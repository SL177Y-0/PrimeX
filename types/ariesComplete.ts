/**
 * Aries Markets Complete Type Definitions
 * Production-ready TypeScript interfaces for all protocol data structures
 * 
 * Based on Move smart contract structs and official Aries Markets implementation
 */

// ============================================================================
// CORE PROTOCOL TYPES
// ============================================================================

/**
 * Complete reserve data including state and configuration
 */
export interface AriesReserve {
  // Asset Identification
  coinType: string;
  symbol: string;
  name: string;
  decimals: number;
  logoUrl?: string;
  
  // Pool Type
  isPaired: boolean;
  isStablecoin: boolean;
  
  // Financial State (from ReserveDetails)
  totalLiquidity: string;        // Total supplied assets (in base units)
  totalBorrowed: string;          // Total borrowed assets (in base units)
  totalLpSupply: string;          // Total LP tokens minted
  cashAvailable: string;          // Available liquidity for borrowing
  reserveAmount: string;          // Protocol reserves
  
  // Exchange Rate
  exchangeRate: string;           // LP token to underlying asset exchange rate
  
  // Risk Parameters (from ReserveConfig)
  loanToValue: number;            // 0-1 (e.g., 0.75 = 75%)
  ltv: number;                    // Alias for loanToValue (for UI convenience)
  liquidationThreshold: number;    // 0-1
  borrowFactor: number;            // 0-1
  liquidationBonus: number;        // 0-1 (e.g., 0.05 = 5%)
  reserveFactor: number;           // 0-1
  
  // Fees
  borrowFeeHundredthBips: number;
  flashLoanFeeHundredthBips: number;
  withdrawFeeHundredthBips: number;
  
  // Limits
  depositLimit: string;
  borrowLimit: string;
  
  // Flags
  allowCollateral: boolean;
  allowRedeem: boolean;
  
  // Interest Rate Model (from InterestRateConfig)
  interestRateConfig: InterestRateConfig;
  
  // Computed Metrics
  utilization: number;             // 0-1 (current utilization rate)
  supplyAPR: number;               // Annual supply rate (decimal, e.g., 0.05 = 5%)
  borrowAPR: number;               // Annual borrow rate
  
  // USD Values (enriched with prices)
  priceUSD?: number;
  totalSuppliedUSD?: number;
  totalBorrowedUSD?: number;
  totalSupplied?: string;          // Total supplied in token amount (display format)
  availableLiquidityUSD?: number;
  
  // E-Mode
  emodeCategory?: string;
}

/**
 * Interest rate model configuration
 */
export interface InterestRateConfig {
  minBorrowRate: number;          // Minimum borrow APR (0-1)
  optimalBorrowRate: number;      // APR at optimal utilization
  maxBorrowRate: number;          // Maximum borrow APR
  optimalUtilization: number;     // Optimal utilization rate (0-1, typically 0.8)
}

/**
 * Reserve configuration (risk parameters)
 */
export interface ReserveConfig {
  loanToValue: number;                    // Basis points (0-10000)
  liquidationThreshold: number;            // Basis points
  liquidationBonusBips: number;           // Basis points
  liquidationFeeHundredthBips: number;    // Hundredth basis points
  borrowFactor: number;                   // Basis points
  reserveRatio: number;                   // Basis points
  borrowFeeHundredthBips: number;
  withdrawFeeHundredthBips: number;
  depositLimit: string;
  borrowLimit: string;
  allowCollateral: boolean;
  allowRedeem: boolean;
  flashLoanFeeHundredthBips: number;
}

// ============================================================================
// USER POSITION TYPES
// ============================================================================

/**
 * User's deposit/supply position for a single asset
 */
export interface DepositPosition {
  coinType: string;
  symbol: string;
  decimals: number;
  
  // Amounts
  lpAmount: string;               // LP tokens held (in base units)
  underlyingAmount: string;       // Underlying asset amount (in base units)
  
  // Display amounts (converted from base units)
  lpAmountDisplay: number;
  underlyingAmountDisplay: number;
  
  // USD Value
  priceUSD: number;
  valueUSD: number;
  
  // Risk Parameters
  loanToValue: number;
  liquidationThreshold: number;
  
  // Collateral Status
  isCollateral: boolean;
  
  // APR & Interest
  currentAPR: number;
  earnedInterestDisplay: number;
}

/**
 * User's borrow position for a single asset
 */
export interface BorrowPosition {
  coinType: string;
  symbol: string;
  decimals: number;
  
  // Amounts
  borrowedAmount: string;         // Total debt (in base units)
  borrowShare: string;            // User's share of total borrows
  
  // Display amounts
  borrowedAmountDisplay: number;
  
  // USD Value
  priceUSD: number;
  valueUSD: number;
  
  // Risk Parameters
  borrowFactor: number;
  
  // APR & Interest
  currentAPR: number;
  accruedInterestDisplay: number;
}

/**
 * Complete user portfolio
 */
export interface UserPortfolio {
  userAddress: string;
  profileName: string;
  poolType: 'paired' | 'isolated';
  
  // Positions
  deposits: DepositPosition[];
  borrows: BorrowPosition[];
  
  // Aggregated Metrics
  totalSuppliedUSD: number;
  totalBorrowedUSD: number;
  netBalanceUSD: number;
  netAPR: number;
  
  // Risk Metrics
  riskMetrics: RiskMetrics;
  
  // Rewards
  rewards: UserReward[];
  totalRewardsUSD: number;
  
  // E-Mode
  emodeCategory?: string;
  emodeEnabled: boolean;
}

/**
 * Comprehensive risk metrics
 */
export interface RiskMetrics {
  healthFactor: number;              // Current health factor (Infinity if no borrows)
  currentLTV: number;                // Current loan-to-value ratio (0-1)
  liquidationLTV: number;            // LTV at which liquidation occurs
  borrowCapacityUSD: number;         // Available borrowing power in USD
  borrowCapacityUsed: number;        // Percentage of capacity used (0-1)
  status: 'safe' | 'warning' | 'danger' | 'liquidatable';
  statusColor: string;               // Color for UI display
  
  // Detailed breakdown
  totalCollateralValueUSD: number;
  totalBorrowValueUSD: number;
  weightedCollateralUSD: number;     // Collateral × liquidation threshold
  adjustedBorrowUSD: number;         // Borrow / borrow factor
}

/**
 * User reward position
 */
export interface UserReward {
  coinType: string;
  symbol: string;
  amount: string;                    // Claimable amount (in base units)
  amountDisplay: number;
  priceUSD: number;
  valueUSD: number;
  rewardType: 'deposit' | 'borrow';
  farmType: 'DepositFarming' | 'BorrowFarming';
}

// ============================================================================
// TRANSACTION PARAMETER TYPES
// ============================================================================

/**
 * Parameters for supply/deposit transaction
 */
export interface SupplyParams {
  coinType: string;
  profileName: string;
  amount: string;                    // Amount in base units
  repayOnly?: boolean;               // If true, only repays debt
  useAsCollateral?: boolean;         // If true, enables as collateral
  signAndSubmitTx?: (transaction: any) => Promise<{ hash: string }>;  // Wallet signing function
}

/**
 * Parameters for withdraw transaction
 */
export interface WithdrawParams {
  coinType: string;
  profileName: string;
  amount: string;
  allowBorrow?: boolean;             // If true, can borrow if insufficient collateral
  signAndSubmitTx?: (transaction: any) => Promise<{ hash: string }>;  // Wallet signing function
}

/**
 * Parameters for borrow transaction
 */
export interface BorrowParams {
  coinType: string;
  profileName: string;
  amount: string;
  signAndSubmitTx?: (transaction: any) => Promise<{ hash: string }>;  // Wallet signing function
}

/**
 * Parameters for repay transaction
 */
export interface RepayParams {
  coinType: string;
  profileName: string;
  amount: string;
  repayAll?: boolean;                // If true, repays entire debt
  signAndSubmitTx?: (transaction: any) => Promise<{ hash: string }>;  // Wallet signing function
}

/**
 * Parameters for claim reward transaction
 */
export interface ClaimRewardParams {
  profileName: string;
  reserveCoinType: string;
  farmingType: 'DepositFarming' | 'BorrowFarming';
  rewardCoinType: string;
}

/**
 * Parameters for E-Mode transaction
 */
export interface EModeParams {
  profileName: string;
  categoryId: string;
  enable: boolean;
}

// ============================================================================
// HEALTH FACTOR SIMULATION TYPES
// ============================================================================

/**
 * Health factor simulation result
 */
export interface HealthFactorSimulation {
  currentHealthFactor: number;
  projectedHealthFactor: number;
  change: number;                    // Change in health factor
  changePercent: number;             // Percentage change
  
  currentStatus: 'safe' | 'warning' | 'danger' | 'liquidatable';
  projectedStatus: 'safe' | 'warning' | 'danger' | 'liquidatable';
  
  totalCollateralValue: number;
  totalBorrowValue: number;
  
  isSafe: boolean;                   // true if projected HF >= 1.0
  warning?: string;                  // Warning message if risky
}

/**
 * Maximum safe amount calculation result
 */
export interface MaxSafeAmount {
  maxAmount: string;                 // In base units
  maxAmountDisplay: number;
  maxAmountUSD: number;
  resultingHealthFactor: number;
  targetHealthFactor: number;        // Target HF used in calculation
}

// ============================================================================
// E-MODE TYPES
// ============================================================================

/**
 * E-Mode category definition
 */
export interface EModeCategory {
  categoryId: string;
  label: string;
  loanToValue: number;
  liquidationThreshold: number;
  liquidationBonus: number;
  oracleKeyType: string;
  assets: string[];                  // Eligible asset symbols
}

// ============================================================================
// EVENT TYPES
// ============================================================================

/**
 * Aries protocol event
 */
export interface AriesEvent {
  type: 'supply' | 'withdraw' | 'borrow' | 'repay' | 'liquidation' | 'claim_reward';
  timestamp: number;
  userAddress: string;
  profileName: string;
  coinType: string;
  amount: string;
  txHash: string;
  blockHeight: number;
}

// ============================================================================
// ANALYTICS & CHART DATA TYPES
// ============================================================================

/**
 * APR history data point
 */
export interface APRDataPoint {
  timestamp: number;
  supplyAPR: number;
  borrowAPR: number;
  utilization: number;
}

/**
 * Utilization chart data
 */
export interface UtilizationChartData {
  currentUtilization: number;
  optimalUtilization: number;
  utilizationPoints: number[];       // Utilization values (0-100)
  borrowRatePoints: number[];        // Corresponding borrow rates
  supplyRatePoints: number[];        // Corresponding supply rates
}

// ============================================================================
// PROTOCOL STATS TYPES
// ============================================================================

/**
 * Protocol-wide statistics
 */
export interface AriesProtocolStats {
  totalValueLockedUSD: number;
  totalSuppliedUSD: number;
  totalBorrowedUSD: number;
  totalReserves: number;
  averageUtilization: number;
  totalUsers: number;
  pairedPoolsCount: number;
  isolatedPoolsCount: number;
  
  // Top assets
  topSuppliedAssets: Array<{ symbol: string; valueUSD: number }>;
  topBorrowedAssets: Array<{ symbol: string; valueUSD: number }>;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

/**
 * Aries protocol error
 */
export interface AriesError {
  code: string;
  message: string;
  details?: any;
  recoverable: boolean;
}

/**
 * Transaction error
 */
export interface TransactionError extends AriesError {
  txHash?: string;
  failureReason?: string;
}

// ============================================================================
// VALIDATION TYPES
// ============================================================================

/**
 * Input validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Transaction validation result
 */
export interface TransactionValidation extends ValidationResult {
  canProceed: boolean;
  estimatedGas?: string;
  healthFactorImpact?: HealthFactorSimulation;
}

// ============================================================================
// CACHE TYPES
// ============================================================================

/**
 * Cache entry with TTL
 */
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

/**
 * Price cache entry
 */
export interface PriceCacheEntry extends CacheEntry<number> {
  coinType: string;
  source: 'coingecko' | 'pyth' | 'switchboard' | 'mock';
}

// ============================================================================
// SERVICE LAYER TYPES
// ============================================================================

/**
 * RPC request options
 */
export interface RPCOptions {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

/**
 * Batch query result
 */
export interface BatchQueryResult<T> {
  success: T[];
  failed: Array<{ id: string; error: Error }>;
}

// ============================================================================
// HOOK RETURN TYPES
// ============================================================================

/**
 * Main useAriesLending hook return type
 */
export interface UseAriesLending {
  // Profile State
  hasProfile: boolean;
  profileName: string | null;
  isInitializing: boolean;
  initializeProfile: (name: string, referrer?: string, signAndSubmitTx?: (transaction: any) => Promise<{ hash: string }>) => Promise<void>;
  
  // Reserve Data
  reserves: AriesReserve[];
  reservesLoading: boolean;
  reservesError: Error | null;
  fetchReserves: () => Promise<void>;
  
  // Portfolio Data
  portfolio: UserPortfolio | null;
  portfolioLoading: boolean;
  portfolioError: Error | null;
  fetchPortfolio: () => Promise<void>;
  
  // Transaction Functions
  supply: (params: SupplyParams) => Promise<string>;
  withdraw: (params: WithdrawParams) => Promise<string>;
  borrow: (params: BorrowParams) => Promise<string>;
  repay: (params: RepayParams) => Promise<string>;
  claimReward: (params: ClaimRewardParams) => Promise<string>;
  enableEMode: (params: EModeParams) => Promise<string>;
  
  // Utility Functions
  getMaxWithdraw: (coinType: string) => MaxSafeAmount | null;
  getMaxBorrow: (coinType: string) => MaxSafeAmount | null;
  simulateSupply: (params: SupplyParams) => HealthFactorSimulation | null;
  simulateWithdraw: (params: WithdrawParams) => HealthFactorSimulation | null;
  simulateBorrow: (params: BorrowParams) => HealthFactorSimulation | null;
  simulateRepay: (params: RepayParams) => HealthFactorSimulation | null;
  
  // UI State
  txPending: boolean;
  txHash: string | null;
  error: Error | null;
  
  // Control
  refresh: () => Promise<void>;
  clearError: () => void;
}

export default {
  // Export all types for convenience
};
