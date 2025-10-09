import { useState, useCallback } from 'react';
import { Account } from '@aptos-labs/ts-sdk';
import { useMerklePositions } from './useMerklePositions';
import { merkleService } from '../services/merkleService';
import { aptosClient } from '../utils/aptosClient';
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
      
      // Debug logging to identify the source of undefined values
      log.trade('Hook Parameters:', {
        account: account,
        accountAddress: account?.address,
        pair,
        sizeDelta: sizeDelta.toString(),
        collateralDelta: collateralDelta.toString(),
        side: params.side,
        isLong: params.side === 'long'
      });

      // Validate account exists and has address
      if (!account || !account.address) {
        throw new Error('Wallet not connected or account address is undefined');
      }

      // Create order payload using Merkle SDK
      let orderTransaction;
      if (params.orderType === 'market') {
        const transactions = await merkleService.placeMarketOrder({
          pair,
          userAddress: account.address,
          sizeDelta,
          collateralDelta,
          isLong: params.side === 'long',
          isIncrease: true,
        });
        // Use the order transaction as the main payload (no init step needed)
        orderTransaction = transactions.orderTransaction;
      } else {
        // Validate that price is provided for limit orders
        if (!params.price || params.price <= 0) {
          throw new Error('Price must be provided for limit orders');
        }
        const price = BigInt(Math.floor(params.price * 1e6));
        const limitResult = await merkleService.placeLimitOrder({
          pair,
          userAddress: account.address,
          sizeDelta,
          collateralDelta,
          price,
          isLong: params.side === 'long',
          isIncrease: true,
        });
        orderTransaction = limitResult.orderTransaction;
      }

      // Submit order placement transaction
      const response = await signAndSubmitTransaction(orderTransaction);
      
      // Wait for transaction confirmation
      const aptos = merkleService.getAptos();
      if (aptos) {
        const txResult = await aptos.waitForTransaction({
          transactionHash: response.hash,
        });

        if (!txResult.success) {
          throw new Error(`Order placement failed: ${txResult.vm_status}`);
        }

        // Extract order ID from transaction events
        const orderId = merkleService.extractOrderIdFromEvents(txResult);
        
        if (orderId && params.orderType === 'market') {
          // For market orders, simulate keeper execution
          log.trade(`Market order ${orderId} placed, simulating keeper execution...`);
          
          // In a real implementation, this would be handled by an off-chain keeper
          // For now, we'll just log the simulation
          const currentPrice = BigInt(Math.floor(50 * 1e6)); // Mock current price
          const keeperResult = await merkleService.simulateKeeperExecution({
            pair,
            orderId,
            currentPrice
          });
          
          console.log('Keeper execution simulation:', keeperResult);
        }
      }

      // Mark trade as executed for cooldown
      merkleService.markTradeExecuted();

      // Add position and activity tracking
      if (params.orderType === 'market') {
        // Calculate entry price (mock for now, would come from actual execution)
        const entryPrice = params.price || 5.27; // Mock APT price
        const leverage = params.leverage || (params.size / params.collateral);
        
        // Add the new position
        addPosition({
          pair: params.market.replace('/', '_'),
          side: params.side,
          sizeUSDC: params.size,
          collateralUSDC: params.collateral,
          leverage,
          entryPrice,
          markPrice: entryPrice,
          liquidationPrice: calculateLiquidationPrice(entryPrice, leverage, params.side === 'long'),
          timestamp: Date.now()
        });

        // Add trading activity
        addActivity({
          action: 'open',
          pair: params.market.replace('/', '_'),
          side: params.side,
          sizeUSDC: params.size,
          price: entryPrice,
          timestamp: Date.now(),
          txHash: response.hash
        });

        log.trade('Position and activity added to tracking');
      }

      return response.hash;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to place order';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [account, wallet, signAndSubmitTransaction, addPosition, addActivity]);

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
      const orderResult = await merkleService.placeMarketOrder({
        pair,
        userAddress: account.address,
        sizeDelta,
        collateralDelta: BigInt(0), // No additional collateral for closing
        isLong: side === 'long',
        isIncrease: false, // false for closing positions
      });

      // Submit close order transaction
      const response = await signAndSubmitTransaction(orderResult.orderTransaction);
      
      // Wait for transaction confirmation
      const aptos = merkleService.getAptos();
      if (aptos) {
        const txResult = await aptos.waitForTransaction({
          transactionHash: response.hash,
        });

        if (!txResult.success) {
          throw new Error(`Close order placement failed: ${txResult.vm_status}`);
        }

        // Extract order ID and simulate keeper execution for market close orders
        const orderId = merkleService.extractOrderIdFromEvents(txResult);
        
        if (orderId && orderType === 'market') {
          console.log(`Market close order ${orderId} placed, simulating keeper execution...`);
          
          const currentPrice = BigInt(Math.floor(50 * 1e6)); // Mock current price
          const keeperResult = await merkleService.simulateKeeperExecution({
            pair,
            orderId,
            currentPrice
          });
          
          console.log('Keeper execution simulation:', keeperResult);
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
