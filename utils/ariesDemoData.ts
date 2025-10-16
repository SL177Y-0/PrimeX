/**
 * Aries Demo Data
 * 
 * Provides fallback demo data when real reserves aren't deployed yet
 * This allows UI development and testing while protocol deploys reserves
 */

import type { AriesReserve, AriesPool, AriesProtocolStats } from '../types/aries';
import { ARIES_CONFIG } from '../config/constants';

/**
 * Demo reserves for UI testing
 * Based on documented parameters from Aries Markets
 */
export const DEMO_RESERVES: AriesReserve[] = [
  {
    coinType: ARIES_CONFIG.pairedAssets.APT.coinType,
    name: 'Aptos',
    symbol: 'APT',
    decimals: 8,
    totalLpSupply: '500000000000000', // 5M APT
    totalBorrowed: '300000000000000', // 3M APT
    totalBorrowedShare: '300000000000000',
    totalCashAvailable: '200000000000000', // 2M APT
    reserveAmount: '50000000000000', // 0.5M APT
    initialExchangeRate: '100000000',
    interestRateConfig: {
      minBorrowRate: 200, // 2%
      optimalBorrowRate: 800, // 8%
      maxBorrowRate: 3000, // 30%
      optimalUtilization: 8000, // 80%
    },
    reserveConfig: {
      loanToValue: 7000, // 70%
      liquidationThreshold: 7500, // 75%
      liquidationBonusBips: 500, // 5%
      liquidationFeeHundredthBips: 50,
      borrowFactor: 10000,
      reserveRatio: 1000, // 10%
      borrowFeeHundredthBips: 10,
      withdrawFeeHundredthBips: 5,
      depositLimit: '10000000000000000', // 100M APT
      borrowLimit: '5000000000000000', // 50M APT
      allowCollateral: true,
      allowRedeem: true,
      flashLoanFeeHundredthBips: 30,
    },
    utilization: 0.60, // 60%
    supplyAPR: 480, // 4.8%
    borrowAPR: 920, // 9.2%
  },
  {
    coinType: ARIES_CONFIG.pairedAssets.USDC.coinType,
    name: 'USD Coin',
    symbol: 'zUSDC',
    decimals: 6,
    totalLpSupply: '50000000000000', // 50M USDC
    totalBorrowed: '35000000000000', // 35M USDC
    totalBorrowedShare: '35000000000000',
    totalCashAvailable: '15000000000000', // 15M USDC
    reserveAmount: '5000000000000', // 5M USDC
    initialExchangeRate: '1000000',
    interestRateConfig: {
      minBorrowRate: 200,
      optimalBorrowRate: 650,
      maxBorrowRate: 2500,
      optimalUtilization: 8500, // 85%
    },
    reserveConfig: {
      loanToValue: 8000, // 80%
      liquidationThreshold: 8500, // 85%
      liquidationBonusBips: 300, // 3%
      liquidationFeeHundredthBips: 50,
      borrowFactor: 10000,
      reserveRatio: 1000,
      borrowFeeHundredthBips: 10,
      withdrawFeeHundredthBips: 5,
      depositLimit: '100000000000000', // 100M USDC
      borrowLimit: '80000000000000', // 80M USDC
      allowCollateral: true,
      allowRedeem: true,
      flashLoanFeeHundredthBips: 30,
    },
    utilization: 0.70, // 70%
    supplyAPR: 580, // 5.8%
    borrowAPR: 850, // 8.5%
  },
  {
    coinType: ARIES_CONFIG.pairedAssets.USDT.coinType,
    name: 'Tether USD',
    symbol: 'USDT',
    decimals: 6,
    totalLpSupply: '30000000000000', // 30M USDT
    totalBorrowed: '20000000000000', // 20M USDT
    totalBorrowedShare: '20000000000000',
    totalCashAvailable: '10000000000000', // 10M USDT
    reserveAmount: '3000000000000', // 3M USDT
    initialExchangeRate: '1000000',
    interestRateConfig: {
      minBorrowRate: 200,
      optimalBorrowRate: 680,
      maxBorrowRate: 2500,
      optimalUtilization: 8500,
    },
    reserveConfig: {
      loanToValue: 8000,
      liquidationThreshold: 8500,
      liquidationBonusBips: 300,
      liquidationFeeHundredthBips: 50,
      borrowFactor: 10000,
      reserveRatio: 1000,
      borrowFeeHundredthBips: 10,
      withdrawFeeHundredthBips: 5,
      depositLimit: '100000000000000',
      borrowLimit: '80000000000000',
      allowCollateral: true,
      allowRedeem: true,
      flashLoanFeeHundredthBips: 30,
    },
    utilization: 0.67, // 67%
    supplyAPR: 550, // 5.5%
    borrowAPR: 830, // 8.3%
  },
];

/**
 * Demo pool data
 */
export const DEMO_POOL: AriesPool = {
  poolId: 'main',
  name: 'Main Pool',
  type: 'paired',
  reserves: DEMO_RESERVES,
  totalValueLockedUSD: 125000000, // $125M
  totalBorrowedUSD: 85000000, // $85M
  averageUtilization: 68, // 68%
};

/**
 * Demo protocol stats
 */
export const DEMO_STATS: AriesProtocolStats = {
  totalValueLockedUSD: 125000000,
  totalSuppliedUSD: 125000000,
  totalBorrowedUSD: 85000000,
  totalReserves: 3,
  totalUsers: 12000,
  averageUtilization: 68,
  pairedPoolsCount: 1,
  isolatedPoolsCount: 0,
};

/**
 * Check if we should use demo data
 * Use demo data if no real reserves are available
 */
export function shouldUseDemoData(realReserves: AriesReserve[]): boolean {
  return realReserves.length === 0;
}

/**
 * Get reserves (real or demo)
 */
export function getReservesWithFallback(
  realReserves: AriesReserve[],
  useDemoMode: boolean = false
): { reserves: AriesReserve[]; isDemo: boolean } {
  if (realReserves.length > 0) {
    return { reserves: realReserves, isDemo: false };
  }
  
  if (useDemoMode) {
    return { reserves: DEMO_RESERVES, isDemo: true };
  }
  
  return { reserves: [], isDemo: false };
}

/**
 * Get stats (real or demo)
 */
export function getStatsWithFallback(
  realStats: AriesProtocolStats | null,
  useDemoMode: boolean = false
): { stats: AriesProtocolStats; isDemo: boolean } {
  if (realStats && realStats.totalValueLockedUSD > 0) {
    return { stats: realStats, isDemo: false };
  }
  
  if (useDemoMode) {
    return { stats: DEMO_STATS, isDemo: true };
  }
  
  return { stats: DEMO_STATS, isDemo: true }; // Always show some stats
}
