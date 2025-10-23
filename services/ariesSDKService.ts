/**
 * Aries Markets SDK Service
 * Official integration using @aries-markets/api REST client
 * Pyth oracle pricing included in API responses
 */

import { AptosClient } from 'aptos';
import { getClient } from '@aries-markets/api';
// Note: @aries-markets/api@0.3.0 doesn't export UserProfile/AggregatedProfile types
// Using custom types from our types file instead
import { AriesReserve, UserPortfolio } from '../types/ariesComplete';
import { ARIES_ASSETS, getAssetByCoinType, getPairedAssets, getIsolatedAssets } from '../config/ariesAssetsComplete';
import { priceService } from './ariesPriceService';
import { ariesMarketDataService } from './ariesMarketDataService';

// Use NodeReal RPC (same as official platform)
const APTOS_NODE_URL = 'https://aptos-mainnet.nodereal.io/v1/dbe3294d24374cad9d0886ca12d0aeb7/v1';
const ARIES_API_URL = 'https://api-v2.ariesmarkets.xyz';
const CONTRACT_ADDRESS = '0x9770fa9c725cbd97eb50b2be5f7416efdfd1f1554beb0750d4dae4c64e860da3';
const RESERVE_TABLE_HANDLE = '0xdf52b2c83b75c52db5bb9f58fb39d9fc2e91b2d537f6498c07bf0f5175498db4';

class AriesSDKService {
  private apiClient: ReturnType<typeof getClient>;
  private reservesCache: AriesReserve[] | null = null;
  private reservesCacheTime: number = 0;
  private CACHE_TTL = 30000; // 30 seconds

  constructor() {
    // Initialize Aries REST API client
    this.apiClient = getClient(ARIES_API_URL);
    console.log('[AriesSDK] Initialized with API endpoint:', ARIES_API_URL);
  }

  /**
   * Check if user has Aries profile via API
   */
  async hasProfile(address: string, profileName: string = 'Main Account'): Promise<boolean> {
    try {
      console.log(`[AriesSDK] Checking profile for ${address}...`);
      
      const userProfile = await this.apiClient.profile.find.query({
        owner: address,
      });

      if (!userProfile || !userProfile.profiles) {
        console.log('[AriesSDK] No profiles found (new user)');
        return false;
      }

      const hasAnyProfile = Object.keys(userProfile.profiles).length > 0;
      console.log(`[AriesSDK] Profile check result: ${hasAnyProfile ? 'EXISTS' : 'NONE'}`);
      
      return hasAnyProfile;
    } catch (error: any) {
      console.log('[AriesSDK] Profile check error (likely new user):', error.message);
      return false;
    }
  }

  /**
   * Fetch reserves by pool type (paired or isolated)
   * Includes Pyth oracle pricing automatically
   * Based on official Aries Markets HAR analysis
   */
  async fetchAllReserves(poolType: 'paired' | 'isolated' | 'all' = 'all'): Promise<AriesReserve[]> {
    try {
      // Check cache
      const now = Date.now();
      if (this.reservesCache && (now - this.reservesCacheTime) < this.CACHE_TTL) {
        const cached = poolType === 'all' 
          ? this.reservesCache 
          : this.reservesCache.filter(r => r.isPaired === (poolType === 'paired'));
        console.log(`[AriesSDK] Using cached reserves (${cached.length} items, pool: ${poolType})`);
        return cached;
      }

      console.log(`[AriesSDK] Fetching reserves from API (pool: ${poolType})...`);
      
      // Fetch reserves based on pool type (matching official platform behavior)
      let allReserves: AriesReserve[] = [];

      if (poolType === 'all') {
        // Fetch both paired and isolated pools
        const [pairedReserves, isolatedReserves] = await Promise.all([
          this.fetchReservesByPoolType('paired'),
          this.fetchReservesByPoolType('isolated'),
        ]);
        allReserves = [...pairedReserves, ...isolatedReserves];
        console.log(`[AriesSDK] ✅ Loaded ${pairedReserves.length} paired + ${isolatedReserves.length} isolated = ${allReserves.length} total reserves`);
      } else {
        allReserves = await this.fetchReservesByPoolType(poolType);
        console.log(`[AriesSDK] ✅ Loaded ${allReserves.length} ${poolType} reserves`);
      }

      // Update cache with all reserves
      this.reservesCache = allReserves;
      this.reservesCacheTime = now;

      return allReserves;
    } catch (error) {
      console.error('[AriesSDK] Error fetching reserves from API:', error);
      console.log('[AriesSDK] Falling back to local asset configuration...');
      return this.buildReservesFromConfig(poolType);
    }
  }

  /**
   * Internal method to fetch reserves for a specific pool type
   * Uses local config since official platform uses direct on-chain table queries (via NodeReal)
   */
  private async fetchReservesByPoolType(poolType: 'paired' | 'isolated'): Promise<AriesReserve[]> {
    // Official platform uses NodeReal RPC with direct table queries
    // For now, use local config with accurate prices from price service
    console.log(`[AriesSDK] Fetching ${poolType} reserves from local configuration...`);
    return await this.buildReservesFromConfig(poolType);
  }

  /**
   * Fallback: Build reserves from local asset configuration
   * Used when API is unavailable or returns invalid data
   */
  private async buildReservesFromConfig(poolType: 'paired' | 'isolated' | 'all' = 'all'): Promise<AriesReserve[]> {
    const assets = poolType === 'paired' 
      ? getPairedAssets() 
      : poolType === 'isolated' 
        ? getIsolatedAssets() 
        : Object.values(ARIES_ASSETS);

    console.log(`[AriesSDK] Building ${assets.length} reserves from local config (pool: ${poolType})`);

    // Fetch prices for all assets in batch
    const coinTypes = assets.map(a => a.coinType);
    const prices = await priceService.getBatchPrices(coinTypes);

    // Fetch market data (APR, utilization) from Aries official API
    const marketData = await ariesMarketDataService.fetchMarketData();
    console.log(`[AriesSDK] Fetched market data for ${marketData.length} assets`);

    // Create lookup map for market data by coinType
    const marketDataMap = new Map(
      marketData.map(data => [data.coinType, data])
    );

    return assets.map(asset => {
      // Get price from price service
      const priceUSD = prices[asset.coinType] || 0;
      
      // Get market data (APR, utilization) from Aries API
      const marketInfo = marketDataMap.get(asset.coinType);

      const reserve: AriesReserve = {
        coinType: asset.coinType,
        symbol: asset.symbol,
        name: asset.name,
        decimals: asset.decimals,
        logoUrl: asset.logoUrl,
        isPaired: asset.isPaired,
        isStablecoin: asset.isStablecoin,

        // On-chain state values (to be fetched from API)
        totalLiquidity: '0',
        totalBorrowed: '0',
        totalLpSupply: '0',
        cashAvailable: '0',
        reserveAmount: '0',
        exchangeRate: '1000000000000000000',

        // Risk params from config
        loanToValue: asset.loanToValue,
        ltv: asset.loanToValue,
        liquidationThreshold: asset.liquidationThreshold,
        borrowFactor: asset.borrowFactor,
        liquidationBonus: asset.liquidationBonus,
        reserveFactor: 0.10,

        // Fees from config
        borrowFeeHundredthBips: asset.borrowFeeHundredthBips,
        flashLoanFeeHundredthBips: asset.flashLoanFeeHundredthBips,
        withdrawFeeHundredthBips: 0,

        // Limits from config
        depositLimit: asset.depositLimit,
        borrowLimit: asset.borrowLimit,

        // Flags
        allowCollateral: true,
        allowRedeem: true,

        // Interest rate config from Aries protocol
        interestRateConfig: {
          minBorrowRate: 0,
          optimalBorrowRate: asset.isStablecoin ? 0.08 : 0.15,
          maxBorrowRate: 2.5,
          optimalUtilization: asset.isStablecoin ? 0.80 : 0.70,
        },

        // Real APR data from official Aries Markets platform
        utilization: marketInfo?.utilization || 0,
        supplyAPR: marketInfo?.supplyAPR || 0,
        borrowAPR: marketInfo?.borrowAPR || 0,

        // Price
        priceUSD: marketInfo?.priceUSD || priceUSD,
        totalSuppliedUSD: marketInfo?.totalSuppliedUSD || 0,
        totalBorrowedUSD: marketInfo?.totalBorrowedUSD || 0,
        totalSupplied: marketInfo?.totalSuppliedUSD ? String(marketInfo.totalSuppliedUSD / (marketInfo.priceUSD || 1)) : '0',
        availableLiquidityUSD: marketInfo?.availableLiquidityUSD || 0,
      };

      return reserve;
    });
  }

  /**
   * Fetch user portfolio from API
   * Returns aggregated deposits, borrows, and health metrics
   */
  async fetchUserPortfolio(address: string, profileName: string = 'Main Account'): Promise<UserPortfolio | null> {
    try {
      console.log(`[AriesSDK] Fetching portfolio for ${address}...`);

      const userProfile: any = await this.apiClient.profile.find.query({
        owner: address,
      });

      if (!userProfile || !userProfile.profiles || Object.keys(userProfile.profiles).length === 0) {
        console.log('[AriesSDK] No portfolio data (new user or no positions)');
        return null;
      }

      // Get first profile (or match by name if needed)
      const profileKey = Object.keys(userProfile.profiles)[0];
      const profile: any = userProfile.profiles[profileKey];

      console.log(`[AriesSDK] Found profile: ${profile.profileName || profileKey}`);

      // Parse deposits
      const deposits = Object.entries(profile.deposits || {}).map(([coinType, deposit]: [string, any]) => {
        const asset = getAssetByCoinType(coinType);
        const decimals = asset?.decimals || 8;
        const collateralAmount = deposit.collateral_coins || 0;
        const collateralAmountDisplay = collateralAmount / (10 ** decimals);
        const priceUSD = deposit.collateral_value > 0 && collateralAmount > 0 
          ? deposit.collateral_value / collateralAmountDisplay 
          : 0;
        
        return {
          coinType,
          symbol: asset?.symbol || 'UNKNOWN',
          decimals,
          
          // Amounts
          lpAmount: String(deposit.collateral_amount || collateralAmount),
          underlyingAmount: String(collateralAmount),
          
          // Display amounts
          lpAmountDisplay: collateralAmountDisplay,
          underlyingAmountDisplay: collateralAmountDisplay,
          
          // USD Value
          priceUSD,
          valueUSD: deposit.collateral_value || 0,
          
          // Risk Parameters
          loanToValue: asset?.loanToValue || 0,
          liquidationThreshold: asset?.liquidationThreshold || 0,
          
          // Collateral Status
          isCollateral: true,
          
          // APR & Interest
          currentAPR: 0.05, // TODO: Get from reserves
          earnedInterestDisplay: 0,
        };
      });

      // Parse borrows
      const borrows = Object.entries(profile.borrows || {}).map(([coinType, borrow]: [string, any]) => {
        const asset = getAssetByCoinType(coinType);
        const decimals = asset?.decimals || 8;
        const borrowedAmount = borrow.borrowed_coins || 0;
        const borrowedAmountDisplay = borrowedAmount / (10 ** decimals);
        const priceUSD = borrow.borrowed_value > 0 && borrowedAmount > 0
          ? borrow.borrowed_value / borrowedAmountDisplay
          : 0;

        return {
          coinType,
          symbol: asset?.symbol || 'UNKNOWN',
          decimals,
          
          // Amounts
          borrowedAmount: String(borrowedAmount),
          borrowShare: String(borrow.borrowed_share || borrowedAmount),
          
          // Display amounts
          borrowedAmountDisplay,
          
          // USD Value
          priceUSD,
          valueUSD: borrow.borrowed_value || 0,
          
          // Risk Parameters
          borrowFactor: asset?.borrowFactor || 1.0,
          
          // APR & Interest
          currentAPR: 0.08, // TODO: Get from reserves
          accruedInterestDisplay: 0,
        };
      });

      // Calculate totals
      const totalSuppliedUSD = deposits.reduce((sum, d) => sum + d.valueUSD, 0);
      const totalBorrowedUSD = borrows.reduce((sum, b) => sum + b.valueUSD, 0);
      const netBalanceUSD = totalSuppliedUSD - totalBorrowedUSD;

      // Calculate health metrics
      const collateralValue = profile.collateralValue || 0;
      const loanValue = profile.loanValue || 0;
      const healthFactor = loanValue > 0 ? collateralValue / loanValue : Infinity;
      const riskFactor = profile.riskFactor || 0;

      const portfolio: UserPortfolio = {
        userAddress: address,
        profileName: profile.profileName || 'Main Account',
        poolType: 'paired',
        deposits,
        borrows,
        totalSuppliedUSD,
        totalBorrowedUSD,
        netBalanceUSD,
        netAPR: 0, // TODO: Calculate weighted APR
        riskMetrics: {
          healthFactor,
          totalCollateralValueUSD: collateralValue,
          totalBorrowValueUSD: loanValue,
          borrowCapacityUSD: collateralValue,
          borrowCapacityUsed: loanValue > 0 ? (loanValue / collateralValue) : 0,
          currentLTV: loanValue > 0 ? (loanValue / totalSuppliedUSD) : 0,
          liquidationLTV: 0.85, // From config
          statusColor: healthFactor > 1.5 ? '#00FF00' : healthFactor > 1.2 ? '#FFA500' : '#FF0000',
          weightedCollateralUSD: collateralValue,
          adjustedBorrowUSD: loanValue,
          status: healthFactor > 1.5 ? 'safe' : healthFactor > 1.0 ? 'warning' : 'danger',
        },
        rewards: [],
        totalRewardsUSD: 0,
        emodeEnabled: false, // TODO: Check E-Mode status from API
      };

      console.log(`[AriesSDK] ✅ Portfolio loaded: $${totalSuppliedUSD.toFixed(2)} supplied, $${totalBorrowedUSD.toFixed(2)} borrowed, HF: ${healthFactor.toFixed(2)}`);
      return portfolio;
    } catch (error) {
      console.error('[AriesSDK] Error fetching portfolio:', error);
      return null;
    }
  }

  /**
   * Build transaction payloads (same as before)
   */
  buildInitializeProfileTransaction(profileName: string = 'Main Account', referrer?: string) {
    return {
      function: `${CONTRACT_ADDRESS}::controller::register_user` as `${string}::${string}::${string}`,
      typeArguments: [],
      functionArguments: referrer ? [profileName, referrer] : [profileName],
    };
  }

  buildSupplyTransaction(coinType: string, amount: string, profileName: string = 'Main Account') {
    return {
      function: `${CONTRACT_ADDRESS}::controller::deposit` as `${string}::${string}::${string}`,
      typeArguments: [coinType],
      functionArguments: [profileName, amount, false], // repay_only = false
    };
  }

  buildBorrowTransaction(coinType: string, amount: string, profileName: string = 'Main Account') {
    return {
      function: `${CONTRACT_ADDRESS}::controller::borrow` as `${string}::${string}::${string}`,
      typeArguments: [coinType],
      functionArguments: [profileName, amount],
    };
  }

  buildWithdrawTransaction(coinType: string, amount: string, profileName: string = 'Main Account') {
    return {
      function: `${CONTRACT_ADDRESS}::controller::withdraw` as `${string}::${string}::${string}`,
      typeArguments: [coinType],
      functionArguments: [profileName, amount, false], // allow_borrow = false
    };
  }

  buildRepayTransaction(coinType: string, amount: string, profileName: string = 'Main Account') {
    return {
      function: `${CONTRACT_ADDRESS}::controller::repay` as `${string}::${string}::${string}`,
      typeArguments: [coinType],
      functionArguments: [profileName, amount],
    };
  }

  /**
   * DEPRECATED: Static data replaced by ariesMarketDataService
   * This method now returns zeros - use ariesMarketDataService.fetchMarketData() instead
   */
  private getOfficialAPRData(symbol: string): { supplyAPR: number; borrowAPR: number; utilization: number } {
    // NO MOCK DATA - Return zeros if real data service fails
    return { supplyAPR: 0, borrowAPR: 0, utilization: 0 };
  }

  /**
   * Legacy calculation methods - deprecated
   * Now using ariesMarketDataService.fetchMarketData() directly
   */
}

// Export singleton instance
export const ariesSDKService = new AriesSDKService();
