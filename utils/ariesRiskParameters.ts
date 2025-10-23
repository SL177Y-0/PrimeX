/**
 * Aries Markets Risk Parameter Display Utilities
 * Formats and displays risk parameters from reserve configs
 */

export interface RiskParameters {
  maxLTV: number; // Maximum Loan-to-Value ratio (%)
  liquidationThreshold: number; // Liquidation threshold (%)
  liquidationPenalty: number; // Liquidation bonus/penalty (%)
  liquidationFee: number; // Protocol liquidation fee (%)
  borrowFactor: number; // Borrow risk adjustment factor (%)
  reserveRatio: number; // Reserve factor (%)
  borrowFee: number; // Borrow fee (%)
  withdrawFee: number; // Withdraw fee (%)
  flashLoanFee: number; // Flash loan fee (%)
}

export interface ReserveConfig {
  loan_to_value: number;
  liquidation_threshold: number;
  liquidation_bonus_bips: number;
  liquidation_fee_hundredth_bips: number;
  borrow_factor: number;
  reserve_ratio: number;
  borrow_fee_hundredth_bips: number;
  withdraw_fee_hundredth_bips: number;
  flash_loan_fee_hundredth_bips: number;
  deposit_limit: number;
  borrow_limit: number;
  allow_collateral: boolean;
  allow_redeem: boolean;
}

/**
 * Parse reserve config to human-readable risk parameters
 */
export function parseRiskParameters(config: ReserveConfig): RiskParameters {
  return {
    maxLTV: config.loan_to_value / 100, // Convert from basis points (10000 = 100%)
    liquidationThreshold: config.liquidation_threshold / 100,
    liquidationPenalty: config.liquidation_bonus_bips / 10000, // From bips (10000 = 100%)
    liquidationFee: config.liquidation_fee_hundredth_bips / 100000, // From hundredth bips
    borrowFactor: config.borrow_factor / 100,
    reserveRatio: config.reserve_ratio / 100,
    borrowFee: config.borrow_fee_hundredth_bips / 100000,
    withdrawFee: config.withdraw_fee_hundredth_bips / 100000,
    flashLoanFee: config.flash_loan_fee_hundredth_bips / 100000,
  };
}

/**
 * Format risk parameter for display
 */
export function formatRiskParameter(value: number, decimals: number = 2): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Get LTV color indicator
 */
export function getLTVColor(ltv: number): 'success' | 'warning' | 'danger' {
  if (ltv >= 80) return 'danger'; // High risk
  if (ltv >= 60) return 'warning'; // Medium risk
  return 'success'; // Low risk
}

/**
 * Get liquidation threshold color
 */
export function getLiquidationThresholdColor(threshold: number): 'success' | 'warning' | 'danger' {
  if (threshold <= 75) return 'danger'; // Low threshold = higher risk
  if (threshold <= 85) return 'warning';
  return 'success'; // High threshold = safer
}

/**
 * Calculate safety buffer between LTV and liquidation threshold
 */
export function calculateSafetyBuffer(ltv: number, liquidationThreshold: number): number {
  return liquidationThreshold - ltv;
}

/**
 * Get safety buffer color
 */
export function getSafetyBufferColor(buffer: number): 'success' | 'warning' | 'danger' {
  if (buffer >= 10) return 'success'; // Good buffer
  if (buffer >= 5) return 'warning'; // Tight buffer
  return 'danger'; // Very tight buffer
}

/**
 * Calculate effective liquidation penalty for user
 * (What user loses when liquidated)
 */
export function calculateEffectiveLiquidationPenalty(
  liquidationBonus: number,
  liquidationFee: number
): number {
  return liquidationBonus + liquidationFee;
}

/**
 * Format limits for display
 */
export function formatLimit(limit: number, decimals: number): string {
  if (limit === 0) return 'Unlimited';
  
  // Convert from raw units (assuming 8 decimals for most assets)
  const formattedLimit = limit / Math.pow(10, decimals);
  
  if (formattedLimit >= 1_000_000) {
    return `${(formattedLimit / 1_000_000).toFixed(2)}M`;
  } else if (formattedLimit >= 1_000) {
    return `${(formattedLimit / 1_000).toFixed(2)}K`;
  }
  
  return formattedLimit.toFixed(2);
}

/**
 * Check if reserve allows collateral
 */
export function canUseAsCollateral(config: ReserveConfig): boolean {
  return config.allow_collateral;
}

/**
 * Check if reserve allows redemption
 */
export function canRedeem(config: ReserveConfig): boolean {
  return config.allow_redeem;
}

/**
 * Get risk level description
 */
export function getRiskLevelDescription(ltv: number, liquidationThreshold: number): string {
  const buffer = calculateSafetyBuffer(ltv, liquidationThreshold);
  
  if (buffer >= 15) return 'Very Low Risk';
  if (buffer >= 10) return 'Low Risk';
  if (buffer >= 5) return 'Medium Risk';
  if (buffer >= 2) return 'High Risk';
  return 'Very High Risk';
}

/**
 * Calculate max borrowable amount based on LTV
 */
export function calculateMaxBorrowable(
  collateralValue: number,
  ltv: number
): number {
  return collateralValue * (ltv / 100);
}

/**
 * Calculate liquidation price
 * Price at which position becomes liquidatable
 */
export function calculateLiquidationPrice(
  collateralAmount: number,
  borrowAmount: number,
  liquidationThreshold: number,
  currentPrice: number
): number {
  if (collateralAmount === 0) return 0;
  
  // Liquidation occurs when: collateral_value * liq_threshold = borrow_value
  // collateral_amount * price * liq_threshold = borrow_amount * price
  // Solving for price: price = borrow_amount / (collateral_amount * liq_threshold)
  
  const liquidationPrice = borrowAmount / (collateralAmount * (liquidationThreshold / 100));
  return liquidationPrice;
}

/**
 * Calculate distance to liquidation (%)
 */
export function calculateDistanceToLiquidation(
  currentPrice: number,
  liquidationPrice: number
): number {
  if (liquidationPrice === 0) return Infinity;
  
  const distance = ((currentPrice - liquidationPrice) / currentPrice) * 100;
  return Math.max(0, distance);
}

/**
 * Get distance to liquidation color
 */
export function getDistanceToLiquidationColor(distance: number): 'success' | 'warning' | 'danger' {
  if (distance >= 30) return 'success'; // Safe
  if (distance >= 15) return 'warning'; // Caution
  return 'danger'; // Danger
}

/**
 * Format fee for display
 */
export function formatFee(fee: number): string {
  if (fee === 0) return 'No Fee';
  if (fee < 0.01) return `${(fee * 100).toFixed(4)}%`;
  return `${fee.toFixed(2)}%`;
}

/**
 * Calculate total cost of borrowing (APR + fees)
 */
export function calculateTotalBorrowCost(
  borrowAPR: number,
  borrowFee: number,
  flashLoanFee: number = 0
): number {
  return borrowAPR + borrowFee + flashLoanFee;
}

/**
 * Risk parameter summary for UI display
 */
export interface RiskParameterSummary {
  parameters: RiskParameters;
  safetyBuffer: number;
  safetyBufferColor: 'success' | 'warning' | 'danger';
  riskLevel: string;
  ltvColor: 'success' | 'warning' | 'danger';
  liquidationThresholdColor: 'success' | 'warning' | 'danger';
  effectiveLiquidationPenalty: number;
  canUseAsCollateral: boolean;
  canRedeem: boolean;
}

/**
 * Get complete risk parameter summary
 */
export function getRiskParameterSummary(config: ReserveConfig): RiskParameterSummary {
  const parameters = parseRiskParameters(config);
  const safetyBuffer = calculateSafetyBuffer(parameters.maxLTV, parameters.liquidationThreshold);
  
  return {
    parameters,
    safetyBuffer,
    safetyBufferColor: getSafetyBufferColor(safetyBuffer),
    riskLevel: getRiskLevelDescription(parameters.maxLTV, parameters.liquidationThreshold),
    ltvColor: getLTVColor(parameters.maxLTV),
    liquidationThresholdColor: getLiquidationThresholdColor(parameters.liquidationThreshold),
    effectiveLiquidationPenalty: calculateEffectiveLiquidationPenalty(
      parameters.liquidationPenalty,
      parameters.liquidationFee
    ),
    canUseAsCollateral: canUseAsCollateral(config),
    canRedeem: canRedeem(config),
  };
}

export default {
  parseRiskParameters,
  formatRiskParameter,
  getLTVColor,
  getLiquidationThresholdColor,
  calculateSafetyBuffer,
  getSafetyBufferColor,
  calculateEffectiveLiquidationPenalty,
  formatLimit,
  canUseAsCollateral,
  canRedeem,
  getRiskLevelDescription,
  calculateMaxBorrowable,
  calculateLiquidationPrice,
  calculateDistanceToLiquidation,
  getDistanceToLiquidationColor,
  formatFee,
  calculateTotalBorrowCost,
  getRiskParameterSummary,
};
