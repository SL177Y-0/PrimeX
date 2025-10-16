/**
 * Aries Markets Risk Calculation Utilities
 * Implements health factor, borrowing power, and liquidation threshold calculations
 * Based on documented formulas from report.md
 */

export interface AssetPosition {
  coinType: string;
  symbol: string;
  amount: number; // underlying amount (not LP)
  priceUSD: number;
  ltv: number; // as percentage (e.g., 80 = 80%)
  liquidationThreshold: number; // as percentage (e.g., 85 = 85%)
  borrowFactor: number; // as percentage (e.g., 100 = 100%)
}

export interface DepositPosition extends AssetPosition {
  lpAmount: number;
}

export interface BorrowPosition extends AssetPosition {
  borrowShare: number;
}

export interface PortfolioRiskMetrics {
  totalSuppliedUSD: number;
  totalBorrowedUSD: number;
  borrowingPower: number;
  adjustedBorrowValue: number;
  liquidationValue: number;
  healthFactor: number;
  borrowLimit: number;
  availableToBorrow: number;
  isHealthy: boolean;
  isLiquidatable: boolean;
}

/**
 * Calculate total borrowing power (LTV-based)
 * Formula: Σ (deposited_amount × price × ltv_percentage)
 */
export function calculateBorrowingPower(deposits: DepositPosition[]): number {
  return deposits.reduce((total, deposit) => {
    const ltv_decimal = deposit.ltv / 100;
    const contribution = deposit.amount * deposit.priceUSD * ltv_decimal;
    return total + contribution;
  }, 0);
}

/**
 * Calculate adjusted borrowed value (risk-adjusted)
 * Formula: Σ (borrowed_amount × price / borrow_factor)
 */
export function calculateAdjustedBorrowValue(borrows: BorrowPosition[]): number {
  return borrows.reduce((total, borrow) => {
    const borrow_factor_decimal = borrow.borrowFactor / 100;
    const contribution = (borrow.amount * borrow.priceUSD) / borrow_factor_decimal;
    return total + contribution;
  }, 0);
}

/**
 * Calculate liquidation threshold value
 * Formula: Σ (deposited_amount × price × liquidation_threshold)
 */
export function calculateLiquidationValue(deposits: DepositPosition[]): number {
  return deposits.reduce((total, deposit) => {
    const liq_threshold_decimal = deposit.liquidationThreshold / 100;
    const contribution = deposit.amount * deposit.priceUSD * liq_threshold_decimal;
    return total + contribution;
  }, 0);
}

/**
 * Calculate health factor
 * Formula: liquidation_value / adjusted_borrow_value
 * Returns Infinity if no borrows
 */
export function calculateHealthFactor(
  liquidationValue: number,
  adjustedBorrowValue: number
): number {
  if (adjustedBorrowValue === 0 || adjustedBorrowValue < 0.01) {
    return Infinity; // No debt = infinite health
  }
  
  return liquidationValue / adjustedBorrowValue;
}

/**
 * Check if position is healthy (can borrow more)
 * Formula: adjusted_borrow_value <= borrowing_power
 */
export function hasEnoughCollateral(
  adjustedBorrowValue: number,
  borrowingPower: number
): boolean {
  return adjustedBorrowValue <= borrowingPower;
}

/**
 * Check if position is liquidatable
 * Formula: health_factor < 1.0
 */
export function isLiquidatable(healthFactor: number): boolean {
  return healthFactor < 1.0;
}

/**
 * Calculate available amount to borrow
 * Formula: borrowing_power - adjusted_borrow_value
 */
export function calculateAvailableToBorrow(
  borrowingPower: number,
  adjustedBorrowValue: number
): number {
  const available = borrowingPower - adjustedBorrowValue;
  return Math.max(0, available);
}

/**
 * Calculate borrow limit percentage
 * Formula: (adjusted_borrow_value / borrowing_power) × 100
 */
export function calculateBorrowLimitPercentage(
  adjustedBorrowValue: number,
  borrowingPower: number
): number {
  if (borrowingPower === 0) return 0;
  return (adjustedBorrowValue / borrowingPower) * 100;
}

/**
 * Main function: Calculate complete portfolio risk metrics
 */
export function calculatePortfolioRisk(
  deposits: DepositPosition[],
  borrows: BorrowPosition[]
): PortfolioRiskMetrics {
  // Calculate totals
  const totalSuppliedUSD = deposits.reduce((sum, d) => sum + (d.amount * d.priceUSD), 0);
  const totalBorrowedUSD = borrows.reduce((sum, b) => sum + (b.amount * b.priceUSD), 0);
  
  // Calculate risk metrics
  const borrowingPower = calculateBorrowingPower(deposits);
  const adjustedBorrowValue = calculateAdjustedBorrowValue(borrows);
  const liquidationValue = calculateLiquidationValue(deposits);
  const healthFactor = calculateHealthFactor(liquidationValue, adjustedBorrowValue);
  const borrowLimit = calculateBorrowLimitPercentage(adjustedBorrowValue, borrowingPower);
  const availableToBorrow = calculateAvailableToBorrow(borrowingPower, adjustedBorrowValue);
  
  // Health checks
  const isHealthy = hasEnoughCollateral(adjustedBorrowValue, borrowingPower);
  const liquidatable = isLiquidatable(healthFactor);
  
  return {
    totalSuppliedUSD,
    totalBorrowedUSD,
    borrowingPower,
    adjustedBorrowValue,
    liquidationValue,
    healthFactor,
    borrowLimit,
    availableToBorrow,
    isHealthy,
    isLiquidatable: liquidatable,
  };
}

/**
 * Format health factor for display
 * Returns "∞" for infinite, percentage for normal values
 */
export function formatHealthFactor(healthFactor: number): string {
  if (!isFinite(healthFactor)) {
    return '∞';
  }
  
  // Convert to percentage for UX clarity
  const percentage = (healthFactor * 100).toFixed(2);
  return `${percentage}%`;
}

/**
 * Get health factor color based on value
 */
export function getHealthFactorColor(healthFactor: number): 'success' | 'warning' | 'danger' {
  if (!isFinite(healthFactor) || healthFactor >= 1.5) {
    return 'success'; // Safe zone
  } else if (healthFactor >= 1.1) {
    return 'warning'; // Caution zone
  } else {
    return 'danger'; // Danger zone / liquidatable
  }
}

/**
 * Simulate health factor after new borrow
 * Useful for UI validation before transaction
 */
export function simulateBorrowHealthFactor(
  currentDeposits: DepositPosition[],
  currentBorrows: BorrowPosition[],
  newBorrowAsset: BorrowPosition
): PortfolioRiskMetrics {
  const updatedBorrows = [...currentBorrows];
  
  // Find existing borrow or add new
  const existingIndex = updatedBorrows.findIndex(b => b.coinType === newBorrowAsset.coinType);
  if (existingIndex >= 0) {
    updatedBorrows[existingIndex] = {
      ...updatedBorrows[existingIndex],
      amount: updatedBorrows[existingIndex].amount + newBorrowAsset.amount,
    };
  } else {
    updatedBorrows.push(newBorrowAsset);
  }
  
  return calculatePortfolioRisk(currentDeposits, updatedBorrows);
}

/**
 * Simulate health factor after withdrawal
 */
export function simulateWithdrawHealthFactor(
  currentDeposits: DepositPosition[],
  currentBorrows: BorrowPosition[],
  withdrawAsset: { coinType: string; amount: number }
): PortfolioRiskMetrics {
  const updatedDeposits = currentDeposits
    .map(d => {
      if (d.coinType === withdrawAsset.coinType) {
        return {
          ...d,
          amount: Math.max(0, d.amount - withdrawAsset.amount),
        };
      }
      return d;
    })
    .filter(d => d.amount > 0); // Remove empty positions
  
  return calculatePortfolioRisk(updatedDeposits, currentBorrows);
}

/**
 * Calculate maximum safe withdrawal amount
 * Returns max amount that keeps health factor above safety threshold
 */
export function calculateMaxSafeWithdrawal(
  currentDeposits: DepositPosition[],
  currentBorrows: BorrowPosition[],
  withdrawCoinType: string,
  safetyThreshold: number = 1.2 // 120% health factor minimum
): number {
  const depositToWithdraw = currentDeposits.find(d => d.coinType === withdrawCoinType);
  if (!depositToWithdraw) return 0;
  
  // Binary search for maximum safe amount
  let low = 0;
  let high = depositToWithdraw.amount;
  let maxSafe = 0;
  
  while (high - low > 0.001) {
    const mid = (low + high) / 2;
    const simulated = simulateWithdrawHealthFactor(
      currentDeposits,
      currentBorrows,
      { coinType: withdrawCoinType, amount: mid }
    );
    
    if (simulated.healthFactor >= safetyThreshold) {
      maxSafe = mid;
      low = mid;
    } else {
      high = mid;
    }
  }
  
  return maxSafe;
}

/**
 * Calculate maximum safe borrow amount
 * Returns max amount that keeps health factor above safety threshold
 */
export function calculateMaxSafeBorrow(
  currentDeposits: DepositPosition[],
  currentBorrows: BorrowPosition[],
  borrowAssetTemplate: Omit<BorrowPosition, 'amount'>,
  safetyThreshold: number = 1.2
): number {
  const currentRisk = calculatePortfolioRisk(currentDeposits, currentBorrows);
  
  // If already at/beyond safety threshold, can't borrow more
  if (currentRisk.healthFactor <= safetyThreshold) {
    return 0;
  }
  
  // Calculate max based on borrowing power
  const maxBasedOnPower = currentRisk.availableToBorrow / borrowAssetTemplate.priceUSD;
  
  // Binary search for amount that maintains safety threshold
  let low = 0;
  let high = maxBasedOnPower;
  let maxSafe = 0;
  
  while (high - low > 0.001) {
    const mid = (low + high) / 2;
    const simulated = simulateBorrowHealthFactor(
      currentDeposits,
      currentBorrows,
      { ...borrowAssetTemplate, amount: mid, borrowShare: 0 }
    );
    
    if (simulated.healthFactor >= safetyThreshold && simulated.isHealthy) {
      maxSafe = mid;
      low = mid;
    } else {
      high = mid;
    }
  }
  
  return maxSafe;
}

export default {
  calculateBorrowingPower,
  calculateAdjustedBorrowValue,
  calculateLiquidationValue,
  calculateHealthFactor,
  hasEnoughCollateral,
  isLiquidatable,
  calculateAvailableToBorrow,
  calculateBorrowLimitPercentage,
  calculatePortfolioRisk,
  formatHealthFactor,
  getHealthFactorColor,
  simulateBorrowHealthFactor,
  simulateWithdrawHealthFactor,
  calculateMaxSafeWithdrawal,
  calculateMaxSafeBorrow,
};
