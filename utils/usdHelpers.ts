/**
 * USD Conversion Helpers
 * 
 * Utilities for converting crypto amounts to USD values
 * using real-time price feeds
 */

import { pythOracleService } from '../services/pythOracleService';

// Cache for price conversions
const priceCache = new Map<string, { price: number; timestamp: number }>();
const CACHE_TTL = 30000; // 30 seconds

/**
 * Convert crypto amount to USD
 */
export async function toUSD(
  amount: number | string,
  symbol: 'APT' | 'BTC' | 'ETH' | 'SOL' | 'USDC',
  decimals: number = 8
): Promise<number> {
  try {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    
    // USDC is already 1:1 with USD
    if (symbol === 'USDC') {
      return numAmount / Math.pow(10, decimals);
    }

    // Check cache first
    const cached = priceCache.get(symbol);
    let price: number;

    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      price = cached.price;
    } else {
      // Fetch fresh price
      const priceData = await pythOracleService.getPrice(symbol);
      price = priceData.priceUSD;

      // Update cache
      priceCache.set(symbol, {
        price,
        timestamp: Date.now(),
      });
    }

    // Convert amount considering decimals
    const adjustedAmount = numAmount / Math.pow(10, decimals);
    return adjustedAmount * price;
  } catch (error: any) {
    console.error(`[USD] Error converting ${symbol} to USD:`, error.message);
    return 0;
  }
}

/**
 * Convert crypto amount to USD (synchronous, using cached prices)
 */
export function toUSDSync(
  amount: number | string,
  symbol: string,
  fallbackPrice: number = 0,
  decimals: number = 8
): number {
  try {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    
    if (symbol === 'USDC' || symbol === 'USDT') {
      return numAmount / Math.pow(10, decimals);
    }

    const cached = priceCache.get(symbol);
    const price = cached ? cached.price : fallbackPrice;

    const adjustedAmount = numAmount / Math.pow(10, decimals);
    return adjustedAmount * price;
  } catch (error: any) {
    console.error(`[USD] Error in sync conversion:`, error.message);
    return 0;
  }
}

/**
 * Format number as USD currency
 */
export function formatUSD(
  amount: number,
  options?: {
    decimals?: number;
    compact?: boolean;
    showSign?: boolean;
  }
): string {
  const {
    decimals = 2,
    compact = false,
    showSign = false,
  } = options || {};

  if (compact && Math.abs(amount) >= 1000000) {
    // Format as millions
    return `$${(amount / 1000000).toFixed(1)}M`;
  } else if (compact && Math.abs(amount) >= 1000) {
    // Format as thousands
    return `$${(amount / 1000).toFixed(1)}K`;
  }

  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Math.abs(amount));

  if (showSign && amount !== 0) {
    return amount >= 0 ? `+${formatted}` : `-${formatted}`;
  }

  return amount >= 0 ? formatted : `-${formatted}`;
}

/**
 * Format percentage
 */
export function formatPercent(
  percent: number,
  options?: {
    decimals?: number;
    showSign?: boolean;
  }
): string {
  const { decimals = 2, showSign = true } = options || {};

  const sign = showSign && percent > 0 ? '+' : '';
  return `${sign}${percent.toFixed(decimals)}%`;
}

/**
 * Get color for positive/negative values
 */
export function getValueColor(value: number): string {
  if (value > 0) return '#10b981'; // Green
  if (value < 0) return '#ef4444'; // Red
  return '#6b7280'; // Gray
}

/**
 * Calculate percentage change
 */
export function calculatePercentChange(
  oldValue: number,
  newValue: number
): number {
  if (oldValue === 0) return 0;
  return ((newValue - oldValue) / oldValue) * 100;
}

/**
 * Format large numbers with K, M, B suffixes
 */
export function formatCompact(num: number, decimals: number = 1): string {
  if (Math.abs(num) >= 1e9) {
    return `${(num / 1e9).toFixed(decimals)}B`;
  } else if (Math.abs(num) >= 1e6) {
    return `${(num / 1e6).toFixed(decimals)}M`;
  } else if (Math.abs(num) >= 1e3) {
    return `${(num / 1e3).toFixed(decimals)}K`;
  }
  return num.toFixed(decimals);
}

/**
 * Format APR with sign
 */
export function formatAPR(apr: number, showSign: boolean = true): string {
  const sign = showSign && apr > 0 ? '+' : '';
  return `${sign}${apr.toFixed(2)}%`;
}

/**
 * Calculate weighted average APR
 */
export function calculateWeightedAPR(
  positions: Array<{ amountUSD: number; apr: number }>
): number {
  if (positions.length === 0) return 0;

  const totalValue = positions.reduce((sum, p) => sum + p.amountUSD, 0);
  if (totalValue === 0) return 0;

  const weightedSum = positions.reduce(
    (sum, p) => sum + p.amountUSD * p.apr,
    0
  );

  return weightedSum / totalValue;
}

/**
 * Parse USD string to number
 */
export function parseUSD(usdString: string): number {
  return parseFloat(usdString.replace(/[^0-9.-]/g, ''));
}

/**
 * Batch convert multiple amounts to USD
 */
export async function batchToUSD(
  conversions: Array<{
    amount: number | string;
    symbol: 'APT' | 'BTC' | 'ETH' | 'SOL' | 'USDC';
    decimals?: number;
  }>
): Promise<number[]> {
  // Get unique symbols
  const symbols = [...new Set(conversions.map(c => c.symbol))];

  // Fetch all prices in batch
  const prices = await pythOracleService.getPrices(
    symbols.filter(s => s !== 'USDC')
  );

  // Create price map
  const priceMap = new Map<string, number>();
  prices.forEach(p => {
    priceMap.set(p.symbol, p.priceUSD);
  });
  priceMap.set('USDC', 1.0);

  // Convert all amounts
  return conversions.map(({ amount, symbol, decimals = 8 }) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    const price = priceMap.get(symbol) || 0;
    const adjustedAmount = numAmount / Math.pow(10, decimals);
    return adjustedAmount * price;
  });
}

/**
 * Clear price cache
 */
export function clearPriceCache(): void {
  priceCache.clear();
}
