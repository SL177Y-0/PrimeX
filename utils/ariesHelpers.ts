/**
 * Aries Markets Helper Functions
 * 
 * Utility functions to calculate and format Aries protocol data
 * for display in the UI
 */

import type { AriesReserve, UserPortfolio, UserSupplyPosition, UserBorrowPosition } from '../types/aries';

// ============================================================================
// Number Formatting
// ============================================================================

/**
 * Convert raw token amount to human-readable format
 */
export function formatTokenAmount(rawAmount: string, decimals: number): number {
  return parseFloat(rawAmount) / Math.pow(10, decimals);
}

/**
 * Format currency with appropriate suffix (K, M, B)
 */
export function formatCurrency(value: number): string {
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
  return `$${value.toFixed(2)}`;
}

/**
 * Format percentage with fixed decimals
 */
export function formatPercent(value: number, decimals: number = 2): string {
  return `${value.toFixed(decimals)}%`;
}

// ============================================================================
// Risk Parameters
// ============================================================================

/**
 * Extract and format risk parameters from reserve config
 */
export interface RiskParameters {
  maxLTV: number;                    // Maximum Loan-to-Value ratio (%)
  liquidationThreshold: number;       // Liquidation threshold (%)
  liquidationPenalty: number;         // Liquidation bonus for liquidators (%)
  liquidationFee: number;            // Protocol liquidation fee (%)
  borrowFactor: number;              // Risk adjustment factor (%)
  reserveRatio: number;              // Protocol reserve factor (%)
}

export function extractRiskParams(reserve: AriesReserve): RiskParameters {
  const config = reserve.reserveConfig;
  
  return {
    maxLTV: config.loanToValue / 100,                                    // 70 → 70%
    liquidationThreshold: config.liquidationThreshold / 100,             // 75 → 75%
    liquidationPenalty: config.liquidationBonusBips / 10000,            // 600 → 6%
    liquidationFee: config.liquidationFeeHundredthBips / 100000,        // 20000 → 20%
    borrowFactor: config.borrowFactor / 100,                            // 100 → 100%
    reserveRatio: config.reserveRatio / 100,                            // 60 → 60%
  };
}

// ============================================================================
// Pool Calculations
// ============================================================================

/**
 * Calculate total supply (available + borrowed)
 */
export function calculateTotalSupply(reserve: AriesReserve): string {
  const cashAvailable = parseFloat(reserve.totalCashAvailable || '0');
  const borrowed = parseFloat(reserve.totalBorrowed || '0');
  return (cashAvailable + borrowed).toString();
}

/**
 * Calculate available liquidity
 */
export function calculateAvailableLiquidity(reserve: AriesReserve): number {
  return parseFloat(reserve.totalCashAvailable || '0');
}

/**
 * Check if pool is close to supply/borrow limit
 */
export function checkPoolLimits(reserve: AriesReserve): {
  nearSupplyLimit: boolean;
  nearBorrowLimit: boolean;
  supplyUtilization: number;
  borrowUtilization: number;
} {
  const totalSupply = parseFloat(calculateTotalSupply(reserve));
  const totalBorrowed = parseFloat(reserve.totalBorrowed || '0');
  const depositLimit = parseFloat(reserve.reserveConfig.depositLimit || '0');
  const borrowLimit = parseFloat(reserve.reserveConfig.borrowLimit || '0');
  
  const supplyUtilization = depositLimit > 0 ? (totalSupply / depositLimit) * 100 : 0;
  const borrowUtilization = borrowLimit > 0 ? (totalBorrowed / borrowLimit) * 100 : 0;
  
  return {
    nearSupplyLimit: supplyUtilization > 90,
    nearBorrowLimit: borrowUtilization > 90,
    supplyUtilization,
    borrowUtilization,
  };
}

// ============================================================================
// User Position Calculations
// ============================================================================

/**
 * Calculate net APR for user portfolio
 */
export function calculateNetAPR(
  supplies: UserSupplyPosition[],
  borrows: UserBorrowPosition[]
): number {
  const totalSupplyValue = supplies.reduce((sum, s) => sum + s.amountSuppliedUSD, 0);
  const totalBorrowValue = borrows.reduce((sum, b) => sum + b.amountBorrowedUSD, 0);
  
  if (totalSupplyValue === 0) return 0;
  
  const supplyAPRWeighted = supplies.reduce((sum, s) => 
    sum + (s.amountSuppliedUSD * s.currentAPR), 0) / totalSupplyValue;
    
  const borrowAPRWeighted = borrows.reduce((sum, b) => 
    sum + (b.amountBorrowedUSD * b.currentAPR), 0) / (totalBorrowValue || 1);
  
  return supplyAPRWeighted - borrowAPRWeighted;
}

/**
 * Calculate health factor
 */
export function calculateHealthFactor(
  totalCollateralUSD: number,
  totalBorrowedUSD: number,
  weightedLiquidationThreshold: number
): number {
  if (totalBorrowedUSD === 0) return Infinity;
  return (totalCollateralUSD * weightedLiquidationThreshold) / totalBorrowedUSD;
}

/**
 * Simulate health factor after withdrawal
 */
export function simulateWithdrawalHealthFactor(
  currentCollateralUSD: number,
  withdrawAmountUSD: number,
  totalBorrowedUSD: number,
  liquidationThreshold: number
): number {
  if (totalBorrowedUSD === 0) return Infinity;
  
  const newCollateral = currentCollateralUSD - withdrawAmountUSD;
  return (newCollateral * liquidationThreshold) / totalBorrowedUSD;
}

/**
 * Calculate maximum safe withdrawal maintaining target health factor
 */
export function calculateMaxSafeWithdrawal(
  currentCollateralUSD: number,
  totalBorrowedUSD: number,
  liquidationThreshold: number,
  targetHealthFactor: number = 1.5
): number {
  if (totalBorrowedUSD === 0) return currentCollateralUSD;
  
  // HF = (collateral * liqThreshold) / borrowed
  // targetHF = ((collateral - withdrawal) * liqThreshold) / borrowed
  // withdrawal = collateral - (targetHF * borrowed / liqThreshold)
  
  const minCollateral = (targetHealthFactor * totalBorrowedUSD) / liquidationThreshold;
  const maxWithdrawal = currentCollateralUSD - minCollateral;
  
  return Math.max(0, maxWithdrawal);
}

/**
 * Calculate borrowing power (available to borrow)
 */
export function calculateBorrowingPower(
  totalCollateralUSD: number,
  totalBorrowedUSD: number,
  weightedLTV: number
): number {
  const maxBorrow = totalCollateralUSD * weightedLTV;
  return Math.max(0, maxBorrow - totalBorrowedUSD);
}

/**
 * Get liquidation risk level
 */
export function getLiquidationRisk(healthFactor: number): 'safe' | 'warning' | 'danger' {
  if (healthFactor > 2.0) return 'safe';
  if (healthFactor > 1.2) return 'warning';
  return 'danger';
}

// ============================================================================
// Interest Rate Calculations
// ============================================================================

/**
 * Calculate borrow rate at specific utilization
 */
export function calculateBorrowRateAtUtilization(
  utilization: number,
  interestRateConfig: AriesReserve['interestRateConfig']
): number {
  const optimalUtil = interestRateConfig.optimalUtilization / 100;
  
  if (utilization <= optimalUtil) {
    // Below optimal: linear from min to optimal
    const slope = (interestRateConfig.optimalBorrowRate - interestRateConfig.minBorrowRate) / optimalUtil;
    return interestRateConfig.minBorrowRate + slope * utilization;
  } else {
    // Above optimal: steeper slope to max
    const excessUtil = utilization - optimalUtil;
    const slope = (interestRateConfig.maxBorrowRate - interestRateConfig.optimalBorrowRate) / (1 - optimalUtil);
    return interestRateConfig.optimalBorrowRate + slope * excessUtil;
  }
}

/**
 * Generate interest rate curve data for charting
 */
export interface RateCurvePoint {
  utilization: number;
  borrowRate: number;
  supplyRate: number;
}

export function generateRateCurve(
  reserve: AriesReserve,
  points: number = 20
): RateCurvePoint[] {
  const curve: RateCurvePoint[] = [];
  const reserveRatio = reserve.reserveConfig.reserveRatio / 10000;
  
  for (let i = 0; i <= points; i++) {
    const utilization = i / points;
    const borrowRate = calculateBorrowRateAtUtilization(utilization, reserve.interestRateConfig);
    const supplyRate = borrowRate * utilization * (1 - reserveRatio);
    
    curve.push({
      utilization: utilization * 100,
      borrowRate: borrowRate / 100, // Convert to percentage
      supplyRate: supplyRate / 100,
    });
  }
  
  return curve;
}

// ============================================================================
// Data Validation
// ============================================================================

/**
 * Validate reserve data quality
 */
export function validateReserveData(reserve: AriesReserve): {
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  
  if (reserve.utilization > 100) {
    issues.push('Utilization exceeds 100%');
  }
  
  if (reserve.supplyAPR < 0) {
    issues.push('Negative supply APR');
  }
  
  if (reserve.borrowAPR < reserve.supplyAPR) {
    issues.push('Borrow APR less than supply APR');
  }
  
  const limits = checkPoolLimits(reserve);
  if (limits.supplyUtilization > 100) {
    issues.push('Supply exceeds deposit limit');
  }
  
  if (limits.borrowUtilization > 100) {
    issues.push('Borrows exceed borrow limit');
  }
  
  return {
    valid: issues.length === 0,
    issues,
  };
}

// ============================================================================
// Pool Type Detection
// ============================================================================

/**
 * Determine if reserve is paired or isolated
 */
export function getPoolType(coinType: string): 'paired' | 'isolated' {
  // Wrapped coins are isolated pools
  if (coinType.includes('::wrapped_coins::')) {
    return 'isolated';
  }
  return 'paired';
}

// ============================================================================
// Display Helpers
// ============================================================================

/**
 * Format health factor for display
 */
export function formatHealthFactor(hf: number): string {
  if (!isFinite(hf)) return '∞';
  if (hf > 999) return '>999';
  return hf.toFixed(2);
}

/**
 * Get health factor color class
 */
export function getHealthFactorColor(hf: number): string {
  const risk = getLiquidationRisk(hf);
  return {
    safe: 'text-green-500',
    warning: 'text-yellow-500',
    danger: 'text-red-500',
  }[risk];
}

/**
 * Format APR with sign
 */
export function formatAPRWithSign(apr: number): string {
  const sign = apr >= 0 ? '+' : '';
  return `${sign}${apr.toFixed(2)}%`;
}

// ============================================================================
// Export All
// ============================================================================

export const AriesHelpers = {
  // Formatting
  formatTokenAmount,
  formatCurrency,
  formatPercent,
  formatHealthFactor,
  formatAPRWithSign,
  
  // Risk
  extractRiskParams,
  getLiquidationRisk,
  getHealthFactorColor,
  
  // Calculations
  calculateTotalSupply,
  calculateAvailableLiquidity,
  calculateNetAPR,
  calculateHealthFactor,
  calculateBorrowingPower,
  calculateMaxSafeWithdrawal,
  simulateWithdrawalHealthFactor,
  
  // Interest Rates
  calculateBorrowRateAtUtilization,
  generateRateCurve,
  
  // Pool Info
  checkPoolLimits,
  getPoolType,
  
  // Validation
  validateReserveData,
};

export default AriesHelpers;
