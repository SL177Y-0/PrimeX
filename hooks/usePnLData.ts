/**
 * Custom Hook for PnL Data
 * 
 * Provides portfolio PnL metrics with auto-refresh
 */

import { useState, useEffect, useCallback } from 'react';
import { pnlEngine, PortfolioMetrics } from '../services/pnlEngine';

export function usePnLData(userId: string, enableRealtime: boolean = true) {
  const [metrics, setMetrics] = useState<PortfolioMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now());

  const fetchMetrics = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);

      const data = await pnlEngine.calculatePortfolioMetrics(userId);
      setMetrics(data);
      setLastUpdated(Date.now());
    } catch (err: any) {
      console.error('[usePnLData] Error fetching metrics:', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    fetchMetrics();

    if (enableRealtime) {
      // Start real-time tracking
      pnlEngine.startRealtimeTracking(userId);

      // Refresh metrics periodically
      const interval = setInterval(fetchMetrics, 30000);

      return () => {
        clearInterval(interval);
        pnlEngine.stopRealtimeTracking();
      };
    }
  }, [userId, enableRealtime, fetchMetrics]);

  return {
    metrics,
    loading,
    error,
    lastUpdated,
    refresh: fetchMetrics,
  };
}

export function usePnLHistory(userId: string, days: number = 30) {
  const [history, setHistory] = useState<Array<{ timestamp: string; pnl: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);

      const data = await pnlEngine.getHistoricalPnL(userId, days);
      setHistory(data);
    } catch (err: any) {
      console.error('[usePnLHistory] Error fetching history:', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId, days]);

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
