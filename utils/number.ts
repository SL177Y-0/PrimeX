/**
 * Safe number formatting utilities with null/undefined protection
 */

export function formatCurrency(
  value: number | undefined | null, 
  decimals: number = 2
): string {
  if (typeof value !== 'number' || isNaN(value) || value === null || value === undefined) {
    return '0.00';
  }
  
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatNumber(
  value: number | undefined | null, 
  options?: Intl.NumberFormatOptions
): string {
  if (typeof value !== 'number' || isNaN(value) || value === null || value === undefined) {
    return '0';
  }
  
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    ...options,
  }).format(value);
}

export function formatPercent(value: number | undefined | null): string {
  if (typeof value !== 'number' || isNaN(value) || value === null || value === undefined) {
    return '0.00%';
  }
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

export function formatCompactNumber(value: number | undefined | null): string {
  if (typeof value !== 'number' || isNaN(value) || value === null || value === undefined) {
    return '0';
  }
  
  if (value >= 1e9) {
    return `${(value / 1e9).toFixed(1)}B`;
  }
  if (value >= 1e6) {
    return `${(value / 1e6).toFixed(1)}M`;
  }
  if (value >= 1e3) {
    return `${(value / 1e3).toFixed(1)}K`;
  }
  return formatNumber(value);
}

export function formatPnL(value: number | undefined | null): {
  formatted: string;
  isPositive: boolean;
} {
  if (typeof value !== 'number' || isNaN(value) || value === null || value === undefined) {
    return { formatted: '0.00', isPositive: true };
  }
  
  const isPositive = value >= 0;
  const formatted = `${isPositive ? '+' : ''}${formatCurrency(value)}`;
  return { formatted, isPositive };
}