import { merkleService } from './merkleService';

export interface MarketData {
  pair: string;
  price: number;
  change24h: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  fundingRate: number;
  nextFundingTime: number;
  longOpenInterest: number;
  shortOpenInterest: number;
  marketSkew: number;
  lastUpdated: number;
}

export interface FundingInfo {
  rate: number;
  nextFundingTime: number;
  interval: number;
  isPositive: boolean;
}

export class RealTimePriceService {
  private marketData: Map<string, MarketData> = new Map();
  private subscribers: Map<string, Set<(data: MarketData) => void>> = new Map();
  private fundingSubscribers: Map<string, Set<(data: FundingInfo) => void>> = new Map();
  private updateInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initialize();
  }

  private async initialize() {
    try {
      // Initialize market data for supported pairs
      const supportedPairs = ['APT_USD', 'BTC_USD', 'ETH_USD', 'SOL_USD'];
      
      for (const pair of supportedPairs) {
        await this.initializePairData(pair);
        this.subscribeToPriceFeed(pair);
      }

      // Start periodic updates for funding rates and market stats
      this.startPeriodicUpdates();
      
      console.log('Real-time price service initialized');
    } catch (error) {
      console.error('Failed to initialize price service:', error);
    }
  }

  private async initializePairData(pair: string) {
    try {
      const [pairInfo, pairState] = await Promise.all([
        merkleService.getPairInfo(pair),
        merkleService.getPairState(pair)
      ]);

      const marketData: MarketData = {
        pair,
        price: pairState.index_price || 0,
        change24h: 0, // Will be calculated from price history
        volume24h: pairState.volume_24h || 0,
        high24h: pairState.high_24h || 0,
        low24h: pairState.low_24h || 0,
        fundingRate: pairState.funding_rate || 0,
        nextFundingTime: pairState.next_funding_time || 0,
        longOpenInterest: pairState.long_open_interest || 0,
        shortOpenInterest: pairState.short_open_interest || 0,
        marketSkew: this.calculateMarketSkew(
          pairState.long_open_interest || 0,
          pairState.short_open_interest || 0
        ),
        lastUpdated: Date.now(),
      };

      this.marketData.set(pair, marketData);
    } catch (error) {
      console.error(`Failed to initialize data for ${pair}:`, error);
    }
  }

  private subscribeToPriceFeed(pair: string) {
    try {
      merkleService.subscribePriceFeed(pair, (priceData) => {
        this.handlePriceUpdate(pair, priceData);
      });
    } catch (error) {
      console.error(`Failed to subscribe to price feed for ${pair}:`, error);
    }
  }

  private handlePriceUpdate(pair: string, priceData: any) {
    const currentData = this.marketData.get(pair);
    if (!currentData) return;

    const previousPrice = currentData.price;
    const newPrice = priceData.price || priceData.index_price || 0;
    
    // Calculate 24h change
    const change24h = previousPrice > 0 
      ? ((newPrice - previousPrice) / previousPrice) * 100 
      : 0;

    const updatedData: MarketData = {
      ...currentData,
      price: newPrice,
      change24h,
      volume24h: priceData.volume_24h || currentData.volume24h,
      high24h: Math.max(currentData.high24h, newPrice),
      low24h: currentData.low24h > 0 ? Math.min(currentData.low24h, newPrice) : newPrice,
      longOpenInterest: priceData.long_open_interest || currentData.longOpenInterest,
      shortOpenInterest: priceData.short_open_interest || currentData.shortOpenInterest,
      marketSkew: this.calculateMarketSkew(
        priceData.long_open_interest || currentData.longOpenInterest,
        priceData.short_open_interest || currentData.shortOpenInterest
      ),
      lastUpdated: Date.now(),
    };

    this.marketData.set(pair, updatedData);
    this.notifySubscribers(pair, updatedData);
  }

  private calculateMarketSkew(longOI: number, shortOI: number): number {
    const totalOI = longOI + shortOI;
    if (totalOI === 0) return 0;
    return ((longOI - shortOI) / totalOI) * 100;
  }

  private startPeriodicUpdates() {
    // Update funding rates and market stats every 30 seconds
    this.updateInterval = setInterval(async () => {
      await this.updateFundingRates();
      await this.updateMarketStats();
    }, 30000);
  }

  private async updateFundingRates() {
    for (const [pair] of this.marketData) {
      try {
        const fundingInfo = await merkleService.getFundingRate(pair);
        if (fundingInfo) {
          const currentData = this.marketData.get(pair);
          if (currentData) {
            const updatedData = {
              ...currentData,
              fundingRate: fundingInfo.currentRate,
              nextFundingTime: fundingInfo.nextFundingTime,
              lastUpdated: Date.now(),
            };
            this.marketData.set(pair, updatedData);
            this.notifySubscribers(pair, updatedData);

            // Notify funding subscribers
            const fundingData: FundingInfo = {
              rate: fundingInfo.currentRate,
              nextFundingTime: fundingInfo.nextFundingTime,
              interval: fundingInfo.fundingInterval,
              isPositive: fundingInfo.currentRate > 0,
            };
            this.notifyFundingSubscribers(pair, fundingData);
          }
        }
      } catch (error) {
        console.error(`Failed to update funding rate for ${pair}:`, error);
      }
    }
  }

  private async updateMarketStats() {
    try {
      const summary = await merkleService.getSummary();
      // Update market statistics from summary data
      // Implementation depends on Merkle SDK's summary structure
    } catch (error) {
      console.error('Failed to update market stats:', error);
    }
  }

  private notifySubscribers(pair: string, data: MarketData) {
    const subscribers = this.subscribers.get(pair);
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

  private notifyFundingSubscribers(pair: string, data: FundingInfo) {
    const subscribers = this.fundingSubscribers.get(pair);
    if (subscribers) {
      subscribers.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in funding subscriber callback:', error);
        }
      });
    }
  }

  // Public API Methods
  getMarketData(pair: string): MarketData | null {
    return this.marketData.get(pair) || null;
  }

  getAllMarketData(): MarketData[] {
    return Array.from(this.marketData.values());
  }

  subscribeToMarket(pair: string, callback: (data: MarketData) => void): () => void {
    if (!this.subscribers.has(pair)) {
      this.subscribers.set(pair, new Set());
    }
    
    this.subscribers.get(pair)!.add(callback);

    // Send current data immediately if available
    const currentData = this.marketData.get(pair);
    if (currentData) {
      callback(currentData);
    }

    // Return unsubscribe function
    return () => {
      const subscribers = this.subscribers.get(pair);
      if (subscribers) {
        subscribers.delete(callback);
        if (subscribers.size === 0) {
          this.subscribers.delete(pair);
        }
      }
    };
  }

  subscribeToFunding(pair: string, callback: (data: FundingInfo) => void): () => void {
    if (!this.fundingSubscribers.has(pair)) {
      this.fundingSubscribers.set(pair, new Set());
    }
    
    this.fundingSubscribers.get(pair)!.add(callback);

    // Send current funding data immediately if available
    const currentData = this.marketData.get(pair);
    if (currentData) {
      const fundingData: FundingInfo = {
        rate: currentData.fundingRate,
        nextFundingTime: currentData.nextFundingTime,
        interval: 3600, // 1 hour
        isPositive: currentData.fundingRate > 0,
      };
      callback(fundingData);
    }

    // Return unsubscribe function
    return () => {
      const subscribers = this.fundingSubscribers.get(pair);
      if (subscribers) {
        subscribers.delete(callback);
        if (subscribers.size === 0) {
          this.fundingSubscribers.delete(pair);
        }
      }
    };
  }

  // Utility methods
  formatPrice(price: number, decimals: number = 2): string {
    return price.toFixed(decimals);
  }

  formatChange(change: number): string {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(2)}%`;
  }

  formatFundingRate(rate: number): string {
    return `${(rate * 100).toFixed(4)}%`;
  }

  formatVolume(volume: number): string {
    if (volume >= 1e9) {
      return `$${(volume / 1e9).toFixed(2)}B`;
    } else if (volume >= 1e6) {
      return `$${(volume / 1e6).toFixed(2)}M`;
    } else if (volume >= 1e3) {
      return `$${(volume / 1e3).toFixed(2)}K`;
    }
    return `$${volume.toFixed(2)}`;
  }

  // Cleanup method
  cleanup() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    this.subscribers.clear();
    this.fundingSubscribers.clear();
    this.marketData.clear();
  }
}

// Singleton instance
export const realTimePriceService = new RealTimePriceService();
