/**
 * Aries Lending Action Hooks
 * 
 * Mutation hooks for supply, borrow, repay, and withdraw actions
 * Handles transaction building, signing, execution, and Supabase persistence
 */

import { useState, useCallback } from 'react';
import { useWallet } from '../app/providers/WalletProvider';
import { databaseService } from '../services/database.service';
import { ariesProtocolService } from '../services/ariesProtocolService';
import type { AriesReserve } from '../types/aries';
import { parseAmount } from '../utils/ariesValidation';

interface ActionState {
  loading: boolean;
  error: string | null;
  txHash: string | null;
}

// ============================================================================
// SUPPLY HOOK
// ============================================================================

export function useSupply(onSuccess?: () => void) {
  const { account, signAndSubmitTransaction } = useWallet();
  const [state, setState] = useState<ActionState>({
    loading: false,
    error: null,
    txHash: null,
  });

  const supply = useCallback(async (reserve: AriesReserve, amount: number) => {
    if (!account?.address) {
      setState({ loading: false, error: 'Wallet not connected', txHash: null });
      return;
    }

    setState({ loading: true, error: null, txHash: null });

    try {
      // Convert amount to base units
      const amountInBaseUnits = parseAmount(amount.toString(), reserve.decimals);

      // Build transaction
      const transaction = ariesProtocolService.buildSupplyTransaction(
        reserve.coinType,
        amountInBaseUnits
      );

      // Submit transaction
      const result = await signAndSubmitTransaction(transaction);
      
      console.log(`[Supply] Transaction submitted: ${result.hash}`);

      // Save to Supabase
      await databaseService.saveLendBorrowPosition({
        user_address: account.address,
        asset_symbol: reserve.symbol,
        coin_type: reserve.coinType,
        position_type: 'supply',
        amount: amount.toString(),
        amount_usd: (amount * (reserve.priceUSD || 0)).toString(),
        entry_price: (reserve.priceUSD || 0).toString(),
      });

      // Log transaction
      await databaseService.saveTransaction({
        user_address: account.address,
        transaction_hash: result.hash,
        transaction_type: 'supply',
        asset_symbol: reserve.symbol,
        amount: amount.toString(),
        amount_usd: (amount * (reserve.priceUSD || 0)).toString(),
        status: 'confirmed',
      });

      console.log(`[Supply] ✅ Position saved to Supabase`);

      setState({ loading: false, error: null, txHash: result.hash });
      
      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error('[Supply] Error:', error);
      setState({
        loading: false,
        error: error.message || 'Failed to supply',
        txHash: null,
      });
    }
  }, [account, signAndSubmitTransaction, onSuccess]);

  const reset = useCallback(() => {
    setState({ loading: false, error: null, txHash: null });
  }, []);

  return {
    supply,
    reset,
    ...state,
  };
}

// ============================================================================
// BORROW HOOK
// ============================================================================

export function useBorrow(onSuccess?: () => void) {
  const { account, signAndSubmitTransaction } = useWallet();
  const [state, setState] = useState<ActionState>({
    loading: false,
    error: null,
    txHash: null,
  });

  const borrow = useCallback(async (reserve: AriesReserve, amount: number) => {
    if (!account?.address) {
      setState({ loading: false, error: 'Wallet not connected', txHash: null });
      return;
    }

    setState({ loading: true, error: null, txHash: null });

    try {
      // Convert amount to base units
      const amountInBaseUnits = parseAmount(amount.toString(), reserve.decimals);

      // Build transaction
      const transaction = ariesProtocolService.buildBorrowTransaction(
        reserve.coinType,
        amountInBaseUnits
      );

      // Submit transaction
      const result = await signAndSubmitTransaction(transaction);
      
      console.log(`[Borrow] Transaction submitted: ${result.hash}`);

      // Save to Supabase
      await databaseService.saveLendBorrowPosition({
        user_address: account.address,
        asset_symbol: reserve.symbol,
        coin_type: reserve.coinType,
        position_type: 'borrow',
        amount: amount.toString(),
        amount_usd: (amount * (reserve.priceUSD || 0)).toString(),
        entry_price: (reserve.priceUSD || 0).toString(),
      });

      // Log transaction
      await databaseService.saveTransaction({
        user_address: account.address,
        transaction_hash: result.hash,
        transaction_type: 'borrow',
        asset_symbol: reserve.symbol,
        amount: amount.toString(),
        amount_usd: (amount * (reserve.priceUSD || 0)).toString(),
        status: 'confirmed',
      });

      console.log(`[Borrow] ✅ Position saved to Supabase`);

      setState({ loading: false, error: null, txHash: result.hash });
      
      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error('[Borrow] Error:', error);
      setState({
        loading: false,
        error: error.message || 'Failed to borrow',
        txHash: null,
      });
    }
  }, [account, signAndSubmitTransaction, onSuccess]);

  const reset = useCallback(() => {
    setState({ loading: false, error: null, txHash: null });
  }, []);

  return {
    borrow,
    reset,
    ...state,
  };
}

// ============================================================================
// REPAY HOOK
// ============================================================================

export function useRepay(onSuccess?: () => void) {
  const { account, signAndSubmitTransaction } = useWallet();
  const [state, setState] = useState<ActionState>({
    loading: false,
    error: null,
    txHash: null,
  });

  const repay = useCallback(async (reserve: AriesReserve, amount: number) => {
    if (!account?.address) {
      setState({ loading: false, error: 'Wallet not connected', txHash: null });
      return;
    }

    setState({ loading: true, error: null, txHash: null });

    try {
      // Convert amount to base units
      const amountInBaseUnits = parseAmount(amount.toString(), reserve.decimals);

      // Build transaction
      const transaction = ariesProtocolService.buildRepayTransaction(
        reserve.coinType,
        amountInBaseUnits
      );

      // Submit transaction
      const result = await signAndSubmitTransaction(transaction);
      
      console.log(`[Repay] Transaction submitted: ${result.hash}`);

      // Log transaction
      await databaseService.saveTransaction({
        user_address: account.address,
        transaction_hash: result.hash,
        transaction_type: 'repay',
        asset_symbol: reserve.symbol,
        amount: amount.toString(),
        amount_usd: (amount * (reserve.priceUSD || 0)).toString(),
        status: 'confirmed',
      });

      console.log(`[Repay] ✅ Transaction saved to Supabase`);

      setState({ loading: false, error: null, txHash: result.hash });
      
      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error('[Repay] Error:', error);
      setState({
        loading: false,
        error: error.message || 'Failed to repay',
        txHash: null,
      });
    }
  }, [account, signAndSubmitTransaction, onSuccess]);

  const reset = useCallback(() => {
    setState({ loading: false, error: null, txHash: null });
  }, []);

  return {
    repay,
    reset,
    ...state,
  };
}

// ============================================================================
// WITHDRAW HOOK
// ============================================================================

export function useWithdraw(onSuccess?: () => void) {
  const { account, signAndSubmitTransaction } = useWallet();
  const [state, setState] = useState<ActionState>({
    loading: false,
    error: null,
    txHash: null,
  });

  const withdraw = useCallback(async (reserve: AriesReserve, amount: number) => {
    if (!account?.address) {
      setState({ loading: false, error: 'Wallet not connected', txHash: null });
      return;
    }

    setState({ loading: true, error: null, txHash: null });

    try {
      // Convert amount to base units
      const amountInBaseUnits = parseAmount(amount.toString(), reserve.decimals);

      // Build transaction
      const transaction = ariesProtocolService.buildWithdrawTransaction(
        reserve.coinType,
        amountInBaseUnits
      );

      // Submit transaction
      const result = await signAndSubmitTransaction(transaction);
      
      console.log(`[Withdraw] Transaction submitted: ${result.hash}`);

      // Log transaction
      await databaseService.saveTransaction({
        user_address: account.address,
        transaction_hash: result.hash,
        transaction_type: 'withdraw',
        asset_symbol: reserve.symbol,
        amount: amount.toString(),
        amount_usd: (amount * (reserve.priceUSD || 0)).toString(),
        status: 'confirmed',
      });

      console.log(`[Withdraw] ✅ Transaction saved to Supabase`);

      setState({ loading: false, error: null, txHash: result.hash });
      
      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error('[Withdraw] Error:', error);
      setState({
        loading: false,
        error: error.message || 'Failed to withdraw',
        txHash: null,
      });
    }
  }, [account, signAndSubmitTransaction, onSuccess]);

  const reset = useCallback(() => {
    setState({ loading: false, error: null, txHash: null });
  }, []);

  return {
    withdraw,
    reset,
    ...state,
  };
}
