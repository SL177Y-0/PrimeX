import { API_CONFIG } from '../config/constants';

export interface RealMarketData {
  symbol: string;
  price: number;
  change24h: number;
  changePercent24h: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  marketCap?: number;
  lastUpdated: number;
}

export interface CandlestickData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface FundingRateData {
  symbol: string;
  fundingRate: number;
  nextFundingTime: number;
  markPrice: number;
  indexPrice: number;
}

class RealMarketDataService {
  private cache: Map<string, { data: RealMarketData; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 30000; // 30 seconds
  private wsConnections: Map<string, WebSocket> = new Map();
  private subscribers: Map<string, Set<(data: RealMarketData) => void>> = new Map();

  // Symbol mapping for different APIs
  // Using underscore format to match MARKETS keys in constants.ts
  private readonly SYMBOL_MAPPING = {
    'APT_USD': { coingecko: 'aptos', binance: 'APTUSDT', symbol: 'APT', display: 'APT/USD' },
    'BTC_USD': { coingecko: 'bitcoin', binance: 'BTCUSDT', symbol: 'BTC', display: 'BTC/USD' },
    'ETH_USD': { coingecko: 'ethereum', binance: 'ETHUSDT', symbol: 'ETH', display: 'ETH/USD' },
    'SOL_USD': { coingecko: 'solana', binance: 'SOLUSDT', symbol: 'SOL', display: 'SOL/USD' },
    'DOGE_USD': { coingecko: 'dogecoin', binance: 'DOGEUSDT', symbol: 'DOGE', display: 'DOGE/USD' },
  };

  // Get real market data from CoinGecko API
  async getMarketData(symbol: string): Promise<RealMarketData | null> {
    try {
      // Check cache first
      const cached = this.cache.get(symbol);
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        return cached.data;
      }

      const mapping = this.SYMBOL_MAPPING[symbol as keyof typeof this.SYMBOL_MAPPING];
      if (!mapping) {
        console.warn(`No mapping found for symbol: ${symbol}`);
        return null;
      }

      // Fetch from CoinGecko API (free tier)
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${mapping.coingecko}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true&include_last_updated_at=true`
      );

      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status}`);
      }

      const data = await response.json();
      const coinData = data[mapping.coingecko];

      if (!coinData) {
        throw new Error(`No data found for ${mapping.coingecko}`);
      }

      const marketData: RealMarketData = {
        symbol,
        price: coinData.usd || 0,
        change24h: coinData.usd_24h_change || 0,
        changePercent24h: coinData.usd_24h_change || 0,
        volume24h: coinData.usd_24h_vol || 0,
        high24h: 0, // CoinGecko simple API doesn't provide high/low
        low24h: 0,
        marketCap: coinData.usd_market_cap,
        lastUpdated: Date.now(),
      };

      // Cache the result
      this.cache.set(symbol, { data: marketData, timestamp: Date.now() });

      return marketData;
    } catch (error) {
      console.error(`Error fetching market data for ${symbol}:`, error);
      return null;
    }
  }

  // Get detailed market data including high/low from CoinGecko
  async getDetailedMarketData(symbol: string): Promise<RealMarketData | null> {
    try {
      const mapping = this.SYMBOL_MAPPING[symbol as keyof typeof this.SYMBOL_MAPPING];
      if (!mapping) return null;

      const response = await fetch(
        `https://api.coingecko.com/api/v3/coins/${mapping.coingecko}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`
      );

      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status}`);
      }

      const data = await response.json();
      const marketData = data.market_data;

      if (!marketData) {
        throw new Error(`No market data found for ${mapping.coingecko}`);
      }

      const result: RealMarketData = {
        symbol,
        price: marketData.current_price?.usd || 0,
        change24h: marketData.price_change_24h || 0,
        changePercent24h: marketData.price_change_percentage_24h || 0,
        volume24h: marketData.total_volume?.usd || 0,
        high24h: marketData.high_24h?.usd || 0,
        low24h: marketData.low_24h?.usd || 0,
        marketCap: marketData.market_cap?.usd,
        lastUpdated: Date.now(),
      };

      // Cache the result
      this.cache.set(symbol, { data: result, timestamp: Date.now() });

      return result;
    } catch (error) {
      console.error(`Error fetching detailed market data for ${symbol}:`, error);
      return null;
    }
  }

  // Generate candlestick data from price history (since OHLC requires API key)
  async getCandlestickData(symbol: string, days: number = 1): Promise<CandlestickData[]> {
    try {
      const priceHistory = await this.getPriceHistory(symbol, days);
      if (priceHistory.length === 0) return [];

      // Generate candlestick data from price points
      const candlesticks: CandlestickData[] = [];
      const pointsPerCandle = Math.max(1, Math.floor(priceHistory.length / 48)); // Target ~48 candles
      
      for (let i = 0; i < priceHistory.length; i += pointsPerCandle) {
        const segment = priceHistory.slice(i, i + pointsPerCandle);
        if (segment.length === 0) continue;

        const open = segment[0];
        const close = segment[segment.length - 1];
        const high = Math.max(...segment);
        const low = Math.min(...segment);
        const timestamp = Date.now() - (priceHistory.length - i) * (days * 24 * 60 * 60 * 1000) / priceHistory.length;

        candlesticks.push({
          timestamp,
          open,
          high,
          low,
          close,
          volume: Math.random() * 1000000, // Simulated volume
        });
      }

      return candlesticks;
    } catch (error) {
      console.error(`Error generating candlestick data for ${symbol}:`, error);
      return [];
    }
  }

  // Get price history for line charts
  async getPriceHistory(symbol: string, days: number = 1): Promise<number[]> {
    try {
      const mapping = this.SYMBOL_MAPPING[symbol as keyof typeof this.SYMBOL_MAPPING];
      if (!mapping) return [];

      const response = await fetch(
        `https://api.coingecko.com/api/v3/coins/${mapping.coingecko}/market_chart?vs_currency=usd&days=${days}`
      );

      if (!response.ok) {
        throw new Error(`CoinGecko market chart API error: ${response.status}`);
      }

      const data = await response.json();
      
      return data.prices?.map((price: [number, number]) => price[1]) || [];
    } catch (error) {
      console.error(`Error fetching price history for ${symbol}:`, error);
      return [];
    }
  }

  // Subscribe to real-time price updates (using polling since CoinGecko doesn't have WebSocket)
  subscribeToPrice(symbol: string, callback: (data: RealMarketData) => void): () => void {
    if (!this.subscribers.has(symbol)) {
      this.subscribers.set(symbol, new Set());
    }
    
    this.subscribers.get(symbol)!.add(callback);

    // Start polling for this symbol if not already started
    this.startPolling(symbol);

    // Return unsubscribe function
    return () => {
      const symbolSubscribers = this.subscribers.get(symbol);
      if (symbolSubscribers) {
        symbolSubscribers.delete(callback);
        if (symbolSubscribers.size === 0) {
          this.subscribers.delete(symbol);
          this.stopPolling(symbol);
        }
      }
    };
  }

  private pollingIntervals: Map<string, any> = new Map();

  private startPolling(symbol: string) {
    if (this.pollingIntervals.has(symbol)) return;

    const poll = async () => {
      const data = await this.getMarketData(symbol);
      if (data) {
        const subscribers = this.subscribers.get(symbol);
        if (subscribers) {
          subscribers.forEach(callback => {
            try {
              callback(data);
            } catch (error) {
              console.error('Error in price subscriber callback:', error);
            }
          });
        }
      }
    };

    // Initial fetch
    poll();

    // Set up polling every 30 seconds
    const interval = setInterval(poll, 30000);
    this.pollingIntervals.set(symbol, interval);
  }

  private stopPolling(symbol: string) {
    const interval = this.pollingIntervals.get(symbol);
    if (interval) {
      clearInterval(interval);
      this.pollingIntervals.delete(symbol);
    }
  }

  // Get mock funding rate data (since real funding rates require futures exchange APIs)
  async getFundingRate(symbol: string): Promise<FundingRateData | null> {
    try {
      const marketData = await this.getMarketData(symbol);
      if (!marketData) return null;

      // For now, return simulated funding rate data
      // In production, this would connect to futures exchanges like Binance, FTX, etc.
      return {
        symbol,
        fundingRate: (Math.random() - 0.5) * 0.001, // Random funding rate between -0.05% and 0.05%
        nextFundingTime: Date.now() + (3600000 - (Date.now() % 3600000)), // Next hour
        markPrice: marketData.price,
        indexPrice: marketData.price * (1 + (Math.random() - 0.5) * 0.001), // Slight variation
      };
    } catch (error) {
      console.error(`Error fetching funding rate for ${symbol}:`, error);
      return null;
    }
  }

  // Cleanup method
  cleanup() {
    // Clear all polling intervals
    this.pollingIntervals.forEach(interval => clearInterval(interval));
    this.pollingIntervals.clear();
    
    // Clear subscribers
    this.subscribers.clear();
    
    // Clear cache
    this.cache.clear();
    
    // Close WebSocket connections
    this.wsConnections.forEach(ws => ws.close());
    this.wsConnections.clear();
  }
}

// Singleton instance
export const realMarketDataService = new RealMarketDataService();
