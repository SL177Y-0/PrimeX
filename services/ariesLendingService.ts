/**
 * Aries Markets Lending Service
 * 
 * Provides abstraction layer for interacting with Aries Protocol on Aptos
 * Handles on-chain data fetching, parsing, and transformation
 */

import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';
import { ARIES_CONFIG, APTOS_CONFIG } from '../config/constants';
import {
  calculateReserveAPRs,
  calculateHealthFactor,
  calculateTotalSupply,
} from '../utils/ariesMath';
import type {
  AriesReserve,
  AriesPool,
  UserPortfolio,
  UserSupplyPosition,
  UserBorrowPosition,
  UserReward,
  AriesProtocolStats,
  AriesAssetMetadata,
  APRDataPoint,
} from '../types/aries';

// ============================================================================
// Service Configuration
// ============================================================================

const config = new AptosConfig({
  network: APTOS_CONFIG.network as Network,
});

const aptos = new Aptos(config);

// ============================================================================
// Asset Metadata Helpers
// ============================================================================

/**
 * Get asset metadata from coin type string
 */
function getAssetMetadata(coinType: string): AriesAssetMetadata {
  // Check paired assets
  for (const [symbol, metadata] of Object.entries(ARIES_CONFIG.pairedAssets)) {
    if (metadata.coinType === coinType) {
      return {
        coinType,
        symbol,
        name: metadata.name,
        decimals: metadata.decimals,
        isWrapped: metadata.isWrapped,
      };
    }
  }
  
  // Check isolated assets
  for (const [symbol, metadata] of Object.entries(ARIES_CONFIG.isolatedAssets)) {
    if (metadata.coinType === coinType) {
      return {
        coinType,
        symbol,
        name: metadata.name,
        decimals: metadata.decimals,
        isWrapped: metadata.isWrapped,
        underlyingAsset: metadata.underlyingAsset,
      };
    }
  }
  
  // Default fallback
  return {
    coinType,
    symbol: 'UNKNOWN',
    name: 'Unknown Asset',
    decimals: 8,
    isWrapped: false,
  };
}

/**
 * Convert on-chain amount to human-readable format
 */
function convertFromOnChainAmount(amount: string, decimals: number): number {
  return parseFloat(amount) / Math.pow(10, decimals);
}

/**
 * Convert human-readable amount to on-chain format
 */
function convertToOnChainAmount(amount: number, decimals: number): string {
  return Math.floor(amount * Math.pow(10, decimals)).toString();
}

// ============================================================================
// Reserve Data Fetching
// ============================================================================

/**
 * Fetch reserve data for a specific coin type using view function
 * DEPRECATED: Use ariesProtocolService.fetchReserve() instead
 * This service is maintained for backward compatibility only
 */
export async function fetchReserve(coinType: string): Promise<AriesReserve | null> {
  try {
    // Use view function to fetch reserve state from on-chain table
    const [reserveData] = await aptos.view<[any]>({
      payload: {
        function: `${ARIES_CONFIG.contractAddress}::reserve::reserve_state`,
        typeArguments: [coinType],
        functionArguments: [],
      },
    });
    
    if (!reserveData) {
      console.warn(`[AriesLendingService] No reserve found for ${coinType}`);
      return null;
    }
    
    const data = reserveData as any;
    const metadata = getAssetMetadata(coinType);
    
    // Parse interest rate config
    const interestRateConfig = {
      minBorrowRate: parseInt(data.interest_rate_config?.min_borrow_rate || '200'),
      optimalBorrowRate: parseInt(data.interest_rate_config?.optimal_borrow_rate || '800'),
      maxBorrowRate: parseInt(data.interest_rate_config?.max_borrow_rate || '3000'),
      optimalUtilization: parseInt(data.interest_rate_config?.optimal_utilization || '8000'),
    };
    
    // Parse reserve config
    const reserveConfig = {
      loanToValue: parseInt(data.reserve_config?.loan_to_value || '7500'),
      liquidationThreshold: parseInt(data.reserve_config?.liquidation_threshold || '8000'),
      liquidationBonusBips: parseInt(data.reserve_config?.liquidation_bonus_bips || '500'),
      liquidationFeeHundredthBips: parseInt(data.reserve_config?.liquidation_fee_hundredth_bips || '50'),
      borrowFactor: parseInt(data.reserve_config?.borrow_factor || '10000'),
      reserveRatio: parseInt(data.reserve_config?.reserve_ratio || '1000'),
      borrowFeeHundredthBips: parseInt(data.reserve_config?.borrow_fee_hundredth_bips || '10'),
      withdrawFeeHundredthBips: parseInt(data.reserve_config?.withdraw_fee_hundredth_bips || '5'),
      depositLimit: data.reserve_config?.deposit_limit || '0',
      borrowLimit: data.reserve_config?.borrow_limit || '0',
      allowCollateral: data.reserve_config?.allow_collateral ?? true,
      allowRedeem: data.reserve_config?.allow_redeem ?? true,
      flashLoanFeeHundredthBips: parseInt(data.reserve_config?.flash_loan_fee_hundredth_bips || '30'),
    };
    
    const totalBorrowed = data.total_borrowed || '0';
    const totalCashAvailable = data.total_cash_available || '0';
    
    // Calculate APRs
    const { supplyAPR, borrowAPR, utilization } = calculateReserveAPRs(
      totalBorrowed,
      totalCashAvailable,
      interestRateConfig,
      reserveConfig.reserveRatio
    );
    
    const reserve: AriesReserve = {
      coinType,
      name: metadata.name,
      symbol: metadata.symbol,
      decimals: metadata.decimals,
      totalLpSupply: data.total_lp_supply || '0',
      totalBorrowed,
      totalBorrowedShare: data.total_borrowed_share || '0',
      totalCashAvailable,
      reserveAmount: data.reserve_amount || '0',
      initialExchangeRate: data.initial_exchange_rate || '1',
      interestRateConfig,
      reserveConfig,
      utilization,
      supplyAPR,
      borrowAPR,
    };
    
    return reserve;
  } catch (error: any) {
    // Enhanced error handling
    if (error?.message?.includes('resource_not_found') || error?.message?.includes('function_not_found')) {
      console.warn(`[AriesLendingService] Reserve not available for ${coinType}`);
    } else {
      console.error(`[AriesLendingService] Failed to fetch reserve for ${coinType}:`, error?.message || error);
    }
    return null;
  }
}

/**
 * Fetch all paired pool reserves
 */
export async function fetchPairedReserves(): Promise<AriesReserve[]> {
  const coinTypes = Object.values(ARIES_CONFIG.pairedAssets).map(asset => asset.coinType);
  
  const results = await Promise.allSettled(
    coinTypes.map(coinType => fetchReserve(coinType))
  );
  
  return results
    .filter((result): result is PromiseFulfilledResult<AriesReserve> => 
      result.status === 'fulfilled' && result.value !== null
    )
    .map(result => result.value);
}

/**
 * Fetch all isolated pool reserves
 */
export async function fetchIsolatedReserves(): Promise<AriesReserve[]> {
  const coinTypes = Object.values(ARIES_CONFIG.isolatedAssets).map(asset => asset.coinType);
  
  const results = await Promise.allSettled(
    coinTypes.map(coinType => fetchReserve(coinType))
  );
  
  return results
    .filter((result): result is PromiseFulfilledResult<AriesReserve> =>
      result.status === 'fulfilled' && result.value !== null
    )
    .map(result => result.value);
}

/**
 * Fetch all reserves (paired + isolated)
 */
export async function fetchAllReserves(): Promise<{
  paired: AriesReserve[];
  isolated: AriesReserve[];
}> {
  const [paired, isolated] = await Promise.all([
    fetchPairedReserves(),
    fetchIsolatedReserves(),
  ]);
  
  return { paired, isolated };
}

// ============================================================================
// Pool Data Aggregation
// ============================================================================

/**
 * Aggregate reserves into pool objects
 */
export async function fetchPools(): Promise<{ pairedPools: AriesPool[]; isolatedPools: AriesPool[] }> {
  const { paired, isolated } = await fetchAllReserves();
  
  // Create paired pool
  const pairedPool: AriesPool = {
    poolId: 'paired-main',
    name: 'Main Pool',
    type: 'paired',
    reserves: paired,
    totalValueLockedUSD: 0,
    totalBorrowedUSD: 0,
    averageUtilization: paired.reduce((sum, r) => sum + r.utilization, 0) / (paired.length || 1),
  };
  
  // Create isolated pools (one per asset)
  const isolatedPools: AriesPool[] = isolated.map(reserve => ({
    poolId: `isolated-${reserve.symbol}`,
    name: `${reserve.symbol} Isolated Pool`,
    type: 'isolated',
    reserves: [reserve],
    totalValueLockedUSD: 0,
    totalBorrowedUSD: 0,
    averageUtilization: reserve.utilization,
  }));
  
  return {
    pairedPools: [pairedPool],
    isolatedPools,
  };
}

// ============================================================================
// User Position Fetching
// ============================================================================

/**
 * Fetch user profile resource
 */
async function fetchUserProfile(userAddress: string): Promise<any> {
  try {
    const resourceType = `${ARIES_CONFIG.contractAddress}::${ARIES_CONFIG.modules.profile}::Profile` as `${string}::${string}::${string}`;
    
    const resource = await aptos.getAccountResource({
      accountAddress: userAddress,
      resourceType,
    });
    
    return resource.data;
  } catch (error) {
    console.error('Failed to fetch user profile:', error);
    return null;
  }
}

/**
 * Fetch user positions (supplies and borrows)
 */
export async function fetchUserPositions(userAddress: string): Promise<UserPortfolio | null> {
  try {
    const profile = await fetchUserProfile(userAddress);
    
    if (!profile) {
      return null;
    }
    
    // Parse deposited reserves
    const supplies: UserSupplyPosition[] = [];
    if (profile.deposited_reserves && Array.isArray(profile.deposited_reserves)) {
      for (const deposit of profile.deposited_reserves) {
        const coinType = deposit.token || deposit.coin_type;
        const metadata = getAssetMetadata(coinType);
        
        supplies.push({
          coinType,
          symbol: metadata.symbol,
          amountSupplied: deposit.collateral_amount || deposit.amount || '0',
          amountSuppliedUSD: 0, // Will be calculated with price data
          lpTokenBalance: deposit.lp_balance || '0',
          earnedInterest: deposit.earned_interest || '0',
          currentAPR: 0, // Will be fetched from reserve
        });
      }
    }
    
    // Parse borrowed reserves
    const borrows: UserBorrowPosition[] = [];
    if (profile.borrowed_reserves && Array.isArray(profile.borrowed_reserves)) {
      for (const borrow of profile.borrowed_reserves) {
        const coinType = borrow.token || borrow.coin_type;
        const metadata = getAssetMetadata(coinType);
        
        borrows.push({
          coinType,
          symbol: metadata.symbol,
          amountBorrowed: borrow.borrowed_share || borrow.amount || '0',
          amountBorrowedUSD: 0, // Will be calculated with price data
          borrowShare: borrow.borrowed_share || '0',
          accruedInterest: borrow.accrued_interest || '0',
          currentAPR: 0, // Will be fetched from reserve
        });
      }
    }
    
    // Parse rewards
    const rewards: UserReward[] = [];
    // TODO: Parse deposit_farms and borrow_farms for rewards
    
    // Calculate health factor (simplified - would need full collateral calculations)
    const healthFactor = borrows.length > 0 ? 1.5 : Infinity;
    
    const portfolio: UserPortfolio = {
      userAddress,
      poolType: 'paired', // or 'isolated' based on pool type
      supplies,
      borrows,
      totalSuppliedUSD: 0,
      totalBorrowedUSD: 0,
      healthFactor,
      netAPR: 0,
      netBalanceUSD: 0,
      rewards,
    };
    
    return portfolio;
  } catch (error) {
    console.error('Failed to fetch user positions:', error);
    return null;
  }
}

// ============================================================================
// Protocol Statistics
// ============================================================================

/**
 * Fetch protocol-wide statistics
 */
export async function fetchProtocolStats(): Promise<AriesProtocolStats> {
  const { paired, isolated } = await fetchAllReserves();
  const allReserves = [...paired, ...isolated];
  
  const totalSupplied = allReserves.reduce((sum, reserve) => {
    const supply = calculateTotalSupply(reserve.totalCashAvailable, reserve.totalBorrowed);
    return sum + supply;
  }, 0);
  
  const totalBorrowed = allReserves.reduce((sum, reserve) => {
    return sum + parseFloat(reserve.totalBorrowed);
  }, 0);
  
  const avgUtilization = allReserves.reduce((sum, reserve) => sum + reserve.utilization, 0) / (allReserves.length || 1);
  
  return {
    totalValueLockedUSD: 0, // Would need price oracle
    totalSuppliedUSD: 0,
    totalBorrowedUSD: 0,
    totalReserves: allReserves.length,
    averageUtilization: avgUtilization,
    totalUsers: ARIES_CONFIG.stats.totalUsers,
    pairedPoolsCount: paired.length,
    isolatedPoolsCount: isolated.length,
  };
}

// ============================================================================
// Historical Data (Mock for now - would need indexer/events)
// ============================================================================

/**
 * Fetch historical APR data
 */
export async function fetchHistoricalAPR(
  coinType: string,
  days: number = 30
): Promise<APRDataPoint[]> {
  // TODO: Implement actual historical data fetching from events or indexer
  // For now, return mock data based on current values
  
  const reserve = await fetchReserve(coinType);
  if (!reserve) return [];
  
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  
  return Array.from({ length: days }, (_, i) => ({
    timestamp: now - (days - i - 1) * dayMs,
    supplyAPR: reserve.supplyAPR * (0.95 + Math.random() * 0.1), // Add some variance
    borrowAPR: reserve.borrowAPR * (0.95 + Math.random() * 0.1),
    utilization: reserve.utilization * (0.9 + Math.random() * 0.2),
  }));
}

// ============================================================================
// Transaction Builders
// ============================================================================

/**
 * Build supply transaction payload
 */
export function buildSupplyTransaction(coinType: string, amount: string, userAddress: string) {
  return {
    function: `${ARIES_CONFIG.contractAddress}::${ARIES_CONFIG.modules.controller}::${ARIES_CONFIG.entryFunctions.deposit}`,
    type_arguments: [coinType],
    arguments: [amount],
  };
}

/**
 * Build withdraw transaction payload
 */
export function buildWithdrawTransaction(coinType: string, amount: string, userAddress: string) {
  return {
    function: `${ARIES_CONFIG.contractAddress}::${ARIES_CONFIG.modules.controller}::${ARIES_CONFIG.entryFunctions.withdraw}`,
    type_arguments: [coinType],
    arguments: [amount],
  };
}

/**
 * Build borrow transaction payload
 */
export function buildBorrowTransaction(coinType: string, amount: string, userAddress: string) {
  return {
    function: `${ARIES_CONFIG.contractAddress}::${ARIES_CONFIG.modules.controller}::${ARIES_CONFIG.entryFunctions.borrow}`,
    type_arguments: [coinType],
    arguments: [amount],
  };
}

/**
 * Build repay transaction payload
 */
export function buildRepayTransaction(coinType: string, amount: string, userAddress: string) {
  return {
    function: `${ARIES_CONFIG.contractAddress}::${ARIES_CONFIG.modules.controller}::${ARIES_CONFIG.entryFunctions.repay}`,
    type_arguments: [coinType],
    arguments: [amount],
  };
}

// ============================================================================
// Price Oracle Integration
// ============================================================================

/**
 * Fetch prices for reserves (placeholder - integrate with actual oracle or price service)
 */
export async function fetchReservePrices(): Promise<Record<string, number>> {
  // TODO: Integrate with Pyth, Switchboard, or other oracle
  // For now, return mock prices
  
  return {
    'APT': 10.50,
    'USDC': 1.00,
    'USDT': 1.00,
    'WBTC': 45000,
    'SOL': 100,
  };
}

/**
 * Update reserves with USD values based on oracle prices
 */
export async function enrichReservesWithPrices(reserves: AriesReserve[]): Promise<AriesReserve[]> {
  const prices = await fetchReservePrices();
  
  return reserves.map(reserve => {
    const price = prices[reserve.symbol] || 0;
    const decimals = reserve.decimals;
    
    const totalSupply = calculateTotalSupply(reserve.totalCashAvailable, reserve.totalBorrowed);
    const totalSupplyInUnits = convertFromOnChainAmount(totalSupply.toString(), decimals);
    const totalBorrowedInUnits = convertFromOnChainAmount(reserve.totalBorrowed, decimals);
    const availableLiquidityInUnits = convertFromOnChainAmount(reserve.totalCashAvailable, decimals);
    
    return {
      ...reserve,
      priceUSD: price,
      totalSupplyUSD: totalSupplyInUnits * price,
      totalBorrowedUSD: totalBorrowedInUnits * price,
      availableLiquidityUSD: availableLiquidityInUnits * price,
    };
  });
}
