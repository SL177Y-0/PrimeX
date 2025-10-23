/**
 * E-Mode Hook
 * 
 * Manages E-Mode (Efficiency Mode) state and actions
 */

import React, { useState, useCallback } from 'react';
import { ARIES_CONFIG } from '../config/constants';
import { useWallet } from '../app/providers/WalletProvider';
import type { EModeCategory } from '../types/aries';

interface UseEModeResult {
  categories: EModeCategory[];
  activeCategory: number;
  loading: boolean;
  error: string | null;
  enableEMode: (categoryId: number) => Promise<void>;
  disableEMode: () => Promise<void>;
  refetch: () => Promise<void>;
}

// E-Mode categories matching official Aries Markets platform
const mockCategories: EModeCategory[] = [
  {
    categoryId: 1,
    maxLTV: 9000, // 90%
    liquidationThreshold: 9300, // 93%
    liquidationBonus: 200, // 2%
    label: 'APT Correlated',
    assets: [
      '0x1::aptos_coin::AptosCoin', // APT
      '0xd11107bdf0d6d7040c6c0bfbdecb6545191fdf13e8d8d259952f53e1713f61b5::staked_coin::StakedAptos', // stAPT
      '0x111ae3e5bc816a5e63c2da97d0aa3886519e0cd5e4b046659fa35796bd11542a::stapt_token::StakedApt', // amAPT
    ],
  },
  {
    categoryId: 2,
    maxLTV: 9000, // 90%
    liquidationThreshold: 9300, // 93%
    liquidationBonus: 200, // 2%
    label: 'Stable Correlated',
    assets: [
      '0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::USDT', // USDT
      '0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::USDC', // USDC
      '0x5e156f1207d0ebfa19a9eeff00d62a282278fb8719f4fab3a586a0a2c0fffbea::coin::T', // sUSDe
    ],
  },
];

export function useEMode(): UseEModeResult {
  const { account, signAndSubmitTransaction } = useWallet();
  const [categories, setCategories] = useState<EModeCategory[]>(mockCategories);
  const [activeCategory, setActiveCategory] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch E-Mode data
  const fetchEMode = useCallback(async () => {
    if (!account?.address) return;

    setLoading(true);
    setError(null);

    try {
      // Set categories (these are static)
      setCategories(mockCategories);

      // E-Mode status will be fetched from portfolio data
      // The ariesSDKService.fetchUserPortfolio() already includes E-Mode status
      // We don't need to query blockchain directly here
      // Just set to 0 for now - the actual status comes from portfolio
      setActiveCategory(0);
      
      console.log('[useEMode] E-Mode categories loaded, status will come from portfolio');
    } catch (err: any) {
      console.error('[useEMode] Error fetching E-Mode:', err);
      setError(err.message || 'Failed to fetch E-Mode');
      setCategories(mockCategories);
    } finally {
      setLoading(false);
    }
  }, [account?.address]);

  // Enable E-Mode
  const enableEMode = useCallback(async (categoryId: number) => {
    if (!account?.address || !signAndSubmitTransaction) {
      throw new Error('Wallet not connected');
    }

    setLoading(true);
    setError(null);

    try {
      // Build transaction
      const transaction = {
        data: {
          function: `${ARIES_CONFIG.contractAddress}::controller::set_user_emode`,
          typeArguments: [],
          functionArguments: [categoryId],
        },
      };

      // Sign and submit
      const response = await signAndSubmitTransaction(transaction);
      
      console.log('[useEMode] E-Mode enabled:', response);

      // Update local state
      setActiveCategory(categoryId);

      // Refetch to confirm
      await fetchEMode();
    } catch (err: any) {
      console.error('[useEMode] Error enabling E-Mode:', err);
      setError(err.message || 'Failed to enable E-Mode');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [account?.address, signAndSubmitTransaction, fetchEMode]);

  // Disable E-Mode
  const disableEMode = useCallback(async () => {
    if (!account?.address || !signAndSubmitTransaction) {
      throw new Error('Wallet not connected');
    }

    setLoading(true);
    setError(null);

    try {
      // Build transaction to set E-Mode to 0 (disabled)
      const transaction = {
        data: {
          function: `${ARIES_CONFIG.contractAddress}::controller::set_user_emode`,
          typeArguments: [],
          functionArguments: [0],
        },
      };

      // Sign and submit
      const response = await signAndSubmitTransaction(transaction);
      
      console.log('[useEMode] E-Mode disabled:', response);

      // Update local state
      setActiveCategory(0);

      // Refetch to confirm
      await fetchEMode();
    } catch (err: any) {
      console.error('[useEMode] Error disabling E-Mode:', err);
      setError(err.message || 'Failed to disable E-Mode');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [account?.address, signAndSubmitTransaction, fetchEMode]);

  // Fetch E-Mode status on mount and when account changes
  React.useEffect(() => {
    fetchEMode();
  }, [fetchEMode]);

  return {
    categories,
    activeCategory,
    loading,
    error,
    enableEMode,
    disableEMode,
    refetch: fetchEMode,
  };
}
