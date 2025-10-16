/**
 * E-Mode Hook
 * 
 * Manages E-Mode (Efficiency Mode) state and actions
 */

import { useState, useCallback } from 'react';
import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';
import { ARIES_CONFIG, APTOS_CONFIG } from '../config/constants';
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

// Mock E-Mode categories (always available)
const mockCategories: EModeCategory[] = [
  {
    categoryId: 1,
    maxLTV: 9000, // 90%
    liquidationThreshold: 9300, // 93%
    liquidationBonus: 200, // 2%
    label: 'Stablecoins',
    assets: [
      ARIES_CONFIG.pairedAssets.USDC?.coinType || '',
      ARIES_CONFIG.pairedAssets.USDT?.coinType || '',
    ].filter(Boolean),
  },
  {
    categoryId: 2,
    maxLTV: 8500, // 85%
    liquidationThreshold: 8800, // 88%
    liquidationBonus: 300, // 3%
    label: 'APT Ecosystem',
    assets: [
      ARIES_CONFIG.pairedAssets.APT?.coinType || '',
    ].filter(Boolean),
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
      const aptosConfig = new AptosConfig({
        network: APTOS_CONFIG.network as Network,
        fullnode: APTOS_CONFIG.nodeUrl,
      });
      const aptos = new Aptos(aptosConfig);

      // In production, fetch from on-chain
      // For now, use mock data
      setCategories(mockCategories);

      // Try to fetch user's active E-Mode category
      try {
        const resource = await aptos.getAccountResource({
          accountAddress: account.address,
          resourceType: `${ARIES_CONFIG.contractAddress}::profile::Profile`,
        });

        const profileData = resource as any;
        setActiveCategory(profileData.emode_category || 0);
      } catch (err) {
        // User doesn't have profile yet or E-Mode not active
        setActiveCategory(0);
      }
    } catch (err: any) {
      console.error('[useEMode] Error fetching E-Mode:', err);
      setError(err.message || 'Failed to fetch E-Mode');
      setCategories(mockCategories); // Still show categories even on error
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
