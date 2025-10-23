/**
 * Aries Markets Complete Risk Calculation Utilities
 * 
 * Production-ready implementations of all risk formulas:
 * - Health Factor calculation
 * - Borrowing power and limits
 * - Transaction simulations
 * - Max safe amounts
 * - Portfolio risk analysis
 * 
 * All formulas based on official Aries Markets documentation
 */

import {
  DepositPosition,
  BorrowPosition,
  RiskMetrics,
  HealthFactorSimulation,
  MaxSafeAmount,
  SupplyParams,
  WithdrawParams,
  BorrowParams,
  RepayParams,
  InterestRateConfig,
} from '../types/ariesComplete';

// ============================================================================
// CORE RISK CALCULATIONS
// ============================================================================

/**
 * Calculate Health Factor
 * 
 * The most critical risk metric in the protocol. A health factor below 1.0
 * makes a position eligible for liquidation.
 * 
 * Formula: HF = (Σ Collateral Value × Liquidation Threshold) / (Σ Borrow Value / Borrow Factor)
 * 
 * @param deposits - User's deposit positions
 * @param borrows - User's borrow positions
 * @returns Health factor (Infinity if no borrows)
 * 
 * @example
 * // $1000 APT collateral (LT 0.75), $500 USDC borrow (BF 1.0)
 * const hf = calculateHealthFactor(deposits, borrows)
 * // Returns: (1000 × 0.75) / (500 / 1.0) = 1.5 (Safe)
 */
export function calculateHealthFactor(
  deposits: DepositPosition[],
  borrows: BorrowPosition[]
): number {
  // Calculate weighted collateral value
  const totalCollateralValue = deposits.reduce((sum, d) => {
    return sum + (d.valueUSD * d.liquidationThreshold);
  }, 0);

  // Calculate risk-adjusted borrow value
  const totalBorrowValue = borrows.reduce((sum, b) => {
    // Division by borrowFactor for two-sided risk adjustment
    return sum + (b.valueUSD / b.borrowFactor);
  }, 0);

  // Edge case: No borrows means infinite health factor
  if (totalBorrowValue === 0) {
    return Infinity;
  }

  return totalCollateralValue / totalBorrowValue;
}

/**
 * Calculate current Loan-to-Value ratio
 * 
 * LTV = Total Debt / Total Collateral
 * 
 * @param deposits - User's deposit positions
 * @param borrows - User's borrow positions
 * @returns Current LTV ratio (0-1)
 */
export function calculateCurrentLTV(
  deposits: DepositPosition[],
  borrows: BorrowPosition[]
): number {
  const totalCollateral = deposits.reduce((sum, d) => sum + d.valueUSD, 0);
  const totalBorrowed = borrows.reduce((sum, b) => sum + b.valueUSD, 0);

  if (totalCollateral === 0) return 0;
  return totalBorrowed / totalCollateral;
}

/**
 * Calculate borrowing power (maximum borrowable value in USD)
 * 
 * Borrowing Power = Σ (Collateral Value × LTV)
 * 
 * @param deposits - User's deposit positions
 * @returns Total available borrowing power in USD
 */
export function calculateBorrowingPower(deposits: DepositPosition[]): number {
  return deposits.reduce((sum, d) => {
    return sum + (d.valueUSD * d.loanToValue);
  }, 0);
}

/**
 * Calculate comprehensive portfolio risk metrics
 * 
 * @param deposits - User's deposit positions
 * @param borrows - User's borrow positions
 * @returns Complete risk metrics object
 */
export function calculatePortfolioRisk(
  deposits: DepositPosition[],
  borrows: BorrowPosition[]
): RiskMetrics {
  const totalCollateralValueUSD = deposits.reduce((sum, d) => sum + d.valueUSD, 0);
  const totalBorrowValueUSD = borrows.reduce((sum, b) => sum + b.valueUSD, 0);
  
  const weightedCollateralUSD = deposits.reduce((sum, d) => {
    return sum + (d.valueUSD * d.liquidationThreshold);
  }, 0);
  
  const adjustedBorrowUSD = borrows.reduce((sum, b) => {
    return sum + (b.valueUSD / b.borrowFactor);
  }, 0);
  
  const healthFactor = calculateHealthFactor(deposits, borrows);
  const currentLTV = calculateCurrentLTV(deposits, borrows);
  const borrowingPower = calculateBorrowingPower(deposits);
  const borrowCapacityUSD = Math.max(0, borrowingPower - totalBorrowValueUSD);
  const borrowCapacityUsed = borrowingPower > 0 ? totalBorrowValueUSD / borrowingPower : 0;
  
  // Determine status and color
  let status: 'safe' | 'warning' | 'danger' | 'liquidatable';
  let statusColor: string;
  
  if (healthFactor < 1.0) {
    status = 'liquidatable';
    statusColor = '#ef4444'; // Red
  } else if (healthFactor < 1.2) {
    status = 'danger';
    statusColor = '#f97316'; // Orange
  } else if (healthFactor < 1.5) {
    status = 'warning';
    statusColor = '#f59e0b'; // Yellow
  } else {
    status = 'safe';
    statusColor = '#10b981'; // Green
  }
  
  return {
    healthFactor,
    currentLTV,
    liquidationLTV: totalCollateralValueUSD > 0 ? weightedCollateralUSD / totalCollateralValueUSD : 0,
    borrowCapacityUSD,
    borrowCapacityUsed,
    status,
    statusColor,
    totalCollateralValueUSD,
    totalBorrowValueUSD,
    weightedCollateralUSD,
    adjustedBorrowUSD,
  };
}

// ============================================================================
// INTEREST RATE CALCULATIONS
// ============================================================================

/**
 * Calculate utilization rate
 * 
 * Utilization = Total Borrowed / (Total Cash + Total Borrowed)
 * 
 * @param totalBorrowed - Total borrowed amount
 * @param totalCash - Total available cash
 * @returns Utilization rate (0-1)
 */
export function calculateUtilizationRate(
  totalBorrowed: number,
  totalCash: number
): number {
  const totalSupply = totalCash + totalBorrowed;
  return totalSupply > 0 ? totalBorrowed / totalSupply : 0;
}

/**
 * Calculate borrow APR using kinked interest rate model
 * 
 * Below optimal:
 *   APR = MinRate + (OptimalRate - MinRate) × (U / OptimalU)
 * 
 * Above optimal:
 *   APR = OptimalRate + (MaxRate - OptimalRate) × ((U - OptimalU) / (1 - OptimalU))
 * 
 * @param utilization - Current utilization rate (0-1)
 * @param config - Interest rate configuration
 * @returns Annual borrow rate (0-1, e.g., 0.05 = 5%)
 */
export function calculateBorrowAPR(
  utilization: number,
  config: InterestRateConfig
): number {
  const { minBorrowRate, optimalBorrowRate, maxBorrowRate, optimalUtilization } = config;

  if (utilization <= optimalUtilization) {
    // Below optimal: Gradual increase
    return minBorrowRate + (optimalBorrowRate - minBorrowRate) * (utilization / optimalUtilization);
  } else {
    // Above optimal: Steep increase to discourage borrowing
    return optimalBorrowRate + (maxBorrowRate - optimalBorrowRate) * 
           ((utilization - optimalUtilization) / (1 - optimalUtilization));
  }
}

/**
 * Calculate supply APR from borrow APR
 * 
 * Supply APR = Borrow APR × Utilization × (1 - Reserve Factor)
 * 
 * @param borrowAPR - Current borrow APR
 * @param utilization - Current utilization rate
 * @param reserveFactor - Protocol fee percentage (0-1)
 * @returns Annual supply rate (0-1)
 */
export function calculateSupplyAPR(
  borrowAPR: number,
  utilization: number,
  reserveFactor: number
): number {
  return borrowAPR * utilization * (1 - reserveFactor);
}

// ============================================================================
// MAX SAFE AMOUNT CALCULATIONS
// ============================================================================

/**
 * Calculate maximum safe withdrawal amount
 * 
 * Determines the maximum amount a user can withdraw while maintaining
 * a safe health factor (default: 1.2).
 * 
 * @param deposits - Current deposit positions
 * @param borrows - Current borrow positions
 * @param coinType - Asset to withdraw
 * @param targetHealthFactor - Minimum safe health factor (default: 1.2)
 * @returns Maximum safe withdrawal calculation
 */
export function calculateMaxSafeWithdrawal(
  deposits: DepositPosition[],
  borrows: BorrowPosition[],
  coinType: string,
  targetHealthFactor: number = 1.2
): MaxSafeAmount | null {
  const deposit = deposits.find(d => d.coinType === coinType);
  if (!deposit) return null;

  // If no borrows, can withdraw everything
  const totalBorrowValueUSD = borrows.reduce((sum, b) => sum + b.valueUSD, 0);
  if (totalBorrowValueUSD === 0) {
    return {
      maxAmount: deposit.underlyingAmount,
      maxAmountDisplay: deposit.underlyingAmountDisplay,
      maxAmountUSD: deposit.valueUSD,
      resultingHealthFactor: Infinity,
      targetHealthFactor,
    };
  }

  // Calculate required collateral to maintain target HF
  const adjustedBorrowUSD = borrows.reduce((sum, b) => sum + (b.valueUSD / b.borrowFactor), 0);
  const requiredCollateralUSD = adjustedBorrowUSD * targetHealthFactor;

  // Calculate total weighted collateral
  const totalWeightedCollateralUSD = deposits.reduce((sum, d) => {
    return sum + (d.valueUSD * d.liquidationThreshold);
  }, 0);

  // Available collateral to withdraw (in USD)
  const availableCollateralUSD = totalWeightedCollateralUSD - requiredCollateralUSD;

  // Convert to asset amount, accounting for liquidation threshold
  const maxWithdrawUSD = availableCollateralUSD / deposit.liquidationThreshold;
  const maxWithdrawAmount = Math.min(maxWithdrawUSD, deposit.valueUSD);

  if (maxWithdrawAmount <= 0) {
    return {
      maxAmount: '0',
      maxAmountDisplay: 0,
      maxAmountUSD: 0,
      resultingHealthFactor: calculateHealthFactor(deposits, borrows),
      targetHealthFactor,
    };
  }

  // Convert USD to token amount
  const maxWithdrawTokens = maxWithdrawAmount / deposit.priceUSD;
  const maxWithdrawBaseUnits = Math.floor(maxWithdrawTokens * (10 ** deposit.decimals)).toString();

  return {
    maxAmount: maxWithdrawBaseUnits,
    maxAmountDisplay: maxWithdrawTokens,
    maxAmountUSD: maxWithdrawAmount,
    resultingHealthFactor: targetHealthFactor,
    targetHealthFactor,
  };
}

/**
 * Calculate maximum safe borrow amount
 * 
 * @param deposits - Current deposit positions
 * @param borrows - Current borrow positions
 * @param coinType - Asset to borrow
 * @param priceUSD - Current price of asset
 * @param borrowFactor - Borrow factor for asset
 * @param decimals - Asset decimals
 * @param targetHealthFactor - Minimum safe health factor (default: 1.3)
 * @returns Maximum safe borrow calculation
 */
export function calculateMaxSafeBorrow(
  deposits: DepositPosition[],
  borrows: BorrowPosition[],
  coinType: string,
  priceUSD: number,
  borrowFactor: number,
  decimals: number,
  targetHealthFactor: number = 1.3
): MaxSafeAmount {
  // Calculate total weighted collateral
  const totalWeightedCollateralUSD = deposits.reduce((sum, d) => {
    return sum + (d.valueUSD * d.liquidationThreshold);
  }, 0);

  // Calculate current adjusted borrow
  const currentAdjustedBorrowUSD = borrows.reduce((sum, b) => {
    return sum + (b.valueUSD / b.borrowFactor);
  }, 0);

  // Maximum adjusted borrow value = total collateral / target HF
  const maxAdjustedBorrowUSD = totalWeightedCollateralUSD / targetHealthFactor;

  // Available adjusted borrow capacity
  const availableAdjustedBorrowUSD = Math.max(0, maxAdjustedBorrowUSD - currentAdjustedBorrowUSD);

  // Convert to actual borrow amount (multiply by borrow factor)
  const maxBorrowUSD = availableAdjustedBorrowUSD * borrowFactor;

  // Convert to token amount
  const maxBorrowTokens = maxBorrowUSD / priceUSD;
  const maxBorrowBaseUnits = Math.floor(maxBorrowTokens * (10 ** decimals)).toString();

  return {
    maxAmount: maxBorrowBaseUnits,
    maxAmountDisplay: maxBorrowTokens,
    maxAmountUSD: maxBorrowUSD,
    resultingHealthFactor: targetHealthFactor,
    targetHealthFactor,
  };
}

// ============================================================================
// TRANSACTION SIMULATIONS
// ============================================================================

/**
 * Simulate health factor after a supply transaction
 * 
 * @param deposits - Current deposits
 * @param borrows - Current borrows
 * @param params - Supply transaction parameters
 * @param priceUSD - Asset price
 * @param ltv - Loan-to-value
 * @param liquidationThreshold - Liquidation threshold
 * @returns Simulation result
 */
export function simulateSupplyHealthFactor(
  deposits: DepositPosition[],
  borrows: BorrowPosition[],
  params: SupplyParams,
  priceUSD: number,
  ltv: number,
  liquidationThreshold: number
): HealthFactorSimulation {
  const currentHF = calculateHealthFactor(deposits, borrows);

  // Create simulated deposit
  const amountDisplay = parseFloat(params.amount) / (10 ** 8); // Assuming 8 decimals, adjust as needed
  const valueUSD = amountDisplay * priceUSD;

  // Clone deposits and add new one
  const simulatedDeposits = [...deposits];
  const existingIndex = simulatedDeposits.findIndex(d => d.coinType === params.coinType);
  
  if (existingIndex >= 0) {
    // Add to existing
    simulatedDeposits[existingIndex] = {
      ...simulatedDeposits[existingIndex],
      valueUSD: simulatedDeposits[existingIndex].valueUSD + valueUSD,
    };
  } else {
    // Create new position
    simulatedDeposits.push({
      coinType: params.coinType,
      symbol: '', // Would be filled from asset metadata
      decimals: 8,
      lpAmount: params.amount,
      underlyingAmount: params.amount,
      lpAmountDisplay: amountDisplay,
      underlyingAmountDisplay: amountDisplay,
      priceUSD,
      valueUSD,
      loanToValue: ltv,
      liquidationThreshold,
      isCollateral: true,
      currentAPR: 0,
      earnedInterestDisplay: 0,
    });
  }

  const projectedHF = calculateHealthFactor(simulatedDeposits, borrows);
  const change = projectedHF - currentHF;
  const changePercent = currentHF !== Infinity ? (change / currentHF) * 100 : 0;

  return {
    currentHealthFactor: currentHF,
    projectedHealthFactor: projectedHF,
    change,
    changePercent,
    currentStatus: getHealthFactorStatus(currentHF),
    projectedStatus: getHealthFactorStatus(projectedHF),
    totalCollateralValue: simulatedDeposits.reduce((sum, d) => sum + d.valueUSD, 0),
    totalBorrowValue: borrows.reduce((sum, b) => sum + b.valueUSD, 0),
    isSafe: projectedHF >= 1.0,
  };
}

/**
 * Simulate health factor after a withdraw transaction
 */
export function simulateWithdrawHealthFactor(
  deposits: DepositPosition[],
  borrows: BorrowPosition[],
  params: WithdrawParams,
  priceUSD: number
): HealthFactorSimulation {
  const currentHF = calculateHealthFactor(deposits, borrows);

  // Calculate withdrawal amount in USD
  const amountDisplay = parseFloat(params.amount) / (10 ** 8);
  const valueUSD = amountDisplay * priceUSD;

  // Clone deposits and subtract
  const simulatedDeposits = deposits.map(d => {
    if (d.coinType === params.coinType) {
      return {
        ...d,
        valueUSD: Math.max(0, d.valueUSD - valueUSD),
      };
    }
    return d;
  }).filter(d => d.valueUSD > 0);

  const projectedHF = calculateHealthFactor(simulatedDeposits, borrows);
  const change = projectedHF - currentHF;
  const changePercent = currentHF !== Infinity ? (change / currentHF) * 100 : 0;

  const isSafe = projectedHF >= 1.0;
  const warning = !isSafe ? 'This withdrawal would put your position at risk of liquidation!' :
                  projectedHF < 1.2 ? 'Warning: Your health factor would be in the danger zone.' :
                  undefined;

  return {
    currentHealthFactor: currentHF,
    projectedHealthFactor: projectedHF,
    change,
    changePercent,
    currentStatus: getHealthFactorStatus(currentHF),
    projectedStatus: getHealthFactorStatus(projectedHF),
    totalCollateralValue: simulatedDeposits.reduce((sum, d) => sum + d.valueUSD, 0),
    totalBorrowValue: borrows.reduce((sum, b) => sum + b.valueUSD, 0),
    isSafe,
    warning,
  };
}

/**
 * Simulate health factor after a borrow transaction
 */
export function simulateBorrowHealthFactor(
  deposits: DepositPosition[],
  borrows: BorrowPosition[],
  params: BorrowParams,
  priceUSD: number,
  borrowFactor: number
): HealthFactorSimulation {
  const currentHF = calculateHealthFactor(deposits, borrows);

  const amountDisplay = parseFloat(params.amount) / (10 ** 8);
  const valueUSD = amountDisplay * priceUSD;

  const simulatedBorrows = [...borrows];
  const existingIndex = simulatedBorrows.findIndex(b => b.coinType === params.coinType);
  
  if (existingIndex >= 0) {
    simulatedBorrows[existingIndex] = {
      ...simulatedBorrows[existingIndex],
      valueUSD: simulatedBorrows[existingIndex].valueUSD + valueUSD,
    };
  } else {
    simulatedBorrows.push({
      coinType: params.coinType,
      symbol: '',
      decimals: 8,
      borrowedAmount: params.amount,
      borrowShare: '0',
      borrowedAmountDisplay: amountDisplay,
      priceUSD,
      valueUSD,
      borrowFactor,
      currentAPR: 0,
      accruedInterestDisplay: 0,
    });
  }

  const projectedHF = calculateHealthFactor(deposits, simulatedBorrows);
  const change = projectedHF - currentHF;
  const changePercent = currentHF !== Infinity ? (change / currentHF) * 100 : 0;

  const isSafe = projectedHF >= 1.0;
  const warning = !isSafe ? 'This borrow would put your position at risk of liquidation!' :
                  projectedHF < 1.2 ? 'Warning: Your health factor would be in the danger zone.' :
                  undefined;

  return {
    currentHealthFactor: currentHF,
    projectedHealthFactor: projectedHF,
    change,
    changePercent,
    currentStatus: getHealthFactorStatus(currentHF),
    projectedStatus: getHealthFactorStatus(projectedHF),
    totalCollateralValue: deposits.reduce((sum, d) => sum + d.valueUSD, 0),
    totalBorrowValue: simulatedBorrows.reduce((sum, b) => sum + b.valueUSD, 0),
    isSafe,
    warning,
  };
}

/**
 * Simulate health factor after a repay transaction
 */
export function simulateRepayHealthFactor(
  deposits: DepositPosition[],
  borrows: BorrowPosition[],
  params: RepayParams,
  priceUSD: number
): HealthFactorSimulation {
  const currentHF = calculateHealthFactor(deposits, borrows);

  const amountDisplay = parseFloat(params.amount) / (10 ** 8);
  const valueUSD = amountDisplay * priceUSD;

  const simulatedBorrows = borrows.map(b => {
    if (b.coinType === params.coinType) {
      return {
        ...b,
        valueUSD: Math.max(0, b.valueUSD - valueUSD),
      };
    }
    return b;
  }).filter(b => b.valueUSD > 0);

  const projectedHF = calculateHealthFactor(deposits, simulatedBorrows);
  const change = projectedHF - currentHF;
  const changePercent = currentHF !== Infinity && currentHF > 0 ? (change / currentHF) * 100 : 0;

  return {
    currentHealthFactor: currentHF,
    projectedHealthFactor: projectedHF,
    change,
    changePercent,
    currentStatus: getHealthFactorStatus(currentHF),
    projectedStatus: getHealthFactorStatus(projectedHF),
    totalCollateralValue: deposits.reduce((sum, d) => sum + d.valueUSD, 0),
    totalBorrowValue: simulatedBorrows.reduce((sum, b) => sum + b.valueUSD, 0),
    isSafe: true, // Repaying always improves safety
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get health factor status category
 */
export function getHealthFactorStatus(
  healthFactor: number
): 'safe' | 'warning' | 'danger' | 'liquidatable' {
  if (healthFactor < 1.0) return 'liquidatable';
  if (healthFactor < 1.2) return 'danger';
  if (healthFactor < 1.5) return 'warning';
  return 'safe';
}

/**
 * Get color for health factor display
 */
export function getHealthFactorColor(healthFactor: number): string {
  if (healthFactor < 1.0) return '#ef4444'; // Red
  if (healthFactor < 1.2) return '#f97316'; // Orange
  if (healthFactor < 1.5) return '#f59e0b'; // Yellow
  return '#10b981'; // Green
}

/**
 * Format health factor for display
 */
export function formatHealthFactor(healthFactor: number): string {
  if (healthFactor === Infinity || healthFactor > 999) {
    return '∞';
  }
  return healthFactor.toFixed(2);
}

export default {
  calculateHealthFactor,
  calculateCurrentLTV,
  calculateBorrowingPower,
  calculatePortfolioRisk,
  calculateUtilizationRate,
  calculateBorrowAPR,
  calculateSupplyAPR,
  calculateMaxSafeWithdrawal,
  calculateMaxSafeBorrow,
  simulateSupplyHealthFactor,
  simulateWithdrawHealthFactor,
  simulateBorrowHealthFactor,
  simulateRepayHealthFactor,
  getHealthFactorStatus,
  getHealthFactorColor,
  formatHealthFactor,
};
