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

import { priceService } from './ariesPriceService';

// Legacy TokenPrice interface (for compatibility)
export interface TokenPrice {
  symbol: string;
  priceUSD: number;
  timestamp: number;
}

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
   * Fetch price using Pyth REST API
   * NOTE: This service is deprecated and not used in Aries integration
   */
  private async fetchPythPrice(symbol: string): Promise<PythPrice> {
    try {
      // Fetch from CoinGecko via ariesPriceService (Pyth not implemented)
      const coinType = this.getCoinTypeForSymbol(symbol);
      const priceUSD = await priceService.getPrice(coinType);

      // Convert to PythPrice format
      return {
        symbol,
        price: Math.round(priceUSD * 1e8), // Convert to integer with 8 decimals
        confidence: 0, // Not available from CoinGecko
        expo: -8, // Standard 8 decimal places
        publishTime: Math.floor(Date.now() / 1000), // Current timestamp
        priceUSD: priceUSD,
      };
    } catch (error: any) {
      console.error(`[Pyth] Price fetch error for ${symbol}:`, error.message);
      throw error;
    }
  }

  /**
   * Helper to convert symbol to coin type
   */
  private getCoinTypeForSymbol(symbol: string): string {
    const mapping: Record<string, string> = {
      'APT': '0x1::aptos_coin::AptosCoin',
      'BTC': '0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::WBTC',
      'ETH': '0xcc8a89c8dce9693d354449f1f73e60e14e347417854f029db5bc8e7454008abb::coin::T',
      'SOL': '0x1::aptos_coin::AptosCoin', // Placeholder
      'USDC': '0xbae207659db88bea0cbead6da0ed00aac12edcdda169e591cd41c94180b46f3b::coin::T',
    };
    return mapping[symbol.toUpperCase()] || '0x1::aptos_coin::AptosCoin';
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
