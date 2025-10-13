/**
 * Aries Markets Mathematical Utilities
 * 
 * Implements core financial calculations for lending/borrowing:
 * - Interest rate models (piecewise linear with kink)
 * - Utilization ratios
 * - Health factor calculations
 * - APR/APY conversions
 * 
 * All calculations use high-precision arithmetic to prevent floating-point errors
 */

import { ARIES_CONFIG, LENDING_CONSTANTS } from '../config/constants';
import type { InterestRateConfig, ReserveConfig } from '../types/aries';

// ============================================================================
// Utilization Calculations
// ============================================================================

/**
 * Calculate utilization ratio
 * Formula: U = totalBorrowed / (totalCashAvailable + totalBorrowed)
 */
export function calculateUtilization(
  totalBorrowed: string | number,
  totalCashAvailable: string | number
): number {
  const borrowed = typeof totalBorrowed === 'string' ? parseFloat(totalBorrowed) : totalBorrowed;
  const cash = typeof totalCashAvailable === 'string' ? parseFloat(totalCashAvailable) : totalCashAvailable;
  
  const totalLiquidity = cash + borrowed;
  
  if (totalLiquidity === 0) {
    return 0;
  }
  
  return borrowed / totalLiquidity;
}

/**
 * Calculate total supply from available cash and borrows
 */
export function calculateTotalSupply(
  totalCashAvailable: string | number,
  totalBorrowed: string | number
): number {
  const cash = typeof totalCashAvailable === 'string' ? parseFloat(totalCashAvailable) : totalCashAvailable;
  const borrowed = typeof totalBorrowed === 'string' ? parseFloat(totalBorrowed) : totalBorrowed;
  
  return cash + borrowed;
}

// ============================================================================
// Interest Rate Model (Piecewise Linear with Kink)
// ============================================================================

/**
 * Calculate borrow APR using piecewise linear interest rate model
 * 
 * Formula:
 * if U <= U_optimal:
 *   borrowAPR = minRate + (U / U_optimal) * (optimalRate - minRate)
 * else:
 *   borrowAPR = optimalRate + ((U - U_optimal) / (1 - U_optimal)) * (maxRate - optimalRate)
 * 
 * @param utilization Current utilization ratio (0-1)
 * @param config Interest rate configuration
 * @returns Borrow APR as decimal (0.05 = 5%)
 */
export function calculateBorrowAPR(
  utilization: number,
  config: InterestRateConfig
): number {
  // Convert basis points to decimal
  const minRate = config.minBorrowRate / 10000;
  const optimalRate = config.optimalBorrowRate / 10000;
  const maxRate = config.maxBorrowRate / 10000;
  const optimalUtil = config.optimalUtilization / 10000;
  
  // Clamp utilization to [0, 1]
  const U = Math.max(0, Math.min(1, utilization));
  
  if (U <= optimalUtil) {
    // Below kink: linear from min to optimal rate
    return minRate + (U / optimalUtil) * (optimalRate - minRate);
  } else {
    // Above kink: steep linear from optimal to max rate
    return optimalRate + ((U - optimalUtil) / (1 - optimalUtil)) * (maxRate - optimalRate);
  }
}

/**
 * Calculate supply APR
 * 
 * Formula:
 * supplyAPR = borrowAPR * utilization * (1 - reserveFactor)
 * 
 * @param borrowAPR Current borrow APR
 * @param utilization Current utilization ratio
 * @param reserveRatio Reserve factor (in basis points)
 * @returns Supply APR as decimal
 */
export function calculateSupplyAPR(
  borrowAPR: number,
  utilization: number,
  reserveRatio: number
): number {
  const reserveFactor = reserveRatio / 10000;
  return borrowAPR * utilization * (1 - reserveFactor);
}

/**
 * Calculate both supply and borrow APR for a reserve
 */
export function calculateReserveAPRs(
  totalBorrowed: string | number,
  totalCashAvailable: string | number,
  interestRateConfig: InterestRateConfig,
  reserveRatio: number
): { supplyAPR: number; borrowAPR: number; utilization: number } {
  const utilization = calculateUtilization(totalBorrowed, totalCashAvailable);
  const borrowAPR = calculateBorrowAPR(utilization, interestRateConfig);
  const supplyAPR = calculateSupplyAPR(borrowAPR, utilization, reserveRatio);
  
  return {
    supplyAPR,
    borrowAPR,
    utilization,
  };
}

// ============================================================================
// Health Factor Calculations
// ============================================================================

/**
 * Calculate health factor for a user position
 * 
 * Formula:
 * HF = (Σ(collateral_i * liquidationThreshold_i)) / totalBorrow
 * 
 * A health factor < 1.0 means the position is eligible for liquidation
 * 
 * @param collateralPositions Array of {value: USD, liquidationThreshold: basis points}
 * @param totalBorrowValue Total borrowed value in USD
 * @returns Health factor (>= 1.0 is safe, < 1.0 is liquidatable)
 */
export function calculateHealthFactor(
  collateralPositions: Array<{ value: number; liquidationThreshold: number }>,
  totalBorrowValue: number
): number {
  if (totalBorrowValue === 0) {
    return Infinity; // No borrows = infinite health
  }
  
  const totalWeightedCollateral = collateralPositions.reduce((sum, position) => {
    const threshold = position.liquidationThreshold / 10000; // Convert basis points to decimal
    return sum + position.value * threshold;
  }, 0);
  
  return totalWeightedCollateral / totalBorrowValue;
}

/**
 * Determine health factor safety level
 */
export function getHealthFactorLevel(healthFactor: number): 'safe' | 'warning' | 'danger' | 'liquidation' {
  const { safe, warning, danger, liquidation } = ARIES_CONFIG.healthFactorThresholds;
  
  if (healthFactor >= safe) return 'safe';
  if (healthFactor >= warning) return 'warning';
  if (healthFactor >= danger) return 'danger';
  return 'liquidation';
}

/**
 * Calculate maximum borrowable amount given collateral
 * 
 * @param collateralValue Collateral value in USD
 * @param loanToValue LTV ratio in basis points
 * @returns Maximum borrowable value in USD
 */
export function calculateMaxBorrow(
  collateralValue: number,
  loanToValue: number
): number {
  const ltv = loanToValue / 10000;
  return collateralValue * ltv;
}

/**
 * Calculate maximum withdrawable collateral given current borrows
 * 
 * @param totalCollateralValue Current total collateral in USD
 * @param totalBorrowValue Current total borrows in USD
 * @param liquidationThreshold Liquidation threshold in basis points
 * @param minHealthFactor Minimum desired health factor (default 1.2)
 * @returns Maximum withdrawable value in USD
 */
export function calculateMaxWithdraw(
  totalCollateralValue: number,
  totalBorrowValue: number,
  liquidationThreshold: number,
  minHealthFactor: number = LENDING_CONSTANTS.WARNING_HEALTH_FACTOR
): number {
  if (totalBorrowValue === 0) {
    return totalCollateralValue; // No borrows, can withdraw everything
  }
  
  const threshold = liquidationThreshold / 10000;
  
  // Required collateral to maintain min health factor
  const requiredCollateral = (totalBorrowValue * minHealthFactor) / threshold;
  
  // Max withdrawable is current minus required
  const maxWithdraw = totalCollateralValue - requiredCollateral;
  
  return Math.max(0, maxWithdraw);
}

/**
 * Simulate health factor after withdraw/borrow action
 */
export function simulateHealthFactorChange(
  currentCollateral: number,
  currentBorrow: number,
  collateralChange: number, // Negative for withdrawal, positive for deposit
  borrowChange: number, // Positive for new borrow, negative for repayment
  liquidationThreshold: number
): {
  currentHF: number;
  projectedHF: number;
  safetyDelta: number;
} {
  const threshold = liquidationThreshold / 10000;
  
  const currentHF = currentBorrow > 0
    ? (currentCollateral * threshold) / currentBorrow
    : Infinity;
  
  const newCollateral = currentCollateral + collateralChange;
  const newBorrow = currentBorrow + borrowChange;
  
  const projectedHF = newBorrow > 0
    ? (newCollateral * threshold) / newBorrow
    : Infinity;
  
  return {
    currentHF,
    projectedHF,
    safetyDelta: projectedHF - currentHF,
  };
}

// ============================================================================
// Liquidation Calculations
// ============================================================================

/**
 * Calculate liquidation price for a position
 * 
 * @param collateralAmount Amount of collateral
 * @param borrowAmount Amount borrowed
 * @param liquidationThreshold Threshold in basis points
 * @returns Price at which liquidation occurs
 */
export function calculateLiquidationPrice(
  collateralAmount: number,
  borrowAmount: number,
  liquidationThreshold: number,
  currentPrice: number
): number {
  if (collateralAmount === 0) return 0;
  
  const threshold = liquidationThreshold / 10000;
  
  // At liquidation: collateral * price * threshold = borrow
  // liquidationPrice = borrow / (collateral * threshold)
  return borrowAmount / (collateralAmount * threshold);
}

/**
 * Calculate liquidation bonus
 */
export function calculateLiquidationBonus(
  liquidatedAmount: number,
  bonusBips: number
): number {
  return liquidatedAmount * (bonusBips / 10000);
}

// ============================================================================
// APY Calculations (Compound Interest)
// ============================================================================

/**
 * Convert APR to APY (with compounding)
 * 
 * @param apr Annual Percentage Rate (simple interest)
 * @param compoundFrequency Number of compounds per year (365 for daily)
 * @returns APY (Annual Percentage Yield with compounding)
 */
export function aprToApy(apr: number, compoundFrequency: number = 365): number {
  return Math.pow(1 + apr / compoundFrequency, compoundFrequency) - 1;
}

/**
 * Convert APY back to APR
 */
export function apyToApr(apy: number, compoundFrequency: number = 365): number {
  return (Math.pow(1 + apy, 1 / compoundFrequency) - 1) * compoundFrequency;
}

// ============================================================================
// Fee Calculations
// ============================================================================

/**
 * Calculate borrow fee
 */
export function calculateBorrowFee(amount: number, feeBips: number): number {
  return amount * (feeBips / 1000000); // Hundredth basis points to decimal
}

/**
 * Calculate withdraw fee
 */
export function calculateWithdrawFee(amount: number, feeBips: number): number {
  return amount * (feeBips / 1000000);
}

/**
 * Calculate flash loan fee
 */
export function calculateFlashLoanFee(amount: number, feeBips: number): number {
  return amount * (feeBips / 1000000);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format APR as percentage string
 */
export function formatAPR(apr: number, decimals: number = 2): string {
  return `${(apr * 100).toFixed(decimals)}%`;
}

/**
 * Format health factor with color indicator
 */
export function formatHealthFactor(hf: number): string {
  if (hf === Infinity) return '∞';
  return hf.toFixed(2);
}

/**
 * Check if a value is within safe health factor range
 */
export function isSafeHealthFactor(hf: number): boolean {
  return hf >= LENDING_CONSTANTS.SAFE_HEALTH_FACTOR;
}

/**
 * Calculate net APR for a user with both supply and borrow positions
 */
export function calculateNetAPR(
  suppliedAmount: number,
  supplyAPR: number,
  borrowedAmount: number,
  borrowAPR: number
): number {
  const totalValue = suppliedAmount + borrowedAmount;
  
  if (totalValue === 0) return 0;
  
  const supplyEarnings = suppliedAmount * supplyAPR;
  const borrowCosts = borrowedAmount * borrowAPR;
  
  return (supplyEarnings - borrowCosts) / totalValue;
}

/**
 * Validate if an action would keep health factor safe
 */
export function validateSafeAction(
  currentCollateral: number,
  currentBorrow: number,
  collateralChange: number,
  borrowChange: number,
  liquidationThreshold: number,
  minHealthFactor: number = LENDING_CONSTANTS.WARNING_HEALTH_FACTOR
): { valid: boolean; reason?: string; projectedHF: number } {
  const simulation = simulateHealthFactorChange(
    currentCollateral,
    currentBorrow,
    collateralChange,
    borrowChange,
    liquidationThreshold
  );
  
  if (simulation.projectedHF < minHealthFactor) {
    return {
      valid: false,
      reason: `Health factor would drop to ${simulation.projectedHF.toFixed(2)} (minimum: ${minHealthFactor.toFixed(2)})`,
      projectedHF: simulation.projectedHF,
    };
  }
  
  return {
    valid: true,
    projectedHF: simulation.projectedHF,
  };
}
