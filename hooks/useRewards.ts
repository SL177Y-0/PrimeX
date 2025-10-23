/**
 * Rewards Hook
 * 
 * React hook for managing user rewards data and claiming functionality
 */

import { useState, useEffect, useCallback } from 'react';
import { rewardsService, type UserReward, type RewardSummary } from '../services/rewardsService';
import { useWallet } from '../app/providers/WalletProvider';

export function useRewards(refreshInterval: number = 60000) {
  const { account } = useWallet();
  const [rewards, setRewards] = useState<UserReward[]>([]);
  const [summary, setSummary] = useState<RewardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState<string | null>(null);

  const fetchRewards = useCallback(async () => {
    if (!account?.address) {
      setRewards([]);
      setSummary(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [userRewards, rewardSummary] = await Promise.all([
        rewardsService.fetchUserRewards(account.address),
        rewardsService.calculateRewardSummary(account.address),
      ]);

      setRewards(userRewards);
      setSummary(rewardSummary);
    } catch (err: any) {
      console.error('[useRewards] Error fetching rewards:', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [account?.address]);

  const claimReward = useCallback(async (
    assetSymbol: string,
    rewardType: 'supply' | 'borrow' | 'liquidity_mining'
  ) => {
    if (!account?.address) {
      throw new Error('Wallet not connected');
    }

    try {
      setClaiming(`${assetSymbol}_${rewardType}`);
      
      const transaction = await rewardsService.claimReward(
        account.address,
        assetSymbol,
        rewardType
      );

      // Here you would sign and submit the transaction
      // For now, we'll just simulate success
      console.log('Claim transaction built:', transaction);
      
      // Refresh rewards after claiming
      await fetchRewards();
      
      return transaction;
    } catch (error) {
      console.error('[useRewards] Error claiming reward:', error);
      throw error;
    } finally {
      setClaiming(null);
    }
  }, [account?.address, fetchRewards]);

  const claimAllRewards = useCallback(async () => {
    if (!rewards.length) return;

    const pendingRewards = rewards.filter(r => !r.claimed);
    
    for (const reward of pendingRewards) {
      try {
        await claimReward(reward.assetSymbol, reward.rewardType);
      } catch (error) {
        console.error(`Failed to claim ${reward.assetSymbol} ${reward.rewardType} reward:`, error);
      }
    }
  }, [rewards, claimReward]);

  useEffect(() => {
    fetchRewards();

    if (refreshInterval > 0) {
      const interval = setInterval(fetchRewards, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchRewards, refreshInterval]);

  return {
    rewards,
    summary,
    loading,
    error,
    claiming,
    refresh: fetchRewards,
    claimReward,
    claimAllRewards,
  };
}

export function useRewardHistory(userAddress?: string, days: number = 30) {
  const [history, setHistory] = useState<Array<{ date: string; amount: number; amountUSD: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    if (!userAddress) {
      setHistory([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const historyData = await rewardsService.getRewardHistory(userAddress, days);
      setHistory(historyData);
    } catch (err: any) {
      console.error('[useRewardHistory] Error fetching history:', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userAddress, days]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return {
    history,
    loading,
    error,
    refresh: fetchHistory,
  };
}

export function useProtocolRewards() {
  const [protocolRewards, setProtocolRewards] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProtocolRewards = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await rewardsService.fetchProtocolRewards();
      setProtocolRewards(data);
    } catch (err: any) {
      console.error('[useProtocolRewards] Error fetching protocol rewards:', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProtocolRewards();
  }, [fetchProtocolRewards]);

  return {
    protocolRewards,
    loading,
    error,
    refresh: fetchProtocolRewards,
  };
}
