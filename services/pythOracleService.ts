/**
 * Pyth Oracle Service
 * 
 * Provides real-time price feeds from Pyth Network for:
 * - APT/USD
 * - BTC/USD
 * - ETH/USD
 * - SOL/USD
 * - USDC/USD
 * 
 * Target latency: < 200ms
 * 
 * NOTE: Uses Pyth Hermes REST API instead of on-chain view functions
 * as get_price_no_older_than is not exposed as a view function on Aptos
 */

import { priceOracleService, TokenPrice } from './priceOracleService';

export interface PythPrice {
  symbol: string;
  price: number;
  confidence: number;
  expo: number;
  publishTime: number;
  priceUSD: number;
}

export interface PriceUpdate {
  symbol: string;
  price: number;
  timestamp: number;
  source: 'pyth' | 'fallback';
}

export class PythOracleService {
  private cache: Map<string, { price: PythPrice; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 10000; // 10 seconds

  /**
   * Get latest price for a symbol
   * Uses priceOracleService which queries Pyth Hermes REST API
   */
  async getPrice(symbol: string): Promise<PythPrice> {
    // Check cache first
    const cached = this.cache.get(symbol);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.price;
    }

    try {
      const priceData = await this.fetchPythPrice(symbol);
      
      // Update cache
      this.cache.set(symbol, {
        price: priceData,
        timestamp: Date.now(),
      });

      return priceData;
    } catch (error: any) {
      console.error(`[Pyth] Error fetching ${symbol} price:`, error.message);
      
      // Return cached data if available
      if (cached) {
        console.warn(`[Pyth] Using stale cache for ${symbol}`);
        return cached.price;
      }

      throw error;
    }
  }

  /**
   * Get multiple prices in batch
   */
  async getPrices(symbols: string[]): Promise<PythPrice[]> {
    const results = await Promise.allSettled(
      symbols.map(symbol => this.getPrice(symbol))
    );

    return results
      .map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value;
        }
        
        console.error(`[Pyth] Failed to fetch ${symbols[index]}`);
        return null;
      })
      .filter((price): price is PythPrice => price !== null);
  }

  /**
   * Fetch price using priceOracleService REST API
   */
  private async fetchPythPrice(symbol: string): Promise<PythPrice> {
    try {
      // Use the existing priceOracleService which uses Hermes REST API
      const tokenPrice: TokenPrice = await priceOracleService.getPrice(symbol);

      // Convert TokenPrice to PythPrice format
      return {
        symbol,
        price: Math.round(tokenPrice.priceUSD * 1e8), // Convert to integer with 8 decimals
        confidence: tokenPrice.confidence || 0,
        expo: -8, // Standard 8 decimal places
        publishTime: Math.floor(tokenPrice.timestamp / 1000), // Convert to seconds
        priceUSD: tokenPrice.priceUSD,
      };
    } catch (error: any) {
      console.error(`[Pyth] REST API error for ${symbol}:`, error.message);
      throw error;
    }
  }

  /**
   * Get price with USD conversion
   */
  async getPriceUSD(symbol: string): Promise<number> {
    const price = await this.getPrice(symbol);
    return price.priceUSD;
  }

  /**
   * Get all supported symbols
   */
  getSupportedSymbols(): string[] {
    return ['APT', 'BTC', 'ETH', 'SOL', 'USDC', 'USDT', 'WBTC'];
  }

  /**
   * Clear price cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Clear cache for specific symbol
   */
  clearCacheForSymbol(symbol: string): void {
    this.cache.delete(symbol);
  }
}

// Export singleton instance
export const pythOracleService = new PythOracleService();
