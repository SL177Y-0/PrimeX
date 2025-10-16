/**
 * Price Oracle Service for Aries Lending
 * 
 * Integrates multiple free price sources:
 * 1. Pyth Network Hermes API (primary - most accurate)
 * 2. CoinGecko API (fallback - free tier)
 * 3. Aptos on-chain oracle (if available)
 */

import { log } from '../utils/logger';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================================================
// Types
// ============================================================================

export interface TokenPrice {
  symbol: string;
  priceUSD: number;
  confidence?: number;
  timestamp: number;
  source: 'pyth' | 'coingecko' | 'fallback';
}

export interface PythPriceFeed {
  id: string;
  price: {
    price: string;
    conf: string;
    expo: number;
    publish_time: number;
  };
  ema_price: {
    price: string;
    conf: string;
    expo: number;
    publish_time: number;
  };
}

// ============================================================================
// Configuration
// ============================================================================

// Pyth Price Feed IDs (from https://pyth.network/developers/price-feed-ids)
const PYTH_PRICE_IDS: Record<string, string> = {
  'APT': '0x03ae4db29ed4ae33d323568895aa00337e658e348b37509f5372ae51f0af00d5', // APT/USD
  'BTC': '0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43', // BTC/USD
  'ETH': '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace', // ETH/USD
  'SOL': '0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d', // SOL/USD
  'USDC': '0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a', // USDC/USD
  'USDT': '0x2b89b9dc8fdf9f34709a5b106b472f0f39bb6ca9ce04b0fd7f2e971688e2e53b', // USDT/USD
  'WBTC': '0xc9d8b075a5c69303365ae23633d4e085199bf5c520a3b90fed1322a0342ffc33', // WBTC/USD
};

// CoinGecko ID mapping
const COINGECKO_IDS: Record<string, string> = {
  'APT': 'aptos',
  'BTC': 'bitcoin',
  'ETH': 'ethereum',
  'SOL': 'solana',
  'USDC': 'usd-coin',
  'USDT': 'tether',
  'WBTC': 'wrapped-bitcoin',
};

// Pyth Hermes endpoint (free, no API key needed)
const PYTH_HERMES_URL = 'https://hermes.pyth.network';

// CoinGecko API (free tier, no key for basic endpoints)
const COINGECKO_API_URL = 'https://api.coingecko.com/api/v3';

// Cache configuration
const PRICE_CACHE_DURATION = 30000; // 30 seconds
const priceCache = new Map<string, { price: TokenPrice; timestamp: number }>();

// ============================================================================
// Price Oracle Service
// ============================================================================

class PriceOracleService {
  // Request deduplication: prevents multiple identical API calls
  private pendingRequests = new Map<string, Promise<TokenPrice>>();
  
  /**
   * Get price for a single token (tries Pyth first, then CoinGecko)
   */
  async getPrice(symbol: string): Promise<TokenPrice> {
    // 1. Check in-memory cache first (fastest)
    const cached = priceCache.get(symbol);
    if (cached && Date.now() - cached.timestamp < PRICE_CACHE_DURATION) {
      return cached.price;
    }

    // 2. Check AsyncStorage cache (offline support)
    try {
      const stored = await AsyncStorage.getItem(`price_${symbol}`);
      if (stored) {
        const parsed = JSON.parse(stored) as { price: TokenPrice; timestamp: number };
        if (Date.now() - parsed.timestamp < PRICE_CACHE_DURATION) {
          // Populate in-memory cache
          priceCache.set(symbol, parsed);
          return parsed.price;
        }
      }
    } catch (e) {
      // Ignore AsyncStorage errors
    }

    // 3. Check if request is already in flight (deduplication)
    const pendingRequest = this.pendingRequests.get(symbol);
    if (pendingRequest) {
      return pendingRequest;
    }

    // 4. Create new request and track it
    const requestPromise = this.fetchPriceInternal(symbol);
    this.pendingRequests.set(symbol, requestPromise);

    try {
      const price = await requestPromise;
      
      // 5. Store in both memory and persistent cache
      const cacheEntry = { price, timestamp: Date.now() };
      priceCache.set(symbol, cacheEntry);
      
      try {
        await AsyncStorage.setItem(`price_${symbol}`, JSON.stringify(cacheEntry));
      } catch (e) {
        // Ignore AsyncStorage errors
      }
      
      return price;
    } finally {
      // Always cleanup pending request
      this.pendingRequests.delete(symbol);
    }
  }

  /**
   * Internal price fetch logic (used by getPrice after deduplication)
   */
  private async fetchPriceInternal(symbol: string): Promise<TokenPrice> {
    // Try Pyth first (most accurate for DeFi)
    try {
      const pythPrice = await this.fetchPythPrice(symbol);
      if (pythPrice) {
        priceCache.set(symbol, { price: pythPrice, timestamp: Date.now() });
        return pythPrice;
      }
    } catch (error) {
      log.warn(`Pyth price fetch failed for ${symbol}:`, error);
    }

    // Fallback to CoinGecko
    try {
      const geckoPrice = await this.fetchCoinGeckoPrice(symbol);
      if (geckoPrice) {
        priceCache.set(symbol, { price: geckoPrice, timestamp: Date.now() });
        return geckoPrice;
      }
    } catch (error) {
      log.warn(`CoinGecko price fetch failed for ${symbol}:`, error);
    }

    // Last resort: fallback prices
    return this.getFallbackPrice(symbol);
  }

  /**
   * Get prices for multiple tokens in parallel
   */
  async getPrices(symbols: string[]): Promise<Record<string, TokenPrice>> {
    const pricePromises = symbols.map(async symbol => ({
      symbol,
      price: await this.getPrice(symbol),
    }));

    const results = await Promise.all(pricePromises);
    
    return results.reduce((acc, { symbol, price }) => {
      acc[symbol] = price;
      return acc;
    }, {} as Record<string, TokenPrice>);
  }

  /**
   * Fetch price from Pyth Hermes API (free, no auth needed)
   */
  private async fetchPythPrice(symbol: string): Promise<TokenPrice | null> {
    const priceId = PYTH_PRICE_IDS[symbol];
    if (!priceId) return null;

    try {
      const response = await fetch(
        `${PYTH_HERMES_URL}/v2/updates/price/latest?ids[]=${priceId}`,
        {
          headers: {
            'Accept': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Pyth API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.parsed || data.parsed.length === 0) {
        return null;
      }

      const priceFeed = data.parsed[0];
      const price = parseFloat(priceFeed.price.price);
      const expo = priceFeed.price.expo;
      const conf = parseFloat(priceFeed.price.conf);
      
      // Convert to USD price (price * 10^expo)
      const priceUSD = price * Math.pow(10, expo);
      const confidence = conf * Math.pow(10, expo);

      return {
        symbol,
        priceUSD,
        confidence,
        timestamp: priceFeed.price.publish_time * 1000,
        source: 'pyth',
      };
    } catch (error) {
      log.error(`Error fetching Pyth price for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Fetch price from CoinGecko API (free tier)
   */
  private async fetchCoinGeckoPrice(symbol: string): Promise<TokenPrice | null> {
    const coinId = COINGECKO_IDS[symbol];
    if (!coinId) return null;

    try {
      const response = await fetch(
        `${COINGECKO_API_URL}/simple/price?ids=${coinId}&vs_currencies=usd`,
        {
          headers: {
            'Accept': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data[coinId]?.usd) {
        return null;
      }

      return {
        symbol,
        priceUSD: data[coinId].usd,
        timestamp: Date.now(),
        source: 'coingecko',
      };
    } catch (error) {
      log.error(`Error fetching CoinGecko price for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Get fallback price (when all APIs fail)
   */
  private getFallbackPrice(symbol: string): TokenPrice {
    const fallbackPrices: Record<string, number> = {
      'APT': 10.50,
      'BTC': 43000,
      'ETH': 2650,
      'SOL': 100,
      'USDC': 1.00,
      'USDT': 1.00,
      'WBTC': 43000,
    };

    return {
      symbol,
      priceUSD: fallbackPrices[symbol] || 1.00,
      timestamp: Date.now(),
      source: 'fallback',
    };
  }

  /**
   * Batch fetch prices from Pyth (more efficient for multiple assets)
   */
  async fetchBatchPythPrices(symbols: string[]): Promise<Record<string, TokenPrice>> {
    const priceIds = symbols
      .map(symbol => PYTH_PRICE_IDS[symbol])
      .filter(Boolean);

    if (priceIds.length === 0) {
      return {};
    }

    try {
      const idsParam = priceIds.map(id => `ids[]=${id}`).join('&');
      const response = await fetch(
        `${PYTH_HERMES_URL}/v2/updates/price/latest?${idsParam}`,
        {
          headers: {
            'Accept': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Pyth API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.parsed || data.parsed.length === 0) {
        return {};
      }

      const prices: Record<string, TokenPrice> = {};
      
      data.parsed.forEach((priceFeed: any) => {
        // Find symbol for this price ID
        const symbol = Object.entries(PYTH_PRICE_IDS).find(
          ([_, id]) => id === priceFeed.id
        )?.[0];

        if (symbol) {
          const price = parseFloat(priceFeed.price.price);
          const expo = priceFeed.price.expo;
          const conf = parseFloat(priceFeed.price.conf);
          
          const priceUSD = price * Math.pow(10, expo);
          const confidence = conf * Math.pow(10, expo);

          prices[symbol] = {
            symbol,
            priceUSD,
            confidence,
            timestamp: priceFeed.price.publish_time * 1000,
            source: 'pyth',
          };

          // Cache the result
          priceCache.set(symbol, {
            price: prices[symbol],
            timestamp: Date.now(),
          });
        }
      });

      return prices;
    } catch (error) {
      log.error('Error fetching batch Pyth prices:', error);
      return {};
    }
  }

  /**
   * Clear price cache (useful for testing or forcing refresh)
   */
  clearCache(): void {
    priceCache.clear();
  }
}

// ============================================================================
// Export singleton instance
// ============================================================================

export const priceOracleService = new PriceOracleService();

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format price with appropriate decimals
 */
export function formatPriceUSD(price: number): string {
  if (price >= 1000) {
    return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  } else if (price >= 1) {
    return `$${price.toFixed(2)}`;
  } else if (price >= 0.01) {
    return `$${price.toFixed(4)}`;
  } else {
    return `$${price.toFixed(6)}`;
  }
}

/**
 * Calculate USD value from token amount
 */
export function calculateUSDValue(
  amount: string,
  decimals: number,
  priceUSD: number
): number {
  const amountInUnits = parseFloat(amount) / Math.pow(10, decimals);
  return amountInUnits * priceUSD;
}
