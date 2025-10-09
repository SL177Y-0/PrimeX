import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '../app/providers/WalletProvider';
import { merklePositionService } from '../services/merklePositionService';
import { realPositionService } from '../services/realPositionService';
import { realMerkleService, MerklePosition, TradingActivity } from '../services/realMerkleService';
import { merkleService } from '../services/merkleService';
import { Position, TradeHistoryItem, Address } from '../types/merkle';
import { APP_CONFIG } from '../config/appConfig';
import { log } from '../utils/logger';

// Re-export types for compatibility
export type { Position, TradeHistoryItem };

// Helper function to map activity types to actions
const mapActivityTypeToAction = (type: string): 'open' | 'close' | 'increase' | 'decrease' => {
  switch (type) {
    case 'position_opened':
      return 'open';
    case 'position_closed':
      return 'close';
    case 'position_modified':
      return 'increase';
    default:
      return 'open';
  }
};

// Helper function to map status types
const mapStatusType = (status: string): 'OPEN' | 'CLOSING' | 'CLOSED' | 'LIQUIDATED' => {
  switch (status) {
    case 'active':
      return 'OPEN';
    case 'closed':
      return 'CLOSED';
    default:
      return 'OPEN';
  }
};

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

      // Use Real Merkle Trade SDK for production data
      if (APP_CONFIG.USE_REAL_BLOCKCHAIN_DATA && !APP_CONFIG.USE_MOCK_POSITIONS) {
        log.trade('REAL DATA MODE: Using official Merkle Trade SDK');
        
        try {
          // Use the official Merkle Trade SDK
          const [fetchedPositions, fetchedActivities] = await Promise.all([
            realMerkleService.fetchPositions(account.address),
            realMerkleService.fetchTradingHistory(account.address)
          ]);
          
          // Convert MerklePosition to Position format for compatibility
          const compatiblePositions = fetchedPositions.map(pos => ({
            id: pos.id,
            pair: pos.pair,
            side: pos.side,
            sizeUSDC: pos.size, // Map size to sizeUSDC for compatibility
            size: pos.size, // Also keep size property
            collateral: pos.collateral,
            collateralUSDC: pos.collateral, // Required by Position type
            leverage: pos.leverage,
            entryPrice: pos.entryPrice,
            markPrice: pos.markPrice,
            pnl: pos.pnl,
            pnlUSDC: pos.pnl, // Required by Position type
            pnlPercentage: pos.pnlPercentage,
            pnlPercent: pos.pnlPercentage, // Required by Position type
            liquidationPrice: pos.liquidationPrice,
            fundingFee: pos.fundingFee,
            timestamp: pos.timestamp,
            status: mapStatusType(pos.status) // Map to correct status type
          }));
          
          // Convert TradingActivity to TradeHistoryItem format
          const compatibleActivities = fetchedActivities.map(act => ({
            id: act.id,
            type: act.type,
            pair: act.pair,
            side: act.side,
            size: act.size,
            price: act.price,
            timestamp: act.timestamp,
            txHash: act.txHash,
            fee: act.fee,
            pnl: act.pnl,
            action: mapActivityTypeToAction(act.type) // Required by TradeHistoryItem type
          }));
          
          setPositions(compatiblePositions);
          setActivities(compatibleActivities);
          
          log.trade(`Loaded ${compatiblePositions.length} real positions, ${compatibleActivities.length} real activities from SDK`);
          
        } catch (realDataError) {
          log.warn('Failed to fetch real SDK data, falling back to mock:', realDataError);
          // Fall back to mock data
          const [fetchedPositions, fetchedActivities] = await Promise.all([
            merklePositionService.fetchPositions(account.address as Address),
            merklePositionService.fetchTradingHistory(account.address as Address)
          ]);
          setPositions(fetchedPositions || []);
          setActivities(fetchedActivities || []);
        }
      } else {
        // Use mock data for development
        log.trade('MOCK DATA MODE: Using mock data for development');
        
        const [fetchedPositions, fetchedActivities] = await Promise.all([
          merklePositionService.fetchPositions(account.address as Address),
          merklePositionService.fetchTradingHistory(account.address as Address)
        ]);
        setPositions(fetchedPositions || []);
        setActivities(fetchedActivities || []);
        
        log.trade(`Loaded ${fetchedPositions?.length || 0} mock positions, ${fetchedActivities?.length || 0} mock activities`);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch positions';
      setError(errorMessage);
      log.error('Error fetching positions:', err);
      
      // Still show mock data on error for development
      setPositions([]);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  }, [account?.address]);

  // Subscribe to real-time position updates
  useEffect(() => {
    if (!account?.address) return;

    const unsubscribePositions = merklePositionService.subscribeToPositions((updatedPositions: Position[]) => {
      setPositions(updatedPositions);
      log.trade('Positions updated via subscription:', updatedPositions.length);
    });

    const unsubscribeActivities = merklePositionService.subscribeToActivities((updatedActivities: TradeHistoryItem[]) => {
      setActivities(updatedActivities);
      log.trade('Activities updated via subscription:', updatedActivities.length);
    });

    return () => {
      unsubscribePositions();
      unsubscribeActivities();
    };
  }, [account?.address]);

  // Fetch positions when account changes
  useEffect(() => {
    fetchPositions();
  }, [fetchPositions]);

  // Auto-refresh positions every 30 seconds
  useEffect(() => {
    if (!account?.address) return;

    const interval = setInterval(() => {
      log.trade('Auto-refreshing positions...');
      fetchPositions();
    }, 30000);

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
   * Uses merkleService to create close transaction
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

      // Convert to microunits (6 decimals)
      const sizeDeltaBigInt = BigInt(Math.floor(params.sizeDelta * 1e6));
      const collateralDeltaBigInt = BigInt(Math.floor(params.collateralDelta * 1e6));

      // Create close transaction via merkleService
      const { closeTransaction } = await merkleService.closePosition({
        pair: params.pair,
        userAddress: account.address,
        positionId: params.positionId,
        sizeDelta: sizeDeltaBigInt,
        collateralDelta: collateralDeltaBigInt,
        isPartial: params.isPartial,
      });

      log.trade('Close transaction created, ready for wallet signature');
      
      // Return transaction for wallet to sign
      return closeTransaction;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to close position';
      log.error('Error closing position:', err);
      throw new Error(errorMessage);
    }
  }, [account?.address]);

  /**
   * Update Stop Loss and Take Profit for a position
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

      // Convert to microunits (6 decimals)
      const slPriceBigInt = params.stopLossPrice 
        ? BigInt(Math.floor(params.stopLossPrice * 1e6)) 
        : undefined;
      const tpPriceBigInt = params.takeProfitPrice 
        ? BigInt(Math.floor(params.takeProfitPrice * 1e6)) 
        : undefined;

      // Create update transaction via merkleService
      const { updateTransaction } = await merkleService.updateTPSL({
        pair: params.pair,
        userAddress: account.address,
        positionId: params.positionId,
        stopLossPrice: slPriceBigInt,
        takeProfitPrice: tpPriceBigInt,
      });

      log.trade('TP/SL update transaction created, ready for wallet signature');
      
      // Return transaction for wallet to sign
      return updateTransaction;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update TP/SL';
      log.error('Error updating TP/SL:', err);
      throw new Error(errorMessage);
    }
  }, [account?.address]);

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
