/**
 * Database Service
 * 
 * Centralized data access layer with:
 * - Supabase integration
 * - In-memory caching (optimized for mobile)
 * - Fallback strategies
 * - Type safety
 */

import { supabase } from '../lib/supabase';

// In-memory cache for mobile (lightweight alternative to Redis)
class MemoryCache {
  private cache: Map<string, { data: any; expiry: number }> = new Map();

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }

    return item.data as T;
  }

  set(key: string, data: any, ttlSeconds: number = 60): void {
    this.cache.set(key, {
      data,
      expiry: Date.now() + ttlSeconds * 1000,
    });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  deletePattern(pattern: string): void {
    const regex = new RegExp(pattern.replace('*', '.*'));
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }
}

const cache = new MemoryCache();

/**
 * Database Service Class
 */
export class DatabaseService {
  /**
   * Get reserve data with caching
   */
  async getReserve(coinType: string) {
    const cacheKey = `reserve:${coinType}`;

    try {
      // 1. Check in-memory cache
      const cached = cache.get(cacheKey);
      if (cached) {
        console.log(`[DB] Cache hit for ${coinType}`);
        return cached;
      }

      // 2. Check Supabase cache table
      const { data: dbCache, error: dbError } = await supabase
        .from('reserve_cache')
        .select('*')
        .eq('coin_type', coinType)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (dbCache && !dbError) {
        console.log(`[DB] Database cache hit for ${coinType}`);
        // Store in memory cache for faster access
        cache.set(cacheKey, dbCache.data, 60);
        return dbCache.data;
      }

      // 3. Fetch from Aptos (use ariesSDKService with view functions)
      try {
        const { ariesSDKService } = await import('./ariesSDKService');
        const reserves = await ariesSDKService.fetchAllReserves();
        const freshData = reserves.find((r: any) => r.coinType === coinType);

        // Update both caches
        cache.set(cacheKey, freshData, 60);
        await this.updateReserveCache(coinType, freshData);

        return freshData;
      } catch (aptosError: any) {
        console.error(`[DB] Aptos fetch failed, using stale data:`, aptosError.message);

        // Return last known data (even if expired)
        const { data: staleData } = await supabase
          .from('reserve_cache')
          .select('*')
          .eq('coin_type', coinType)
          .order('last_fetched_at', { ascending: false })
          .limit(1)
          .single();

        if (staleData) {
          console.warn(`[DB] ⚠️ Using stale data for ${coinType}`);
          cache.set(cacheKey, { ...staleData.data, isStale: true }, 30);
          return { ...staleData.data, isStale: true };
        }

        throw new Error(`No data available for ${coinType}`);
      }
    } catch (error: any) {
      console.error(`[DB] Complete failure for ${coinType}:`, error.message);
      throw error;
    }
  }

  /**
   * Update reserve cache in Supabase
   */
  private async updateReserveCache(coinType: string, data: any) {
    try {
      const { error } = await supabase
        .from('reserve_cache')
        .upsert({
          coin_type: coinType,
          symbol: data.symbol || 'UNKNOWN',
          data: data,
          last_fetched_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 60000).toISOString(), // 60 seconds
        });

      if (error) {
        console.error('[DB] Failed to update reserve cache:', error.message);
      }
    } catch (error: any) {
      console.error('[DB] Error updating cache:', error.message);
    }
  }

  /**
   * Helper to check if string is valid UUID
   */
  private isValidUUID(str: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  }

  /**
   * Get user positions by wallet address
   */
  async getUserPositions(userAddress: string): Promise<any[]> {
    const cacheKey = `positions:${userAddress}`;

    // Try cache first
    const cached = cache.get<any[]>(cacheKey);
    if (cached) return cached;

    try {
      console.log(`[DB] Querying positions by user_address: ${userAddress}`);

      // Fetch from database - query open positions
      const { data, error } = await supabase
        .from('positions')
        .select('*')
        .eq('user_address', userAddress)
        .is('closed_at', null)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('[DB] Error fetching positions:', error.message);
        throw error;
      }

      // Cache for 30 seconds
      cache.set(cacheKey, data || [], 30);
      return data || [];
    } catch (error: any) {
      console.error('[DB] Error fetching positions:', error.message);
      throw error;
    }
  }

  /**
   * Save new position
   */
  async savePosition(position: any) {
    const { data, error } = await supabase
      .from('positions')
      .insert(position)
      .select()
      .single();

    if (error) {
      console.error('[DB] Error saving position:', error.message);
      throw error;
    }

    // Invalidate user's position cache
    cache.delete(`positions:${position.user_address}`);
    return data;
  }

  /**
   * Update position (for PnL updates)
   */
  async updatePosition(positionId: string, updates: any) {
    const { data, error } = await supabase
      .from('positions')
      .update(updates)
      .eq('id', positionId)
      .select()
      .single();

    if (error) {
      console.error('[DB] Error updating position:', error.message);
      throw error;
    }

    // Invalidate cache
    if (data) {
      cache.delete(`positions:${data.user_address}`);
    }

    return data;
  }

  /**
   * Get user transactions
   */
  async getUserTransactions(userAddress: string, limit: number = 50) {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_address', userAddress)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[DB] Error fetching transactions:', error.message);
      throw error;
    }

    return data;
  }

  /**
   * Save transaction
   */
  async saveTransaction(transaction: any) {
    const { data, error } = await supabase
      .from('transactions')
      .insert(transaction)
      .select()
      .single();

    if (error) {
      console.error('[DB] Error saving transaction:', error.message);
      throw error;
    }

    return data;
  }

  /**
   * Get or create user profile
   */
  async getOrCreateProfile(userData: {
    walletAddress: string;
    walletName?: string;
    email?: string;
  }) {
    try {
      // Use database function to create or update profile
      const { error: rpcError } = await supabase.rpc('create_profile_if_not_exists', {
        wallet_address: userData.walletAddress,
        wallet_name: userData.walletName || null,
      });

      if (rpcError) {
        console.error('[DB] Error creating profile:', rpcError.message);
      }

      // Fetch and return the profile
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_address', userData.walletAddress)
        .single();

      if (error) {
        console.error('[DB] Error fetching profile:', error.message);
        throw error;
      }

      return profile;
    } catch (error: any) {
      console.error('[DB] Error in getOrCreateProfile:', error.message);
      throw error;
    }
  }

  /**
   * Clear all caches
   */
  clearCache() {
    cache.clear();
    console.log('[DB] Cache cleared');
  }

  /**
   * Clear specific cache pattern
   */
  clearCachePattern(pattern: string) {
    cache.deletePattern(pattern);
    console.log(`[DB] Cleared cache pattern: ${pattern}`);
  }

  // ============================================================================
  // FEATURE INITIALIZATION METHODS (First-time access)
  // ============================================================================

  /**
   * Initialize user's data for all features on first wallet connection
   * Creates baseline records so features show "0 positions" instead of empty
   */
  async initializeUserFeatures(userAddress: string): Promise<void> {
    try {
      console.log(`[DB] Initializing features for ${userAddress}`);
      
      // Check if already initialized
      const { data: profile } = await supabase
        .from('profiles')
        .select('preferences')
        .eq('user_address', userAddress)
        .maybeSingle();
      
      if (!profile) {
        console.warn('[DB] Profile not found, cannot initialize features');
        return;
      }
      
      const prefs = profile.preferences || {};
      
      // Initialize each feature if not already done
      if (!prefs.leverage_initialized) {
        await this.initializeLeverageFeature(userAddress);
      }
      
      if (!prefs.staking_initialized) {
        await this.initializeStakingFeature(userAddress);
      }
      
      if (!prefs.swap_initialized) {
        await this.initializeSwapFeature(userAddress);
      }
      
      if (!prefs.lend_initialized) {
        await this.initializeLendFeature(userAddress);
      }
      
      console.log(`[DB] ✅ All features initialized for ${userAddress}`);
    } catch (error: any) {
      console.error('[DB] Error initializing features:', error.message);
      // Don't throw - initialization is non-critical
    }
  }

  /**
   * Initialize leverage trading feature (empty state)
   */
  async initializeLeverageFeature(userAddress: string): Promise<void> {
    try {
      // Get current preferences
      const { data: profile } = await supabase
        .from('profiles')
        .select('preferences')
        .eq('user_address', userAddress)
        .maybeSingle();
      
      const currentPrefs = profile?.preferences || {};
      
      // Update preferences flag
      await supabase
        .from('profiles')
        .update({
          preferences: { ...currentPrefs, leverage_initialized: true }
        })
        .eq('user_address', userAddress);
      
      console.log(`[DB] ✅ Leverage feature initialized for ${userAddress}`);
    } catch (error: any) {
      console.error('[DB] Error initializing leverage:', error.message);
    }
  }

  /**
   * Initialize liquid staking feature (empty state)
   */
  async initializeStakingFeature(userAddress: string): Promise<void> {
    try {
      // Get current preferences
      const { data: profile } = await supabase
        .from('profiles')
        .select('preferences')
        .eq('user_address', userAddress)
        .maybeSingle();
      
      const currentPrefs = profile?.preferences || {};
      
      // Update preferences flag
      await supabase
        .from('profiles')
        .update({
          preferences: { ...currentPrefs, staking_initialized: true }
        })
        .eq('user_address', userAddress);
      
      console.log(`[DB] ✅ Staking feature initialized for ${userAddress}`);
    } catch (error: any) {
      console.error('[DB] Error initializing staking:', error.message);
    }
  }

  /**
   * Initialize swap feature (empty state)
   */
  async initializeSwapFeature(userAddress: string): Promise<void> {
    try {
      // Get current preferences
      const { data: profile } = await supabase
        .from('profiles')
        .select('preferences')
        .eq('user_address', userAddress)
        .maybeSingle();
      
      const currentPrefs = profile?.preferences || {};
      
      // Update preferences flag
      await supabase
        .from('profiles')
        .update({
          preferences: { ...currentPrefs, swap_initialized: true }
        })
        .eq('user_address', userAddress);
      
      console.log(`[DB] ✅ Swap feature initialized for ${userAddress}`);
    } catch (error: any) {
      console.error('[DB] Error initializing swap:', error.message);
    }
  }

  /**
   * Initialize lend & borrow feature (empty state)
   */
  async initializeLendFeature(userAddress: string): Promise<void> {
    try {
      // Get current preferences
      const { data: profile } = await supabase
        .from('profiles')
        .select('preferences')
        .eq('user_address', userAddress)
        .maybeSingle();
      
      const currentPrefs = profile?.preferences || {};
      
      // Update preferences flag
      await supabase
        .from('profiles')
        .update({
          preferences: { ...currentPrefs, lend_initialized: true }
        })
        .eq('user_address', userAddress);
      
      console.log(`[DB] ✅ Lend feature initialized for ${userAddress}`);
    } catch (error: any) {
      console.error('[DB] Error initializing lend:', error.message);
    }
  }

  /**
   * Check if a specific feature is initialized
   */
  async isFeatureInitialized(userAddress: string, feature: 'leverage' | 'staking' | 'swap' | 'lend'): Promise<boolean> {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('preferences')
        .eq('user_address', userAddress)
        .maybeSingle();
      
      if (!data) return false;
      
      const prefs = data.preferences || {};
      return prefs[`${feature}_initialized`] === true;
    } catch (error) {
      return false;
    }
  }

  // ============================================================================
  // LEVERAGE TRADING METHODS
  // ============================================================================

  /**
   * Save leverage position
   */
  async saveLeveragePosition(leveragePosition: {
    user_address: string;
    position_id?: string;
    leverage_ratio: number;
    margin_amount: string;
    margin_amount_usd: string;
    liquidation_price: string;
    current_price: string;
    funding_rate?: string;
    unrealized_pnl?: string;
  }) {
    try {
      const { data, error } = await supabase
        .from('leverage_positions')
        .insert(leveragePosition)
        .select()
        .single();

      if (error) {
        console.error('[DB] Error saving leverage position:', error.message);
        throw error;
      }

      // Invalidate cache
      cache.delete(`leverage_positions:${leveragePosition.user_address}`);
      console.log(`[DB] ✅ Leverage position saved for ${leveragePosition.user_address}`);
      return data;
    } catch (error: any) {
      console.error('[DB] Error in saveLeveragePosition:', error.message);
      throw error;
    }
  }

  /**
   * Get user leverage positions
   */
  async getUserLeveragePositions(userAddress: string) {
    const cacheKey = `leverage_positions:${userAddress}`;
    const cached = cache.get<any[]>(cacheKey);
    if (cached) return cached;

    try {
      const { data, error } = await supabase
        .from('leverage_positions')
        .select('*')
        .eq('user_address', userAddress)
        .is('closed_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      cache.set(cacheKey, data || [], 30);
      return data || [];
    } catch (error: any) {
      console.error('[DB] Error fetching leverage positions:', error.message);
      throw error;
    }
  }

  /**
   * Close leverage position
   */
  async closeLeveragePosition(positionId: string, finalPnl: string) {
    try {
      const { data, error } = await supabase
        .from('leverage_positions')
        .update({
          closed_at: new Date().toISOString(),
          unrealized_pnl: finalPnl,
        })
        .eq('id', positionId)
        .select()
        .single();

      if (error) throw error;
      
      if (data) {
        cache.delete(`leverage_positions:${data.user_address}`);
      }
      
      console.log(`[DB] ✅ Leverage position closed: ${positionId}`);
      return data;
    } catch (error: any) {
      console.error('[DB] Error closing leverage position:', error.message);
      throw error;
    }
  }

  // ============================================================================
  // LIQUID STAKING METHODS
  // ============================================================================

  /**
   * Save staking position
   */
  async saveStakingPosition(stakingPosition: {
    user_address: string;
    stake_amount: string;
    stake_amount_usd: string;
    validator_address?: string;
    protocol_name: string;
    annual_percentage_yield: string;
    rewards_earned?: string;
  }) {
    try {
      const { data, error } = await supabase
        .from('staking_positions')
        .insert(stakingPosition)
        .select()
        .single();

      if (error) {
        console.error('[DB] Error saving staking position:', error.message);
        throw error;
      }

      cache.delete(`staking_positions:${stakingPosition.user_address}`);
      console.log(`[DB] ✅ Staking position saved for ${stakingPosition.user_address}`);
      return data;
    } catch (error: any) {
      console.error('[DB] Error in saveStakingPosition:', error.message);
      throw error;
    }
  }

  /**
   * Get user staking positions
   */
  async getUserStakingPositions(userAddress: string) {
    const cacheKey = `staking_positions:${userAddress}`;
    const cached = cache.get<any[]>(cacheKey);
    if (cached) return cached;

    try {
      const { data, error } = await supabase
        .from('staking_positions')
        .select('*')
        .eq('user_address', userAddress)
        .is('unstaked_at', null)
        .order('staked_at', { ascending: false });

      if (error) throw error;

      cache.set(cacheKey, data || [], 30);
      return data || [];
    } catch (error: any) {
      console.error('[DB] Error fetching staking positions:', error.message);
      throw error;
    }
  }

  /**
   * Unstake position
   */
  async unstakePosition(positionId: string) {
    try {
      const { data, error } = await supabase
        .from('staking_positions')
        .update({ unstaked_at: new Date().toISOString() })
        .eq('id', positionId)
        .select()
        .single();

      if (error) throw error;
      
      if (data) {
        cache.delete(`staking_positions:${data.user_address}`);
      }
      
      console.log(`[DB] ✅ Staking position unstaked: ${positionId}`);
      return data;
    } catch (error: any) {
      console.error('[DB] Error unstaking position:', error.message);
      throw error;
    }
  }

  /**
   * Update staking rewards
   */
  async updateStakingRewards(positionId: string, rewardsEarned: string) {
    try {
      const { data, error } = await supabase
        .from('staking_positions')
        .update({ 
          rewards_earned: rewardsEarned,
          updated_at: new Date().toISOString()
        })
        .eq('id', positionId)
        .select()
        .single();

      if (error) throw error;
      
      if (data) {
        cache.delete(`staking_positions:${data.user_address}`);
      }
      
      return data;
    } catch (error: any) {
      console.error('[DB] Error updating staking rewards:', error.message);
      throw error;
    }
  }

  // ============================================================================
  // SWAP TOKENS METHODS
  // ============================================================================

  /**
   * Save swap transaction
   */
  async saveSwap(swap: {
    user_address: string;
    from_token: string;
    to_token: string;
    from_amount: string;
    to_amount: string;
    exchange_rate: string;
    price_impact?: string;
    slippage?: string;
    transaction_hash: string;
    status?: 'pending' | 'completed' | 'failed';
  }) {
    try {
      const { data, error } = await supabase
        .from('swap_history')
        .insert({
          ...swap,
          status: swap.status || 'pending',
        })
        .select()
        .single();

      if (error) {
        console.error('[DB] Error saving swap:', error.message);
        throw error;
      }

      cache.delete(`swap_history:${swap.user_address}`);
      console.log(`[DB] ✅ Swap saved for ${swap.user_address}`);
      return data;
    } catch (error: any) {
      console.error('[DB] Error in saveSwap:', error.message);
      throw error;
    }
  }

  /**
   * Get user swap history
   */
  async getUserSwapHistory(userAddress: string, limit: number = 50) {
    const cacheKey = `swap_history:${userAddress}`;
    const cached = cache.get<any[]>(cacheKey);
    if (cached) return cached;

    try {
      const { data, error } = await supabase
        .from('swap_history')
        .select('*')
        .eq('user_address', userAddress)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      cache.set(cacheKey, data || [], 30);
      return data || [];
    } catch (error: any) {
      console.error('[DB] Error fetching swap history:', error.message);
      throw error;
    }
  }

  /**
   * Update swap status
   */
  async updateSwapStatus(
    transactionHash: string, 
    status: 'completed' | 'failed'
  ) {
    try {
      const { data, error } = await supabase
        .from('swap_history')
        .update({ status })
        .eq('transaction_hash', transactionHash)
        .select()
        .single();

      if (error) throw error;
      
      if (data) {
        cache.delete(`swap_history:${data.user_address}`);
      }
      
      console.log(`[DB] ✅ Swap status updated: ${transactionHash} -> ${status}`);
      return data;
    } catch (error: any) {
      console.error('[DB] Error updating swap status:', error.message);
      throw error;
    }
  }

  // ============================================================================
  // LEND & BORROW METHODS (Enhanced)
  // ============================================================================

  /**
   * Save lend/borrow position (supply or borrow)
   */
  async saveLendBorrowPosition(position: {
    user_address: string;
    asset_symbol: string;
    coin_type: string;
    position_type: 'supply' | 'borrow';
    amount: string;
    amount_usd: string;
    entry_price: string;
    current_price: string;
    current_apr: string;
    pnl?: string;
    pnl_percent?: string;
  }) {
    return this.savePosition(position);
  }

  /**
   * Close lend/borrow position
   */
  async closePosition(positionId: string) {
    try {
      const { data, error } = await supabase
        .from('positions')
        .update({ closed_at: new Date().toISOString() })
        .eq('id', positionId)
        .select()
        .single();

      if (error) throw error;
      
      if (data) {
        cache.delete(`positions:${data.user_address}`);
      }
      
      console.log(`[DB] ✅ Position closed: ${positionId}`);
      return data;
    } catch (error: any) {
      console.error('[DB] Error closing position:', error.message);
      throw error;
    }
  }
}

// Export singleton instance
export const databaseService = new DatabaseService();
