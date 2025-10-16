/**
 * Wallet Balance Hook
 * 
 * Fetches and tracks user's wallet balance for a specific coin type
 * Auto-refreshes on interval and when transactions complete
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';
import { APTOS_CONFIG } from '../config/constants';
import { useWallet } from '../app/providers/WalletProvider';

interface UseWalletBalanceResult {
  balance: number; // in token units (e.g., 1.5 APT, not 150000000 octas)
  balanceRaw: string; // raw balance string from chain
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch wallet balance for a specific coin type
 * 
 * @param coinType - The coin type address (e.g., '0x1::aptos_coin::AptosCoin')
 * @param decimals - Number of decimals for the token (default: 8)
 * @param refreshInterval - Auto-refresh interval in ms (default: 30000 = 30s)
 */
export function useWalletBalance(
  coinType: string | null,
  decimals: number = 8,
  refreshInterval: number = 30000
): UseWalletBalanceResult {
  const { account, connected } = useWallet();
  const [balance, setBalance] = useState<number>(0);
  const [balanceRaw, setBalanceRaw] = useState<string>('0');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize Aptos client
  const aptosRef = useRef<Aptos | null>(null);
  if (!aptosRef.current) {
    const config = new AptosConfig({
      network: APTOS_CONFIG.network as Network,
      fullnode: APTOS_CONFIG.nodeUrl,
    });
    aptosRef.current = new Aptos(config);
  }

  const fetchBalance = useCallback(async () => {
    // Early return if not connected or no coin type
    if (!connected || !account?.address || !coinType) {
      setBalance(0);
      setBalanceRaw('0');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const aptos = aptosRef.current!;

      // Fetch account resource for the specific coin type
      const resource = await aptos.getAccountResource({
        accountAddress: account.address,
        resourceType: `0x1::coin::CoinStore<${coinType}>`,
      });

      // Extract balance from coin field
      const coinData = resource.coin as { value: string };
      const rawBalance = coinData.value || '0';
      const numericBalance = parseFloat(rawBalance) / Math.pow(10, decimals);

      setBalanceRaw(rawBalance);
      setBalance(numericBalance);
      setError(null);
    } catch (err: any) {
      console.error(`[useWalletBalance] Error fetching balance for ${coinType}:`, err);
      
      // Check if error is because user doesn't have this coin type yet
      if (err.message?.includes('Resource not found')) {
        // User has never received this token - balance is 0
        setBalance(0);
        setBalanceRaw('0');
        setError(null);
      } else {
        setError(err.message || 'Failed to fetch balance');
        setBalance(0);
        setBalanceRaw('0');
      }
    } finally {
      setLoading(false);
    }
  }, [connected, account?.address, coinType, decimals]);

  // Initial fetch
  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  // Auto-refresh interval
  useEffect(() => {
    if (!connected || !account?.address || !coinType) return;

    const interval = setInterval(() => {
      fetchBalance();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [connected, account?.address, coinType, refreshInterval, fetchBalance]);

  return {
    balance,
    balanceRaw,
    loading,
    error,
    refetch: fetchBalance,
  };
}

/**
 * Hook to fetch multiple balances at once
 * Useful for displaying portfolio overview
 */
export function useMultipleBalances(
  coinTypes: Array<{ coinType: string; decimals: number }>,
  refreshInterval: number = 30000
): Record<string, UseWalletBalanceResult> {
  const { account, connected } = useWallet();
  const [balances, setBalances] = useState<Record<string, UseWalletBalanceResult>>({});

  const fetchAllBalances = useCallback(async () => {
    if (!connected || !account?.address) return;

    const aptosConfig = new AptosConfig({
      network: APTOS_CONFIG.network as Network,
      fullnode: APTOS_CONFIG.nodeUrl,
    });
    const aptos = new Aptos(aptosConfig);

    const results: Record<string, UseWalletBalanceResult> = {};

    for (const { coinType, decimals } of coinTypes) {
      try {
        const resource = await aptos.getAccountResource({
          accountAddress: account.address,
          resourceType: `0x1::coin::CoinStore<${coinType}>`,
        });

        const coinData = resource.coin as { value: string };
        const rawBalance = coinData.value || '0';
        const numericBalance = parseFloat(rawBalance) / Math.pow(10, decimals);

        results[coinType] = {
          balance: numericBalance,
          balanceRaw: rawBalance,
          loading: false,
          error: null,
          refetch: async () => {}, // Individual refetch not supported in batch mode
        };
      } catch (err: any) {
        if (err.message?.includes('Resource not found')) {
          results[coinType] = {
            balance: 0,
            balanceRaw: '0',
            loading: false,
            error: null,
            refetch: async () => {},
          };
        } else {
          results[coinType] = {
            balance: 0,
            balanceRaw: '0',
            loading: false,
            error: err.message || 'Failed to fetch balance',
            refetch: async () => {},
          };
        }
      }
    }

    setBalances(results);
  }, [connected, account?.address, coinTypes]);

  useEffect(() => {
    fetchAllBalances();
  }, [fetchAllBalances]);

  useEffect(() => {
    if (!connected || !account?.address) return;

    const interval = setInterval(() => {
      fetchAllBalances();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [connected, account?.address, refreshInterval, fetchAllBalances]);

  return balances;
}
