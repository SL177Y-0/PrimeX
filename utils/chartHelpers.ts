/**
 * Chart Data Helpers
 * 
 * Utilities for formatting data for chart components:
 * - APR history charts
 * - Utilization curves
 * - PnL performance charts
 * - Portfolio composition charts
 */

export interface APRDataPoint {
  timestamp: number;
  date: string;
  supplyAPR: number;
  borrowAPR: number;
  utilization: number;
}

export interface UtilizationPoint {
  utilization: number;
  borrowRate: number;
  supplyRate: number;
}

export interface PnLDataPoint {
  timestamp: number;
  date: string;
  pnl: number;
  cumulativePnL: number;
}

export interface PortfolioAllocation {
  asset: string;
  value: number;
  percentage: number;
  color: string;
}

/**
 * Generate utilization curve data points
 */
export function generateUtilizationCurve(
  config: {
    minBorrowRate: number;
    optimalBorrowRate: number;
    maxBorrowRate: number;
    optimalUtilization: number;
    reserveRatio?: number;
  },
  points: number = 20
): UtilizationPoint[] {
  const {
    minBorrowRate,
    optimalBorrowRate,
    maxBorrowRate,
    optimalUtilization,
    reserveRatio = 0.1,
  } = config;

  const curve: UtilizationPoint[] = [];

  for (let i = 0; i <= points; i++) {
    const utilization = (i / points) * 100;
    
    let borrowRate: number;
    
    if (utilization <= optimalUtilization) {
      // Linear interpolation from min to optimal
      const slope = (optimalBorrowRate - minBorrowRate) / optimalUtilization;
      borrowRate = minBorrowRate + slope * utilization;
    } else {
      // Linear interpolation from optimal to max
      const slope = (maxBorrowRate - optimalBorrowRate) / (100 - optimalUtilization);
      borrowRate = optimalBorrowRate + slope * (utilization - optimalUtilization);
    }

    // Supply rate = borrow rate * utilization * (1 - reserve ratio)
    const supplyRate = (borrowRate * utilization / 100) * (1 - reserveRatio);

    curve.push({
      utilization,
      borrowRate,
      supplyRate,
    });
  }

  return curve;
}

/**
 * Format APR history data
 */
export function formatAPRHistory(
  rawData: Array<{
    timestamp: number;
    supplyAPR: number;
    borrowAPR: number;
    utilization: number;
  }>
): APRDataPoint[] {
  return rawData.map(point => ({
    ...point,
    date: formatChartDate(point.timestamp),
  }));
}

/**
 * Format PnL history for charts
 */
export function formatPnLHistory(
  rawData: Array<{
    timestamp: number | string;
    pnl: number;
  }>
): PnLDataPoint[] {
  let cumulativePnL = 0;

  return rawData.map(point => {
    const timestamp = typeof point.timestamp === 'string'
      ? new Date(point.timestamp).getTime()
      : point.timestamp;

    cumulativePnL += point.pnl;

    return {
      timestamp,
      date: formatChartDate(timestamp),
      pnl: point.pnl,
      cumulativePnL,
    };
  });
}

/**
 * Calculate portfolio allocation
 */
export function calculatePortfolioAllocation(
  positions: Array<{
    asset: string;
    valueUSD: number;
  }>
): PortfolioAllocation[] {
  const totalValue = positions.reduce((sum, p) => sum + p.valueUSD, 0);

  if (totalValue === 0) {
    return [];
  }

  const colors = [
    '#3b82f6', // Blue
    '#10b981', // Green
    '#f59e0b', // Orange
    '#ef4444', // Red
    '#8b5cf6', // Purple
    '#ec4899', // Pink
    '#14b8a6', // Teal
    '#f97316', // Dark Orange
  ];

  return positions
    .map((position, index) => ({
      asset: position.asset,
      value: position.valueUSD,
      percentage: (position.valueUSD / totalValue) * 100,
      color: colors[index % colors.length],
    }))
    .sort((a, b) => b.value - a.value); // Sort by value descending
}

/**
 * Format timestamp for chart display
 */
export function formatChartDate(
  timestamp: number,
  format: 'short' | 'medium' | 'long' = 'medium'
): string {
  const date = new Date(timestamp);

  switch (format) {
    case 'short':
      // "10/14"
      return `${date.getMonth() + 1}/${date.getDate()}`;
    
    case 'medium':
      // "Oct 14"
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    
    case 'long':
      // "Oct 14, 2025"
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    
    default:
      return date.toLocaleDateString();
  }
}

/**
 * Generate mock APR history for testing
 */
export function generateMockAPRHistory(
  days: number = 30,
  baseSupplyAPR: number = 5,
  baseBorrowAPR: number = 8
): APRDataPoint[] {
  const now = Date.now();
  const history: APRDataPoint[] = [];

  for (let i = days; i >= 0; i--) {
    const timestamp = now - i * 24 * 60 * 60 * 1000;
    
    // Add some randomness
    const supplyVariation = (Math.random() - 0.5) * 2;
    const borrowVariation = (Math.random() - 0.5) * 3;
    
    history.push({
      timestamp,
      date: formatChartDate(timestamp),
      supplyAPR: Math.max(0, baseSupplyAPR + supplyVariation),
      borrowAPR: Math.max(0, baseBorrowAPR + borrowVariation),
      utilization: 50 + (Math.random() - 0.5) * 40, // 30-70%
    });
  }

  return history;
}

/**
 * Generate mock PnL history for testing
 */
export function generateMockPnLHistory(days: number = 30): PnLDataPoint[] {
  const now = Date.now();
  const history: Array<{ timestamp: number; pnl: number }> = [];

  let trend = 0;
  for (let i = days; i >= 0; i--) {
    const timestamp = now - i * 24 * 60 * 60 * 1000;
    
    // Simulate trending PnL with some volatility
    trend += (Math.random() - 0.45) * 50; // Slight upward bias
    const dailyPnL = trend + (Math.random() - 0.5) * 100;
    
    history.push({
      timestamp,
      pnl: dailyPnL,
    });
  }

  return formatPnLHistory(history);
}

/**
 * Smooth chart data using moving average
 */
export function smoothData<T extends { timestamp: number }>(
  data: T[],
  windowSize: number = 3
): T[] {
  if (data.length < windowSize) {
    return data;
  }

  // This is a simple implementation - just returns original data
  // In production, implement proper moving average
  return data;
}

/**
 * Resample data to reduce points (for performance)
 */
export function resampleData<T>(
  data: T[],
  maxPoints: number = 100
): T[] {
  if (data.length <= maxPoints) {
    return data;
  }

  const step = Math.ceil(data.length / maxPoints);
  const resampled: T[] = [];

  for (let i = 0; i < data.length; i += step) {
    resampled.push(data[i]);
  }

  return resampled;
}

/**
 * Calculate min/max values for chart scaling
 */
export function getChartBounds(
  data: number[],
  padding: number = 0.1
): { min: number; max: number } {
  if (data.length === 0) {
    return { min: 0, max: 100 };
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min;

  return {
    min: min - range * padding,
    max: max + range * padding,
  };
}

/**
 * Format tooltip values
 */
export function formatTooltipValue(
  value: number,
  type: 'currency' | 'percent' | 'number' = 'number',
  decimals: number = 2
): string {
  switch (type) {
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(value);
    
    case 'percent':
      return `${value.toFixed(decimals)}%`;
    
    case 'number':
    default:
      return value.toFixed(decimals);
  }
}
