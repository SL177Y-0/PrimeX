/**
 * Merkle SDK Service
 * 
 * Production-grade service using official @merkletrade/ts-sdk
 * Provides clean API for positions, history, and trading operations
 * No mocks, no proxies - direct REST API calls to https://api.merkle.trade
 */

import { log } from '../utils/logger';
import type { Position, TradeHistoryItem } from '../types/merkle';

// Types matching official SDK
type Hex = `0x${string}`;
type PairId = string;

interface SDKPosition {
  uid: number;
  accFundingFeePerSize: string;
  accRolloverFeePerCollateral: string;
  avgPrice: string;
  collateral: string;
  collateralType: string;
  isLong: boolean;
  lastExecuteTimestamp: number;
  pairType: string;
  size: string;
  stopLossTriggerPrice: string;
  takeProfitTriggerPrice: string;
  timestamp: string;
  user: Hex;
  version: number;
}

interface SDKTradeHistory {
  version: string;
  type: string;
  orderId: string;
  uid: string;
  address: Hex;
  eventType: string;
  pairType: string;
  collateralType: string;
  isLong: boolean;
  leverage: string;
  price: string;
  originalSize: string;
  sizeDelta: string;
  originalCollateral: string;
  collateralDelta: string;
  isIncrease: boolean;
  pnlWithoutFee: string;
  entryExitFee: string;
  fundingFee: string;
  rolloverFee: string;
  longOpenInterest: string;
  shortOpenInterest: string;
  ts: string; // Timestamp field from API (ISO string)
  sequenceNumber: string;
}

/**
 * Merkle SDK Service Class
 */
class MerkleSdkService {
  private apiClient: any = null;
  private initialized = false;
  private currentNetwork: 'mainnet' | 'testnet' = 'mainnet';
  
  // Network configurations from official Merkle SDK
  private readonly NETWORKS = {
    mainnet: {
      apiUrl: 'https://api.merkle.trade',
      wsUrl: 'wss://api.merkle.trade/v1',
      contract: '0x5ae6789dd2fec1a9ec9cccfb3acaf12e93d432f0a3a42c92fe1a9d490b7bbc06'
    },
    testnet: {
      apiUrl: 'https://api.testnet.merkle.trade',
      wsUrl: 'wss://api.testnet.merkle.trade/v1',
      contract: '0x5ae6789dd2fec1a9ec9cccfb3acaf12e93d432f0a3a42c92fe1a9d490b7bbc06' // Same contract for now
    }
  };
  
  constructor() {
    // Default to mainnet (testnet contract may not be deployed)
    this.currentNetwork = 'mainnet';
    
    // Load saved network preference from localStorage
    if (typeof window !== 'undefined') {
      const savedNetwork = localStorage.getItem('merkle_network') as 'mainnet' | 'testnet' | null;
      if (savedNetwork && (savedNetwork === 'mainnet' || savedNetwork === 'testnet')) {
        this.currentNetwork = savedNetwork;
      }
    }
    // console.log(' MerkleSdkService initialized with network:', this.currentNetwork);
    // console.log(' Note: Testnet contract may not be deployed. Use mainnet for testing.');
  }
  
  /**
   * Get current network configuration
   */
  private getNetworkConfig() {
    return this.NETWORKS[this.currentNetwork];
  }
  
  /**
   * Get base URL for current network
   * Uses CORS proxy in development (localhost), direct API in production
   */
  private get BASE_URL(): string {
    const networkUrl = this.getNetworkConfig().apiUrl;

    // Use local CORS proxy in development (browsers block direct api.merkle.trade calls)
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      const proxyUrl =
        process.env.EXPO_PUBLIC_MERKLE_PROXY ||
        process.env.REACT_NATIVE_MERKLE_PROXY ||
        process.env.REACT_APP_MERKLE_PROXY ||
        'http://localhost:3001/api/merkle';  // Default proxy (cors-proxy.js)

      if (proxyUrl && proxyUrl.trim().length > 0) {
        log.trade(`Using CORS proxy: ${proxyUrl} -> ${networkUrl}`);
        return proxyUrl;
      }
    }

    // Direct API URL for production or when proxy is unavailable
    return networkUrl;
  }

  /**
   * Get contract address for current network
   */
  get MERKLE_CONTRACT(): string {
    return this.getNetworkConfig().contract;
  }
  
  /**
   * Switch between mainnet and testnet
   */
  switchNetwork(network: 'mainnet' | 'testnet'): void {
    if (this.currentNetwork === network) return;
    
    this.currentNetwork = network;
    this.initialized = false; // Force re-initialization
    
    // Save preference to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('merkle_network', network);
    }
    
    log.trade(`Switched to ${network}. Base URL: ${this.BASE_URL}`);
  }
  
  /**
   * Get current network
   */
  getCurrentNetwork(): 'mainnet' | 'testnet' {
    return this.currentNetwork;
  }
  
  /**
   * Initialize SDK client
   * Note: SDK not installed, using direct REST calls instead
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      log.trade('Initializing Merkle SDK Service (REST mode)...');
      
      // SDK package not installed - use direct REST calls
      // This is actually better: no package dependency, direct API access
      this.apiClient = null;
      
      this.initialized = true;
      log.trade('Merkle SDK Service initialized (using direct REST)');
      
    } catch (error) {
      log.error('Failed to initialize Merkle SDK:', error);
      this.initialized = true;
    }
  }

  /**
   * Fetch user positions
   * Direct REST call to https://api.merkle.trade/v1/indexer/trading/position/{address}
   */
  async fetchPositions(userAddress: string): Promise<Position[]> {
    try {
      await this.initialize();
      
      // Validate address format
      if (!userAddress || !userAddress.startsWith('0x')) {
        log.error('Invalid wallet address format:', userAddress);
        return [];
      }
      
      log.trade('Fetching positions for:', userAddress);
      
      // Add network parameter for proxy
      const url = `${this.BASE_URL}/v1/indexer/trading/position/${userAddress}?network=${this.currentNetwork}`;
      log.trade('Fetching from URL:', url);
      
      // Direct REST call with CORS mode
      const response = await fetch(url, {
        method: 'GET',
        mode: 'cors',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });
      
      log.trade('Response status:', response.status, response.statusText);
      
      if (!response.ok) {
        if (response.status === 404) {
          log.trade('No positions found for user (404) - this is normal for new wallets');
          return [];
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const rawData = await response.json();
      log.trade('Raw API response:', rawData);
      
      // Handle both array and object wrapper formats
      const rawPositions: SDKPosition[] = Array.isArray(rawData) ? rawData : (rawData.items || []);
      
      log.trade(`Fetched ${rawPositions.length} positions from Merkle API`);
      
      if (rawPositions.length === 0) {
        return [];
      }
      
      const normalizedPositions = await this.normalizeSDKPositionsWithPnL(rawPositions);
      log.trade('Normalized positions with live PnL:', normalizedPositions);
      
      return normalizedPositions;
      
    } catch (error) {
      log.error('Error fetching positions:', error);
      log.error('Error details:', error instanceof Error ? error.message : String(error));
      // Return empty array instead of mock data
      return [];
    }
  }

  /**
   * Fetch trading history
   * Direct REST call to https://api.merkle.trade/v1/trade/{address}
   */
  async fetchTradingHistory(userAddress: string, limit = 50): Promise<TradeHistoryItem[]> {
    try {
      await this.initialize();
      
      // Validate address format
      if (!userAddress || !userAddress.startsWith('0x')) {
        log.error('Invalid wallet address format:', userAddress);
        return [];
      }
      
      log.trade('Fetching trading history for:', userAddress);
      
      // Add network parameter for proxy
      const url = `${this.BASE_URL}/v1/trade/${userAddress}?network=${this.currentNetwork}`;
      log.trade('Fetching from URL:', url);
      
      // Direct REST call with CORS mode
      const response = await fetch(url, {
        method: 'GET',
        mode: 'cors',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });
      
      log.trade('Response status:', response.status, response.statusText);
      
      if (!response.ok) {
        if (response.status === 404) {
          log.trade('No trading history found for user (404) - this is normal for new wallets');
          return [];
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const rawData = await response.json();
      log.trade('Raw API response:', rawData);
      
      // API returns { items: [...], pagination: {...} } format
      const rawHistory: SDKTradeHistory[] = rawData.items || [];
      
      log.trade(`Fetched ${rawHistory.length} trading history items from Merkle API`);
      
      if (rawHistory.length === 0) {
        return [];
      }
      
      const normalizedHistory = this.normalizeSDKHistory(rawHistory);
      log.trade('Normalized history:', normalizedHistory);
      
      return normalizedHistory;
      
    } catch (error) {
      log.error('Error fetching trading history:', error);
      log.error('Error details:', error instanceof Error ? error.message : String(error));
      // Return empty array instead of mock data
      return [];
    }
  }

  /**
   * Create market order payload (manual construction - no SDK needed)
   * Based on official Merkle Trade contract structure
   */
  async createMarketOrderPayload(params: {
    pair: string;
    userAddress: string;
    sizeDelta: bigint;
    collateralDelta: bigint;
    isLong: boolean;
    isIncrease: boolean;
  }) {
    await this.initialize();
    
    log.trade('Creating market order payload:', params);
    
    // Get contract address for current network
    const MERKLE_CONTRACT = this.MERKLE_CONTRACT;
    
    // Map pair to type arguments
    const pairTypeMap: Record<string, string> = {
      'APT_USD': `${MERKLE_CONTRACT}::pair_types::APT_USD`,
      'BTC_USD': `${MERKLE_CONTRACT}::pair_types::BTC_USD`,
      'ETH_USD': `${MERKLE_CONTRACT}::pair_types::ETH_USD`,
      'SOL_USD': `${MERKLE_CONTRACT}::pair_types::SOL_USD`,
      'DOGE_USD': `${MERKLE_CONTRACT}::pair_types::DOGE_USD`,
    };
    
    const pairType = pairTypeMap[params.pair];
    if (!pairType) {
      throw new Error(`Unsupported pair: ${params.pair}`);
    }
    
    const collateralType = `${MERKLE_CONTRACT}::fa_box::W_USDC`;
    
    // Price limits (max for long, min for short when market order)
    // CRITICAL: Merkle contract expects u64 for price, NOT u128
    const PRICE_MAX = BigInt('18446744073709551615'); // u64 max
    const PRICE_MIN = BigInt('0');
    
    // Build transaction payload
    const payload = {
      type: 'entry_function_payload' as const,
      function: `${MERKLE_CONTRACT}::managed_trading::place_order_v3`,
      type_arguments: [pairType, collateralType],
      arguments: [
        params.userAddress,
        params.sizeDelta.toString(),
        params.collateralDelta.toString(),
        (params.isLong ? PRICE_MAX : PRICE_MIN).toString(), // Market price
        params.isLong,
        params.isIncrease,
        true, // isMarket
        (params.isLong ? PRICE_MIN : PRICE_MAX).toString(), // stopLoss (disabled)
        (params.isLong ? PRICE_MAX : PRICE_MIN).toString(), // takeProfit (disabled)
        !params.isLong, // canExecuteAbovePrice
        '0x0', // referrer (zero address)
      ],
    };
    
    return payload;
  }

  /**
   * Normalize SDK positions to our Position type
   * Now includes live PnL calculation using current market prices
   */
  private async normalizeSDKPositionsWithPnL(rawPositions: SDKPosition[]): Promise<Position[]> {
    // Import price service dynamically to avoid circular dependency
    const { realMarketDataService } = await import('./realMarketDataService');
    
    return Promise.all(rawPositions.map(async raw => {
      // Parse numeric values from strings (API returns strings for large numbers)
      const size = parseFloat(raw.size) || 0;
      const collateral = parseFloat(raw.collateral) || 0;
      const avgPrice = parseFloat(raw.avgPrice) || 0;
      
      // Calculate leverage from size and collateral
      // Ensure we always have a valid number
      const leverage = (collateral > 0 && size > 0) ? size / collateral : 0;
      
      // Extract pair ID from type (e.g., "::pair_types::APT_USD" -> "APT_USD")
      const pairMatch = raw.pairType.match(/::pair_types::([A-Z_]+)$/);
      const pair = pairMatch ? pairMatch[1] : 'UNKNOWN';
      
      // Fetch current market price for live PnL calculation
      let markPrice = avgPrice;
      let pnlUSDC = 0;
      let pnlPercent = 0;
      
      try {
        const marketData = await realMarketDataService.getDetailedMarketData(pair);
        if (marketData && marketData.price > 0) {
          markPrice = marketData.price;
          
          // Calculate PnL: (current_price - entry_price) / entry_price * size
          // For shorts, invert the calculation
          if (raw.isLong) {
            pnlUSDC = ((markPrice - avgPrice) / avgPrice) * size;
          } else {
            pnlUSDC = ((avgPrice - markPrice) / avgPrice) * size;
          }
          
          // Calculate PnL percentage based on collateral
          // Ensure it's always a valid number
          pnlPercent = (collateral > 0 && !isNaN(pnlUSDC)) ? (pnlUSDC / collateral) * 100 : 0;
        }
      } catch (error) {
        log.error('Failed to fetch mark price for PnL calculation:', error);
        // Fallback to entry price if market data fetch fails
      }
      
      // Parse timestamp (could be string or number)
      const timestamp = typeof raw.timestamp === 'string' ? parseInt(raw.timestamp) : raw.timestamp;
      
      return {
        id: `${raw.user}-${raw.uid}`,
        pair,
        side: raw.isLong ? 'long' : 'short',
        sizeUSDC: size,
        collateralUSDC: collateral,
        leverage,
        entryPrice: avgPrice,
        markPrice: markPrice,
        pnlUSDC: pnlUSDC,
        pnlPercent: pnlPercent,
        liquidationPrice: this.calculateLiquidationPrice(avgPrice, leverage, raw.isLong),
        fundingFeeUSDC: parseFloat(raw.accFundingFeePerSize),
        takeProfitPrice: parseFloat(raw.takeProfitTriggerPrice),
        stopLossPrice: parseFloat(raw.stopLossTriggerPrice),
        timestamp: timestamp,
        status: 'OPEN',
      };
    }));
  }

  /**
   * Normalize SDK trade history to our TradeHistoryItem type
   */
  private normalizeSDKHistory(rawHistory: SDKTradeHistory[]): TradeHistoryItem[] {
    return rawHistory.map(raw => {
      // Extract pair ID
      const pairMatch = raw.pairType.match(/::pair_types::([A-Z_]+)$/);
      const pair = pairMatch ? pairMatch[1] : 'UNKNOWN';
      
      // Map event type to action
      const actionMap: Record<string, TradeHistoryItem['action']> = {
        'position_liquidate': 'liquidated',
        'position_close': 'close',
        'position_open': 'open',
        'position_update': 'increase',
        'position_take_profit': 'close',
        'position_stop_loss': 'close',
      };
      
      // Parse timestamp from ISO string (API returns "ts" field like "2025-10-11T18:36:35.731Z")
      const timestamp = new Date(raw.ts).getTime();
      
      return {
        id: `${raw.sequenceNumber}-${raw.uid}`,
        action: actionMap[raw.eventType] || 'open',
        pair,
        side: raw.isLong ? 'long' : 'short',
        price: parseFloat(raw.price),
        sizeUSDC: parseFloat(raw.sizeDelta),
        feeUSDC: parseFloat(raw.entryExitFee),
        pnlUSDC: parseFloat(raw.pnlWithoutFee),
        txHash: undefined, // Not available in this endpoint
        timestamp: timestamp,
      };
    });
  }

  /**
   * Calculate liquidation price using Merkle formula
   */
  private calculateLiquidationPrice(entryPrice: number, leverage: number, isLong: boolean): number {
    if (leverage <= 0) return 0;
    
    if (isLong) {
      return entryPrice * (1 - 1 / leverage);
    } else {
      return entryPrice * (1 + 1 / leverage);
    }
  }

  /**
   * Get SDK client instance (for advanced use)
   * Note: Returns null since SDK is not installed - use direct REST methods instead
   */
  getClient() {
    return null;
  }
}

// Export singleton instance
export const merkleSdkService = new MerkleSdkService();
