/**
 * PnL (Profit & Loss) Calculation Engine
 * 
 * Features:
 * - Real-time PnL calculation for positions
 * - Historical performance tracking
 * - ROI calculations
 * - Position monitoring
 * - Automatic database updates
 */

import { databaseService } from './database.service';
import { pythOracleService } from './pythOracleService';

export interface Position {
  id: string;
  user_id: string;
  asset_symbol: string;
  coin_type: string;
  position_type: 'supply' | 'borrow';
  amount: string;
  amount_usd: string;
  entry_price: string;
  current_price: string;
  pnl: string;
  pnl_percent: string;
  current_apr: string;
  opened_at: string;
  updated_at: string;
}

export interface PnLMetrics {
  pnl: number;
  pnlPercent: number;
  currentValue: number;
  entryValue: number;
  unrealizedPnL: number;
  realizedPnL: number;
}

export interface PortfolioMetrics {
  totalSupplied: number;
  totalBorrowed: number;
  netPnL: number;
  netPnLPercent: number;
  totalValue: number;
  healthFactor: number | null;
}

export class PnLEngine {
  private updateInterval: ReturnType<typeof setInterval> | null = null;
  private readonly UPDATE_FREQUENCY = 30000; // 30 seconds

  /**
   * Calculate PnL for a single position
   */
  calculatePositionPnL(
    position: {
      amount: number;
      entryPrice: number;
      positionType: 'supply' | 'borrow';
    },
    currentPrice: number
  ): PnLMetrics {
    const entryValue = position.amount * position.entryPrice;
    const currentValue = position.amount * currentPrice;

    let pnl: number;
    
    if (position.positionType === 'supply') {
      // For supply positions, profit when price increases
      pnl = currentValue - entryValue;
    } else {
      // For borrow positions, profit when price decreases
      pnl = entryValue - currentValue;
    }

    const pnlPercent = entryValue > 0 ? (pnl / entryValue) * 100 : 0;

    return {
      pnl,
      pnlPercent,
      currentValue,
      entryValue,
      unrealizedPnL: pnl, // Unrealized until position is closed
      realizedPnL: 0, // Only when position is closed
    };
  }

  /**
   * Update all positions for a user with latest prices
   */
  async updateUserPositions(
    userId: string,
    latestPrices: Record<string, number>
  ): Promise<void> {
    try {
      const positions = (await databaseService.getUserPositions(userId)) as Position[];

      if (!positions || positions.length === 0) {
        return;
      }

      for (const position of positions) {
        const currentPrice = latestPrices[position.asset_symbol];
        
        if (!currentPrice) {
          console.warn(`[PnL] No price available for ${position.asset_symbol}`);
          continue;
        }

        const pnlMetrics = this.calculatePositionPnL(
          {
            amount: parseFloat(position.amount),
            entryPrice: parseFloat(position.entry_price),
            positionType: position.position_type,
          },
          currentPrice
        );

        // Update position in database
        await databaseService.updatePosition(position.id, {
          current_price: currentPrice.toString(),
          pnl: pnlMetrics.pnl.toString(),
          pnl_percent: pnlMetrics.pnlPercent.toString(),
          updated_at: new Date().toISOString(),
        });

        console.log(
          `[PnL] Updated ${position.asset_symbol}: PnL ${pnlMetrics.pnlPercent.toFixed(2)}%`
        );
      }
    } catch (error: any) {
      console.error('[PnL] Error updating user positions:', error.message);
    }
  }

  /**
   * Calculate portfolio metrics for a user
   */
  async calculatePortfolioMetrics(userId: string): Promise<PortfolioMetrics> {
    try {
      const positions = (await databaseService.getUserPositions(userId)) as Position[];

      if (!positions || positions.length === 0) {
        return {
          totalSupplied: 0,
          totalBorrowed: 0,
          netPnL: 0,
          netPnLPercent: 0,
          totalValue: 0,
          healthFactor: null,
        };
      }

      const supplied = positions
        .filter((p: Position) => p.position_type === 'supply')
        .reduce((sum: number, p: Position) => sum + parseFloat(p.amount_usd || '0'), 0);

      const borrowed = positions
        .filter((p: Position) => p.position_type === 'borrow')
        .reduce((sum: number, p: Position) => sum + parseFloat(p.amount_usd || '0'), 0);

      const totalPnL = positions.reduce(
        (sum: number, p: Position) => sum + parseFloat(p.pnl || '0'),
        0
      );

      const totalValue = supplied - borrowed;
      const netPnLPercent = totalValue > 0 ? (totalPnL / totalValue) * 100 : 0;

      // Simple health factor calculation
      const healthFactor = borrowed > 0 ? supplied / borrowed : null;

      return {
        totalSupplied: supplied,
        totalBorrowed: borrowed,
        netPnL: totalPnL,
        netPnLPercent,
        totalValue,
        healthFactor,
      };
    } catch (error: any) {
      console.error('[PnL] Error calculating portfolio metrics:', error.message);
      throw error;
    }
  }

  /**
   * Start automatic PnL updates for a user
   */
  async startRealtimeTracking(userId: string): Promise<void> {
    // Clear any existing interval
    this.stopRealtimeTracking();

    console.log(`[PnL] Starting real-time tracking for user ${userId}`);

    // Initial update
    await this.updatePositionsWithLatestPrices(userId);

    // Set up periodic updates
    this.updateInterval = setInterval(async () => {
      await this.updatePositionsWithLatestPrices(userId);
    }, this.UPDATE_FREQUENCY) as ReturnType<typeof setInterval>;
  }

  /**
   * Stop automatic PnL updates
   */
  stopRealtimeTracking(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
      console.log('[PnL] Stopped real-time tracking');
    }
  }

  /**
   * Update positions with latest prices from Pyth
   */
  private async updatePositionsWithLatestPrices(userId: string): Promise<void> {
    try {
      // Fetch latest prices
      const prices = await pythOracleService.getPrices(['APT', 'BTC', 'ETH', 'SOL', 'USDC']);

      // Convert to symbol -> price map
      const priceMap: Record<string, number> = {};
      prices.forEach(p => {
        priceMap[p.symbol] = p.priceUSD;
      });

      // Update user positions
      await this.updateUserPositions(userId, priceMap);
    } catch (error: any) {
      console.error('[PnL] Error updating positions with latest prices:', error.message);
    }
  }

  /**
   * Calculate ROI for a closed position
   */
  calculateROI(
    entryPrice: number,
    exitPrice: number,
    amount: number,
    positionType: 'supply' | 'borrow'
  ): number {
    const entryValue = amount * entryPrice;
    const exitValue = amount * exitPrice;

    let profit: number;
    
    if (positionType === 'supply') {
      profit = exitValue - entryValue;
    } else {
      profit = entryValue - exitValue;
    }

    return entryValue > 0 ? (profit / entryValue) * 100 : 0;
  }

  /**
   * Get historical PnL snapshots for charting
   */
  async getHistoricalPnL(
    userId: string,
    days: number = 30
  ): Promise<Array<{ timestamp: string; pnl: number }>> {
    try {
      // This would query from pnl_history table in production
      // For now, return mock data
      const snapshots: Array<{ timestamp: string; pnl: number }> = [];
      const now = Date.now();

      for (let i = days; i >= 0; i--) {
        const timestamp = new Date(now - i * 24 * 60 * 60 * 1000).toISOString();
        // Mock PnL growth over time
        const pnl = Math.random() * 1000 - 500;
        snapshots.push({ timestamp, pnl });
      }

      return snapshots;
    } catch (error: any) {
      console.error('[PnL] Error fetching historical PnL:', error.message);
      return [];
    }
  }
}

// Export singleton instance
export const pnlEngine = new PnLEngine();
