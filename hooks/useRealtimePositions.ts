/**
 * Real-Time Positions Hook
 * 
 * Features:
 * - Supabase real-time subscriptions
 * - Automatic PnL updates
 * - Optimistic updates
 * - Error recovery
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { databaseService } from '../services/database.service';
import { RealtimeChannel } from '@supabase/supabase-js';

interface Position {
  id: string;
  user_id: string;
  asset_symbol: string;
  coin_type: string;
  position_type: 'supply' | 'borrow';
  amount: string;
  amount_usd: string;
  entry_price: string;
  current_price: string;
  pnl: string;
  pnl_percent: string;
  current_apr: string;
  opened_at: string;
  updated_at: string;
}

export function useRealtimePositions(userId: string | null) {
  const [positions, setPositions] = useState<Position[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  /**
   * Fetch initial positions
   */
  const fetchPositions = useCallback(async () => {
    if (!userId) {
      setPositions([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const data = await databaseService.getUserPositions(userId);
      const normalizedPositions = Array.isArray(data) ? (data as Position[]) : [];
      setPositions(normalizedPositions);
    } catch (err: any) {
      console.error('[useRealtimePositions] Fetch error:', err.message);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  /**
   * Setup real-time subscription
   */
  useEffect(() => {
    if (!userId) {
      // Cleanup if no user
      if (channel) {
        channel.unsubscribe();
        setChannel(null);
      }
      return;
    }

    // Initial fetch
    fetchPositions();

    // Subscribe to real-time updates
    const positionsChannel = supabase
      .channel(`positions:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'positions',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('[Realtime] Position change:', payload.eventType);

          if (payload.eventType === 'INSERT') {
            // New position added
            setPositions((prev) => [payload.new as Position, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            // Position updated (PnL, price, etc.)
            setPositions((prev) =>
              prev.map((p) =>
                p.id === payload.new.id ? (payload.new as Position) : p
              )
            );
          } else if (payload.eventType === 'DELETE') {
            // Position closed
            setPositions((prev) => prev.filter((p) => p.id !== payload.old.id));
          }
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Subscription status:', status);
        
        if (status === 'SUBSCRIBED') {
          console.log('✅ Real-time positions active');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Real-time subscription error');
          setError('Real-time updates unavailable');
        }
      });

    setChannel(positionsChannel);

    // Cleanup on unmount
    return () => {
      console.log('[Realtime] Unsubscribing from positions');
      positionsChannel.unsubscribe();
    };
  }, [userId, fetchPositions]);

  /**
   * Refresh positions manually
   */
  const refresh = useCallback(async () => {
    await fetchPositions();
  }, [fetchPositions]);

  /**
   * Calculate total portfolio metrics
   */
  const portfolioMetrics = useCallback(() => {
    if (positions.length === 0) {
      return {
        totalSupplied: 0,
        totalBorrowed: 0,
        netPnL: 0,
        netPnLPercent: 0,
        healthFactor: null,
      };
    }

    const supplied = positions
      .filter((p) => p.position_type === 'supply')
      .reduce((sum, p) => sum + parseFloat(p.amount_usd || '0'), 0);

    const borrowed = positions
      .filter((p) => p.position_type === 'borrow')
      .reduce((sum, p) => sum + parseFloat(p.amount_usd || '0'), 0);

    const totalPnL = positions.reduce(
      (sum, p) => sum + parseFloat(p.pnl || '0'),
      0
    );

    const avgPnLPercent =
      positions.reduce((sum, p) => sum + parseFloat(p.pnl_percent || '0'), 0) /
      positions.length;

    // Simple health factor (supplied / borrowed)
    const healthFactor = borrowed > 0 ? supplied / borrowed : null;

    return {
      totalSupplied: supplied,
      totalBorrowed: borrowed,
      netPnL: totalPnL,
      netPnLPercent: avgPnLPercent,
      healthFactor,
    };
  }, [positions]);

  return {
    positions,
    isLoading,
    error,
    refresh,
    metrics: portfolioMetrics(),
    isConnected: channel?.state === 'joined',
  };
}
