import { useState, useCallback } from 'react';
import { Account } from '@aptos-labs/ts-sdk';
import { merkleService } from '../services/merkleService';
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

  // Place a new order using Merkle SDK
  const placeOrder = useCallback(async (params: PlaceOrderParams): Promise<string> => {
    if (!account || !wallet) {
      throw new Error('Wallet not connected');
    }

    setLoading(true);
    setError(null);

    try {
      // Validate trade constraints
      const validation = merkleService.validateTradeConstraints({
        pair: params.market,
        sizeDelta: params.size,
        collateralDelta: params.collateral,
        leverage: params.leverage || (params.size / params.collateral),
      });

      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      // Check trade cooldown
      if (!merkleService.canTrade()) {
        const remaining = merkleService.getTradeTimeRemaining();
        throw new Error(`Trade cooldown active. ${Math.ceil(remaining / 1000)}s remaining`);
      }

      // Convert market name to Merkle pair format
      const pair = params.market.replace('/', '_'); // APT/USD -> APT_USD
      
      // Convert amounts to proper units (USDC has 6 decimals)
      const sizeDelta = BigInt(Math.floor(params.size * 1e6));
      const collateralDelta = BigInt(Math.floor(params.collateral * 1e6));
      
      // Create order payload using Merkle SDK
      let orderPayload;
      if (params.orderType === 'market') {
        orderPayload = await merkleService.placeMarketOrder({
          pair,
          userAddress: account.address,
          sizeDelta,
          collateralDelta,
          isLong: params.side === 'long',
          isIncrease: true,
        });
      } else {
        const price = BigInt(Math.floor((params.price || 0) * 1e6));
        orderPayload = await merkleService.placeLimitOrder({
          pair,
          userAddress: account.address,
          sizeDelta,
          collateralDelta,
          price,
          isLong: params.side === 'long',
          isIncrease: true,
        });
      }

      // Submit transaction using wallet
      const response = await signAndSubmitTransaction(orderPayload);
      
      // Wait for transaction confirmation
      const aptos = merkleService.getAptos();
      if (aptos) {
        const txResult = await aptos.waitForTransaction({
          transactionHash: response.hash,
        });

        if (!txResult.success) {
          throw new Error(`Transaction failed: ${txResult.vm_status}`);
        }
      }

      // Mark trade as executed for cooldown
      merkleService.markTradeExecuted();

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
      // For now, return a placeholder - cancel order functionality needs to be implemented
      // TODO: Implement cancel order with proper Merkle integration
      throw new Error('Cancel order functionality not yet implemented');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to cancel order';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [account, wallet, signAndSubmitTransaction]);

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
      
      // Create close order payload using Merkle service
      const orderPayload = await merkleService.placeMarketOrder({
        pair,
        userAddress: account.address,
        sizeDelta,
        collateralDelta: BigInt(0), // No additional collateral for closing
        isLong: side === 'long',
        isIncrease: false, // false for closing positions
      });

      // Submit transaction using wallet
      const response = await signAndSubmitTransaction(orderPayload);
      
      // Wait for transaction confirmation
      const aptos = merkleService.getAptos();
      if (aptos) {
        const txResult = await aptos.waitForTransaction({
          transactionHash: response.hash,
        });

        if (!txResult.success) {
          throw new Error(`Transaction failed: ${txResult.vm_status}`);
        }
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
      // For now, return a placeholder - TP/SL update functionality needs to be implemented
      // TODO: Implement TP/SL update with proper Merkle integration
      throw new Error('TP/SL update functionality not yet implemented');
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
      // For now, return a placeholder - user initialization functionality needs to be implemented
      // TODO: Implement user initialization with proper Merkle integration
      throw new Error('User initialization functionality not yet implemented');
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
