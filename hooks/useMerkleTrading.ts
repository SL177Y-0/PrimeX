import { useState, useCallback } from 'react';
import { useMerklePositions } from './useMerklePositions';
import { merkleSdkService } from '../services/merkleSdkService';
import { useWallet } from '../app/providers/WalletProvider';
import { log } from '../utils/logger';

// Transaction data interface
export interface TransactionData {
  hash: string;
  sender: string;
  success: boolean;
  gasUsed: string;
  vmStatus: string;
}

// Place order parameters interface
export interface PlaceOrderParams {
  market: string;
  side: 'long' | 'short';
  size: number;
  collateral: number;
  orderType: 'market' | 'limit';
  price?: number;
  leverage?: number;
  stopLoss?: number;
  takeProfit?: number;
}

// Position interface
export interface Position {
  id: string;
  market: string;
  side: 'long' | 'short';
  size: number;
  collateral: number;
  entryPrice: number;
  liquidationPrice: number;
  unrealizedPnl: number;
  leverage: number;
}

// Helper functions for calculations
export const calculatePnL = (
  entryPrice: number,
  currentPrice: number,
  size: number,
  isLong: boolean
): number => {
  const priceDiff = isLong ? currentPrice - entryPrice : entryPrice - currentPrice;
  return (priceDiff / entryPrice) * size;
};

export const calculateLiquidationPrice = (
  entryPrice: number,
  leverage: number,
  isLong: boolean,
  maintenanceMargin: number = 0.05
): number => {
  const liquidationFactor = 1 - maintenanceMargin - (1 / leverage);
  return isLong 
    ? entryPrice * liquidationFactor
    : entryPrice / liquidationFactor;
};

export const useMerkleTrading = () => {
  const { account, wallet, signAndSubmitTransaction } = useWallet();
  const { addPosition, addActivity } = useMerklePositions();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Place a new order using Merkle SDK
  const placeOrder = useCallback(async (params: PlaceOrderParams): Promise<string> => {
    if (!account || !wallet) {
      throw new Error('Wallet not connected');
    }

    setLoading(true);
    setError(null);

    try {
      // Basic validation
      if (!params.market || !params.size || !params.collateral) {
        throw new Error('Invalid order parameters');
      }

      // Convert market name to Merkle pair format
      const pair = params.market.replace('/', '_'); // APT/USD -> APT_USD
      
      // Convert amounts to proper units (USDC has 6 decimals)
      const sizeDelta = BigInt(Math.floor(params.size * 1e6));
      const collateralDelta = BigInt(Math.floor(params.collateral * 1e6));
      
      log.trade('Placing order:', {
        pair,
        sizeDelta: sizeDelta.toString(),
        collateralDelta: collateralDelta.toString(),
        side: params.side,
        orderType: params.orderType
      });

      // Validate account address
      if (!account.address) {
        throw new Error('Account address is undefined');
      }

      // Create order payload using Merkle SDK
      const orderTransaction = await merkleSdkService.createMarketOrderPayload({
        pair,
        userAddress: account.address,
        sizeDelta,
        collateralDelta,
        isLong: params.side === 'long',
        isIncrease: true, // true = open/increase position
      });

      // Submit order placement transaction
      const response = await signAndSubmitTransaction(orderTransaction);
      
      log.trade('Order transaction submitted:', response.hash);

      // Trigger position refresh after short delay
      setTimeout(() => {
        addPosition({
          pair: params.market.replace('/', '_'),
          side: params.side,
          sizeUSDC: params.size,
          collateralUSDC: params.collateral,
          leverage: params.leverage || (params.size / params.collateral),
          entryPrice: 0, // Will be populated on refresh
          markPrice: 0,
          liquidationPrice: 0,
          timestamp: Date.now()
        });
      }, 2000);

      return response.hash;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to place order';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [account, wallet, signAndSubmitTransaction, addPosition]);

  // Cancel an existing order
  const cancelOrder = useCallback(async (orderId: string): Promise<string> => {
    if (!account || !wallet) {
      throw new Error('Wallet not connected');
    }

    setLoading(true);
    setError(null);

    try {
      // Note: Cancel order requires pair parameter to build contract call
      // Would need to track order-to-pair mapping in state
      throw new Error('Cancel order requires pair context - feature not yet implemented');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to cancel order';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [account, wallet]);

  // Close a position (using place_order with is_increase = false)
  const closePosition = useCallback(async (
    market: string,
    side: 'long' | 'short',
    size: number,
    orderType: 'market' | 'limit' = 'market',
    price?: number
  ): Promise<string> => {
    if (!account || !wallet) {
      throw new Error('Wallet not connected');
    }

    setLoading(true);
    setError(null);

    try {
      // Convert market name to Merkle pair format
      const pair = market.replace('/', '_'); // APT/USD -> APT_USD
      
      // Convert amounts to proper units (USDC has 6 decimals)
      const sizeDelta = BigInt(Math.floor(size * 1e6));
      
      log.trade('Closing position:', {
        pair,
        sizeDelta: sizeDelta.toString(),
        side
      });
      
      // Create close order payload using Merkle SDK
      const orderTransaction = await merkleSdkService.createMarketOrderPayload({
        pair,
        userAddress: account.address,
        sizeDelta,
        collateralDelta: BigInt(0), // No additional collateral for closing
        isLong: side === 'long',
        isIncrease: false, // false = close/decrease position
      });

      // Submit close order transaction
      const response = await signAndSubmitTransaction(orderTransaction);
      
      log.trade('Close order submitted:', response.hash);

      return response.hash;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to close position';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [account, wallet, signAndSubmitTransaction]);

  // Update stop loss and take profit
  const updateTPSL = useCallback(async (
    positionId: string,
    stopLoss?: number,
    takeProfit?: number
  ): Promise<string> => {
    if (!account || !wallet) {
      throw new Error('Wallet not connected');
    }

    setLoading(true);
    setError(null);

    try {
      // Note: This requires position context (pair, side)
      // Use useMerklePositions.updateTPSL instead which has full position data
      throw new Error('TP/SL update requires position context - use useMerklePositions.updateTPSL instead');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update TP/SL';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [account, wallet]);

  // Initialize user account for trading (usually not needed for Merkle Trade)
  const initializeUser = useCallback(async (): Promise<string> => {
    if (!account || !wallet) {
      throw new Error('Wallet not connected');
    }

    setLoading(true);
    setError(null);

    try {
      // Merkle Trade handles user initialization automatically on first trade
      log.trade('User initialization not required for Merkle Trade');
      return 'no-op';
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize user';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [account, wallet]);

  return {
    // Actions
    placeOrder,
    cancelOrder,
    closePosition,
    updateTPSL,
    initializeUser,
    
    // State
    loading,
    error,
    
    // Utilities
    clearError: () => setError(null),
    
    // Helper functions
    calculatePnL,
    calculateLiquidationPrice,
  };
};
