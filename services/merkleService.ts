/**
 * Merkle Service Helper Functions
 * Simple utilities for Merkle Trade calculations
 */

import { MarketName } from '../config/constants';

export const merkleService = {
  getMinLeverage: (marketPair: MarketName): number => {
    return 3;
  },

  getMaxLeverage: (marketPair: MarketName): number => {
    return 150;
  },

  getMinPositionSize: (marketPair: MarketName): number => {
    // Reduced minimum to allow 2 USDC trades at 150x
    // (2 - 0.11) × 150 = 283.50 USDC
    return 100; // Allow positions from 100 USDC
  },

  calculateLiquidationPrice: (params: {
    entryPrice: number;
    leverage: number;
    isLong: boolean;
  }): number => {
    const { entryPrice, leverage, isLong } = params;
    if (leverage <= 0) return 0;

    if (isLong) {
      return entryPrice * (1 - 1 / leverage);
    } else {
      return entryPrice * (1 + 1 / leverage);
    }
  },

  calculatePriceImpact: (currentSkew: number, tradeSize: number): number => {
    // Simplified price impact calculation
    return Math.abs(currentSkew + tradeSize) * 0.0001;
  },

  calculateTradingFee: (positionSize: number): number => {
    // Merkle trading fee: 0.1% of position size
    return positionSize * 0.001;
  },

  calculateProfitCap: (collateral: number): number => {
    // Profit cap = collateral * 100 (simplified)
    return collateral * 100;
  },
};
