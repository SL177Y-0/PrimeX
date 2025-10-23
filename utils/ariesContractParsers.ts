/**
 * Aries Markets Contract Parsers
 * 
 * Utilities for parsing raw RPC responses from Aptos blockchain
 * into strongly-typed TypeScript objects.
 * 
 * All Move u128/u64 values are returned as strings from RPC and must be parsed.
 */

import { AriesReserve, ReserveConfig, InterestRateConfig, DepositPosition, BorrowPosition } from '../types/ariesComplete';
import { getAssetByCoinType, fromBaseUnits } from '../config/ariesAssetsComplete';

// ============================================================================
// DECIMAL & BASIS POINT PARSERS
// ============================================================================

/**
 * Parse a fixed-point decimal value from u128 string
 * 
 * Move stores decimals as u128 with a fixed number of decimal places (typically 18).
 * Example: 1.5 is stored as "1500000000000000000" (1.5 * 10^18)
 * 
 * @param value - Raw u128 string from RPC
 * @param decimals - Number of decimal places (default: 18)
 * @returns Normalized decimal number
 * 
 * @example
 * parseDecimal("1500000000000000000", 18) // Returns 1.5
 * parseDecimal("800000000000000000", 18)  // Returns 0.8
 */
export function parseDecimal(value: string | number, decimals: number = 18): number {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  
  try {
    const bigIntValue = BigInt(value);
    const divisor = BigInt(10 ** decimals);
    const integerPart = Number(bigIntValue / divisor);
    const fractionalPart = Number(bigIntValue % divisor) / Number(divisor);
    return integerPart + fractionalPart;
  } catch (error) {
    console.error('Failed to parse decimal:', value, error);
    return 0;
  }
}

/**
 * Parse basis points to decimal (0-1)
 * 
 * Basis points: 1 bp = 0.01%, so 10000 bp = 100%
 * Example: 7500 bp = 75% = 0.75
 * 
 * @param basisPoints - Value in basis points (0-10000)
 * @returns Decimal representation (0-1)
 * 
 * @example
 * parseBasisPoints(7500) // Returns 0.75 (75%)
 * parseBasisPoints(10000) // Returns 1.0 (100%)
 */
export function parseBasisPoints(basisPoints: number): number {
  return basisPoints / 10000;
}

/**
 * Parse hundredth basis points to decimal
 * 
 * Hundredth basis points: 1/100 of a basis point
 * Example: 10 hundredth bps = 0.1 bp = 0.001% = 0.00001
 * 
 * @param hundredthBps - Value in hundredth basis points
 * @returns Decimal representation
 */
export function parseHundredthBasisPoints(hundredthBps: number): number {
  return hundredthBps / 1000000;
}

// ============================================================================
// RESERVE PARSERS
// ============================================================================

/**
 * Parse ReserveConfig from raw RPC data
 * 
 * @param raw - Raw config data from blockchain
 * @returns Parsed ReserveConfig
 */
export function parseReserveConfig(raw: any): ReserveConfig {
  return {
    loanToValue: raw.ltv || raw.loan_to_value || 0,
    liquidationThreshold: raw.liquidation_threshold || 0,
    liquidationBonusBips: raw.liquidation_bonus_bips || raw.liquidation_bonus || 0,
    liquidationFeeHundredthBips: raw.liquidation_fee_hundredth_bips || 0,
    borrowFactor: raw.borrow_factor || 10000, // Default 1.0 (10000 bps)
    reserveRatio: raw.reserve_ratio || raw.reserve_factor || 0,
    borrowFeeHundredthBips: raw.borrow_fee_hundredth_bips || 0,
    withdrawFeeHundredthBips: raw.withdraw_fee_hundredth_bips || 0,
    depositLimit: raw.deposit_limit || '0',
    borrowLimit: raw.borrow_limit || '0',
    allowCollateral: raw.allow_collateral ?? true,
    allowRedeem: raw.allow_redeem ?? true,
    flashLoanFeeHundredthBips: raw.flash_loan_fee_hundredth_bips || 0,
  };
}

/**
 * Parse InterestRateConfig from raw RPC data
 * 
 * @param raw - Raw interest rate config
 * @returns Parsed InterestRateConfig
 */
export function parseInterestRateConfig(raw: any): InterestRateConfig {
  // Rates are typically stored as basis points or fixed-point
  return {
    minBorrowRate: parseDecimal(raw.min_borrow_rate || '0'),
    optimalBorrowRate: parseDecimal(raw.optimal_borrow_rate || '0'),
    maxBorrowRate: parseDecimal(raw.max_borrow_rate || '0'),
    optimalUtilization: parseDecimal(raw.optimal_utilization || '800000000000000000'), // Default 0.8
  };
}

/**
 * Parse complete reserve data from RPC response
 * 
 * Combines ReserveDetails, ReserveConfig, and InterestRateConfig
 * into a single AriesReserve object.
 * 
 * @param coinType - Full Move coin type
 * @param rawDetails - Raw reserve details from blockchain
 * @param rawConfig - Raw reserve config
 * @param rawInterestConfig - Raw interest rate config
 * @returns Complete AriesReserve object or null if parsing fails
 */
export function parseReserve(
  coinType: string,
  rawDetails: any,
  rawConfig: any,
  rawInterestConfig: any
): AriesReserve | null {
  try {
    const asset = getAssetByCoinType(coinType);
    if (!asset) {
      console.warn(`Unknown asset for coinType: ${coinType}`);
      return null;
    }

    const config = parseReserveConfig(rawConfig);
    const interestConfig = parseInterestRateConfig(rawInterestConfig);

    // Parse reserve state
    const totalLiquidity = rawDetails.total_liquidity || rawDetails.total_cash || '0';
    const totalBorrowed = rawDetails.total_borrowed || rawDetails.total_borrow || '0';
    const totalLpSupply = rawDetails.total_lp_supply || '0';
    const cashAvailable = rawDetails.cash_available || rawDetails.available_cash || '0';

    // Calculate utilization
    const totalLiquidityNum = parseFloat(totalLiquidity);
    const totalBorrowedNum = parseFloat(totalBorrowed);
    const totalSupply = totalLiquidityNum + totalBorrowedNum;
    const utilization = totalSupply > 0 ? totalBorrowedNum / totalSupply : 0;

    // Calculate APRs using interest rate model
    const borrowAPR = calculateBorrowAPRFromConfig(utilization, interestConfig);
    const reserveFactor = parseBasisPoints(config.reserveRatio);
    const supplyAPR = borrowAPR * utilization * (1 - reserveFactor);

    return {
      coinType,
      symbol: asset.symbol,
      name: asset.name,
      decimals: asset.decimals,
      logoUrl: asset.logoUrl,
      isPaired: asset.isPaired,
      isStablecoin: asset.isStablecoin,
      
      // State
      totalLiquidity,
      totalBorrowed,
      totalLpSupply,
      cashAvailable,
      reserveAmount: rawDetails.reserve_amount || '0',
      exchangeRate: rawDetails.exchange_rate || '1000000000000000000', // Default 1.0
      
      // Risk params (convert from basis points)
      loanToValue: parseBasisPoints(config.loanToValue),
      ltv: parseBasisPoints(config.loanToValue), // Alias for UI convenience
      liquidationThreshold: parseBasisPoints(config.liquidationThreshold),
      borrowFactor: parseBasisPoints(config.borrowFactor),
      liquidationBonus: parseBasisPoints(config.liquidationBonusBips),
      reserveFactor,
      
      // Fees
      borrowFeeHundredthBips: config.borrowFeeHundredthBips,
      flashLoanFeeHundredthBips: config.flashLoanFeeHundredthBips,
      withdrawFeeHundredthBips: config.withdrawFeeHundredthBips,
      
      // Limits
      depositLimit: config.depositLimit,
      borrowLimit: config.borrowLimit,
      
      // Flags
      allowCollateral: config.allowCollateral,
      allowRedeem: config.allowRedeem,
      
      // Interest rate model
      interestRateConfig: interestConfig,
      
      // Computed
      utilization,
      supplyAPR,
      borrowAPR,
      
      // Display format (will be enriched with USD values by service)
      totalSupplied: (totalLiquidityNum / (10 ** asset.decimals)).toFixed(2),
    };
  } catch (error) {
    console.error(`Failed to parse reserve for ${coinType}:`, error);
    return null;
  }
}

/**
 * Calculate borrow APR from interest rate config and utilization
 * 
 * Uses the kinked interest rate model:
 * - Below optimal: Linear interpolation from min to optimal rate
 * - Above optimal: Steeper linear interpolation to max rate
 * 
 * @param utilization - Current utilization rate (0-1)
 * @param config - Interest rate configuration
 * @returns Annual borrow rate (0-1, e.g., 0.05 = 5%)
 */
function calculateBorrowAPRFromConfig(
  utilization: number,
  config: InterestRateConfig
): number {
  const { minBorrowRate, optimalBorrowRate, maxBorrowRate, optimalUtilization } = config;

  if (utilization <= optimalUtilization) {
    // Below optimal: Linear interpolation
    return minBorrowRate + (optimalBorrowRate - minBorrowRate) * (utilization / optimalUtilization);
  } else {
    // Above optimal: Steeper slope
    return optimalBorrowRate + (maxBorrowRate - optimalBorrowRate) * 
           ((utilization - optimalUtilization) / (1 - optimalUtilization));
  }
}

// ============================================================================
// USER POSITION PARSERS
// ============================================================================

/**
 * Parse user deposit positions from profile data
 * 
 * @param depositsMap - Raw deposits table from Profile resource
 * @param exchangeRates - Map of coinType to exchange rate
 * @param prices - Map of coinType to USD price
 * @returns Array of DepositPosition objects
 */
export function parseUserDeposits(
  depositsMap: Record<string, any>,
  exchangeRates: Record<string, string>,
  prices: Record<string, number>
): DepositPosition[] {
  const positions: DepositPosition[] = [];

  for (const [coinType, depositData] of Object.entries(depositsMap)) {
    try {
      const asset = getAssetByCoinType(coinType);
      if (!asset) continue;

      const lpAmount = depositData.lp_amount || depositData.collateral_amount || '0';
      const exchangeRate = exchangeRates[coinType] || '1000000000000000000'; // Default 1.0
      
      // Calculate underlying amount: lpAmount * exchangeRate
      const lpAmountBigInt = BigInt(lpAmount);
      const exchangeRateBigInt = BigInt(exchangeRate);
      const underlyingAmount = (lpAmountBigInt * exchangeRateBigInt / BigInt(10 ** 18)).toString();
      
      // Convert to display amounts
      const lpAmountDisplay = fromBaseUnits(lpAmount, asset.decimals);
      const underlyingAmountDisplay = fromBaseUnits(underlyingAmount, asset.decimals);
      
      // Get price
      const priceUSD = prices[coinType] || 0;
      const valueUSD = underlyingAmountDisplay * priceUSD;
      
      positions.push({
        coinType,
        symbol: asset.symbol,
        decimals: asset.decimals,
        lpAmount,
        underlyingAmount,
        lpAmountDisplay,
        underlyingAmountDisplay,
        priceUSD,
        valueUSD,
        loanToValue: asset.loanToValue,
        liquidationThreshold: asset.liquidationThreshold,
        isCollateral: depositData.is_collateral ?? true,
        currentAPR: 0, // Will be enriched with reserve data
        earnedInterestDisplay: underlyingAmountDisplay - lpAmountDisplay, // Approximation
      });
    } catch (error) {
      console.error(`Failed to parse deposit for ${coinType}:`, error);
    }
  }

  return positions;
}

/**
 * Parse user borrow positions from profile data
 * 
 * @param borrowsMap - Raw borrows table from Profile resource
 * @param prices - Map of coinType to USD price
 * @returns Array of BorrowPosition objects
 */
export function parseUserBorrows(
  borrowsMap: Record<string, any>,
  prices: Record<string, number>
): BorrowPosition[] {
  const positions: BorrowPosition[] = [];

  for (const [coinType, borrowData] of Object.entries(borrowsMap)) {
    try {
      const asset = getAssetByCoinType(coinType);
      if (!asset) continue;

      const borrowedAmount = borrowData.borrowed_amount || borrowData.principal || '0';
      const borrowShare = borrowData.borrow_share || borrowData.share || '0';
      
      // Convert to display amount
      const borrowedAmountDisplay = fromBaseUnits(borrowedAmount, asset.decimals);
      
      // Get price
      const priceUSD = prices[coinType] || 0;
      const valueUSD = borrowedAmountDisplay * priceUSD;
      
      positions.push({
        coinType,
        symbol: asset.symbol,
        decimals: asset.decimals,
        borrowedAmount,
        borrowShare,
        borrowedAmountDisplay,
        priceUSD,
        valueUSD,
        borrowFactor: asset.borrowFactor,
        currentAPR: 0, // Will be enriched with reserve data
        accruedInterestDisplay: 0, // Would need to calculate from borrow index
      });
    } catch (error) {
      console.error(`Failed to parse borrow for ${coinType}:`, error);
    }
  }

  return positions;
}

/**
 * Parse complete user profile from RPC response
 * 
 * @param raw - Raw profile data from blockchain
 * @param exchangeRates - Exchange rates for deposits
 * @param prices - Current prices for all assets
 * @returns Parsed profile data
 */
export function parseProfile(
  raw: any,
  exchangeRates: Record<string, string>,
  prices: Record<string, number>
) {
  const depositsMap = raw.deposits?.data || {};
  const borrowsMap = raw.borrows?.data || {};
  
  const deposits = parseUserDeposits(depositsMap, exchangeRates, prices);
  const borrows = parseUserBorrows(borrowsMap, prices);
  
  return {
    profileId: raw.id || raw.profile_id || '0',
    deposits,
    borrows,
    emodeCategory: raw.emode_category,
  };
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

/**
 * Check if an RPC error indicates a missing resource (404)
 * 
 * @param error - Error object from RPC call
 * @returns True if this is a "resource not found" error
 */
export function isResourceNotFoundError(error: any): boolean {
  return (
    error?.status === 404 ||
    error?.errorCode === 'resource_not_found' ||
    error?.message?.includes('Resource not found') ||
    error?.message?.includes('does not exist')
  );
}

/**
 * Safely parse any value with fallback
 * 
 * @param parser - Parser function
 * @param value - Value to parse
 * @param fallback - Fallback value if parsing fails
 * @returns Parsed value or fallback
 */
export function safeParse<T>(
  parser: (value: any) => T,
  value: any,
  fallback: T
): T {
  try {
    return parser(value);
  } catch (error) {
    console.warn('Parse failed, using fallback:', error);
    return fallback;
  }
}

export default {
  parseDecimal,
  parseBasisPoints,
  parseHundredthBasisPoints,
  parseReserveConfig,
  parseInterestRateConfig,
  parseReserve,
  parseUserDeposits,
  parseUserBorrows,
  parseProfile,
  isResourceNotFoundError,
  safeParse,
};
