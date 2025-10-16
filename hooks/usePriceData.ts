/**
 * Custom Hook for Price Data
 * 
 * Provides real-time price data with auto-refresh
 */

import { useState, useEffect, useCallback } from 'react';
import { pythOracleService } from '../services/pythOracleService';

export function usePriceData(
  symbols: Array<'APT' | 'BTC' | 'ETH' | 'SOL' | 'USDC'>,
  refreshInterval: number = 30000
) {
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now());

  const fetchPrices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const priceData = await pythOracleService.getPrices(symbols);
      
      const priceMap: Record<string, number> = {};
      priceData.forEach(p => {
        priceMap[p.symbol] = p.priceUSD;
      });

      setPrices(priceMap);
      setLastUpdated(Date.now());
    } catch (err: any) {
      console.error('[usePriceData] Error fetching prices:', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [symbols]);

  useEffect(() => {
    fetchPrices();

    const interval = setInterval(fetchPrices, refreshInterval);

    return () => clearInterval(interval);
  }, [fetchPrices, refreshInterval]);

  return {
    prices,
    loading,
    error,
    lastUpdated,
    refresh: fetchPrices,
  };
}

export function usePrice(symbol: 'APT' | 'BTC' | 'ETH' | 'SOL' | 'USDC', refreshInterval: number = 30000) {
  const [price, setPrice] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPrice = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const priceUSD = await pythOracleService.getPriceUSD(symbol);
      setPrice(priceUSD);
    } catch (err: any) {
      console.error(`[usePrice] Error fetching ${symbol} price:`, err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [symbol]);

  useEffect(() => {
    fetchPrice();

    const interval = setInterval(fetchPrice, refreshInterval);

    return () => clearInterval(interval);
  }, [fetchPrice, refreshInterval]);

  return {
    price,
    loading,
    error,
    refresh: fetchPrice,
  };
}
