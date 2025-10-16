/**
 * Complete Aries Lending Hook
 * Comprehensive hook for Lend & Borrow feature
 * Integrates protocol service, risk calculations, and rewards
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useWallet } from '../app/providers/WalletProvider';
import {
  hasAriesProfile,
  registerUser,
  deposit,
  withdraw,
  getUserPosition,
  getBorrowingPower,
  hasEnoughCollateral as checkCollateral,
  DepositParams,
  WithdrawParams,
  UserPosition,
} from '../services/ariesProtocolServiceEnhanced';
import {
  calculatePortfolioRisk,
  DepositPosition,
  BorrowPosition,
  PortfolioRiskMetrics,
  simulateBorrowHealthFactor,
  simulateWithdrawHealthFactor,
  calculateMaxSafeBorrow,
  calculateMaxSafeWithdrawal,
} from '../utils/ariesRiskCalculations';
import {
  getUserClaimableRewards,
  summarizeRewards,
  UserRewardPosition,
  RewardsSummary,
} from '../services/ariesRewardsService';
import { getAssetMetadata, getAllAssets } from '../config/ariesAssets';
import { getPricesByCoinTypes } from '../services/priceService';

export interface AriesReserve {
  coinType: string;
  symbol: string;
  name: string;
  decimals: number;
  priceUSD: number;
  
  // Reserve stats
  totalSuppliedUSD: number;
  totalBorrowedUSD: number;
  utilization: number;
  
  // APRs
  supplyAPR: number;
  borrowAPR: number;
  rewardAPRs: number[];
  
  // Risk params
  ltv: number;
  liquidationThreshold: number;
  borrowFactor: number;
  
  // Limits
  depositLimit: number;
  borrowLimit: number;
  
  // Features
  canSupply: boolean;
  canBorrow: boolean;
  canUseAsCollateral: boolean;
}

export interface UserPortfolio {
  deposits: DepositPosition[];
  borrows: BorrowPosition[];
  riskMetrics: PortfolioRiskMetrics;
  rewards: RewardsSummary;
}

export interface LendingState {
  // Profile
  hasProfile: boolean;
  profileName: string;
  isInitializing: boolean;
  
  // Reserves
  reserves: AriesReserve[];
  reservesLoading: boolean;
  
  // User Portfolio
  portfolio: UserPortfolio | null;
  portfolioLoading: boolean;
  
  // UI State
  error: string | null;
  txPending: boolean;
}

export function useAriesLendingComplete() {
  const { connected, account } = useWallet();
  
  const [state, setState] = useState<LendingState>({
    hasProfile: false,
    profileName: 'default',
    isInitializing: false,
    reserves: [],
    reservesLoading: false,
    portfolio: null,
    portfolioLoading: false,
    error: null,
    txPending: false,
  });
  
  /**
   * Check profile status
   */
  const checkProfile = useCallback(async () => {
    if (!connected || !account?.address) {
      setState(prev => ({ ...prev, hasProfile: false }));
      return false;
    }
    
    try {
      const exists = await hasAriesProfile(account.address);
      setState(prev => ({ ...prev, hasProfile: exists }));
      return exists;
    } catch (error) {
      console.error('[useAriesLending] Profile check failed:', error);
      setState(prev => ({ ...prev, hasProfile: false }));
      return false;
    }
  }, [connected, account?.address]);
  
  /**
   * Initialize profile
   */
  const initializeProfile = useCallback(async (profileName: string = 'default') => {
    if (!account) {
      throw new Error('Wallet not connected');
    }
    
    setState(prev => ({ ...prev, isInitializing: true, error: null }));
    
    try {
      // Convert WalletAccount to Account type for protocol service
      const accountAdapter = account as any; // Type adapter for compatibility
      const txHash = await registerUser(accountAdapter, profileName);
      setState(prev => ({ 
        ...prev, 
        hasProfile: true, 
        profileName,
        isInitializing: false 
      }));
      return txHash;
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to initialize profile';
      setState(prev => ({ 
        ...prev, 
        error: errorMessage,
        isInitializing: false 
      }));
      throw error;
    }
  }, [account]);
  
  /**
   * Fetch reserves
   */
  const fetchReserves = useCallback(async () => {
    setState(prev => ({ ...prev, reservesLoading: true, error: null }));
    
    try {
      // Get all configured assets
      const allAssets = getAllAssets();
      
      // Fetch prices for all assets
      const coinTypes = allAssets.map(a => a.coinType);
      const prices = await getPricesByCoinTypes(coinTypes);
      
      // Build reserve list from configured assets with fetched prices
      const reserves: AriesReserve[] = allAssets.map(asset => ({
        coinType: asset.coinType,
        symbol: asset.symbol,
        name: asset.name,
        decimals: asset.decimals,
        priceUSD: prices[asset.coinType] || 0,
        
        // Default values (would be fetched from contract in production)
        totalSuppliedUSD: 0,
        totalBorrowedUSD: 0,
        utilization: 0,
        
        // Default APRs (would be calculated from reserve details)
        supplyAPR: asset.symbol === 'USDC' || asset.symbol === 'USDT' ? 3.5 : 5.0,
        borrowAPR: asset.symbol === 'USDC' || asset.symbol === 'USDT' ? 6.0 : 8.5,
        rewardAPRs: [],
        
        // Default risk params from report.md
        ltv: 80,
        liquidationThreshold: 85,
        borrowFactor: 100,
        
        // Default limits
        depositLimit: 200000000000000,
        borrowLimit: 100000000000000,
        
        // Default flags
        canSupply: true,
        canBorrow: true,
        canUseAsCollateral: true,
      }));
      
      setState(prev => ({ 
        ...prev, 
        reserves,
        reservesLoading: false 
      }));
    } catch (error: any) {
      setState(prev => ({ 
        ...prev, 
        error: error?.message || 'Failed to fetch reserves',
        reservesLoading: false 
      }));
    }
  }, []);
  
  /**
   * Fetch user portfolio
   */
  const fetchPortfolio = useCallback(async () => {
    if (!connected || !account?.address || !state.hasProfile) {
      setState(prev => ({ ...prev, portfolio: null }));
      return;
    }
    
    setState(prev => ({ ...prev, portfolioLoading: true, error: null }));
    
    try {
      // Fetch positions
      const position = await getUserPosition(account.address, state.profileName);
      
      // Fetch rewards
      const rewardPositions = await getUserClaimableRewards(account.address, state.profileName);
      const rewards = summarizeRewards(rewardPositions);
      
      if (position) {
        // Get prices for all assets in position
        const allCoinTypes = [
          ...position.deposits.map(d => d.coinType),
          ...position.borrows.map(b => b.coinType),
        ];
        const prices = await getPricesByCoinTypes(allCoinTypes);
        
        // Convert to risk calculation format
        const deposits: DepositPosition[] = position.deposits.map(d => {
          const metadata = getAssetMetadata(d.coinType);
          const reserve = state.reserves.find(r => r.coinType === d.coinType);
          
          return {
            coinType: d.coinType,
            symbol: metadata?.symbol || 'UNKNOWN',
            amount: parseFloat(d.amount),
            priceUSD: prices[d.coinType] || 0,
            ltv: reserve?.ltv || 80,
            liquidationThreshold: reserve?.liquidationThreshold || 85,
            borrowFactor: reserve?.borrowFactor || 100,
            lpAmount: 0,
          };
        });
        
        const borrows: BorrowPosition[] = position.borrows.map(b => {
          const metadata = getAssetMetadata(b.coinType);
          const reserve = state.reserves.find(r => r.coinType === b.coinType);
          
          return {
            coinType: b.coinType,
            symbol: metadata?.symbol || 'UNKNOWN',
            amount: parseFloat(b.amount),
            priceUSD: prices[b.coinType] || 0,
            ltv: 0,
            liquidationThreshold: 0,
            borrowFactor: reserve?.borrowFactor || 100,
            borrowShare: 0,
          };
        });
        
        const riskMetrics = calculatePortfolioRisk(deposits, borrows);
        
        setState(prev => ({
          ...prev,
          portfolio: {
            deposits,
            borrows,
            riskMetrics,
            rewards,
          },
          portfolioLoading: false,
        }));
      } else {
        setState(prev => ({ ...prev, portfolio: null, portfolioLoading: false }));
      }
    } catch (error: any) {
      setState(prev => ({ 
        ...prev, 
        error: error?.message || 'Failed to fetch portfolio',
        portfolioLoading: false 
      }));
    }
  }, [connected, account?.address, state.hasProfile, state.profileName]);
  
  /**
   * Supply assets
   */
  const supply = useCallback(async (params: Omit<DepositParams, 'account'>) => {
    if (!account) throw new Error('Wallet not connected');
    
    setState(prev => ({ ...prev, txPending: true, error: null }));
    
    try {
      // Convert WalletAccount to Account type for protocol service
      const accountAdapter = account as any;
      const txHash = await deposit({ ...params, account: accountAdapter });
      setState(prev => ({ ...prev, txPending: false }));
      
      // Refresh portfolio
      await fetchPortfolio();
      
      return txHash;
    } catch (error: any) {
      setState(prev => ({ 
        ...prev, 
        error: error?.message || 'Supply failed',
        txPending: false 
      }));
      throw error;
    }
  }, [account, fetchPortfolio]);
  
  /**
   * Withdraw assets
   */
  const withdrawAssets = useCallback(async (params: Omit<WithdrawParams, 'account'>) => {
    if (!account) throw new Error('Wallet not connected');
    
    setState(prev => ({ ...prev, txPending: true, error: null }));
    
    try {
      // Convert WalletAccount to Account type for protocol service
      const accountAdapter = account as any;
      const txHash = await withdraw({ ...params, account: accountAdapter });
      setState(prev => ({ ...prev, txPending: false }));
      
      // Refresh portfolio
      await fetchPortfolio();
      
      return txHash;
    } catch (error: any) {
      setState(prev => ({ 
        ...prev, 
        error: error?.message || 'Withdrawal failed',
        txPending: false 
      }));
      throw error;
    }
  }, [account, fetchPortfolio]);
  
  /**
   * Calculate max safe withdrawal
   */
  const getMaxWithdraw = useCallback((coinType: string): number => {
    if (!state.portfolio) return 0;
    
    return calculateMaxSafeWithdrawal(
      state.portfolio.deposits,
      state.portfolio.borrows,
      coinType,
      1.2 // 120% safety threshold
    );
  }, [state.portfolio]);
  
  /**
   * Calculate max safe borrow
   */
  const getMaxBorrow = useCallback((coinType: string, assetTemplate: Omit<BorrowPosition, 'amount'>): number => {
    if (!state.portfolio) return 0;
    
    return calculateMaxSafeBorrow(
      state.portfolio.deposits,
      state.portfolio.borrows,
      assetTemplate,
      1.2 // 120% safety threshold
    );
  }, [state.portfolio]);
  
  /**
   * Simulate transaction impact
   */
  const simulateSupply = useCallback(async (coinType: string, amount: number) => {
    if (!state.portfolio) return null;

    // Get reserve info
    const reserve = state.reserves.find(r => r.coinType === coinType);
    if (!reserve) return null;
    
    // Create new deposit position
    const newDeposit: DepositPosition = {
      coinType,
      symbol: reserve.symbol,
      amount,
      priceUSD: reserve.priceUSD,
      ltv: reserve.ltv,
      liquidationThreshold: reserve.liquidationThreshold,
      borrowFactor: reserve.borrowFactor,
      lpAmount: 0,
    };
    
    // Add to existing deposits or update existing
    const updatedDeposits = [...state.portfolio.deposits];
    const existingIndex = updatedDeposits.findIndex(d => d.coinType === coinType);
    
    if (existingIndex >= 0) {
      updatedDeposits[existingIndex] = {
        ...updatedDeposits[existingIndex],
        amount: updatedDeposits[existingIndex].amount + amount,
      };
    } else {
      updatedDeposits.push(newDeposit);
    }
    
    // Calculate new risk metrics
    return calculatePortfolioRisk(updatedDeposits, state.portfolio.borrows);
  }, [state.portfolio, state.reserves]);
  
  const simulateWithdraw = useCallback((coinType: string, amount: number) => {
    if (!state.portfolio) return null;
    
    return simulateWithdrawHealthFactor(
      state.portfolio.deposits,
      state.portfolio.borrows,
      { coinType, amount }
    );
  }, [state.portfolio]);
  
  /**
   * Initialize on mount
   */
  useEffect(() => {
    if (connected && account?.address) {
      checkProfile();
      fetchReserves();
    }
  }, [connected, account?.address, checkProfile, fetchReserves]);
  
  /**
   * Fetch portfolio when profile ready
   */
  useEffect(() => {
    if (state.hasProfile) {
      fetchPortfolio();
    }
  }, [state.hasProfile, fetchPortfolio]);
  
  /**
   * Auto-refresh portfolio every 30 seconds
   */
  useEffect(() => {
    if (!state.hasProfile) return;
    
    const interval = setInterval(() => {
      fetchPortfolio();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [state.hasProfile, fetchPortfolio]);
  
  return {
    // Profile
    hasProfile: state.hasProfile,
    profileName: state.profileName,
    isInitializing: state.isInitializing,
    initializeProfile,
    
    // Reserves
    reserves: state.reserves,
    reservesLoading: state.reservesLoading,
    
    // Portfolio
    portfolio: state.portfolio,
    portfolioLoading: state.portfolioLoading,
    
    // Actions
    supply,
    withdraw: withdrawAssets,
    getMaxWithdraw,
    getMaxBorrow,
    simulateSupply,
    simulateWithdraw,
    
    // Refresh
    refresh: fetchPortfolio,
    
    // State
    loading: state.reservesLoading || state.portfolioLoading || state.isInitializing,
    error: state.error,
    txPending: state.txPending,
  };
}

export default useAriesLendingComplete;
