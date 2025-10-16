/**
 * Aries Protocol Service
 * 
 * Direct Aptos SDK implementation for Aries Markets lending & borrowing
 * Uses correct on-chain resource types from official contract
 * 
 * Correct Resource Paths (from fix.txt analysis):
 * - reserve::ReserveDetails<T> - Primary reserve analytics
 * - reserve::ReserveCoinContainer<T> - Balance tracking  
 * - profile::Profile - User positions
 * - wrapped_coins::Wrapped* - Isolated assets (NOT fa_to_coin_wrapper)
 */

import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';
import { ARIES_CONFIG, APTOS_CONFIG } from '../config/constants';
import { priceOracleService } from './priceOracleService';
import type {
  AriesReserve,
  AriesPool,
  UserPortfolio,
  UserSupplyPosition,
  UserBorrowPosition,
  AriesProtocolStats,
  APRDataPoint,
} from '../types/aries';

/**
 * Aries Protocol Service - Direct Aptos SDK Implementation
 */
export class AriesProtocolService {
  private aptos: Aptos;
  private initialized: boolean = false;

  constructor() {
    const aptosConfig = new AptosConfig({
      network: APTOS_CONFIG.network as Network,
      fullnode: APTOS_CONFIG.nodeUrl,
    });
    this.aptos = new Aptos(aptosConfig);
    this.initialized = true;
  }

  /**
   * Get asset metadata
   */
  private getAssetMetadata(coinType: string) {
    for (const [symbol, metadata] of Object.entries(ARIES_CONFIG.pairedAssets)) {
      if (metadata.coinType === coinType) {
        return {
          symbol,
          name: metadata.name,
          decimals: metadata.decimals,
          isWrapped: metadata.isWrapped,
        };
      }
    }
    
    for (const [symbol, metadata] of Object.entries(ARIES_CONFIG.isolatedAssets)) {
      if (metadata.coinType === coinType) {
        return {
          symbol,
          name: metadata.name,
          decimals: metadata.decimals,
          isWrapped: metadata.isWrapped,
        };
      }
    }
    
    return {
      symbol: 'UNKNOWN',
      name: 'Unknown Asset',
      decimals: 8,
      isWrapped: false,
    };
  }

  /**
   * Calculate APR from interest rate config using Aries formula
   */
  private calculateAPR(
    totalBorrowed: number,
    totalCashAvailable: number,
    interestRateConfig: {
      minBorrowRate: number;
      optimalBorrowRate: number;
      maxBorrowRate: number;
      optimalUtilization: number;
    },
    reserveRatio: number
  ): { supplyAPR: number; borrowAPR: number; utilization: number } {
    const totalSupply = totalCashAvailable + totalBorrowed;
    
    if (totalSupply === 0) {
      return { supplyAPR: 0, borrowAPR: 0, utilization: 0 };
    }
    
    const utilization = (totalBorrowed / totalSupply) * 100;
    const utilizationRatio = totalBorrowed / totalSupply;
    const optimalUtilization = interestRateConfig.optimalUtilization / 10000;
    
    let borrowRate: number;
    
    if (utilizationRatio <= optimalUtilization) {
      const slope = (interestRateConfig.optimalBorrowRate - interestRateConfig.minBorrowRate) / 10000;
      borrowRate = (interestRateConfig.minBorrowRate + slope * (utilizationRatio / optimalUtilization) * 10000) / 10000;
    } else {
      const excessUtilization = (utilizationRatio - optimalUtilization) / (1 - optimalUtilization);
      const slope = (interestRateConfig.maxBorrowRate - interestRateConfig.optimalBorrowRate) / 10000;
      borrowRate = (interestRateConfig.optimalBorrowRate + slope * excessUtilization * 10000) / 10000;
    }
    
    const borrowAPR = borrowRate * 100;
    const supplyAPR = borrowAPR * utilizationRatio * (1 - reserveRatio / 10000);
    
    return { supplyAPR, borrowAPR, utilization };
  }

  /**
   * Fetch reserve data using correct resource type: reserve::ReserveDetails<T>
   */
  async fetchReserve(coinType: string): Promise<AriesReserve | null> {
    try {
      // Use correct resource type from documentation
      const resourceType = `${ARIES_CONFIG.contractAddress}::reserve::ReserveDetails<${coinType}>` as `${string}::${string}::${string}`;
      
      const resource = await this.aptos.getAccountResource({
        accountAddress: ARIES_CONFIG.contractAddress,
        resourceType,
      });
      
      const data = resource as any;
      const metadata = this.getAssetMetadata(coinType);
      
      // Parse data (field names from Aries contract documentation)
      const totalBorrowed = parseFloat(data.total_borrowed || '0');
      const totalCashAvailable = parseFloat(data.total_cash_available || '0');
      
      const interestRateConfig = {
        minBorrowRate: parseInt(data.interest_rate_config?.min_borrow_rate || '200'),
        optimalBorrowRate: parseInt(data.interest_rate_config?.optimal_borrow_rate || '800'),
        maxBorrowRate: parseInt(data.interest_rate_config?.max_borrow_rate || '3000'),
        optimalUtilization: parseInt(data.interest_rate_config?.optimal_utilization || '8000'),
      };
      
      const reserveConfig = {
        loanToValue: parseInt(data.reserve_config?.loan_to_value || '7500'),
        liquidationThreshold: parseInt(data.reserve_config?.liquidation_threshold || '8000'),
        liquidationBonusBips: parseInt(data.reserve_config?.liquidation_bonus_bips || '500'),
        liquidationFeeHundredthBips: parseInt(data.reserve_config?.liquidation_fee_hundredth_bips || '50'),
        borrowFactor: parseInt(data.reserve_config?.borrow_factor || '10000'),
        reserveRatio: parseInt(data.reserve_config?.reserve_ratio || '1000'),
        borrowFeeHundredthBips: parseInt(data.reserve_config?.borrow_fee_hundredth_bips || '10'),
        withdrawFeeHundredthBips: parseInt(data.reserve_config?.withdraw_fee_hundredth_bips || '5'),
        depositLimit: data.reserve_config?.deposit_limit?.toString() || '0',
        borrowLimit: data.reserve_config?.borrow_limit?.toString() || '0',
        allowCollateral: data.reserve_config?.allow_collateral ?? true,
        allowRedeem: data.reserve_config?.allow_redeem ?? true,
        flashLoanFeeHundredthBips: parseInt(data.reserve_config?.flash_loan_fee_hundredth_bips || '30'),
      };
      
      const { supplyAPR, borrowAPR, utilization } = this.calculateAPR(
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
        totalLpSupply: data.total_lp_supply?.toString() || '0',
        totalBorrowed: data.total_borrowed?.toString() || '0',
        totalBorrowedShare: data.total_borrowed_share?.toString() || '0',
        totalCashAvailable: data.total_cash_available?.toString() || '0',
        reserveAmount: data.reserve_amount?.toString() || '0',
        initialExchangeRate: data.initial_exchange_rate?.toString() || '1',
        interestRateConfig,
        reserveConfig,
        utilization,
        supplyAPR,
        borrowAPR,
      };
      
      return reserve;
    } catch (error: any) {
      // Only log non-404 errors (404s are expected for reserves not deployed yet)
      const is404 = error?.message?.includes('resource_not_found') || error?.message?.includes('404');
      if (!is404) {
        console.error(`[AriesService] Failed to fetch reserve for ${coinType}:`, error.message);
      }
      return null;
    }
  }

  /**
   * Fetch all paired pool reserves
   */
  async fetchPairedReserves(): Promise<AriesReserve[]> {
    const coinTypes = Object.values(ARIES_CONFIG.pairedAssets).map(asset => asset.coinType);
    
    const results = await Promise.allSettled(
      coinTypes.map(coinType => this.fetchReserve(coinType))
    );
    
    return results
      .filter((result): result is PromiseFulfilledResult<AriesReserve> => 
        result.status === 'fulfilled' && result.value !== null
      )
      .map(result => result.value);
  }

  /**
   * Fetch all isolated pool reserves
   * Note: Many isolated reserves don't exist on mainnet yet (expected 404s)
   */
  async fetchIsolatedReserves(): Promise<AriesReserve[]> {
    const coinTypes = Object.values(ARIES_CONFIG.isolatedAssets).map(asset => asset.coinType);
    
    const results = await Promise.allSettled(
      coinTypes.map(coinType => this.fetchReserve(coinType))
    );
    
    const successfulReserves = results
      .filter((result): result is PromiseFulfilledResult<AriesReserve> =>
        result.status === 'fulfilled' && result.value !== null
      )
      .map(result => result.value);
    
    // Log summary instead of individual errors (many reserves don't exist yet)
    const failedCount = results.length - successfulReserves.length;
    if (failedCount > 0) {
      console.log(`[AriesService] ${successfulReserves.length}/${results.length} isolated reserves available (${failedCount} not deployed yet)`);
    }
    
    return successfulReserves;
  }

  /**
   * Fetch all reserves
   */
  async fetchAllReserves(): Promise<{ paired: AriesReserve[]; isolated: AriesReserve[] }> {
    const [paired, isolated] = await Promise.all([
      this.fetchPairedReserves(),
      this.fetchIsolatedReserves(),
    ]);
    
    return { paired, isolated };
  }

  /**
   * Enrich reserves with USD values
   */
  async enrichReservesWithPrices(reserves: AriesReserve[]): Promise<AriesReserve[]> {
    const prices = await this.fetchReservePrices();
    
    return reserves.map(reserve => {
      const price = prices[reserve.symbol] || 0;
      const decimals = reserve.decimals;
      
      const totalSupply = parseFloat(reserve.totalCashAvailable) + parseFloat(reserve.totalBorrowed);
      const totalSupplyInUnits = totalSupply / Math.pow(10, decimals);
      const totalBorrowedInUnits = parseFloat(reserve.totalBorrowed) / Math.pow(10, decimals);
      const availableLiquidityInUnits = parseFloat(reserve.totalCashAvailable) / Math.pow(10, decimals);
      
      return {
        ...reserve,
        priceUSD: price,
        totalSupplyUSD: totalSupplyInUnits * price,
        totalBorrowedUSD: totalBorrowedInUnits * price,
        availableLiquidityUSD: availableLiquidityInUnits * price,
      };
    });
  }

  /**
   * Fetch protocol-wide statistics
   */
  async fetchProtocolStats(): Promise<AriesProtocolStats> {
    const { paired, isolated } = await this.fetchAllReserves();
    const allReserves = [...paired, ...isolated];
    
    const enriched = await this.enrichReservesWithPrices(allReserves);
    
    const totalSuppliedUSD = enriched.reduce((sum, r) => sum + (r.totalSupplyUSD || 0), 0);
    const totalBorrowedUSD = enriched.reduce((sum, r) => sum + (r.totalBorrowedUSD || 0), 0);
    const avgUtilization = enriched.reduce((sum, r) => sum + r.utilization, 0) / (enriched.length || 1);
    
    return {
      totalValueLockedUSD: totalSuppliedUSD,
      totalSuppliedUSD,
      totalBorrowedUSD,
      totalReserves: enriched.length,
      averageUtilization: avgUtilization,
      totalUsers: ARIES_CONFIG.stats.totalUsers,
      pairedPoolsCount: paired.length,
      isolatedPoolsCount: isolated.length,
    };
  }

  /**
   * Fetch aggregated pool data
   */
  async fetchPools(): Promise<{ pairedPools: AriesPool[]; isolatedPools: AriesPool[] }> {
    const { paired, isolated } = await this.fetchAllReserves();
    
    const enrichedPaired = await this.enrichReservesWithPrices(paired);
    const enrichedIsolated = await this.enrichReservesWithPrices(isolated);
    
    const pairedPool: AriesPool = {
      poolId: 'paired-main',
      name: 'Main Pool',
      type: 'paired',
      reserves: enrichedPaired,
      totalValueLockedUSD: enrichedPaired.reduce((sum, r) => sum + (r.totalSupplyUSD || 0), 0),
      totalBorrowedUSD: enrichedPaired.reduce((sum, r) => sum + (r.totalBorrowedUSD || 0), 0),
      averageUtilization: enrichedPaired.reduce((sum, r) => sum + r.utilization, 0) / (enrichedPaired.length || 1),
    };
    
    const isolatedPools: AriesPool[] = enrichedIsolated.map(reserve => ({
      poolId: `isolated-${reserve.symbol}`,
      name: `${reserve.symbol} Isolated Pool`,
      type: 'isolated',
      reserves: [reserve],
      totalValueLockedUSD: reserve.totalSupplyUSD || 0,
      totalBorrowedUSD: reserve.totalBorrowedUSD || 0,
      averageUtilization: reserve.utilization,
    }));
    
    return {
      pairedPools: [pairedPool],
      isolatedPools,
    };
  }

  /**
   * Fetch user positions using profile::Profile resource
   */
  async fetchUserPositions(userAddress: string): Promise<UserPortfolio | null> {
    try {
      const resourceType = `${ARIES_CONFIG.contractAddress}::profile::Profile` as `${string}::${string}::${string}`;
      
      const resource = await this.aptos.getAccountResource({
        accountAddress: userAddress,
        resourceType,
      });
      
      const profile = resource as any;
      const prices = await this.fetchReservePrices();
      
      const supplies: UserSupplyPosition[] = [];
      const borrows: UserBorrowPosition[] = [];
      
      // Parse deposited reserves
      if (profile.deposited_reserves) {
        for (const deposit of Object.values(profile.deposited_reserves)) {
          const depositData = deposit as any;
          const coinType = depositData.coin_type || depositData.key;
          const metadata = this.getAssetMetadata(coinType);
          const price = prices[metadata.symbol] || 0;
          const amount = parseFloat(depositData.collateral_amount || depositData.value || '0');
          const amountInUnits = amount / Math.pow(10, metadata.decimals);
          
          supplies.push({
            coinType,
            symbol: metadata.symbol,
            amountSupplied: depositData.collateral_amount || depositData.value || '0',
            amountSuppliedUSD: amountInUnits * price,
            lpTokenBalance: depositData.collateral_amount || '0',
            earnedInterest: '0',
            currentAPR: 0,
          });
        }
      }
      
      // Parse borrowed reserves
      if (profile.borrowed_reserves) {
        for (const borrow of Object.values(profile.borrowed_reserves)) {
          const borrowData = borrow as any;
          const coinType = borrowData.coin_type || borrowData.key;
          const metadata = this.getAssetMetadata(coinType);
          const price = prices[metadata.symbol] || 0;
          const amount = parseFloat(borrowData.borrowed_share || borrowData.value || '0');
          const amountInUnits = amount / Math.pow(10, metadata.decimals);
          
          borrows.push({
            coinType,
            symbol: metadata.symbol,
            amountBorrowed: borrowData.borrowed_share || borrowData.value || '0',
            amountBorrowedUSD: amountInUnits * price,
            borrowShare: borrowData.borrowed_share || '0',
            accruedInterest: '0',
            currentAPR: 0,
          });
        }
      }
      
      // Calculate health factor
      let totalCollateralValue = 0;
      let totalBorrowValue = 0;
      
      for (const supply of supplies) {
        const reserve = await this.fetchReserve(supply.coinType);
        const liquidationThreshold = reserve ? reserve.reserveConfig.liquidationThreshold / 10000 : 0.8;
        totalCollateralValue += supply.amountSuppliedUSD * liquidationThreshold;
      }
      
      for (const borrow of borrows) {
        totalBorrowValue += borrow.amountBorrowedUSD;
      }
      
      const healthFactor = totalBorrowValue > 0 ? totalCollateralValue / totalBorrowValue : Infinity;
      
      const totalSuppliedUSD = supplies.reduce((sum, s) => sum + s.amountSuppliedUSD, 0);
      const totalBorrowedUSD = borrows.reduce((sum, b) => sum + b.amountBorrowedUSD, 0);
      
      return {
        userAddress,
        poolType: 'paired',
        supplies,
        borrows,
        totalSuppliedUSD,
        totalBorrowedUSD,
        healthFactor,
        netAPR: 0,
        netBalanceUSD: totalSuppliedUSD - totalBorrowedUSD,
        rewards: [],
      };
    } catch (error: any) {
      // ✅ Check if error is "resource_not_found" (user hasn't used Aries yet)
      if (error?.errorCode === 'resource_not_found' || error?.message?.includes('resource_not_found')) {
        console.log('[AriesService] User has no Aries profile yet (new user) - this is normal');
        return null;
      }
      
      // Only log actual errors, not expected 404s for new users
      console.error('[AriesService] Failed to fetch user positions:', error);
      return null;
    }
  }

  /**
   * Fetch reserve prices
   */
  async fetchReservePrices(): Promise<Record<string, number>> {
    try {
      const symbols = ['APT', 'USDC', 'USDT', 'WBTC', 'SOL'];
      const prices = await priceOracleService.getPrices(symbols);
      
      return Object.entries(prices).reduce((acc, [symbol, priceData]) => {
        acc[symbol] = priceData.priceUSD;
        return acc;
      }, {} as Record<string, number>);
    } catch (error) {
      console.error('[AriesService] Error fetching prices:', error);
      return {
        'APT': 10.50,
        'USDC': 1.00,
        'USDT': 1.00,
        'WBTC': 43000,
        'SOL': 100,
      };
    }
  }

  /**
   * Fetch historical APR data (mock for now)
   */
  async fetchHistoricalAPR(coinType: string, days: number = 30): Promise<APRDataPoint[]> {
    const reserve = await this.fetchReserve(coinType);
    if (!reserve) return [];
    
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    
    return Array.from({ length: days }, (_, i) => ({
      timestamp: now - (days - i - 1) * dayMs,
      supplyAPR: reserve.supplyAPR * (0.95 + Math.random() * 0.1),
      borrowAPR: reserve.borrowAPR * (0.95 + Math.random() * 0.1),
      utilization: reserve.utilization * (0.9 + Math.random() * 0.2),
    }));
  }

  /**
   * Build transaction payloads
   */
  buildDepositTransaction(coinType: string, amount: string) {
    return {
      function: `${ARIES_CONFIG.contractAddress}::${ARIES_CONFIG.modules.controller}::${ARIES_CONFIG.entryFunctions.deposit}`,
      type_arguments: [coinType],
      arguments: [amount],
    };
  }

  buildWithdrawTransaction(coinType: string, amount: string) {
    return {
      function: `${ARIES_CONFIG.contractAddress}::${ARIES_CONFIG.modules.controller}::${ARIES_CONFIG.entryFunctions.withdraw}`,
      type_arguments: [coinType],
      arguments: [amount],
    };
  }

  buildBorrowTransaction(coinType: string, amount: string) {
    return {
      function: `${ARIES_CONFIG.contractAddress}::${ARIES_CONFIG.modules.controller}::${ARIES_CONFIG.entryFunctions.borrow}`,
      type_arguments: [coinType],
      arguments: [amount],
    };
  }

  buildRepayTransaction(coinType: string, amount: string) {
    return {
      function: `${ARIES_CONFIG.contractAddress}::${ARIES_CONFIG.modules.controller}::${ARIES_CONFIG.entryFunctions.repay}`,
      type_arguments: [coinType],
      arguments: [amount],
    };
  }
}

// Export singleton instance
export const ariesProtocolService = new AriesProtocolService();

// Export convenience functions with preserved context
export const fetchReserve = (coinType: string) =>
  ariesProtocolService.fetchReserve(coinType);

export const fetchPairedReserves = () =>
  ariesProtocolService.fetchPairedReserves();

export const fetchIsolatedReserves = () =>
  ariesProtocolService.fetchIsolatedReserves();

export const fetchAllReserves = () =>
  ariesProtocolService.fetchAllReserves();

export const fetchPools = () =>
  ariesProtocolService.fetchPools();

export const fetchUserPositions = (userAddress: string) =>
  ariesProtocolService.fetchUserPositions(userAddress);

export const fetchProtocolStats = () =>
  ariesProtocolService.fetchProtocolStats();

export const fetchReservePrices = () =>
  ariesProtocolService.fetchReservePrices();

export const enrichReservesWithPrices = (reserves: AriesReserve[]) =>
  ariesProtocolService.enrichReservesWithPrices(reserves);

export const fetchHistoricalAPR = (coinType: string, days?: number) =>
  ariesProtocolService.fetchHistoricalAPR(coinType, days);
