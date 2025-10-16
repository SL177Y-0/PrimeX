/**
 * Wallet Authentication Service
 * 
 * Handles Petra/Martian/Pontem wallet authentication for PrimeX
 * Uses wallet address as primary identity (Web3 native approach)
 * 
 * Features:
 * - Wallet connection via Aptos Wallet Adapter
 * - Auto-create user profiles on first connection
 * - Session management using wallet address
 * - No traditional passwords needed
 */

import { supabase } from '../lib/supabase';
import { databaseService } from './database.service';

export interface WalletUser {
  address: string;
  publicKey?: string;
  walletName?: string; // 'Petra', 'Martian', 'Pontem', etc.
  isNewUser: boolean;
}

export interface UserProfile {
  user_address: string;
  username: string | null;
  email: string | null;
  avatar_url: string | null;
  bio: string | null;
  twitter_handle: string | null;
  discord_handle: string | null;
  preferences: Record<string, any>;
  total_volume_usd: string;
  total_transactions: number;
  reputation_score: number;
  created_at: string;
  updated_at: string;
  last_activity_at: string;
}

/**
 * Wallet Authentication Service
 */
export class WalletAuthService {
  private currentUser: WalletUser | null = null;
  
  /**
   * Connect wallet and authenticate user
   * Creates profile if first time user
   */
  async connectWallet(
    address: string,
    publicKey?: string,
    walletName?: string
  ): Promise<WalletUser> {
    try {
      const normalizedAddress = this.normalizeAddress(address);
      console.log(`[WalletAuth] Connecting wallet: ${normalizedAddress}`);
      
      // Check if user profile exists
      const profile = await this.getProfile(normalizedAddress);
      
      const isNewUser = !profile;
      
      // Create profile if new user
      if (isNewUser) {
        await this.createProfile(normalizedAddress, walletName);
        console.log(`[WalletAuth] Created new profile for ${normalizedAddress}`);
        
        // ✅ Initialize all features with empty state for new users
        await databaseService.initializeUserFeatures(normalizedAddress);
      } else {
        // Update last activity
        await this.updateLastActivity(normalizedAddress);
        console.log(`[WalletAuth] Welcome back! ${profile.username || normalizedAddress}`);
      }
      
      const user: WalletUser = {
        address: normalizedAddress,
        publicKey,
        walletName,
        isNewUser,
      };
      
      this.currentUser = user;
      
      // Set session context for RLS policies
      await this.setSessionContext(normalizedAddress);
      
      return user;
    } catch (error: any) {
      console.error('[WalletAuth] Error connecting wallet:', error.message);
      throw new Error(`Failed to connect wallet: ${error.message}`);
    }
  }
  
  /**
   * Disconnect wallet and clear session
   */
  async disconnectWallet(): Promise<void> {
    try {
      if (this.currentUser) {
        console.log(`[WalletAuth] Disconnecting wallet: ${this.currentUser.address}`);
        await this.updateLastActivity(this.currentUser.address);
      }
      
      this.currentUser = null;
      await this.clearSessionContext();
      
      // Clear cached data
      databaseService.clearCache();
      
      console.log('[WalletAuth] Wallet disconnected successfully');
    } catch (error: any) {
      console.error('[WalletAuth] Error disconnecting wallet:', error.message);
    }
  }
  
  /**
   * Get current connected user
   */
  getCurrentUser(): WalletUser | null {
    return this.currentUser;
  }
  
  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }
  
  /**
   * Get user profile
   */
  async getProfile(address: string): Promise<UserProfile | null> {
    try {
      const normalizedAddress = this.normalizeAddress(address);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_address', normalizedAddress)
        .maybeSingle(); // ✅ Changed from .single() to avoid 406 errors
      
      if (error) {
        if (error.code === 'PGRST116') {
          // Profile doesn't exist (expected for new users)
          return null;
        }
        throw error;
      }
      
      return data as UserProfile;
    } catch (error: any) {
      console.error('[WalletAuth] Error fetching profile:', error.message);
      return null;
    }
  }
  
  /**
   * Create or update user profile
   * Uses database function to prevent duplicates
   */
  private async createProfile(
    address: string,
    walletName?: string
  ): Promise<void> {
    try {
      // Use database function that handles UPSERT
      // This prevents duplicate users even if called multiple times
      const { error } = await supabase.rpc('create_profile_if_not_exists', {
        wallet_address: address,
        wallet_name: walletName || null,
      });
      
      if (error) {
        throw error;
      }
      
      console.log(`[WalletAuth] Profile created/updated for ${address}`);
    } catch (error: any) {
      console.error('[WalletAuth] Error creating/updating profile:', error.message);
      // Non-critical error - connection should still succeed
    }
  }
  
  /**
   * Update user profile
   */
  async updateProfile(
    address: string,
    updates: Partial<Omit<UserProfile, 'user_address' | 'created_at' | 'updated_at'>>
  ): Promise<UserProfile> {
    try {
      const normalizedAddress = this.normalizeAddress(address);
      
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_address', normalizedAddress)
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      console.log(`[WalletAuth] Profile updated for ${normalizedAddress}`);
      return data as UserProfile;
    } catch (error: any) {
      console.error('[WalletAuth] Error updating profile:', error.message);
      throw error;
    }
  }
  
  /**
   * Update last activity timestamp
   */
  private async updateLastActivity(address: string): Promise<void> {
    try {
      await supabase
        .from('profiles')
        .update({ last_activity_at: new Date().toISOString() })
        .eq('user_address', address);
    } catch (error) {
      // Non-critical, log but don't throw
      console.warn('[WalletAuth] Failed to update last activity:', error);
    }
  }
  
  /**
   * Set session context for Row Level Security policies
   * This allows Supabase RLS to identify the current user
   */
  private async setSessionContext(address: string): Promise<void> {
    try {
      // Use our custom session config function
      // This sets the app.user_address setting used in RLS policies
      await supabase.rpc('set_session_config', {
        setting_name: 'app.user_address',
        setting_value: address,
        is_local: true,
      });
    } catch (error) {
      console.warn('[WalletAuth] Could not set session context:', error);
      // Non-critical - RLS policies have fallbacks
    }
  }
  
  /**
   * Clear session context
   */
  private async clearSessionContext(): Promise<void> {
    try {
      await supabase.rpc('set_session_config', {
        setting_name: 'app.user_address',
        setting_value: '',
        is_local: true,
      });
    } catch (error) {
      // Ignore errors on clear
    }
  }
  
  /**
   * Normalize wallet address format
   * Ensures consistent format: 0x + 64 hex chars
   */
  private normalizeAddress(address: string): string {
    // Remove 0x prefix if present
    let cleanAddress = address.toLowerCase().replace('0x', '');
    
    // Pad to 64 characters
    cleanAddress = cleanAddress.padStart(64, '0');
    
    // Add 0x prefix
    return `0x${cleanAddress}`;
  }
  
  /**
   * Get user statistics
   */
  async getUserStats(address: string): Promise<{
    totalPositions: number;
    totalTransactions: number;
    totalSupplied: number;
    totalBorrowed: number;
    accountAge: number; // days
  }> {
    try {
      const normalizedAddress = this.normalizeAddress(address);
      
      // Use the user_stats view created in migration
      const { data, error } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_address', normalizedAddress)
        .single();
      
      if (error) throw error;
      
      const accountAge = data.created_at 
        ? Math.floor((Date.now() - new Date(data.created_at).getTime()) / (1000 * 60 * 60 * 24))
        : 0;
      
      return {
        totalPositions: Number(data.total_positions) || 0,
        totalTransactions: Number(data.total_transactions) || 0,
        totalSupplied: Number(data.total_supplied) || 0,
        totalBorrowed: Number(data.total_borrowed) || 0,
        accountAge,
      };
    } catch (error: any) {
      console.error('[WalletAuth] Error fetching user stats:', error.message);
      return {
        totalPositions: 0,
        totalTransactions: 0,
        totalSupplied: 0,
        totalBorrowed: 0,
        accountAge: 0,
      };
    }
  }
  
  /**
   * Verify wallet signature (optional security enhancement)
   * Can be used to prove wallet ownership
   */
  async verifySignature(
    address: string,
    message: string,
    signature: string
  ): Promise<boolean> {
    try {
      // TODO: Implement signature verification using @aptos-labs/ts-sdk
      // This would verify that the signature was created by the wallet's private key
      
      // For now, return true (basic implementation)
      // In production, you should verify the signature
      console.log('[WalletAuth] Signature verification not implemented yet');
      return true;
    } catch (error) {
      console.error('[WalletAuth] Signature verification failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const walletAuthService = new WalletAuthService();
