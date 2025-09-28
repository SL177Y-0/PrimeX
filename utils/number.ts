export function formatCurrency(
  value: number, 
  currency = 'USD', 
  options?: Intl.NumberFormatOptions
): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: value < 1 ? 4 : 2,
    maximumFractionDigits: value < 1 ? 4 : 2,
    ...options,
  }).format(value);
}

export function formatNumber(
  value: number, 
  options?: Intl.NumberFormatOptions
): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    ...options,
  }).format(value);
}

export function formatPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

export function formatCompactNumber(value: number): string {
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

export function formatPnL(value: number, currency = 'USD'): {
  formatted: string;
  isPositive: boolean;
} {
  const isPositive = value >= 0;
  const formatted = `${isPositive ? '+' : ''}${formatCurrency(value, currency)}`;
  return { formatted, isPositive };
}