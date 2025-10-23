/**
 * Aries Markets Formatting Utilities
 * Consistent formatting for amounts, percentages, and display values
 */

/**
 * Format crypto amount with proper decimals
 */
export function formatCryptoAmount(
  amount: number | string,
  decimals: number = 8,
  displayDecimals: number = 4
): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  // Convert from raw units if needed
  const actualAmount = numAmount / Math.pow(10, decimals);
  
  // Format with appropriate decimals
  if (actualAmount === 0) return '0';
  if (actualAmount < 0.0001) return '< 0.0001';
  if (actualAmount < 1) return actualAmount.toFixed(displayDecimals);
  if (actualAmount < 1000) return actualAmount.toFixed(2);
  if (actualAmount < 1_000_000) return `${(actualAmount / 1000).toFixed(2)}K`;
  return `${(actualAmount / 1_000_000).toFixed(2)}M`;
}

/**
 * Format USD amount
 */
export function formatUSD(amount: number, showCents: boolean = true): string {
  if (amount === 0) return '$0.00';
  if (amount < 0.01) return '< $0.01';
  
  if (amount < 1000) {
    return `$${amount.toFixed(showCents ? 2 : 0)}`;
  }
  
  if (amount < 1_000_000) {
    return `$${(amount / 1000).toFixed(2)}K`;
  }
  
  if (amount < 1_000_000_000) {
    return `$${(amount / 1_000_000).toFixed(2)}M`;
  }
  
  return `$${(amount / 1_000_000_000).toFixed(2)}B`;
}

/**
 * Format percentage
 */
export function formatPercentage(
  value: number,
  decimals: number = 2,
  showSign: boolean = false
): string {
  if (!isFinite(value)) return '0.00%';
  
  const sign = showSign && value > 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
}

/**
 * Format APR with color coding hint
 */
export function formatAPRWithHint(apr: number): {
  formatted: string;
  color: 'success' | 'warning' | 'neutral';
} {
  const formatted = formatPercentage(apr);
  
  let color: 'success' | 'warning' | 'neutral' = 'neutral';
  if (apr >= 10) color = 'success';
  else if (apr < 3) color = 'warning';
  
  return { formatted, color };
}

/**
 * Format health factor
 */
export function formatHealthFactor(healthFactor: number): {
  formatted: string;
  color: 'success' | 'warning' | 'danger';
  label: string;
} {
  if (!isFinite(healthFactor)) {
    return {
      formatted: '∞',
      color: 'success',
      label: 'No Borrows',
    };
  }
  
  let color: 'success' | 'warning' | 'danger';
  let label: string;
  
  if (healthFactor >= 1.5) {
    color = 'success';
    label = 'Safe';
  } else if (healthFactor >= 1.1) {
    color = 'warning';
    label = 'Caution';
  } else {
    color = 'danger';
    label = healthFactor < 1.0 ? 'Liquidatable' : 'At Risk';
  }
  
  return {
    formatted: healthFactor.toFixed(2),
    color,
    label,
  };
}

/**
 * Format utilization rate
 */
export function formatUtilization(utilization: number): {
  formatted: string;
  color: 'success' | 'warning' | 'danger';
} {
  const formatted = formatPercentage(utilization);
  
  let color: 'success' | 'warning' | 'danger';
  if (utilization < 50) color = 'success';
  else if (utilization < 80) color = 'warning';
  else color = 'danger';
  
  return { formatted, color };
}

/**
 * Format large numbers with K/M/B suffixes
 */
export function formatLargeNumber(num: number, decimals: number = 2): string {
  if (num === 0) return '0';
  if (num < 1000) return num.toFixed(decimals);
  if (num < 1_000_000) return `${(num / 1000).toFixed(decimals)}K`;
  if (num < 1_000_000_000) return `${(num / 1_000_000).toFixed(decimals)}M`;
  return `${(num / 1_000_000_000).toFixed(decimals)}B`;
}

/**
 * Format time duration
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

/**
 * Format timestamp to relative time
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

/**
 * Format coin type to symbol
 */
export function formatCoinTypeToSymbol(coinType: string): string {
  const parts = coinType.split('::');
  return parts[parts.length - 1] || parts[parts.length - 2] || 'UNKNOWN';
}

/**
 * Truncate address for display
 */
export function truncateAddress(address: string, startChars: number = 6, endChars: number = 4): string {
  if (address.length <= startChars + endChars) return address;
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

/**
 * Format transaction hash
 */
export function formatTxHash(hash: string): string {
  return truncateAddress(hash, 8, 6);
}

/**
 * Format borrow limit usage
 */
export function formatBorrowLimit(used: number, total: number): {
  percentage: number;
  formatted: string;
  color: 'success' | 'warning' | 'danger';
} {
  const percentage = total > 0 ? (used / total) * 100 : 0;
  const formatted = `${formatPercentage(percentage)} (${formatUSD(used)} / ${formatUSD(total)})`;
  
  let color: 'success' | 'warning' | 'danger';
  if (percentage < 50) color = 'success';
  else if (percentage < 80) color = 'warning';
  else color = 'danger';
  
  return { percentage, formatted, color };
}

/**
 * Format net balance (supply - borrow)
 */
export function formatNetBalance(supplied: number, borrowed: number): {
  net: number;
  formatted: string;
  isPositive: boolean;
} {
  const net = supplied - borrowed;
  const isPositive = net >= 0;
  const formatted = `${isPositive ? '+' : ''}${formatUSD(net)}`;
  
  return { net, formatted, isPositive };
}

/**
 * Format APY from APR
 */
export function formatAPY(apr: number, compoundingPeriods: number = 365): string {
  const aprDecimal = apr / 100;
  const apy = (Math.pow(1 + aprDecimal / compoundingPeriods, compoundingPeriods) - 1) * 100;
  return formatPercentage(apy);
}

/**
 * Format reward amount
 */
export function formatReward(amount: number, symbol: string, priceUSD?: number): string {
  const cryptoFormatted = formatCryptoAmount(amount);
  if (priceUSD) {
    const usdValue = amount * priceUSD;
    return `${cryptoFormatted} ${symbol} (${formatUSD(usdValue)})`;
  }
  return `${cryptoFormatted} ${symbol}`;
}

/**
 * Format liquidation distance
 */
export function formatLiquidationDistance(
  currentPrice: number,
  liquidationPrice: number
): {
  distance: number;
  formatted: string;
  color: 'success' | 'warning' | 'danger';
} {
  if (liquidationPrice === 0) {
    return {
      distance: Infinity,
      formatted: 'N/A',
      color: 'success',
    };
  }
  
  const distance = ((currentPrice - liquidationPrice) / currentPrice) * 100;
  const formatted = formatPercentage(Math.max(0, distance));
  
  let color: 'success' | 'warning' | 'danger';
  if (distance >= 30) color = 'success';
  else if (distance >= 15) color = 'warning';
  else color = 'danger';
  
  return { distance, formatted, color };
}

/**
 * Format pool type
 */
export function formatPoolType(isPaired: boolean): string {
  return isPaired ? 'Paired Pool' : 'Isolated Pool';
}

/**
 * Format E-Mode status
 */
export function formatEModeStatus(
  isActive: boolean,
  categoryName?: string
): string {
  if (!isActive) return 'Not Active';
  return categoryName ? `Active: ${categoryName}` : 'Active';
}

/**
 * Format asset name with symbol
 */
export function formatAssetName(name: string, symbol: string): string {
  if (name === symbol) return name;
  return `${name} (${symbol})`;
}

/**
 * Format change percentage
 */
export function formatChange(
  oldValue: number,
  newValue: number
): {
  change: number;
  formatted: string;
  isIncrease: boolean;
} {
  const change = ((newValue - oldValue) / oldValue) * 100;
  const isIncrease = change > 0;
  const formatted = `${isIncrease ? '+' : ''}${formatPercentage(change)}`;
  
  return { change, formatted, isIncrease };
}

/**
 * Format risk level
 */
export function formatRiskLevel(
  healthFactor: number
): {
  level: 'Very Low' | 'Low' | 'Medium' | 'High' | 'Very High';
  color: 'success' | 'warning' | 'danger';
} {
  if (!isFinite(healthFactor) || healthFactor >= 2.0) {
    return { level: 'Very Low', color: 'success' };
  }
  if (healthFactor >= 1.5) {
    return { level: 'Low', color: 'success' };
  }
  if (healthFactor >= 1.2) {
    return { level: 'Medium', color: 'warning' };
  }
  if (healthFactor >= 1.0) {
    return { level: 'High', color: 'danger' };
  }
  return { level: 'Very High', color: 'danger' };
}

/**
 * Format input amount (for user input validation)
 */
export function formatInputAmount(input: string): {
  isValid: boolean;
  value: number;
  error?: string;
} {
  const trimmed = input.trim();
  
  if (trimmed === '') {
    return { isValid: false, value: 0, error: 'Amount required' };
  }
  
  const value = parseFloat(trimmed);
  
  if (isNaN(value)) {
    return { isValid: false, value: 0, error: 'Invalid number' };
  }
  
  if (value <= 0) {
    return { isValid: false, value, error: 'Amount must be positive' };
  }
  
  return { isValid: true, value };
}

export default {
  formatCryptoAmount,
  formatUSD,
  formatPercentage,
  formatAPRWithHint,
  formatHealthFactor,
  formatUtilization,
  formatLargeNumber,
  formatDuration,
  formatRelativeTime,
  formatCoinTypeToSymbol,
  truncateAddress,
  formatTxHash,
  formatBorrowLimit,
  formatNetBalance,
  formatAPY,
  formatReward,
  formatLiquidationDistance,
  formatPoolType,
  formatEModeStatus,
  formatAssetName,
  formatChange,
  formatRiskLevel,
  formatInputAmount,
};
