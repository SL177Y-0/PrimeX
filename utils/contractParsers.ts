/**
 * Contract Response Parsers
 * Utilities to parse Move contract responses into TypeScript types
 */

import { getAssetMetadata } from '../config/ariesAssets';

// Parse Decimal type from contract (u128 with 18 decimals)
export function parseDecimal(raw: string | number): number {
  const value = typeof raw === 'string' ? BigInt(raw) : BigInt(raw);
  return Number(value) / 1e18;
}

// Parse percentage (u8 representing percentage)
export function parsePercentage(raw: number): number {
  return raw; // Already in percentage form (e.g., 80 = 80%)
}

// Parse basis points to percentage
export function parseBasisPoints(raw: number): number {
  return raw / 100; // 10000 bps = 100%
}

// Parse hundredth basis points to percentage
export function parseHundredthBasisPoints(raw: number): number {
  return raw / 10000; // 1000000 = 100%
}

// Parse Reserve Config from contract response
export interface ParsedReserveConfig {
  loanToValue: number;
  liquidationThreshold: number;
  liquidationBonusBips: number;
  liquidationFeeHundredthBips: number;
  borrowFactor: number;
  reserveRatio: number;
  borrowFeeHundredthBips: number;
  withdrawFeeHundredthBips: number;
  depositLimit: number;
  borrowLimit: number;
  allowCollateral: boolean;
  allowRedeem: boolean;
  flashLoanFeeHundredthBips: number;
}

export function parseReserveConfig(raw: any): ParsedReserveConfig {
  return {
    loanToValue: parsePercentage(raw.loan_to_value || raw.loanToValue || 80),
    liquidationThreshold: parsePercentage(raw.liquidation_threshold || raw.liquidationThreshold || 85),
    liquidationBonusBips: raw.liquidation_bonus_bips || raw.liquidationBonusBips || 500,
    liquidationFeeHundredthBips: raw.liquidation_fee_hundredth_bips || raw.liquidationFeeHundredthBips || 0,
    borrowFactor: parsePercentage(raw.borrow_factor || raw.borrowFactor || 100),
    reserveRatio: parsePercentage(raw.reserve_ratio || raw.reserveRatio || 10),
    borrowFeeHundredthBips: raw.borrow_fee_hundredth_bips || raw.borrowFeeHundredthBips || 1000,
    withdrawFeeHundredthBips: raw.withdraw_fee_hundredth_bips || raw.withdrawFeeHundredthBips || 0,
    depositLimit: Number(raw.deposit_limit || raw.depositLimit || 0),
    borrowLimit: Number(raw.borrow_limit || raw.borrowLimit || 0),
    allowCollateral: raw.allow_collateral ?? raw.allowCollateral ?? true,
    allowRedeem: raw.allow_redeem ?? raw.allowRedeem ?? true,
    flashLoanFeeHundredthBips: raw.flash_loan_fee_hundredth_bips || raw.flashLoanFeeHundredthBips || 3000,
  };
}

// Parse Interest Rate Config
export interface ParsedInterestRateConfig {
  baseRate: number;
  slope1: number;
  slope2: number;
  optimalUtilization: number;
}

export function parseInterestRateConfig(raw: any): ParsedInterestRateConfig {
  return {
    baseRate: parseDecimal(raw.base_rate || raw.baseRate || 0),
    slope1: parseDecimal(raw.slope1 || 0),
    slope2: parseDecimal(raw.slope2 || 0),
    optimalUtilization: parseDecimal(raw.optimal_utilization || raw.optimalUtilization || 0.8e18),
  };
}

// Calculate current APR from interest rate model
export function calculateAPR(
  config: ParsedInterestRateConfig,
  utilization: number
): number {
  const optimalUtil = config.optimalUtilization;
  
  if (utilization <= optimalUtil) {
    // Below optimal: baseRate + (utilization / optimal) * slope1
    const ratio = utilization / optimalUtil;
    return (config.baseRate + ratio * config.slope1) * 100;
  } else {
    // Above optimal: baseRate + slope1 + ((utilization - optimal) / (1 - optimal)) * slope2
    const ratio = (utilization - optimalUtil) / (1 - optimalUtil);
    return (config.baseRate + config.slope1 + ratio * config.slope2) * 100;
  }
}

// Parse Reserve Details
export interface ParsedReserveDetails {
  totalCashAvailable: number;
  totalBorrowedShare: number;
  totalBorrowed: number;
  initialExchangeRate: number;
  reserveAmount: number;
  interestAccrueTimestamp: number;
  utilization: number;
  supplyAPR: number;
  borrowAPR: number;
}

export function parseReserveDetails(
  raw: any,
  config: ParsedReserveConfig,
  interestConfig: ParsedInterestRateConfig
): ParsedReserveDetails {
  const totalCash = Number(raw.total_cash_available || raw.totalCashAvailable || 0);
  const totalBorrowed = parseDecimal(raw.total_borrowed_decimal || raw.totalBorrowed || 0);
  const totalSupply = totalCash + totalBorrowed;
  
  const utilization = totalSupply > 0 ? totalBorrowed / totalSupply : 0;
  const borrowAPR = calculateAPR(interestConfig, utilization);
  const supplyAPR = borrowAPR * utilization * (1 - config.reserveRatio / 100);
  
  return {
    totalCashAvailable: totalCash,
    totalBorrowedShare: parseDecimal(raw.total_borrowed_share_decimal || raw.totalBorrowedShare || 0),
    totalBorrowed,
    initialExchangeRate: parseDecimal(raw.initial_exchange_rate_decimal || raw.initialExchangeRate || 1e18),
    reserveAmount: parseDecimal(raw.reserve_amount_decimal || raw.reserveAmount || 0),
    interestAccrueTimestamp: Number(raw.interest_accrue_timestamp || raw.interestAccrueTimestamp || 0),
    utilization: utilization * 100,
    supplyAPR,
    borrowAPR,
  };
}

// Parse User Deposit Position
export interface ParsedDeposit {
  coinType: string;
  collateralAmount: number;
  lpAmount: number;
}

export function parseDeposit(raw: any, coinType: string): ParsedDeposit {
  return {
    coinType,
    collateralAmount: Number(raw.collateral_amount || raw.collateralAmount || 0),
    lpAmount: Number(raw.lp_amount || raw.lpAmount || 0),
  };
}

// Parse User Loan Position
export interface ParsedLoan {
  coinType: string;
  borrowedShare: number;
}

export function parseLoan(raw: any, coinType: string): ParsedLoan {
  return {
    coinType,
    borrowedShare: parseDecimal(raw.borrowed_share || raw.borrowedShare || 0),
  };
}

// Convert LP amount to underlying amount
export function lpToUnderlying(
  lpAmount: number,
  totalLpSupply: number,
  totalUnderlying: number
): number {
  if (totalLpSupply === 0) return 0;
  return (lpAmount / totalLpSupply) * totalUnderlying;
}

// Convert borrow share to borrow amount
export function shareToAmount(
  share: number,
  totalShare: number,
  totalBorrowed: number
): number {
  if (totalShare === 0) return 0;
  return (share / totalShare) * totalBorrowed;
}

// Parse Reward Config
export interface ParsedRewardConfig {
  rewardPerDay: number;
  remainingReward: number;
  rewardPerShare: number;
}

export function parseRewardConfig(raw: any): ParsedRewardConfig {
  return {
    rewardPerDay: Number(raw.reward_per_day || raw.rewardPerDay || 0),
    remainingReward: Number(raw.remaining_reward || raw.remainingReward || 0),
    rewardPerShare: parseDecimal(raw.reward_per_share || raw.rewardPerShare || 0),
  };
}

// Parse complete reserve data
export interface CompleteReserveData {
  coinType: string;
  config: ParsedReserveConfig;
  interestConfig: ParsedInterestRateConfig;
  details: ParsedReserveDetails;
}

export function parseCompleteReserve(
  coinType: string,
  rawConfig: any,
  rawInterestConfig: any,
  rawDetails: any
): CompleteReserveData {
  const config = parseReserveConfig(rawConfig);
  const interestConfig = parseInterestRateConfig(rawInterestConfig);
  const details = parseReserveDetails(rawDetails, config, interestConfig);
  
  return {
    coinType,
    config,
    interestConfig,
    details,
  };
}

// Helper to safely parse contract responses
export function safeParseResponse<T>(
  parser: () => T,
  fallback: T,
  errorContext: string
): T {
  try {
    return parser();
  } catch (error) {
    console.error(`[ContractParser] ${errorContext}:`, error);
    return fallback;
  }
}

export default {
  parseDecimal,
  parsePercentage,
  parseBasisPoints,
  parseHundredthBasisPoints,
  parseReserveConfig,
  parseInterestRateConfig,
  calculateAPR,
  parseReserveDetails,
  parseDeposit,
  parseLoan,
  lpToUnderlying,
  shareToAmount,
  parseRewardConfig,
  parseCompleteReserve,
  safeParseResponse,
};
