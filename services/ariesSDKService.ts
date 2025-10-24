/**
 * Aries Markets SDK Service - NEW IMPLEMENTATION
 * Matches EXACT pattern from official platform HAR analysis
 * Uses table handles with hex-encoded keys
 */

import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';
import { getAssetByCoinType } from '../config/ariesAssetsComplete';

const CONTRACT_ADDRESS = '0x9770fa9c725cbd97eb50b2be5f7416efdfd1f1554beb0750d4dae4c64e860da3';

// Use CORS proxy for React Native (NodeReal only allows localhost:8081 origin)
// Official web platform can use NodeReal directly, but mobile apps need proxy
const NODE_URL = 'http://localhost:3001/api/aptos-rpc';

interface TableHandles {
  statsHandle: string;
  oracleHandle: string;
  farmsHandle: string;
}

interface ReserveDetails {
  total_cash_available: string;
  total_lp_supply: string;
  total_borrowed: { val: string };
  total_borrowed_share: { val: string };
  reserve_amount: { val: string };
  interest_rate_config: {
    min_borrow_rate: string;
    optimal_borrow_rate: string;
    max_borrow_rate: string;
    optimal_utilization: string;
  };
  reserve_config: {
    loan_to_value: number;
    liquidation_threshold: number;
    allow_collateral: boolean;
    allow_redeem: boolean;
    borrow_factor: number;
    [key: string]: any;
  };
  interest_accrue_timestamp: string;
  initial_exchange_rate: { val: string };
}

interface OracleInfo {
  price: string;
  decimal: number;
  timestamp: string;
}

interface AriesReserveData {
  coinType: string;
  symbol: string;
  name: string;
  logoUrl?: string;
  isPaired: boolean;
  isDeprecated: boolean;
  stats: ReserveDetails | null;
  oracle: OracleInfo | null;
  // Computed fields
  supplyAPR: number;
  borrowAPR: number;
  totalSupplied: number;
  totalBorrowed: number;
  utilization: number;
  priceUSD: number;
  marketSizeUSD: number;
  totalBorrowedUSD: number;
  totalSuppliedUSD: number;
  ltv: number;
}

class AriesSDKServiceNew {
  private aptosClient: Aptos;
  private handles: TableHandles | null = null;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 30000; // 30 seconds

  constructor() {
    const config = new AptosConfig({
      network: Network.MAINNET,
      fullnode: NODE_URL,
    });
    this.aptosClient = new Aptos(config);
    console.log('[AriesSDKNew] Initialized with NodeReal RPC (Direct)');
    console.log('[AriesSDKNew] RPC URL:', NODE_URL);
  }

  /**
   * Convert string to hex encoding (React Native compatible)
   */
  private stringToHex(str: string): string {
    let hex = '';
    for (let i = 0; i < str.length; i++) {
      const charCode = str.charCodeAt(i);
      hex += charCode.toString(16).padStart(2, '0');
    }
    return hex;
  }

  /**
   * Parse coin type to get address, module and struct names
   * Official platform uses the EXACT coin type structure, not wrapped versions
   */
  private parseCoinType(coinType: string): { address: string; module: string; struct: string } | null {
    try {
      const parts = coinType.split('::');
      if (parts.length !== 3) {
        console.warn(`[AriesSDKNew] Invalid coin type format: ${coinType}`);
        return null;
      }

      // Use the EXACT coin type structure from the asset
      const address = parts[0];
      const module = parts[1];
      const struct = parts[2];

      return { address, module, struct };
    } catch (error) {
      console.error(`[AriesSDKNew] Error parsing coin type ${coinType}:`, error);
      return null;
    }
  }

  /**
   * Step 1: Initialize table handles from contract resources
   */
  async initializeHandles(): Promise<TableHandles> {
    if (this.handles) {
      return this.handles;
    }

    console.log('[AriesSDKNew] Fetching table handles...');

    try {
      // Fetch Reserves resource
      const reservesResource = await this.aptosClient.getAccountResource({
        accountAddress: CONTRACT_ADDRESS,
        resourceType: `${CONTRACT_ADDRESS}::reserve::Reserves`,
      });

      console.log('[AriesSDKNew] Reserves resource:', JSON.stringify(reservesResource, null, 2));

      // The response has a 'data' property containing the actual data
      const reservesData = (reservesResource as any).data || reservesResource;
      const statsHandle = reservesData.stats?.handle;
      const farmsHandle = reservesData.farms?.handle;

      if (!statsHandle || !farmsHandle) {
        throw new Error('Missing stats or farms handle in reserves resource');
      }

      // Fetch Oracle resource
      const oracleResource = await this.aptosClient.getAccountResource({
        accountAddress: CONTRACT_ADDRESS,
        resourceType: `${CONTRACT_ADDRESS}::oracle::OracleIndex`,
      });

      console.log('[AriesSDKNew] Oracle resource:', JSON.stringify(oracleResource, null, 2));

      const oracleData = (oracleResource as any).data || oracleResource;
      const oracleHandle = oracleData.prices?.handle; // ← FIX: It's 'prices', not 'oracles'

      if (!oracleHandle) {
        throw new Error('Missing prices handle in oracle resource');
      }

      this.handles = {
        statsHandle,
        oracleHandle,
        farmsHandle,
      };

      console.log('[AriesSDKNew] ✅ Handles initialized:', this.handles);
      return this.handles;
    } catch (error) {
      console.error('[AriesSDKNew] ❌ Failed to initialize handles:', error);
      throw error;
    }
  }

  /**
   * Step 2: Fetch reserve details from table
   */
  async fetchReserveDetails(coinType: string): Promise<ReserveDetails | null> {
    const cacheKey = `stats:${coinType}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    try {
      const handles = await this.initializeHandles();
      const parsed = this.parseCoinType(coinType);
      
      if (!parsed) {
        return null;
      }

      const key = {
        account_address: parsed.address,
        module_name: this.stringToHex(parsed.module),
        struct_name: this.stringToHex(parsed.struct),
      };

      console.log(`[AriesSDKNew] Fetching stats for ${coinType}...`);
      console.log(`[AriesSDKNew]   Address: ${parsed.address}`);
      console.log(`[AriesSDKNew]   Module: ${parsed.module} (hex: ${key.module_name})`);
      console.log(`[AriesSDKNew]   Struct: ${parsed.struct} (hex: ${key.struct_name})`);

      const result = await this.aptosClient.getTableItem({
        handle: handles.statsHandle,
        data: {
          key,
          key_type: '0x1::type_info::TypeInfo',
          value_type: `${CONTRACT_ADDRESS}::reserve_details::ReserveDetails`,
        },
      });

      this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
      return result as ReserveDetails;
    } catch (error) {
      console.error(`[AriesSDKNew] Failed to fetch stats for ${coinType}:`, error);
      return null;
    }
  }

  /**
   * Step 3: Fetch oracle price from table
   */
  async fetchOraclePrice(coinType: string): Promise<OracleInfo | null> {
    const cacheKey = `oracle:${coinType}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    try {
      const handles = await this.initializeHandles();
      const parsed = this.parseCoinType(coinType);
      
      if (!parsed) {
        return null;
      }

      const key = {
        account_address: parsed.address,
        module_name: this.stringToHex(parsed.module),
        struct_name: this.stringToHex(parsed.struct),
      };

      console.log(`[AriesSDKNew] Fetching oracle for ${coinType}...`);

      const result = await this.aptosClient.getTableItem({
        handle: handles.oracleHandle,
        data: {
          key,
          key_type: '0x1::type_info::TypeInfo',
          value_type: `${CONTRACT_ADDRESS}::oracle::OracleInfo`,
        },
      });

      this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
      return result as OracleInfo;
    } catch (error) {
      console.error(`[AriesSDKNew] Failed to fetch oracle for ${coinType}:`, error);
      return null;
    }
  }

  /**
   * Step 4: Fetch complete reserve data
   */
  async fetchReserveData(coinType: string, symbol: string, name: string, isPaired: boolean, isDeprecated: boolean = false, logoUrl?: string): Promise<AriesReserveData> {
    console.log(`[AriesSDKNew] 📊 Fetching complete data for ${symbol}...`);

    const [stats, oracle] = await Promise.all([
      this.fetchReserveDetails(coinType),
      this.fetchOraclePrice(coinType),
    ]);

    // Get asset config for logo URL
    const assetConfig = getAssetByCoinType(coinType);

    // Parse and compute values
    const priceUSD = oracle ? parseFloat(oracle.price) / Math.pow(10, oracle.decimal) : 0;
    
    // Total supply = cash available + total borrowed (from HAR analysis)
    const cashAvailable = stats ? parseFloat(stats.total_cash_available) / 1e8 : 0;
    const totalBorrowed = stats ? parseFloat(stats.total_borrowed.val) / 1e8 : 0;
    const totalSupplied = cashAvailable + totalBorrowed;
    
    // Calculate utilization rate
    const utilization = totalSupplied > 0 ? totalBorrowed / totalSupplied : 0;
    
    // Calculate APRs from interest rate model (kinked rate model like Aave)
    let borrowAPR = 0;
    let supplyAPR = 0;
    
    if (stats && utilization > 0) {
      const optimalUtil = parseFloat(stats.interest_rate_config.optimal_utilization) / 100;
      const minRate = parseFloat(stats.interest_rate_config.min_borrow_rate) / 100;
      const optimalRate = parseFloat(stats.interest_rate_config.optimal_borrow_rate) / 100;
      const maxRate = parseFloat(stats.interest_rate_config.max_borrow_rate) / 100;
      
      if (utilization <= optimalUtil) {
        // Below optimal: linear interpolation between min and optimal
        borrowAPR = minRate + (utilization / optimalUtil) * (optimalRate - minRate);
      } else {
        // Above optimal: linear interpolation between optimal and max
        const excessUtil = (utilization - optimalUtil) / (1 - optimalUtil);
        borrowAPR = optimalRate + excessUtil * (maxRate - optimalRate);
      }
      
      // Supply APR = Borrow APR * Utilization * (1 - Reserve Factor)
      const reserveFactor = stats.reserve_config.reserve_ratio ? stats.reserve_config.reserve_ratio / 100 : 0.1;
      supplyAPR = borrowAPR * utilization * (1 - reserveFactor);
    }
    
    const marketSizeUSD = totalSupplied * priceUSD;
    const totalBorrowedUSD = totalBorrowed * priceUSD;

    // Extract LTV from reserve config (it's a direct number, not basis points)
    const ltv = stats?.reserve_config?.loan_to_value ? stats.reserve_config.loan_to_value / 100 : 0;

    return {
      coinType,
      symbol,
      name,
      logoUrl: logoUrl || assetConfig?.logoUrl,
      isPaired,
      isDeprecated,
      stats,
      oracle,
      supplyAPR,
      borrowAPR,
      totalSupplied,
      totalBorrowed,
      utilization,
      priceUSD,
      marketSizeUSD,
      totalSuppliedUSD: marketSizeUSD,
      totalBorrowedUSD,
      ltv,
    };
  }

  /**
   * Fetch all reserves with proper filtering
   */
  async fetchAllReserves(includeDeprecated: boolean = false): Promise<AriesReserveData[]> {
    console.log('[AriesSDKNew] 🚀 Fetching all reserves...');

    // Define all assets matching official platform (EXACT coin types from HAR analysis)
    const assets = [
      // MAIN POOL (Paired Reserves) - Verified working coin types
      { coinType: '0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::USDT', symbol: 'USDT', name: 'Tether USD', isPaired: true, isDeprecated: false, logoUrl: 'https://cdn.jsdelivr.net/gh/PanoraExchange/Aptos-Tokens@main/logos/USDT.svg' },
      { coinType: '0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::USDC', symbol: 'USDC', name: 'USD Coin', isPaired: true, isDeprecated: false, logoUrl: 'https://cdn.jsdelivr.net/gh/PanoraExchange/Aptos-Tokens@main/logos/USDC.svg' },
      { coinType: '0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::WBTC', symbol: 'WBTC', name: 'Wrapped BTC', isPaired: true, isDeprecated: false, logoUrl: 'https://cdn.jsdelivr.net/gh/PanoraExchange/Aptos-Tokens@main/logos/WBTC.png' },
      { coinType: '0x49e5e7f5a6d290537bc8ff18dcec09572a5e8a10c91bb2ac9a935cc86d694e8c::coin::WBTC', symbol: 'xBTC', name: 'OKX Wrapped BTC', isPaired: true, isDeprecated: false, logoUrl: 'https://cdn.jsdelivr.net/gh/PanoraExchange/Aptos-Tokens@main/logos/WBTC.png' },
      { coinType: '0x4e1854f6d332c9525e258fb6e66f84b6af8aba687bbcb832a24768c4e175feec::abtc::ABTC', symbol: 'aBTC', name: 'Avalon BTC', isPaired: true, isDeprecated: false, logoUrl: 'https://cdn.jsdelivr.net/gh/PanoraExchange/Aptos-Tokens@main/logos/WBTC.png' },
      { coinType: '0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::sUSDe', symbol: 'sUSDe', name: 'Ethena Staked USDe', isPaired: true, isDeprecated: false, logoUrl: 'https://assets.panora.exchange/tokens/aptos/sUSDe.png' },
      { coinType: '0x1::aptos_coin::AptosCoin', symbol: 'APT', name: 'Aptos Coin', isPaired: true, isDeprecated: false, logoUrl: 'https://cdn.jsdelivr.net/gh/PanoraExchange/Aptos-Tokens@main/logos/APT.svg' },
      { coinType: '0x49e5e7f5a6d290537bc8ff18dcec09572a5e8a10c91bb2ac9a935cc86d694e8c::coin::WETH', symbol: 'WETH', name: 'Wrapped Ether', isPaired: true, isDeprecated: false, logoUrl: 'https://cdn.jsdelivr.net/gh/PanoraExchange/Aptos-Tokens@main/logos/WETH.svg' },
      { coinType: '0xcc8a89c8dce9693d354449f1f73e60e14e347417854f029db5bc8e7454008abb::coin::T', symbol: 'zWETH', name: 'LayerZero WETH', isPaired: true, isDeprecated: false, logoUrl: 'https://assets.panora.exchange/tokens/aptos/lzWETH.png' },
      { coinType: '0x111ae3e5bc816a5e63c2da97d0aa3886519e0cd5e4b046659fa35796bd11542a::stapt_token::StakedApt', symbol: 'stAPT', name: 'Staked Aptos Coin', isPaired: true, isDeprecated: false, logoUrl: 'https://assets.panora.exchange/tokens/aptos/stAPT.png' },
      { coinType: '0xdd89c0e695df0692205912fb69fc290418bed0dbe6e4573d744a6d5e6bab6c13::coin::T', symbol: 'zWBTC', name: 'LayerZero WBTC', isPaired: true, isDeprecated: false, logoUrl: 'https://assets.panora.exchange/tokens/aptos/lzWBTC.png' },
      { coinType: '0x159df6b7689437016108a019fd5bef736bac692b6d4a1f10c941f6fbb9a74ca6::oft::CakeOFT', symbol: 'CAKE', name: 'PancakeSwap Token', isPaired: true, isDeprecated: false, logoUrl: 'https://assets.panora.exchange/tokens/aptos/CAKE.png' },
      { coinType: '0x111ae3e5bc816a5e63c2da97d0aa3886519e0cd5e4b046659fa35796bd11542a::amapt_token::AmnisApt', symbol: 'amAPT', name: 'Amnis Aptos Coin', isPaired: true, isDeprecated: false, logoUrl: 'https://assets.panora.exchange/tokens/aptos/amAPT.png' },
      
      // MERKLE LP POOL (Isolated Reserves)
      { coinType: '0xc91d826e29a3183eb3b6f6aa3a722089fdffb8e9642b94c5fcd4c48d035c0080::type::USDC', symbol: 'USDC', name: 'LayerZero USDC', isPaired: false, isDeprecated: false, logoUrl: 'https://cdn.jsdelivr.net/gh/PanoraExchange/Aptos-Tokens@main/logos/USDC.svg' },
      { coinType: '0x9770fa9c725cbd97eb50b2be5f7416efdfd1f1554beb0750d4dae4c64e860da3::mklp::MKLP', symbol: 'MKLP', name: 'Merkle LP', isPaired: false, isDeprecated: false, logoUrl: 'https://assets.panora.exchange/tokens/aptos/MKLP.png' },
    ];

    // Fetch data for all assets in parallel
    const reserves = await Promise.all(
      assets.map(asset => this.fetchReserveData(
        asset.coinType,
        asset.symbol,
        asset.name,
        asset.isPaired,
        asset.isDeprecated,
        asset.logoUrl
      ))
    );

    // Filter out deprecated if not requested
    const filtered = includeDeprecated 
      ? reserves 
      : reserves.filter((r: AriesReserveData) => !r.isDeprecated);

    console.log(`[AriesSDKNew] ✅ Fetched ${filtered.length} reserves`);
    console.log(`[AriesSDKNew]   - Paired: ${filtered.filter((r: AriesReserveData) => r.isPaired).length}`);
    console.log(`[AriesSDKNew]   - Isolated: ${filtered.filter((r: AriesReserveData) => !r.isPaired).length}`);

    return filtered;
  }

  /**
   * Get reserves by pool type
   */
  async getReservesByPool(poolType: 'paired' | 'isolated', includeDeprecated: boolean = false): Promise<AriesReserveData[]> {
    const allReserves = await this.fetchAllReserves(includeDeprecated);
    return poolType === 'paired'
      ? allReserves.filter(r => r.isPaired)
      : allReserves.filter(r => !r.isPaired);
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    this.handles = null;
    console.log('[AriesSDKNew] 🗑️ Cache cleared');
  }
}

// Export as main service
export const ariesSDKService = new AriesSDKServiceNew();
export default ariesSDKService;
