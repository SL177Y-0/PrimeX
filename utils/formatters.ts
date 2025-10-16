/**
 * Number Formatting Utilities
 * 
 * Fixes the issue where TVL shows quadrillions instead of millions
 */

/**
 * Format crypto amount (handle decimals)
 * 
 * @param amount - Raw amount from blockchain
 * @param decimals - Token decimals (usually 8 for APT, 6 for USDC)
 * @returns Formatted number as string
 */
export function formatCryptoAmount(
  amount: string | number,
  decimals: number = 8
): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '0';
  
  const formatted = num / Math.pow(10, decimals);
  return formatted.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format USD amount
 * 
 * @param amount - Amount in USD
 * @returns Formatted currency string
 */
export function formatUSD(amount: number): string {
  if (isNaN(amount)) return '$0.00';
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format percentage
 * 
 * @param value - Percentage value (e.g., 85.5 for 85.5%)
 * @returns Formatted percentage string
 */
export function formatPercent(value: number): string {
  if (isNaN(value)) return '0.00%';
  return `${value.toFixed(2)}%`;
}

/**
 * Format large numbers with K, M, B, T suffixes
 * 
 * @param num - Number to format
 * @returns Compact formatted string (e.g., "$1.5M")
 */
export function formatCompact(num: number): string {
  if (isNaN(num)) return '$0';
  
  if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
  return `$${num.toFixed(2)}`;
}

/**
 * Convert raw amount to USD value
 * 
 * @param amount - Raw token amount
 * @param decimals - Token decimals
 * @param priceUSD - Price per token in USD
 * @returns USD value
 */
export function toUSD(
  amount: string | number,
  decimals: number,
  priceUSD: number
): number {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num) || isNaN(priceUSD)) return 0;
  
  const tokenAmount = num / Math.pow(10, decimals);
  return tokenAmount * priceUSD;
}

/**
 * Format APR with proper display
 * 
 * @param apr - APR value (can be very small or very large)
 * @returns Formatted APR string
 */
export function formatAPR(apr: number): string {
  if (isNaN(apr)) return '0.00%';
  
  // Handle very small APRs
  if (apr < 0.01 && apr > 0) return '<0.01%';
  
  // Handle very large APRs (likely error)
  if (apr > 1000) return '>1000%';
  
  return `${apr.toFixed(2)}%`;
}

/**
 * Format utilization ratio
 * 
 * @param utilized - Amount utilized
 * @param total - Total amount available
 * @returns Utilization percentage
 */
export function formatUtilization(utilized: number, total: number): string {
  if (total === 0) return '0.00%';
  const ratio = (utilized / total) * 100;
  return formatPercent(ratio);
}

/**
 * Shorten address for display
 * 
 * @param address - Full blockchain address
 * @param chars - Number of chars to show on each end (default: 4)
 * @returns Shortened address (e.g., "0x1234...5678")
 */
export function shortenAddress(address: string, chars: number = 4): string {
  if (!address) return '';
  if (address.length <= chars * 2 + 3) return address;
  
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

/**
 * Format time ago (e.g., "2 hours ago")
 * 
 * @param timestamp - ISO timestamp or Date
 * @returns Human-readable time ago string
 */
export function formatTimeAgo(timestamp: string | Date): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  
  return date.toLocaleDateString();
}

/**
 * Format health factor with color indication
 * 
 * @param healthFactor - Health factor value
 * @returns Object with formatted value and status
 */
export function formatHealthFactor(healthFactor: number | null): {
  value: string;
  status: 'safe' | 'warning' | 'danger';
  color: string;
} {
  if (healthFactor === null || isNaN(healthFactor)) {
    return { value: '∞', status: 'safe', color: '#4ade80' };
  }
  
  let status: 'safe' | 'warning' | 'danger';
  let color: string;
  
  if (healthFactor >= 2.0) {
    status = 'safe';
    color = '#4ade80'; // green
  } else if (healthFactor >= 1.2) {
    status = 'warning';
    color = '#fbbf24'; // yellow
  } else {
    status = 'danger';
    color = '#ef4444'; // red
  }
  
  return {
    value: healthFactor.toFixed(2),
    status,
    color,
  };
}
