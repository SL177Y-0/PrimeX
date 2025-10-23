/**
 * Aries Markets SDK Service
 * Official integration using @aries-markets/api REST client
 * Pyth oracle pricing included in API responses
 */

import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';
import { getClient } from '@aries-markets/api';
// Note: @aries-markets/api@0.3.0 doesn't export UserProfile/AggregatedProfile types
// Using custom types from our types file instead
import { AriesReserve, UserPortfolio } from '../types/ariesComplete';
import { ARIES_ASSETS, getAssetByCoinType, getPairedAssets, getIsolatedAssets } from '../config/ariesAssetsComplete';
// Price data is now extracted directly from tRPC API response (no external service needed)
import { ariesMarketDataService } from './ariesMarketDataService';
import { APTOS_CONFIG } from '../config/constants';

// Use NodeReal RPC (same as official Aries platform)
const APTOS_NODE_URL = process.env.EXPO_PUBLIC_APTOS_NODE_URL || 'https://aptos-mainnet.nodereal.io/v1/dbe3294d24374cad9d0886ca12d0aeb7/v1';
// Use CORS proxy for API calls to avoid CORS errors
const ARIES_API_URL = process.env.EXPO_PUBLIC_PROXY_BASE_URL 
  ? `${process.env.EXPO_PUBLIC_PROXY_BASE_URL}/api/aries-trpc`
  : 'http://localhost:3001/api/aries-trpc';
const CONTRACT_ADDRESS = '0x9770fa9c725cbd97eb50b2be5f7416efdfd1f1554beb0750d4dae4c64e860da3';
const RESERVE_TABLE_HANDLE = '0xdf52b2c83b75c52db5bb9f58fb39d9fc2e91b2d537f6498c07bf0f5175498db4';

class AriesSDKService {
  private apiClient: ReturnType<typeof getClient>;
  private aptosClient: Aptos;
  private reservesCache: AriesReserve[] | null = null;
  private reservesCacheTime: number = 0;
  private readonly CACHE_TTL = 1 * 1000; // 1 second for debugging (change to 2*60*1000 for production)
  
  // Request deduplication: track in-flight requests
  private fetchPromises: Map<string, Promise<any>> = new Map();

  constructor() {
    // Initialize Aries tRPC client with proxy URL (for API data)
    this.apiClient = getClient(ARIES_API_URL);
    
    // Initialize Aptos client with NodeReal RPC (for blockchain data)
    const aptosConfig = new AptosConfig({
      network: Network.MAINNET,
      fullnode: APTOS_NODE_URL,
    });
    this.aptosClient = new Aptos(aptosConfig);
    
    console.log('[AriesSDK] Initialized with:');
    console.log('[AriesSDK]   - tRPC API:', ARIES_API_URL);
    console.log('[AriesSDK]   - NodeReal RPC:', APTOS_NODE_URL);
    console.log('[AriesSDK] Using hybrid approach like official platform');
  }

  /**
   * Clear cache to force fresh API fetch
   * Useful for debugging and testing
   */
  clearCache() {
    this.reservesCache = null;
    this.reservesCacheTime = 0;
    this.fetchPromises.clear();
    console.log('[AriesSDK] 🗑️ Cache cleared! Next fetch will be fresh from API.');
  }

  /**
   * Get fallback prices when API fails
   * Complete list for ALL 21 Aries assets
   */
  private getFallbackPrices(): any {
    return {
      // 1. APT (Aptos Coin)
      '0x0000000000000000000000000000000000000000000000000000000000000001::aptos_coin::AptosCoin': 
        { price: 3.22, decimal: 8, symbol: 'APT', name: 'Aptos' },
      
      // 2. zUSDC (LayerZero USDC - coin::T variant)
      '0x5e156f1207d0ebfa19a9eeff00d62a282278fb8719f4fab3a586a0a2c0fffbea::coin::T': 
        { price: 1.00, decimal: 8, symbol: 'zUSDC', name: 'LayerZero USD Coin' },
      
      // 3. zWBTC (LayerZero WBTC - coin::T variant)  
      '0xae478ff7d83ed072dbc5e264250e67ef58f57c99d89b447efd8a0a2e8b2be76e::coin::T': 
        { price: 109000, decimal: 8, symbol: 'zWBTC', name: 'LayerZero Wrapped BTC' },
      
      // 4. USDC (Merkle/Wormhole)
      '0xc91d826e29a3183eb3b6f6aa3a722089fdffb8e9642b94c5fcd4c48d035c0080::type::USDC': 
        { price: 1.00, decimal: 6, symbol: 'USDC', name: 'USD Coin' },
      
      // 5. Ditto StakedAptosCoin
      '0x84d7aeef42d38a5ffc3ccef853e1b82e4958659d16a7de736a29c55fbbeb0114::staked_aptos_coin::StakedAptosCoin': 
        { price: 3.50, decimal: 8, symbol: 'stAPT', name: 'Ditto Staked Aptos' },
      
      // 6. zWETH (LayerZero WETH - coin::T variant)
      '0xcc8a89c8dce9693d354449f1f73e60e14e347417854f029db5bc8e7454008abb::coin::T': 
        { price: 3865, decimal: 8, symbol: 'zWETH', name: 'LayerZero Wrapped Ether' },
      
      // 7. CAKE (PancakeSwap)
      '0x159df6b7689437016108a019fd5bef736bac692b6d4a1f10c941f6fbb9a74ca6::oft::CakeOFT': 
        { price: 2.69, decimal: 8, symbol: 'CAKE', name: 'PancakeSwap Token' },
      
      // 8. WETH (Wormhole Wrapped Ether)
      '0x49e5e7f5a6d290537bc8ff18dcec09572a5e8a10c91bb2ac9a935cc86d694e8c::coin::WETH': 
        { price: 3865, decimal: 6, symbol: 'WETH', name: 'Wormhole Wrapped Ether' },
      
      // 9. stAPT (Tortuga Staked APT)
      '0xd11107bdf0d6d7040c6c0bfbdecb6545191fdf13e8d8d259952f53e1713f61b5::staked_coin::StakedAptos': 
        { price: 3.69, decimal: 8, symbol: 'stAPT', name: 'Tortuga Staked Aptos' },
      
      // 10. USDT (Tether)
      '0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::USDT': 
        { price: 1.00, decimal: 6, symbol: 'USDT', name: 'Tether USD' },
      
      // 11. WBTC (Wormhole Wrapped BTC)
      '0xae478ff7d83ed072dbc5e264250e67ef58f57c99d89b447efd8a0a2e8b2be76e::coin::WBTC': 
        { price: 109000, decimal: 8, symbol: 'WBTC', name: 'Wormhole Wrapped BTC' },
      
      // 12. amAPT (Amnis APT)
      '0x111ae3e5bc816a5e63c2da97d0aa3886519e0cd5e4b046659fa35796bd11542a::amapt_token::AmnisApt': 
        { price: 3.14, decimal: 8, symbol: 'amAPT', name: 'Amnis Aptos Coin' },
      
      // 13. USDY (Ondo USD Yield)
      '0x960ab4193471c96e55faa83bb461c5ceccd80fb1286fb75c95f08c81c72d5724::usdy_coin::USDY': 
        { price: 1.00, decimal: 6, symbol: 'USDY', name: 'Ondo USD Yield' },
      
      // 14. WrappedUSDT (Wormhole Portal USDT)
      '0xa2eda21a58856fda86451436513b867c97eecb4ba099da5775520e0f7492e852::coin::T': 
        { price: 1.00, decimal: 6, symbol: 'whUSDT', name: 'Wormhole Portal USDT' },
      
      // 15. WrappedUSDC (Wormhole Portal USDC)
      '0x5e156f1207d0ebfa19a9eeff00d62a282278fb8719f4fab3a586a0a2c0fffbea::coin::USDC': 
        { price: 1.00, decimal: 6, symbol: 'whUSDC', name: 'Wormhole Portal USDC' },
      
      // 16. sUSDe (Ethena Staked USDe)
      '0xb00b643e390c638e1c9ccfe2b5d54d9cbbf77110e0d72ec6b0af0b3399a23b72::susde::SUSDe': 
        { price: 1.20, decimal: 6, symbol: 'sUSDe', name: 'Ethena Staked USDe' },
      
      // 17. kAPT/WrappedKAPT (Kana Labs APT)
      '0x5c738a5dfa343bee927c39ebe85b0ceb95fdb5575840c0c39bbf7f4ff6e0994c::coin::KAPT': 
        { price: 3.50, decimal: 8, symbol: 'kAPT', name: 'Kana Labs APT' },
      
      // 18. xBTC (OKX Wrapped BTC)
      '0x04c8224db7414ace4a2c666943dff3cec6c7577424aca3d2e49c5db5ca7e32b9::xbtc::XBTC': 
        { price: 109000, decimal: 8, symbol: 'xBTC', name: 'OKX Wrapped BTC' },
      
      // 19. aBTC (Avalon BTC)
      '0x4a64f5afe8b5d09c5219eb16b0b93c85c0b3e77ef37a57f77f1d86f0c3f9e1e5::coin::ABTC': 
        { price: 109000, decimal: 8, symbol: 'aBTC', name: 'Avalon BTC' },
      
      // 20. WrappedWBTC (Another WBTC variant)
      '0x5e156f1207d0ebfa19a9eeff00d62a282278fb8719f4fab3a586a0a2c0fffbea::coin::WBTC': 
        { price: 109000, decimal: 8, symbol: 'whWBTC', name: 'Wormhole Portal WBTC' },
      
      // 21. USD1 (Everlend USD)
      '0x5e156f1207d0ebfa19a9eeff00d62a282278fb8719f4fab3a586a0a2c0fffbea::coin::USD1': 
        { price: 1.00, decimal: 6, symbol: 'USD1', name: 'Everlend USD' },
    };
  }

  /**
   * Check if user has Aries profile via API
   * REQUEST DEDUPLICATION: Reuses in-flight requests
   */
  async hasProfile(address: string, profileName: string = 'Main Account'): Promise<boolean> {
    try {
      // REQUEST DEDUPLICATION
      const promiseKey = `hasProfile:${address}`;
      if (this.fetchPromises.has(promiseKey)) {
        console.log(`[AriesSDK] ⏳ Profile check already in-flight, reusing promise`);
        return this.fetchPromises.get(promiseKey)!;
      }
      
      console.log(`[AriesSDK] Checking profile for ${address}...`);
      
      const checkPromise = (async () => {
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
      })();
      
      // Store promise
      this.fetchPromises.set(promiseKey, checkPromise);
      
      // Clean up after completion
      checkPromise.finally(() => {
        this.fetchPromises.delete(promiseKey);
      });
      
      return checkPromise;

    } catch (error: any) {
      console.log('[AriesSDK] Profile check error (likely new user):', error.message);
      return false;
    }
  }

  /**
   * Fetch reserves by pool type (paired or isolated)
   * Includes Pyth oracle pricing automatically
   * OPTIMIZED: Fetch all reserves once, then filter locally
   * REQUEST DEDUPLICATION: Reuses in-flight requests
   */
  async fetchAllReserves(poolType: 'paired' | 'isolated' | 'all' = 'all'): Promise<AriesReserve[]> {
    try {
      console.log(`[AriesSDK] 🔄 fetchAllReserves called with poolType: ${poolType}`);
      
      // REQUEST DEDUPLICATION
      const promiseKey = `fetchAllReserves:${poolType}`;
      if (this.fetchPromises.has(promiseKey)) {
        console.log(`[AriesSDK] ⏳ Request already in-flight, reusing promise`);
        return this.fetchPromises.get(promiseKey)!;
      }

      // Check cache first
      const now = Date.now();
      if (this.reservesCache && (now - this.reservesCacheTime < this.CACHE_TTL)) {
        console.log(`[AriesSDK] ⚠️ Using cached reserves (${this.reservesCache.length} items, pool: ${poolType})`);
        console.log(`[AriesSDK] ⚠️ Cache age: ${Math.round((now - this.reservesCacheTime) / 1000)}s / ${this.CACHE_TTL / 1000}s`);
        console.log(`[AriesSDK] 💡 To see fresh data, clear cache or wait ${Math.round((this.CACHE_TTL - (now - this.reservesCacheTime)) / 1000)}s`);
        return this.reservesCache;
      }

      console.log(`[AriesSDK] Fetching reserves from API (pool: ${poolType})...`);
      
      // OPTIMIZATION: Fetch all reserves in ONE API call, then filter locally
      // This prevents multiple redundant API calls
      const fetchPromise = this.fetchAllReservesFromAPI();
      
      // Store promise for deduplication
      this.fetchPromises.set(promiseKey, fetchPromise);
      
      // Clean up after completion
      fetchPromise.finally(() => {
        this.fetchPromises.delete(promiseKey);
      });
      
      const allReserves = await fetchPromise;
      
      // Update cache with all reserves
      this.reservesCache = allReserves;
      this.reservesCacheTime = now;

      console.log(`[AriesSDK] ✅ Loaded ${allReserves.length} total reserves`);
      return allReserves;
    } catch (error) {
      console.error('[AriesSDK] Error fetching reserves from API:', error);
      console.log('[AriesSDK] Falling back to local asset configuration...');
      return this.buildReservesFromConfig(poolType);
    }
  }

  /**
   * Fetch all reserves from API in one call
   * Private method to prevent duplicate API calls
   */
  private async fetchAllReservesFromAPI(): Promise<AriesReserve[]> {
    try {
      console.log(`[AriesSDK] Fetching all reserves from Aries tRPC API...`);
      
      // Use correct tRPC method: reserve.current.query()
      const reserveData: any = await this.apiClient.reserve.current.query();
      
      if (!reserveData || !reserveData.stats || !Array.isArray(reserveData.stats)) {
        throw new Error('Invalid API response format');
      }
      
      console.log(`[AriesSDK] 📊 API Response Details:`);
      console.log(`[AriesSDK]   - Total reserves: ${reserveData.stats.length}`);
      console.log(`[AriesSDK]   - Reserve symbols:`, reserveData.stats.map((s: any) => {
        const coinType = s.key;
        const parts = coinType.split('::');
        return parts[parts.length - 1] || parts[parts.length - 2] || 'UNKNOWN';
      }).join(', '));
      
      // Fetch ALL prices from coinInfo.currentInfo endpoint (SINGLE CALL!)
      console.log('[AriesSDK] 📊 Fetching ALL prices from coinInfo.currentInfo (single API call)...');
      
      const priceData: any = {};
      
      try {
        const coinTypes = reserveData.stats.map((s: any) => s.key);
        console.log(`[AriesSDK] 🔄 Fetching prices for ${coinTypes.length} assets in single call...`);
        
        // CRITICAL FIX: Single API call returns ALL prices as dictionary!
        // Response format: { "0x1::aptos_coin::AptosCoin": { price: 12.34, decimal: 8 }, ... }
        const url = `${ARIES_API_URL}/coinInfo.currentInfo`;
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        // Response is a DICTIONARY of coin types to price data
        const allPrices: Record<string, { price: number; decimal: number }> = await response.json();
        
        console.log(`[AriesSDK] ✅ Received price data for ${Object.keys(allPrices).length} coins`);
        
        // Convert to our internal format
        Object.entries(allPrices).forEach(([coinType, priceInfo]) => {
          if (priceInfo && typeof priceInfo.price === 'number') {
            priceData[coinType] = {
              price: priceInfo.price,
              decimal: priceInfo.decimal || 8,
              symbol: this.extractSymbolFromCoinType(coinType),
              name: this.extractSymbolFromCoinType(coinType)
            };
          }
        });
        
        console.log(`[AriesSDK] ✅ Processed ${Object.keys(priceData).length} prices successfully`);
        
        if (Object.keys(priceData).length > 0) {
          const samplePrices = Object.entries(priceData).slice(0, 3).map(([key, val]: [string, any]) => 
            `${key.split('::').pop()}: $${val.price.toFixed(2)}`
          );
          console.log(`[AriesSDK] 📊 Sample prices:`, samplePrices.join(', '));
        } else {
          console.warn('[AriesSDK] ⚠️ No prices received from API');
        }
      } catch (error: any) {
        console.error('[AriesSDK] ❌ Price fetch failed:', error.message);
        console.error('[AriesSDK] ❌ Error details:', error);
      }
      
      // Transform all reserves
      console.log('[AriesSDK] 🔄 Transforming reserves...');
      const allReserves = reserveData.stats.map((stat: any) => 
        this.transformApiReserveToLocal(stat, priceData)
      );
      
      console.log(`[AriesSDK] 📦 Transformed ${allReserves.length} total reserves`);
      
      // Filter out deprecated/inactive assets
      const activeReserves = this.filterActiveReserves(allReserves);
      console.log(`[AriesSDK] ✅ Filtered to ${activeReserves.length} active reserves (removed ${allReserves.length - activeReserves.length} deprecated)`);
      
      return activeReserves;
    } catch (error: any) {
      console.log(`[AriesSDK] API fetch failed (${error.message}), using local config...`);
      return await this.buildReservesFromConfig('all');
    }
  }


  /**
   * Filter out deprecated and inactive reserves
   * Only show assets that are active on the official platform
   * MINIMAL FILTERING - Let API decide what's active
   */
  private filterActiveReserves(reserves: AriesReserve[]): AriesReserve[] {
    console.log(`[AriesSDK] 🔍 Filtering ${reserves.length} reserves...`);
    
    // ONLY filter truly deprecated assets - nothing else!
    // The API already returns active assets, so don't over-filter
    const deprecatedSymbols = new Set<string>([
      // These are behind "Show deprecated assets" button on official platform
      // DO NOT ADD MORE - let the API decide what's active
      // Currently: NO FILTERING - API returns correct assets
    ]);
    
    const filtered = reserves.filter(reserve => {
      // Only filter if explicitly in deprecated list
      if (deprecatedSymbols.has(reserve.symbol)) {
        console.log(`[AriesSDK] 🗑️ Filtering deprecated asset: ${reserve.symbol}`);
        return false;
      }
      
      console.log(`[AriesSDK] ✅ Keeping asset: ${reserve.symbol} - ${reserve.name} (Price: $${reserve.priceUSD}, Liquidity: ${reserve.totalLiquidity})`);
      return true;
    });
    
    console.log(`[AriesSDK] 📊 Filter result: ${filtered.length}/${reserves.length} assets kept`);
    return filtered;
  }

  /**
   * Transform API reserve data to our local format
   * Calculates APRs using the same formula as official SDK
   */
  private transformApiReserveToLocal(stat: any, priceData: any): AriesReserve {
    const coinType = stat.key;
    const reserve = stat.value;
    
    console.log(`[AriesSDK] 🔄 Transforming: ${coinType.split('::').pop()}`);

    // Get asset from config
    const asset = getAssetByCoinType(coinType);

    // Calculate utilization
    const totalBorrowed = reserve.total_borrowed || 0;
    const totalCashAvailable = reserve.total_cash_available || 0;
    const totalAsset = totalBorrowed + totalCashAvailable;
    const utilization = totalAsset === 0 ? 0 : totalBorrowed / totalAsset;
    
    // Calculate borrow APR using official SDK formula
    const interestConfig = reserve.interest_rate_config;
    const optimalUtilization = Number(interestConfig.optimal_utilization) / 100;
    let borrowAPR = 0;
    
    if (utilization <= optimalUtilization) {
      const factor = optimalUtilization === 0 ? 0 : utilization / optimalUtilization;
      const borrowRateDiff = interestConfig.optimal_borrow_rate - interestConfig.min_borrow_rate;
      borrowAPR = (factor * Number(borrowRateDiff) + Number(interestConfig.min_borrow_rate)) / 100;
    } else {
      const factor = (utilization - optimalUtilization) / (1 - optimalUtilization);
      const borrowRateDiff = interestConfig.max_borrow_rate - interestConfig.optimal_borrow_rate;
      borrowAPR = (factor * Number(borrowRateDiff) + Number(interestConfig.optimal_borrow_rate)) / 100;
    }
    
    // Calculate supply APR: borrowAPR * utilization * (1 - reserveFactor)
    const reserveFactor = reserve.reserve_config.reserve_ratio / 10000; // Convert from basis points
    const supplyAPR = borrowAPR * utilization * (1 - reserveFactor);
    
    console.log(`[AriesSDK] 📊 APR Calculation for ${coinType.split('::').pop()}:`);
    console.log(`[AriesSDK]   - Utilization: ${(utilization * 100).toFixed(2)}%`);
    console.log(`[AriesSDK]   - Borrow APR: ${(borrowAPR * 100).toFixed(2)}%`);
    console.log(`[AriesSDK]   - Supply APR: ${(supplyAPR * 100).toFixed(2)}%`);
    console.log(`[AriesSDK]   - Reserve Factor: ${(reserveFactor * 100).toFixed(2)}%`);
    
    // Get price from priceData
    const priceUSD = priceData?.[coinType]?.price || 0;
    const decimals = priceData?.[coinType]?.decimal || asset?.decimals || 8;
    
    console.log(`[AriesSDK]   - Price USD: $${priceUSD}`);
    console.log(`[AriesSDK]   - Decimals: ${decimals}`);
    
    // Calculate USD values
    const totalSuppliedUSD = (totalAsset / Math.pow(10, decimals)) * priceUSD;
    const totalBorrowedUSD = (totalBorrowed / Math.pow(10, decimals)) * priceUSD;
    const availableLiquidityUSD = (totalCashAvailable / Math.pow(10, decimals)) * priceUSD;
    
    // Extract symbol and name from coinType or priceData if asset not found in config
    let extractedSymbol = 'UNKNOWN';
    let extractedName = 'Unknown Asset';
    
    if (!asset) {
      console.log(`[AriesSDK] ⚠️ Asset not in config: ${coinType}`);
      
      // First try to get from priceData (API might have it)
      if (priceData?.[coinType]?.symbol) {
        extractedSymbol = priceData[coinType].symbol;
        extractedName = priceData[coinType].name || priceData[coinType].symbol;
        console.log(`[AriesSDK] 📊 Got from API: ${extractedSymbol} - ${extractedName}`);
      } else {
        // Fallback: Parse coinType for better name extraction
        const parts = coinType.split('::');
        // Try to get the module name (second to last part) which is usually more descriptive
        if (parts.length >= 2) {
          const moduleName = parts[parts.length - 2];
          const typeName = parts[parts.length - 1];
          
          // If type name is single letter (like T), use module name
          if (typeName.length === 1) {
            extractedSymbol = moduleName;
            extractedName = moduleName;
          } else {
            extractedSymbol = typeName;
            extractedName = typeName;
          }
          console.log(`[AriesSDK] 🔍 Extracted: ${extractedSymbol} from coinType`);
        }
      }
    } else {
      console.log(`[AriesSDK] ✅ Found in config: ${asset.symbol} - ${asset.name}`);
    }
    
    const finalSymbol = asset?.symbol || extractedSymbol;
    const finalName = asset?.name || extractedName;
    const finalIsPaired = asset?.isPaired !== false; // Default to true (paired/main pool)
    
    console.log(`[AriesSDK] ✅ Final asset: ${finalSymbol} (${finalName}) - ${finalIsPaired ? 'Main Pool' : 'Isolated Pool'}`);
    
    return {
      coinType,
      symbol: finalSymbol,
      name: finalName,
      decimals,
      logoUrl: asset?.logoUrl,
      isPaired: finalIsPaired,
      isStablecoin: asset?.isStablecoin || false,
      
      // Financial State from API
      totalLiquidity: String(totalAsset),
      totalBorrowed: String(totalBorrowed),
      totalLpSupply: String(reserve.total_lp_supply || 0),
      cashAvailable: String(totalCashAvailable),
      reserveAmount: String(reserve.reserve_amount || 0),
      exchangeRate: String(reserve.initial_exchange_rate || '1000000000000000000'),
      
      // Risk Parameters from API (convert from basis points)
      loanToValue: reserve.reserve_config.loan_to_value / 10000,
      ltv: reserve.reserve_config.loan_to_value / 10000,
      liquidationThreshold: reserve.reserve_config.liquidation_threshold / 10000,
      borrowFactor: reserve.reserve_config.borrow_factor / 10000,
      liquidationBonus: reserve.reserve_config.liquidation_bonus_bips / 10000,
      reserveFactor,
      
      // Fees (already in hundredth bips)
      borrowFeeHundredthBips: reserve.reserve_config.borrow_fee_hundredth_bips,
      flashLoanFeeHundredthBips: reserve.reserve_config.flash_loan_fee_hundredth_bips,
      withdrawFeeHundredthBips: reserve.reserve_config.withdraw_fee_hundredth_bips,
      
      // Limits
      depositLimit: String(reserve.reserve_config.deposit_limit),
      borrowLimit: String(reserve.reserve_config.borrow_limit),
      
      // Flags
      allowCollateral: reserve.reserve_config.allow_collateral,
      allowRedeem: reserve.reserve_config.allow_redeem,
      
      // Interest Rate Config (convert from basis points to decimal)
      interestRateConfig: {
        minBorrowRate: interestConfig.min_borrow_rate / 100,
        optimalBorrowRate: interestConfig.optimal_borrow_rate / 100,
        maxBorrowRate: interestConfig.max_borrow_rate / 100,
        optimalUtilization: optimalUtilization,
      },
      
      // CALCULATED APR DATA (matches official SDK)
      utilization,
      supplyAPR,
      borrowAPR,
      
      // USD Values
      priceUSD,
      totalSuppliedUSD,
      totalBorrowedUSD,
      totalSupplied: String(totalAsset / Math.pow(10, decimals)),
      availableLiquidityUSD,
      
      // E-Mode
      emodeCategory: undefined,
    };
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

    // Note: Prices come from API response, not fetched separately
    const coinTypes = assets.map(a => a.coinType);
    const prices: Record<string, number> = {}; // Will be populated from API response

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
   * Extract symbol from coin type
   * Example: "0x1::aptos_coin::AptosCoin" → "AptosCoin"
   */
  private extractSymbolFromCoinType(coinType: string): string {
    const parts = coinType.split('::');
    return parts[parts.length - 1] || parts[parts.length - 2] || 'UNKNOWN';
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
