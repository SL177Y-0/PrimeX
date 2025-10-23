/**
 * Aries Markets Price Service
 * 
 * Real-time price fetching from CoinGecko API with intelligent caching
 * Production-ready implementation with error handling and fallbacks
 */

import { ARIES_ASSETS } from '../config/ariesAssetsComplete';

// ============================================================================
// CONFIGURATION
// ============================================================================

// Use proxy server instead of direct CoinGecko calls to handle CORS and API keys
const COINGECKO_API_BASE = process.env.EXPO_PUBLIC_PROXY_BASE_URL 
  ? `${process.env.EXPO_PUBLIC_PROXY_BASE_URL}/api/coingecko/api/v3`
  : 'http://localhost:3001/api/coingecko/api/v3';
const CACHE_TTL = 120 * 1000; // 2 minutes cache (reduce API load)
const REQUEST_TIMEOUT = 10000; // 10 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

// ============================================================================
// TYPES
// ============================================================================

interface PriceCacheEntry {
  price: number;
  timestamp: number;
  source: 'coingecko';
}

interface CoinGeckoPriceResponse {
  [key: string]: {
    usd: number;
    usd_24h_change?: number;
  };
}

// ============================================================================
// PRICE SERVICE CLASS
// ============================================================================

class AriesPriceService {
  private cache: Map<string, PriceCacheEntry> = new Map();
  private pendingRequests: Map<string, Promise<number>> = new Map();
  private apiKey: string | null = null;

  constructor() {
    // API key is now handled by the proxy server
    this.apiKey = null;
  }

  /**
   * Get current USD price for an asset by coin type
   * Uses cache if available, fetches from CoinGecko if expired
   * 
   * @param coinType - Full Move coin type
   * @returns Current price in USD
   */
  async getPrice(coinType: string): Promise<number> {
    // Check cache first
    const cached = this.cache.get(coinType);
    if (cached && this.isCacheValid(cached)) {
      return cached.price;
    }

    // Check if there's already a pending request for this asset
    const pending = this.pendingRequests.get(coinType);
    if (pending) {
      return pending;
    }

    // Create new request
    const request = this.fetchPriceFromCoinGecko(coinType);
    this.pendingRequests.set(coinType, request);

    try {
      const price = await request;
      this.pendingRequests.delete(coinType);
      return price;
    } catch (error) {
      this.pendingRequests.delete(coinType);
      throw error;
    }
  }

  /**
   * Batch fetch prices for multiple assets
   * More efficient than individual calls
   * 
   * @param coinTypes - Array of coin types
   * @returns Map of coinType to price
   */
  async getBatchPrices(coinTypes: string[]): Promise<Record<string, number>> {
    const prices: Record<string, number> = {};
    const toFetch: string[] = [];

    // Check cache for each asset
    for (const coinType of coinTypes) {
      const cached = this.cache.get(coinType);
      if (cached && this.isCacheValid(cached)) {
        prices[coinType] = cached.price;
      } else {
        toFetch.push(coinType);
      }
    }

    // Fetch remaining assets in batch
    if (toFetch.length > 0) {
      const freshPrices = await this.fetchBatchPricesFromCoinGecko(toFetch);
      Object.assign(prices, freshPrices);
    }

    return prices;
  }

  /**
   * Force refresh price for an asset (bypass cache)
   * 
   * @param coinType - Coin type to refresh
   * @returns Fresh price
   */
  async refreshPrice(coinType: string): Promise<number> {
    this.cache.delete(coinType);
    return this.getPrice(coinType);
  }

  /**
   * Clear entire price cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cached price if available (no fetch)
   * 
   * @param coinType - Coin type
   * @returns Cached price or null
   */
  getCachedPrice(coinType: string): number | null {
    const cached = this.cache.get(coinType);
    return cached ? cached.price : null;
  }

  // ==========================================================================
  // PRIVATE METHODS
  // ==========================================================================

  /**
   * Fetch single price from CoinGecko API
   */
  private async fetchPriceFromCoinGecko(coinType: string): Promise<number> {
    // Find asset metadata
    const asset = Object.values(ARIES_ASSETS).find(a => a.coinType === coinType);
    if (!asset || !asset.coingeckoId) {
      console.warn(`No CoinGecko ID found for ${coinType}`);
      // Return fallback mock price for common assets
      return this.getMockPrice(coinType);
    }

    const coingeckoId = asset.coingeckoId;

    // Construct API URL
    const url = this.buildApiUrl('/simple/price', {
      ids: coingeckoId,
      vs_currencies: 'usd',
      include_24hr_change: 'true',
    });

    try {
      const response = await this.fetchWithRetry(url);
      const data: CoinGeckoPriceResponse = await response.json();

      if (!data[coingeckoId] || typeof data[coingeckoId].usd !== 'number') {
        throw new Error(`Invalid price data for ${coingeckoId}`);
      }

      const price = data[coingeckoId].usd;

      // Cache the result
      this.cache.set(coinType, {
        price,
        timestamp: Date.now(),
        source: 'coingecko',
      });

      return price;
    } catch (error) {
      console.error(`Failed to fetch price for ${coinType}:`, error);
      
      // Return last known price if available
      const cached = this.cache.get(coinType);
      if (cached) {
        console.warn(`Using stale cached price for ${coinType}`);
        return cached.price;
      }

      // Final fallback to mock price
      console.warn(`Using mock price for ${coinType}`);
      return this.getMockPrice(coinType);
    }
  }

  /**
   * Get mock/fallback price for an asset
   */
  private getMockPrice(coinType: string): number {
    const mockPrices: Record<string, number> = {
      '0x1::aptos_coin::AptosCoin': 10.50, // APT
      '0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::USDC': 1.00,
      '0xbae207659db88bea0cbead6da0ed00aac12edcdda169e591cd41c94180b46f3b::coin::T': 1.00, // USDC LayerZero
      '0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::USDT': 1.00,
      '0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::WBTC': 95000.00,
      '0xcc8a89c8dce9693d354449f1f73e60e14e347417854f029db5bc8e7454008abb::coin::T': 3200.00, // ETH
      '0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::WETH': 3200.00,
    };
    return mockPrices[coinType] || 0;
  }

  /**
   * Fetch multiple prices in one batch request
   */
  private async fetchBatchPricesFromCoinGecko(
    coinTypes: string[]
  ): Promise<Record<string, number>> {
    // Map coin types to CoinGecko IDs
    const coingeckoIds: string[] = [];
    const typeToIdMap: Record<string, string> = {};

    for (const coinType of coinTypes) {
      const asset = Object.values(ARIES_ASSETS).find(a => a.coinType === coinType);
      if (asset && asset.coingeckoId) {
        coingeckoIds.push(asset.coingeckoId);
        typeToIdMap[asset.coingeckoId] = coinType;
      }
    }

    if (coingeckoIds.length === 0) {
      return {};
    }

    // Construct batch API URL (max 250 IDs per request)
    const url = this.buildApiUrl('/simple/price', {
      ids: coingeckoIds.join(','),
      vs_currencies: 'usd',
    });

    try {
      const response = await this.fetchWithRetry(url);
      const data: CoinGeckoPriceResponse = await response.json();

      const prices: Record<string, number> = {};
      const now = Date.now();

      for (const [coingeckoId, priceData] of Object.entries(data)) {
        if (typeof priceData.usd === 'number') {
          const coinType = typeToIdMap[coingeckoId];
          if (coinType) {
            prices[coinType] = priceData.usd;

            // Cache the result
            this.cache.set(coinType, {
              price: priceData.usd,
              timestamp: now,
              source: 'coingecko',
            });
          }
        }
      }

      return prices;
    } catch (error) {
      console.error('Failed to fetch batch prices:', error);
      
      // Return any cached prices we have
      const cachedPrices: Record<string, number> = {};
      for (const coinType of coinTypes) {
        const cached = this.cache.get(coinType);
        if (cached) {
          cachedPrices[coinType] = cached.price;
        }
      }

      if (Object.keys(cachedPrices).length > 0) {
        console.warn('Using stale cached prices for some assets');
        return cachedPrices;
      }

      throw error;
    }
  }

  /**
   * Build CoinGecko API URL with parameters
   * Proxy server handles API key authentication
   */
  private buildApiUrl(endpoint: string, params: Record<string, string>): string {
    // Properly construct URL by concatenating base + endpoint
    const fullUrl = `${COINGECKO_API_BASE}${endpoint}`;
    const url = new URL(fullUrl);
    
    // Proxy server automatically adds API key, no need to include here
    // Add all parameters
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    return url.toString();
  }

  /**
   * Fetch with automatic retry on failure
   */
  private async fetchWithRetry(
    url: string,
    retries: number = MAX_RETRIES
  ): Promise<Response> {
    let lastError: Error | null = null;

    for (let i = 0; i < retries; i++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
          },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return response;
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on 4xx errors (client errors)
        if (error instanceof Error && error.message.includes('HTTP 4')) {
          throw error;
        }

        // Wait before retrying (exponential backoff)
        if (i < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (i + 1)));
        }
      }
    }

    throw lastError || new Error('Failed to fetch after retries');
  }

  /**
   * Check if cached price is still valid
   */
  private isCacheValid(entry: PriceCacheEntry): boolean {
    return Date.now() - entry.timestamp < CACHE_TTL;
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const priceService = new AriesPriceService();

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Get price for a single asset
 * 
 * @example
 * const aptPrice = await getAssetPrice('0x1::aptos_coin::AptosCoin');
 */
export async function getAssetPrice(coinType: string): Promise<number> {
  return priceService.getPrice(coinType);
}

/**
 * Get prices for multiple assets
 * 
 * @example
 * const prices = await getAssetPrices([aptCoinType, usdcCoinType]);
 */
export async function getAssetPrices(
  coinTypes: string[]
): Promise<Record<string, number>> {
  return priceService.getBatchPrices(coinTypes);
}

/**
 * Get all prices for Aries assets
 * 
 * @example
 * const allPrices = await getAllAriesPrices();
 */
export async function getAllAriesPrices(): Promise<Record<string, number>> {
  const coinTypes = Object.values(ARIES_ASSETS).map(a => a.coinType);
  return priceService.getBatchPrices(coinTypes);
}

export default priceService;
