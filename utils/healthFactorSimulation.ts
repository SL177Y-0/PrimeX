/**
 * Health Factor Simulation Utility
 * 
 * Simulates health factor changes for supply, borrow, withdraw, and repay actions
 * Helps users preview the impact of their transactions before executing
 */

import type { UserPortfolio, AriesReserve, HealthFactorSimulation } from '../types/aries';

// ============================================================================
// HEALTH FACTOR SIMULATION
// ============================================================================

/**
 * Simulate health factor change after a transaction
 */
export function simulateHealthFactorChange(
  portfolio: UserPortfolio,
  action: 'supply' | 'borrow' | 'withdraw' | 'repay',
  reserve: AriesReserve,
  amount: number // in token units
): HealthFactorSimulation {
  const amountUSD = amount * (reserve.priceUSD || 0);
  const liquidationThreshold = reserve.reserveConfig.liquidationThreshold / 10000;

  let newSupplyValue = portfolio.totalSuppliedUSD;
  let newBorrowValue = portfolio.totalBorrowedUSD;

  // Apply changes based on action
  switch (action) {
    case 'supply':
      newSupplyValue += amountUSD;
      break;
    case 'borrow':
      newBorrowValue += amountUSD;
      break;
    case 'withdraw':
      newSupplyValue -= amountUSD;
      break;
    case 'repay':
      newBorrowValue -= amountUSD;
      break;
  }

  // Calculate collateral value (supply value weighted by liquidation threshold)
  const newCollateralValue = newSupplyValue * liquidationThreshold;

  // Calculate new health factor
  const newHealthFactor = newBorrowValue > 0
    ? newCollateralValue / newBorrowValue
    : Infinity;

  // Determine safety level
  let safetyLevel: 'safe' | 'warning' | 'danger';
  if (newHealthFactor >= 1.5) {
    safetyLevel = 'safe';
  } else if (newHealthFactor >= 1.2) {
    safetyLevel = 'warning';
  } else {
    safetyLevel = 'danger';
  }

  // Calculate liquidation price (only for withdrawals/borrows)
  let liquidationPrice: number | undefined;
  if ((action === 'withdraw' || action === 'borrow') && newBorrowValue > 0) {
    // Simplified liquidation price calculation
    // This assumes the withdrawn/borrowed asset is the only one affected
    const requiredCollateralValue = newBorrowValue;
    const currentSupplyInAsset = newSupplyValue / (reserve.priceUSD || 1);
    
    if (currentSupplyInAsset > 0) {
      liquidationPrice = requiredCollateralValue / (currentSupplyInAsset * liquidationThreshold);
    }
  }

  return {
    currentHealthFactor: portfolio.healthFactor,
    projectedHealthFactor: newHealthFactor,
    totalCollateralValue: newCollateralValue,
    totalBorrowValue: newBorrowValue,
    liquidationPrice,
    safetyLevel,
  };
}

/**
 * Calculate maximum safe amount for a given action
 */
export function calculateMaxSafeAmount(
  portfolio: UserPortfolio,
  action: 'borrow' | 'withdraw',
  reserve: AriesReserve,
  targetHealthFactor: number = 1.5 // Default to 1.5 for safety
): number {
  const liquidationThreshold = reserve.reserveConfig.liquidationThreshold / 10000;
  const priceUSD = reserve.priceUSD || 0;

  if (priceUSD === 0) return 0;

  if (action === 'borrow') {
    // Max borrow: (collateral * LT / target HF) - current borrows
    const maxBorrowValue = (portfolio.totalSuppliedUSD * liquidationThreshold / targetHealthFactor) - portfolio.totalBorrowedUSD;
    return Math.max(0, maxBorrowValue / priceUSD);
  }

  if (action === 'withdraw') {
    // If no borrows, can withdraw everything
    if (portfolio.totalBorrowedUSD === 0) {
      const suppliedPosition = portfolio.supplies.find(s => s.coinType === reserve.coinType);
      return suppliedPosition ? parseFloat(suppliedPosition.amountSupplied) / Math.pow(10, reserve.decimals) : 0;
    }

    // Max withdraw: supply - (borrows * target HF / LT)
    const minRequiredSupply = (portfolio.totalBorrowedUSD * targetHealthFactor) / liquidationThreshold;
    const maxWithdrawValue = portfolio.totalSuppliedUSD - minRequiredSupply;
    return Math.max(0, maxWithdrawValue / priceUSD);
  }

  return 0;
}

/**
 * Get health factor color based on value
 */
export function getHealthFactorColor(healthFactor: number): string {
  if (healthFactor >= 2.0) return '#10b981'; // Green
  if (healthFactor >= 1.5) return '#3b82f6'; // Blue
  if (healthFactor >= 1.2) return '#f59e0b'; // Orange
  return '#ef4444'; // Red
}

/**
 * Get health factor label
 */
export function getHealthFactorLabel(healthFactor: number): string {
  if (healthFactor === Infinity) return 'No Borrows';
  if (healthFactor >= 2.0) return 'Safe';
  if (healthFactor >= 1.5) return 'Good';
  if (healthFactor >= 1.2) return 'At Risk';
  return 'Liquidation Risk';
}

/**
 * Format health factor for display
 */
export function formatHealthFactor(healthFactor: number): string {
  if (healthFactor === Infinity) return '∞';
  if (healthFactor > 999) return '>999';
  return healthFactor.toFixed(2);
}

/**
 * Calculate borrowing power remaining
 */
export function calculateBorrowingPower(
  portfolio: UserPortfolio,
  loanToValue: number // in bips (e.g., 7500 = 75%)
): {
  totalBorrowingPower: number;
  usedBorrowingPower: number;
  availableBorrowingPower: number;
  utilizationPercent: number;
} {
  const ltv = loanToValue / 10000;
  const totalBorrowingPower = portfolio.totalSuppliedUSD * ltv;
  const usedBorrowingPower = portfolio.totalBorrowedUSD;
  const availableBorrowingPower = Math.max(0, totalBorrowingPower - usedBorrowingPower);
  const utilizationPercent = totalBorrowingPower > 0
    ? (usedBorrowingPower / totalBorrowingPower) * 100
    : 0;

  return {
    totalBorrowingPower,
    usedBorrowingPower,
    availableBorrowingPower,
    utilizationPercent,
  };
}

/**
 * Calculate distance to liquidation
 */
export function calculateLiquidationDistance(
  portfolio: UserPortfolio,
  liquidationThreshold: number // in bips (e.g., 8000 = 80%)
): {
  distanceToLiquidation: number; // in USD
  percentToLiquidation: number; // percentage
  isAtRisk: boolean;
} {
  if (portfolio.totalBorrowedUSD === 0) {
    return {
      distanceToLiquidation: Infinity,
      percentToLiquidation: 0,
      isAtRisk: false,
    };
  }

  const lt = liquidationThreshold / 10000;
  const currentCollateralValue = portfolio.totalSuppliedUSD * lt;
  const distanceToLiquidation = currentCollateralValue - portfolio.totalBorrowedUSD;
  const percentToLiquidation = (distanceToLiquidation / currentCollateralValue) * 100;
  const isAtRisk = portfolio.healthFactor < 1.5;

  return {
    distanceToLiquidation,
    percentToLiquidation,
    isAtRisk,
  };
}
