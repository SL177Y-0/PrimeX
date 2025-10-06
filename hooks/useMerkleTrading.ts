import { useState, useCallback } from 'react';
import { Account } from '@aptos-labs/ts-sdk';
import { 
  aptosClient, 
  TRADING_FUNCTIONS, 
  MERKLE_MARKETS,
  parseAmount, 
  parsePrice,
  getMarketId,
  buildMerkleTransaction,
  simulateTransaction,
  POSITION_SIDES,
  ORDER_TYPES
} from '../utils/aptosClient';
import { useWallet } from '../app/providers/WalletProvider';

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Place a new order
  const placeOrder = useCallback(async (params: PlaceOrderParams): Promise<string> => {
    if (!account || !wallet) {
      throw new Error('Wallet not connected');
    }

    setLoading(true);
    setError(null);

    try {
      const marketId = getMarketId(params.market);
      const isLong = params.side === 'long';
      const orderType = params.orderType === 'market' ? ORDER_TYPES.MARKET : ORDER_TYPES.LIMIT;
      
      // Convert numbers to strings for contract calls
      const args = [
        marketId,
        parseAmount(params.size.toString()),
        parseAmount(params.collateral.toString()),
        parsePrice(params.price?.toString() || '0'),
        isLong,
        orderType,
      ];

      // Add optional stop loss and take profit
      if (params.stopLoss) {
        args.push(parsePrice(params.stopLoss.toString()));
      }
      if (params.takeProfit) {
        args.push(parsePrice(params.takeProfit.toString()));
      }

      const transaction = buildMerkleTransaction(
        TRADING_FUNCTIONS.PLACE_ORDER,
        [],
        args
      );

      // Simulate transaction first
      await simulateTransaction(account as any, transaction);
      
      const response = await signAndSubmitTransaction(transaction);
      
      const txResult = await aptosClient.waitForTransaction({
        transactionHash: response.hash,
      });

      if (!txResult.success) {
        throw new Error(`Transaction failed: ${txResult.vm_status}`);
      }

      return response.hash;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to place order';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [account, wallet, signAndSubmitTransaction]);

  // Cancel an existing order
  const cancelOrder = useCallback(async (orderId: string): Promise<string> => {
    if (!account || !wallet) {
      throw new Error('Wallet not connected');
    }

    setLoading(true);
    setError(null);

    try {
      const args = [orderId]; // Keep orderId as string

      const transaction = buildMerkleTransaction(
        TRADING_FUNCTIONS.CANCEL_ORDER,
        [],
        args
      );

      await simulateTransaction(account as any, transaction);
      const response = await signAndSubmitTransaction(transaction);
      
      const txResult = await aptosClient.waitForTransaction({
        transactionHash: response.hash,
      });

      if (!txResult.success) {
        throw new Error(`Transaction failed: ${txResult.vm_status}`);
      }

      return response.hash;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to cancel order';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [account, wallet, signAndSubmitTransaction]);

  // Close a position
  const closePosition = useCallback(async (positionId: string, size?: number): Promise<string> => {
    if (!account || !wallet) {
      throw new Error('Wallet not connected');
    }

    setLoading(true);
    setError(null);

    try {
      const args = [positionId]; // Keep positionId as string
      
      if (size) {
        args.push(parseAmount(size.toString()));
      }

      const transaction = buildMerkleTransaction(
        TRADING_FUNCTIONS.CLOSE_POSITION,
        [],
        args
      );

      await simulateTransaction(account as any, transaction);
      const response = await signAndSubmitTransaction(transaction);
      
      const txResult = await aptosClient.waitForTransaction({
        transactionHash: response.hash,
      });

      if (!txResult.success) {
        throw new Error(`Transaction failed: ${txResult.vm_status}`);
      }

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
      const args: (string | number)[] = [positionId]; // Keep positionId as string
      
      if (stopLoss !== undefined) {
        args.push(parsePrice(stopLoss.toString()));
      }
      
      if (takeProfit !== undefined) {
        args.push(parsePrice(takeProfit.toString()));
      }

      const transaction = buildMerkleTransaction(
        TRADING_FUNCTIONS.UPDATE_POSITION_TP_SL,
        [],
        args
      );

      await simulateTransaction(account as any, transaction);
      const response = await signAndSubmitTransaction(transaction);
      
      const txResult = await aptosClient.waitForTransaction({
        transactionHash: response.hash,
      });

      if (!txResult.success) {
        throw new Error(`Transaction failed: ${txResult.vm_status}`);
      }

      return response.hash;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update TP/SL';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [account, wallet, signAndSubmitTransaction]);

  // Initialize user account for trading
  const initializeUser = useCallback(async (): Promise<string> => {
    if (!account || !wallet) {
      throw new Error('Wallet not connected');
    }

    setLoading(true);
    setError(null);

    try {
      const transaction = buildMerkleTransaction(
        TRADING_FUNCTIONS.INITIALIZE_USER,
        [],
        []
      );

      await simulateTransaction(account as any, transaction);
      const response = await signAndSubmitTransaction(transaction);
      
      const txResult = await aptosClient.waitForTransaction({
        transactionHash: response.hash,
      });

      if (!txResult.success) {
        throw new Error(`Transaction failed: ${txResult.vm_status}`);
      }

      return response.hash;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize user';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [account, wallet, signAndSubmitTransaction]);

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
