/**
 * React Hooks for Aries Lending & Borrowing
 * 
 * Provides data fetching and state management hooks for Aries protocol
 */

import { useState, useEffect, useCallback } from 'react';
import { ARIES_CONFIG } from '../config/constants';
import {
  fetchPools,
  fetchUserPositions,
  fetchProtocolStats,
  fetchReserve,
  fetchHistoricalAPR,
  enrichReservesWithPrices,
} from '../services/ariesLendingService';
import type {
  AriesPool,
  AriesReserve,
  UserPortfolio,
  AriesProtocolStats,
  APRDataPoint,
} from '../types/aries';

// ============================================================================
// Pools Hooks
// ============================================================================

export function useAriesPools() {
  const [pairedPools, setPairedPools] = useState<AriesPool[]>([]);
  const [isolatedPools, setIsolatedPools] = useState<AriesPool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<number>(0);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { pairedPools: paired, isolatedPools: isolated } = await fetchPools();
      
      // Enrich with price data
      const enrichedPaired = await Promise.all(
        paired.map(async pool => ({
          ...pool,
          reserves: await enrichReservesWithPrices(pool.reserves),
        }))
      );
      
      const enrichedIsolated = await Promise.all(
        isolated.map(async pool => ({
          ...pool,
          reserves: await enrichReservesWithPrices(pool.reserves),
        }))
      );
      
      setPairedPools(enrichedPaired);
      setIsolatedPools(enrichedIsolated);
      setLastUpdate(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch pools');
      console.error('Error fetching Aries pools:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData();
    }, ARIES_CONFIG.refreshIntervals.pools);

    return () => clearInterval(interval);
  }, [fetchData]);

  return {
    pairedPools,
    isolatedPools,
    loading,
    error,
    lastUpdate,
    refetch: fetchData,
  };
}

// ============================================================================
// Single Reserve Hook
// ============================================================================

export function useAriesReserve(coinType: string) {
  const [reserve, setReserve] = useState<AriesReserve | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!coinType) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const data = await fetchReserve(coinType);
      
      if (data) {
        const enriched = await enrichReservesWithPrices([data]);
        setReserve(enriched[0] || null);
      } else {
        setReserve(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch reserve');
      console.error('Error fetching reserve:', err);
    } finally {
      setLoading(false);
    }
  }, [coinType]);

  useEffect(() => {
    fetchData();
    
    const interval = setInterval(fetchData, ARIES_CONFIG.refreshIntervals.pools);
    return () => clearInterval(interval);
  }, [fetchData]);

  return {
    reserve,
    loading,
    error,
    refetch: fetchData,
  };
}

// ============================================================================
// User Positions Hook
// ============================================================================

export function useAriesUserPositions(userAddress?: string) {
  const [portfolio, setPortfolio] = useState<UserPortfolio | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!userAddress) {
      setPortfolio(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const data = await fetchUserPositions(userAddress);
      setPortfolio(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch user positions');
      console.error('Error fetching user positions:', err);
    } finally {
      setLoading(false);
    }
  }, [userAddress]);

  useEffect(() => {
    fetchData();
    
    if (userAddress) {
      const interval = setInterval(fetchData, ARIES_CONFIG.refreshIntervals.userPositions);
      return () => clearInterval(interval);
    }
  }, [fetchData, userAddress]);

  return {
    portfolio,
    loading,
    error,
    refetch: fetchData,
  };
}

// ============================================================================
// Protocol Stats Hook
// ============================================================================

export function useAriesProtocolStats() {
  const [stats, setStats] = useState<AriesProtocolStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await fetchProtocolStats();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch protocol stats');
      console.error('Error fetching protocol stats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    
    const interval = setInterval(fetchData, ARIES_CONFIG.refreshIntervals.pools);
    return () => clearInterval(interval);
  }, [fetchData]);

  return {
    stats,
    loading,
    error,
    refetch: fetchData,
  };
}

// ============================================================================
// Historical APR Hook
// ============================================================================

export function useAriesHistoricalAPR(coinType: string, days: number = 30) {
  const [history, setHistory] = useState<APRDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!coinType) return;

    try {
      setLoading(true);
      setError(null);
      
      const data = await fetchHistoricalAPR(coinType, days);
      setHistory(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch APR history');
      console.error('Error fetching APR history:', err);
    } finally {
      setLoading(false);
    }
  }, [coinType, days]);

  useEffect(() => {
    fetchData();
    
    const interval = setInterval(fetchData, ARIES_CONFIG.refreshIntervals.aprHistory);
    return () => clearInterval(interval);
  }, [fetchData]);

  return {
    history,
    loading,
    error,
    refetch: fetchData,
  };
}

// ============================================================================
// Combined Data Hook (for dashboard)
// ============================================================================

export function useAriesDashboard(userAddress?: string) {
  const poolsData = useAriesPools();
  const statsData = useAriesProtocolStats();
  const positionsData = useAriesUserPositions(userAddress);

  const loading = poolsData.loading || statsData.loading || positionsData.loading;
  const error = poolsData.error || statsData.error || positionsData.error;

  const refetchAll = useCallback(() => {
    poolsData.refetch();
    statsData.refetch();
    positionsData.refetch();
  }, [poolsData, statsData, positionsData]);

  return {
    pools: {
      paired: poolsData.pairedPools,
      isolated: poolsData.isolatedPools,
    },
    stats: statsData.stats,
    userPortfolio: positionsData.portfolio,
    loading,
    error,
    refetch: refetchAll,
  };
}

// ============================================================================
// Utility Hooks
// ============================================================================

/**
 * Hook to get all reserves as flat list
 */
export function useAriesAllReserves() {
  const { pairedPools, isolatedPools, loading, error } = useAriesPools();

  const allReserves = [
    ...pairedPools.flatMap(pool => pool.reserves),
    ...isolatedPools.flatMap(pool => pool.reserves),
  ];

  return {
    reserves: allReserves,
    loading,
    error,
  };
}

/**
 * Hook to filter reserves by type
 */
export function useFilteredReserves(type: 'paired' | 'isolated' | 'all' = 'all') {
  const { pairedPools, isolatedPools, loading, error } = useAriesPools();

  let reserves: AriesReserve[] = [];

  if (type === 'paired' || type === 'all') {
    reserves = [...reserves, ...pairedPools.flatMap(pool => pool.reserves)];
  }

  if (type === 'isolated' || type === 'all') {
    reserves = [...reserves, ...isolatedPools.flatMap(pool => pool.reserves)];
  }

  return {
    reserves,
    loading,
    error,
  };
}
