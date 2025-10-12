import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '../app/providers/WalletProvider';
import { merkleSdkService } from '../services/merkleSdkService';
import { Position, TradeHistoryItem } from '../types/merkle';
import { log } from '../utils/logger';

// Re-export types for compatibility
export type { Position, TradeHistoryItem };

export const useMerklePositions = () => {
  const { account } = useWallet();
  const [positions, setPositions] = useState<Position[]>([]);
  const [activities, setActivities] = useState<TradeHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPositions = useCallback(async () => {
    if (!account?.address) {
      setPositions([]);
      setActivities([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      log.trade('Fetching positions and activities for:', account.address);

      // Use official Merkle SDK service (no mocks, direct REST)
      const [fetchedPositions, fetchedActivities] = await Promise.all([
        merkleSdkService.fetchPositions(account.address),
        merkleSdkService.fetchTradingHistory(account.address)
      ]);
      
      setPositions(fetchedPositions);
      setActivities(fetchedActivities);
      
      log.trade(`Loaded ${fetchedPositions.length} positions, ${fetchedActivities.length} activities from Merkle API`);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch positions';
      setError(errorMessage);
      log.error('Error fetching positions:', err);
      
      // Return empty arrays on error (no mock fallback)
      setPositions([]);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  }, [account?.address]);

  // Real-time updates disabled for now (would require WebSocket integration)
  // Positions will refresh on manual refresh or auto-refresh interval

  // Fetch positions when account changes
  useEffect(() => {
    fetchPositions();
  }, [fetchPositions]);

  // Auto-refresh positions every 60 seconds (reduced frequency to prevent scroll jumps)
  useEffect(() => {
    if (!account?.address) return;

    const interval = setInterval(() => {
      log.trade('Auto-refreshing positions...');
      // Only fetch if component is still mounted and user hasn't scrolled recently
      fetchPositions();
    }, 60000); // Increased from 30s to 60s

    return () => clearInterval(interval);
  }, [fetchPositions, account?.address]);

  const refreshPositions = useCallback(() => {
    log.trade('Manual refresh triggered');
    fetchPositions();
  }, [fetchPositions]);

  // Add a new position (called after successful trade)
  const addPosition = useCallback((positionData: Partial<Position>) => {
    log.trade('Adding new position:', positionData);
    // Position will be updated via WebSocket subscription
    refreshPositions();
  }, [refreshPositions]);

  // Add trading activity
  const addActivity = useCallback((activityData: Partial<TradeHistoryItem>) => {
    log.trade('Adding new activity:', activityData);
    // Activity will be updated via WebSocket subscription
    refreshPositions();
  }, [refreshPositions]);

  // ===== CLOSE POSITION FUNCTIONALITY =====
  
  /**
   * Close a position (full or partial)
   * Uses Merkle SDK to create close transaction
   */
  const closePosition = useCallback(async (params: {
    positionId: string;
    pair: string;
    sizeDelta: number;        // Amount to close (USDC)
    collateralDelta: number;  // Collateral to withdraw (USDC)
    isPartial: boolean;
  }) => {
    if (!account?.address) {
      throw new Error('Wallet not connected');
    }

    try {
      log.trade('Closing position:', params);

      // Convert to microunits (6 decimals for USDC)
      const sizeDeltaBigInt = BigInt(Math.floor(params.sizeDelta * 1e6));
      const collateralDeltaBigInt = BigInt(Math.floor(params.collateralDelta * 1e6));

      // Find position to determine side
      const position = positions.find(p => p.id === params.positionId);
      if (!position) {
        throw new Error('Position not found');
      }

      // Create close transaction using SDK (isIncrease=false for closing)
      const closeTransaction = await merkleSdkService.createMarketOrderPayload({
        pair: params.pair,
        userAddress: account.address,
        sizeDelta: sizeDeltaBigInt,
        collateralDelta: collateralDeltaBigInt,
        isLong: position.side === 'long',
        isIncrease: false, // false = close/decrease position
      });

      log.trade('Close transaction created via SDK, ready for wallet signature');
      
      // Return transaction for wallet to sign
      return closeTransaction;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to close position';
      log.error('Error closing position:', err);
      throw new Error(errorMessage);
    }
  }, [account?.address, positions]);

  /**
   * Update Stop Loss and Take Profit for a position
   * Note: This feature requires manual transaction construction
   */
  const updateTPSL = useCallback(async (params: {
    positionId: string;
    pair: string;
    stopLossPrice?: number;   // USDC price (0 = remove)
    takeProfitPrice?: number; // USDC price (0 = remove)
  }) => {
    if (!account?.address) {
      throw new Error('Wallet not connected');
    }

    try {
      log.trade('Updating TP/SL:', params);

      // Find position to determine side
      const position = positions.find(p => p.id === params.positionId);
      if (!position) {
        throw new Error('Position not found');
      }

      // Note: TP/SL update requires the update_position contract function
      // For now, recommend closing and reopening with new TP/SL
      throw new Error('TP/SL update not yet implemented. Please close and reopen position with new values.');
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update TP/SL';
      log.error('Error updating TP/SL:', err);
      throw new Error(errorMessage);
    }
  }, [account?.address, positions]);

  // Calculate portfolio metrics for compatibility
  const totalPnL = positions?.reduce((sum, pos) => {
    return sum + (pos?.pnlUSDC || 0);
  }, 0) || 0;
  
  const totalCollateral = positions?.reduce((sum, pos) => {
    return sum + (pos?.collateralUSDC || 0);
  }, 0) || 0;
  
  const mockBalance = 1000; // Mock balance
  
  const portfolio = {
    totalBalance: mockBalance,
    totalPnl: totalPnL,
    totalCollateral,
    freeCollateral: Math.max(0, mockBalance - totalCollateral),
    marginRatio: totalCollateral > 0 ? (mockBalance + totalPnL) / totalCollateral : 0,
    positionCount: positions?.length || 0,
    orderCount: 0,
  };

  return {
    positions,
    activities,
    portfolio,
    totalPnL,
    loading,
    error,
    refreshPositions,
    addPosition,
    addActivity,
    // New close/update functionality
    closePosition,
    updateTPSL,
  };
};
