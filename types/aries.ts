/**
 * Aries Markets Lending & Borrowing Type Definitions
 * 
 * Based on Aries Protocol smart contract structures
 * Contract: 0x9770fa9c725cbd97eb50b2be5f7416efdfd1f1554beb0750d4dae4c64e860da3
 */

// ============================================================================
// Core Protocol Types
// ============================================================================

export interface AriesReserve {
  coinType: string;
  name: string;
  symbol: string;
  decimals: number;
  
  // Core financial state
  totalLpSupply: string;
  totalBorrowed: string;
  totalBorrowedShare: string;
  totalCashAvailable: string;
  reserveAmount: string;
  initialExchangeRate: string;
  
  // Interest rate model
  interestRateConfig: InterestRateConfig;
  
  // Risk parameters
  reserveConfig: ReserveConfig;
  
  // Oracle price
  price?: string;
  priceUSD?: number;
  
  // Computed metrics
  utilization: number;
  supplyAPR: number;
  borrowAPR: number;
  totalSupplyUSD?: number;
  totalBorrowedUSD?: number;
  availableLiquidityUSD?: number;
}

export interface InterestRateConfig {
  minBorrowRate: number;
  optimalBorrowRate: number;
  maxBorrowRate: number;
  optimalUtilization: number;
}

export interface ReserveConfig {
  loanToValue: number; // in basis points (7500 = 75%)
  liquidationThreshold: number; // in basis points
  liquidationBonusBips: number;
  liquidationFeeHundredthBips: number;
  borrowFactor: number;
  reserveRatio: number;
  borrowFeeHundredthBips: number;
  withdrawFeeHundredthBips: number;
  depositLimit: string;
  borrowLimit: string;
  allowCollateral: boolean;
  allowRedeem: boolean;
  flashLoanFeeHundredthBips: number;
}

export interface AriesPool {
  poolId: string;
  name: string;
  type: 'paired' | 'isolated';
  reserves: AriesReserve[];
  totalValueLockedUSD: number;
  totalBorrowedUSD: number;
  averageUtilization: number;
}

// ============================================================================
// User Position Types
// ============================================================================

export interface UserSupplyPosition {
  coinType: string;
  symbol: string;
  amountSupplied: string;
  amountSuppliedUSD: number;
  lpTokenBalance: string;
  earnedInterest: string;
  currentAPR: number;
}

export interface UserBorrowPosition {
  coinType: string;
  symbol: string;
  amountBorrowed: string;
  amountBorrowedUSD: number;
  borrowShare: string;
  accruedInterest: string;
  currentAPR: number;
}

export interface UserPortfolio {
  userAddress: string;
  poolType: 'paired' | 'isolated';
  supplies: UserSupplyPosition[];
  borrows: UserBorrowPosition[];
  totalSuppliedUSD: number;
  totalBorrowedUSD: number;
  healthFactor: number;
  netAPR: number;
  netBalanceUSD: number;
  rewards: UserReward[];
}

export interface UserReward {
  tokenAddress: string;
  symbol: string;
  amount: string;
  amountUSD: number;
  rewardType: 'deposit' | 'borrow';
}

// ============================================================================
// Chart & Historical Data
// ============================================================================

export interface APRDataPoint {
  timestamp: number;
  supplyAPR: number;
  borrowAPR: number;
  utilization: number;
}

export interface UtilizationChartData {
  currentUtilization: number;
  optimalUtilization: number;
  borrowRate: number;
  supplyRate: number;
}

// ============================================================================
// Protocol Analytics
// ============================================================================

export interface AriesProtocolStats {
  totalValueLockedUSD: number;
  totalSuppliedUSD: number;
  totalBorrowedUSD: number;
  totalReserves: number;
  averageUtilization: number;
  totalUsers: number;
  pairedPoolsCount: number;
  isolatedPoolsCount: number;
}

// ============================================================================
// Transaction Types
// ============================================================================

export interface AriesSupplyParams {
  coinType: string;
  amount: string;
  userAddress: string;
}

export interface AriesBorrowParams {
  coinType: string;
  amount: string;
  userAddress: string;
}

export interface AriesRepayParams {
  coinType: string;
  amount: string;
  userAddress: string;
}

export interface AriesWithdrawParams {
  coinType: string;
  amount: string;
  userAddress: string;
}

// ============================================================================
// Health Factor Simulation
// ============================================================================

export interface HealthFactorSimulation {
  currentHealthFactor: number;
  projectedHealthFactor: number;
  totalCollateralValue: number;
  totalBorrowValue: number;
  liquidationPrice?: number;
  safetyLevel: 'safe' | 'warning' | 'danger';
}

// ============================================================================
// E-Mode (Efficiency Mode) for correlated assets
// ============================================================================

export interface EModeCategory {
  categoryId: number;
  maxLTV: number;
  liquidationThreshold: number;
  liquidationBonus: number;
  label: string;
  assets: string[];
}

// ============================================================================
// Event Types
// ============================================================================

export interface AriesEvent {
  type: 'supply' | 'borrow' | 'repay' | 'withdraw' | 'liquidation';
  timestamp: number;
  userAddress: string;
  coinType: string;
  amount: string;
  txHash: string;
}

// ============================================================================
// Asset Metadata
// ============================================================================

export interface AriesAssetMetadata {
  coinType: string;
  symbol: string;
  name: string;
  decimals: number;
  logo?: string;
  isWrapped: boolean;
  underlyingAsset?: string;
}
