import { TRADING_CONSTANTS } from '../config/constants';
import { log } from './logger';

// Market configuration
export interface MarketInfo {
  id: number;
  symbol: string;
  name: string;
  baseAsset: string;
  quoteAsset: string;
  priceFeedId?: string; // For Pyth or Switchboard integration
  decimals: number;
}

export interface PriceData {
  symbol: string;
  price: number;
  change24h: number;
  changePercent24h: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  timestamp: number;
}

export interface CandleData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// CoinGecko API response types
interface CoinGeckoPriceData {
  usd: number;
  usd_24h_change?: number;
  usd_24h_vol?: number;
}

interface CoinGeckoResponse {
  [coinId: string]: CoinGeckoPriceData;
}

interface CoinGeckoHistoricalData {
  prices: [number, number][];
  total_volumes: [number, number][];
}

// Supported markets on Merkle Trade
// Using underscore format to match MARKETS keys in constants.ts
export const SUPPORTED_MARKETS: MarketInfo[] = [
  {
    id: 0,
    symbol: 'BTC_USD',
    name: 'Bitcoin',
    baseAsset: 'BTC',
    quoteAsset: 'USD',
    decimals: 8,
  },
  {
    id: 1,
    symbol: 'ETH_USD',
    name: 'Ethereum',
    baseAsset: 'ETH',
    quoteAsset: 'USD',
    decimals: 18,
  },
  {
    id: 2,
    symbol: 'APT_USD',
    name: 'Aptos',
    baseAsset: 'APT',
    quoteAsset: 'USD',
    decimals: 8,
  },
  {
    id: 3,
    symbol: 'SOL_USD',
    name: 'Solana',
    baseAsset: 'SOL',
    quoteAsset: 'USD',
    decimals: 9,
  },
  {
    id: 4,
    symbol: 'DOGE_USD',
    name: 'Dogecoin',
    baseAsset: 'DOGE',
    quoteAsset: 'USD',
    decimals: 8,
  },
];

// Price cache to reduce API calls
const priceCache = new Map<string, { data: PriceData; timestamp: number }>();
const CACHE_DURATION = 30000; // 30 seconds

// Fallback prices for when APIs are unavailable
// Using underscore format to match MARKETS keys
const FALLBACK_PRICES: Record<string, number> = {
  'BTC_USD': 43250.50,
  'ETH_USD': 2650.75,
  'APT_USD': 12.45,
  'SOL_USD': 98.20,
  'DOGE_USD': 0.085,
};

class PriceService {
  private wsConnections: Map<string, { close: () => void }> = new Map();
  private priceSubscribers: Map<string, Set<(price: PriceData) => void>> = new Map();

  // Fetch current prices from CoinGecko API (free tier)
  async fetchPrices(symbols: string[] = []): Promise<PriceData[]> {
    const targetSymbols = symbols.length > 0 ? symbols : SUPPORTED_MARKETS.map(m => m.symbol);
    
    try {
      // Check cache first
      const cachedPrices: PriceData[] = [];
      const uncachedSymbols: string[] = [];
      
      for (const symbol of targetSymbols) {
        const cached = priceCache.get(symbol);
        if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
          cachedPrices.push(cached.data);
        } else {
          uncachedSymbols.push(symbol);
        }
      }

      if (uncachedSymbols.length === 0) {
        return cachedPrices;
      }

      // Map symbols to CoinGecko IDs
      const coinGeckoIds = this.mapSymbolsToCoinGeckoIds(uncachedSymbols);
      
      if (coinGeckoIds.length === 0) {
        return this.getFallbackPrices(targetSymbols);
      }

      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${coinGeckoIds.join(',')}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true`
      );

      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status}`);
      }

      const data: CoinGeckoResponse = await response.json();
      const freshPrices = this.processCoinGeckoData(data, uncachedSymbols);

      // Cache the results
      freshPrices.forEach(price => {
        priceCache.set(price.symbol, {
          data: price,
          timestamp: Date.now(),
        });
      });

      return [...cachedPrices, ...freshPrices];
    } catch (error) {
      log.error('Error fetching prices:', error);
      return this.getFallbackPrices(targetSymbols);
    }
  }

  // Get single price for a symbol
  async getPrice(symbol: string): Promise<PriceData | null> {
    const prices = await this.fetchPrices([symbol]);
    return prices.length > 0 ? prices[0] : null;
  }

  // Subscribe to real-time price updates
  subscribeToPriceUpdates(symbol: string, callback: (price: PriceData) => void): () => void {
    if (!this.priceSubscribers.has(symbol)) {
      this.priceSubscribers.set(symbol, new Set());
    }
    
    this.priceSubscribers.get(symbol)!.add(callback);
    
    // Start WebSocket connection if not already connected
    this.startPriceStream(symbol);
    
    // Return unsubscribe function
    return () => {
      const subscribers = this.priceSubscribers.get(symbol);
      if (subscribers) {
        subscribers.delete(callback);
        if (subscribers.size === 0) {
          this.stopPriceStream(symbol);
        }
      }
    };
  }

  // Fetch historical candle data
  async getCandleData(symbol: string, interval: string = '1h', limit: number = 100): Promise<CandleData[]> {
    try {
      const coinGeckoId = this.mapSymbolToCoinGeckoId(symbol);
      if (!coinGeckoId) {
        return this.generateMockCandles(FALLBACK_PRICES[symbol] || 100, limit);
      }

      // CoinGecko historical data (limited on free tier)
      const days = this.getDaysFromInterval(interval, limit);
      const response = await fetch(
        `https://api.coingecko.com/api/v3/coins/${coinGeckoId}/market_chart?vs_currency=usd&days=${days}&interval=${interval}`
      );

      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status}`);
      }

      const data: CoinGeckoHistoricalData = await response.json();
      return this.processCandleData(data);
    } catch (error) {
      log.error('Error fetching candle data:', error);
      const fallbackPrice = FALLBACK_PRICES[symbol] || 100;
      return this.generateMockCandles(fallbackPrice, limit);
    }
  }

  // Private methods
  private mapSymbolsToCoinGeckoIds(symbols: string[]): string[] {
    const mapping: Record<string, string> = {
      'BTC_USD': 'bitcoin',
      'ETH_USD': 'ethereum',
      'APT_USD': 'aptos',
      'SOL_USD': 'solana',
      'DOGE_USD': 'dogecoin',
    };

    return symbols
      .map(symbol => mapping[symbol])
      .filter(id => id !== undefined);
  }

  private mapSymbolToCoinGeckoId(symbol: string): string | null {
    const mapping: Record<string, string> = {
      'BTC_USD': 'bitcoin',
      'ETH_USD': 'ethereum',
      'APT_USD': 'aptos',
      'SOL_USD': 'solana',
      'DOGE_USD': 'dogecoin',
    };

    return mapping[symbol] || null;
  }

  private processCoinGeckoData(data: CoinGeckoResponse, symbols: string[]): PriceData[] {
    const idToSymbol: Record<string, string> = {
      'bitcoin': 'BTC_USD',
      'ethereum': 'ETH_USD',
      'aptos': 'APT_USD',
      'solana': 'SOL_USD',
      'dogecoin': 'DOGE_USD',
    };

    return Object.entries(data).map(([coinId, priceData]: [string, CoinGeckoPriceData]) => {
      const symbol = idToSymbol[coinId];
      return {
        symbol,
        price: priceData.usd || 0,
        change24h: priceData.usd_24h_change || 0,
        changePercent24h: priceData.usd_24h_change || 0,
        volume24h: priceData.usd_24h_vol || 0,
        high24h: priceData.usd * 1.05, // Approximate
        low24h: priceData.usd * 0.95, // Approximate
        timestamp: Date.now(),
      };
    }).filter(price => price.symbol);
  }

  private processCandleData(data: CoinGeckoHistoricalData): CandleData[] {
    const prices = data.prices || [];
    const volumes = data.total_volumes || [];

    return prices.map((pricePoint: [number, number], index: number) => {
      const [timestamp, price] = pricePoint;
      const volume = volumes[index] ? volumes[index][1] : 0;
      
      // Generate OHLC from single price point (simplified)
      const volatility = 0.02;
      const change = (Math.random() - 0.5) * volatility * price;
      
      return {
        timestamp,
        open: price - change / 2,
        high: price + Math.abs(change),
        low: price - Math.abs(change),
        close: price,
        volume,
      };
    });
  }

  private getFallbackPrices(symbols: string[]): PriceData[] {
    return symbols.map(symbol => ({
      symbol,
      price: FALLBACK_PRICES[symbol] || 100,
      change24h: (Math.random() - 0.5) * 10, // Random change
      changePercent24h: (Math.random() - 0.5) * 5,
      volume24h: Math.random() * 1000000,
      high24h: (FALLBACK_PRICES[symbol] || 100) * 1.05,
      low24h: (FALLBACK_PRICES[symbol] || 100) * 0.95,
      timestamp: Date.now(),
    }));
  }

  private generateMockCandles(currentPrice: number, count: number): CandleData[] {
    const candles: CandleData[] = [];
    let price = currentPrice * 0.95;
    
    for (let i = 0; i < count; i++) {
      const open = price;
      const volatility = 0.02;
      const change = (Math.random() - 0.5) * volatility * price;
      const close = Math.max(0, open + change);
      const high = Math.max(open, close) * (1 + Math.random() * 0.01);
      const low = Math.min(open, close) * (1 - Math.random() * 0.01);
      
      candles.push({
        timestamp: Date.now() - (count - i) * 3600000,
        open,
        high,
        low,
        close,
        volume: Math.random() * 100000,
      });
      
      price = close;
    }
    
    return candles;
  }

  private getDaysFromInterval(interval: string, limit: number): number {
    const intervalToDays: Record<string, number> = {
      '1m': limit / (24 * 60),
      '5m': limit / (24 * 12),
      '15m': limit / (24 * 4),
      '1h': limit / 24,
      '4h': limit / 6,
      '1d': limit,
    };

    return Math.max(1, Math.ceil(intervalToDays[interval] || limit / 24));
  }

  private startPriceStream(symbol: string): void {
    if (this.wsConnections.has(symbol)) return;

    // For now, use polling instead of WebSocket since CoinGecko free tier doesn't support WebSocket
    const interval = setInterval(async () => {
      try {
        const price = await this.getPrice(symbol);
        if (price) {
          const subscribers = this.priceSubscribers.get(symbol);
          if (subscribers) {
            subscribers.forEach(callback => callback(price));
          }
        }
      } catch (error) {
        log.error(`Error in price stream for ${symbol}:`, error);
      }
    }, 5000); // Update every 5 seconds

    // Store interval ID as a mock WebSocket
    this.wsConnections.set(symbol, { close: () => clearInterval(interval) });
  }

  private stopPriceStream(symbol: string): void {
    const connection = this.wsConnections.get(symbol);
    if (connection) {
      connection.close();
      this.wsConnections.delete(symbol);
    }
  }
}

// Export singleton instance
export const priceService = new PriceService();

// Utility functions
export const formatPrice = (price: number, decimals: number = 2): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(price);
};

export const formatPriceChange = (change: number, isPercent: boolean = false): string => {
  const prefix = change >= 0 ? '+' : '';
  const suffix = isPercent ? '%' : '';
  return `${prefix}${change.toFixed(2)}${suffix}`;
};

export const getPriceChangeColor = (change: number): string => {
  return change >= 0 ? '#10b981' : '#ef4444';
};
