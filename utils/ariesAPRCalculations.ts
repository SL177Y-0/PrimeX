/**
 * Aries Markets APR Calculation Utilities
 * Implements net APR, weighted APR, and APY conversions
 */

export interface SupplyPosition {
  coinType: string;
  symbol: string;
  amountUSD: number;
  supplyAPR: number; // as percentage (e.g., 5.5 = 5.5%)
  rewardAPR?: number; // optional reward APR
}

export interface BorrowPosition {
  coinType: string;
  symbol: string;
  amountUSD: number;
  borrowAPR: number; // as percentage (e.g., 8.2 = 8.2%)
  rewardAPR?: number; // optional reward APR (reduces cost)
}

export interface NetAPRResult {
  netAPR: number; // Net APR across all positions
  totalSupplyAPR: number; // Weighted average supply APR
  totalBorrowAPR: number; // Weighted average borrow APR
  totalRewardAPR: number; // Total reward APR contribution
  supplyEarnings: number; // Annual earnings from supply (USD)
  borrowCosts: number; // Annual costs from borrow (USD)
  rewardEarnings: number; // Annual earnings from rewards (USD)
  netEarnings: number; // Net annual earnings (USD)
}

/**
 * Calculate weighted average supply APR
 * Formula: Σ(supply_amount × supply_apr) / Σ(supply_amount)
 */
export function calculateWeightedSupplyAPR(supplies: SupplyPosition[]): number {
  const totalSupplyValue = supplies.reduce((sum, s) => sum + s.amountUSD, 0);
  
  if (totalSupplyValue === 0) return 0;
  
  const weightedSum = supplies.reduce((sum, s) => {
    const baseAPR = s.supplyAPR || 0;
    const rewardAPR = s.rewardAPR || 0;
    const totalAPR = baseAPR + rewardAPR;
    return sum + (s.amountUSD * totalAPR);
  }, 0);
  
  return weightedSum / totalSupplyValue;
}

/**
 * Calculate weighted average borrow APR
 * Formula: Σ(borrow_amount × borrow_apr) / Σ(borrow_amount)
 * Note: Reward APR reduces borrow cost
 */
export function calculateWeightedBorrowAPR(borrows: BorrowPosition[]): number {
  const totalBorrowValue = borrows.reduce((sum, b) => sum + b.amountUSD, 0);
  
  if (totalBorrowValue === 0) return 0;
  
  const weightedSum = borrows.reduce((sum, b) => {
    const baseAPR = b.borrowAPR || 0;
    const rewardAPR = b.rewardAPR || 0;
    const netAPR = baseAPR - rewardAPR; // Rewards reduce cost
    return sum + (b.amountUSD * netAPR);
  }, 0);
  
  return weightedSum / totalBorrowValue;
}

/**
 * Calculate total reward APR contribution
 */
export function calculateTotalRewardAPR(
  supplies: SupplyPosition[],
  borrows: BorrowPosition[]
): number {
  const totalValue = 
    supplies.reduce((sum, s) => sum + s.amountUSD, 0) +
    borrows.reduce((sum, b) => sum + b.amountUSD, 0);
  
  if (totalValue === 0) return 0;
  
  const supplyRewards = supplies.reduce((sum, s) => {
    return sum + (s.amountUSD * (s.rewardAPR || 0));
  }, 0);
  
  const borrowRewards = borrows.reduce((sum, b) => {
    return sum + (b.amountUSD * (b.rewardAPR || 0));
  }, 0);
  
  return (supplyRewards + borrowRewards) / totalValue;
}

/**
 * Calculate net APR across all positions
 * Formula: weighted_supply_apr - weighted_borrow_apr
 */
export function calculateNetAPR(
  supplies: SupplyPosition[],
  borrows: BorrowPosition[]
): NetAPRResult {
  const totalSupplyValue = supplies.reduce((sum, s) => sum + s.amountUSD, 0);
  const totalBorrowValue = borrows.reduce((sum, b) => sum + b.amountUSD, 0);
  
  // Calculate weighted APRs
  const totalSupplyAPR = calculateWeightedSupplyAPR(supplies);
  const totalBorrowAPR = calculateWeightedBorrowAPR(borrows);
  const totalRewardAPR = calculateTotalRewardAPR(supplies, borrows);
  
  // Calculate annual earnings/costs
  const supplyEarnings = (totalSupplyValue * totalSupplyAPR) / 100;
  const borrowCosts = (totalBorrowValue * totalBorrowAPR) / 100;
  
  // Calculate reward earnings separately
  const supplyRewardEarnings = supplies.reduce((sum, s) => {
    return sum + (s.amountUSD * (s.rewardAPR || 0)) / 100;
  }, 0);
  
  const borrowRewardEarnings = borrows.reduce((sum, b) => {
    return sum + (b.amountUSD * (b.rewardAPR || 0)) / 100;
  }, 0);
  
  const rewardEarnings = supplyRewardEarnings + borrowRewardEarnings;
  
  // Net earnings
  const netEarnings = supplyEarnings - borrowCosts + rewardEarnings;
  
  // Net APR as percentage
  const totalValue = totalSupplyValue + totalBorrowValue;
  const netAPR = totalValue > 0 ? (netEarnings / totalValue) * 100 : 0;
  
  return {
    netAPR,
    totalSupplyAPR,
    totalBorrowAPR,
    totalRewardAPR,
    supplyEarnings,
    borrowCosts,
    rewardEarnings,
    netEarnings,
  };
}

/**
 * Convert APR to APY (compound interest)
 * Formula: APY = (1 + APR/n)^n - 1
 * where n = compounding periods per year
 */
export function convertAPRtoAPY(apr: number, compoundingPeriodsPerYear: number = 365): number {
  const aprDecimal = apr / 100;
  const apy = Math.pow(1 + aprDecimal / compoundingPeriodsPerYear, compoundingPeriodsPerYear) - 1;
  return apy * 100; // Return as percentage
}

/**
 * Calculate projected earnings over time period
 */
export function calculateProjectedEarnings(
  principal: number,
  apr: number,
  daysHeld: number,
  useCompounding: boolean = true
): number {
  const aprDecimal = apr / 100;
  const yearsHeld = daysHeld / 365;
  
  if (useCompounding) {
    // Compound daily
    return principal * Math.pow(1 + aprDecimal / 365, daysHeld) - principal;
  } else {
    // Simple interest
    return principal * aprDecimal * yearsHeld;
  }
}

/**
 * Format APR for display
 */
export function formatAPR(apr: number, decimals: number = 2): string {
  if (!isFinite(apr)) return '0.00%';
  return `${apr.toFixed(decimals)}%`;
}

/**
 * Get APR color based on value (for UI)
 */
export function getAPRColor(apr: number): 'success' | 'warning' | 'neutral' {
  if (apr >= 10) return 'success'; // High APR
  if (apr >= 3) return 'neutral'; // Medium APR
  return 'warning'; // Low APR
}

/**
 * Calculate break-even borrow APR
 * Returns the borrow APR at which net earnings = 0
 */
export function calculateBreakEvenBorrowAPR(
  supplies: SupplyPosition[],
  totalBorrowValue: number
): number {
  const totalSupplyValue = supplies.reduce((sum, s) => sum + s.amountUSD, 0);
  const supplyEarnings = supplies.reduce((sum, s) => {
    return sum + (s.amountUSD * (s.supplyAPR || 0)) / 100;
  }, 0);
  
  if (totalBorrowValue === 0) return 0;
  
  // Break-even when supply earnings = borrow costs
  return (supplyEarnings / totalBorrowValue) * 100;
}

/**
 * Calculate optimal leverage ratio
 * Returns recommended borrow amount based on supply APR and borrow APR spread
 */
export function calculateOptimalLeverage(
  supplyAPR: number,
  borrowAPR: number,
  maxLTV: number,
  riskTolerance: 'conservative' | 'moderate' | 'aggressive' = 'moderate'
): number {
  const aprSpread = supplyAPR - borrowAPR;
  
  // Only leverage if supply APR > borrow APR
  if (aprSpread <= 0) return 0;
  
  // Risk multipliers
  const riskMultipliers = {
    conservative: 0.5, // Use 50% of max LTV
    moderate: 0.7, // Use 70% of max LTV
    aggressive: 0.9, // Use 90% of max LTV
  };
  
  const multiplier = riskMultipliers[riskTolerance];
  return (maxLTV / 100) * multiplier;
}

export default {
  calculateWeightedSupplyAPR,
  calculateWeightedBorrowAPR,
  calculateTotalRewardAPR,
  calculateNetAPR,
  convertAPRtoAPY,
  calculateProjectedEarnings,
  formatAPR,
  getAPRColor,
  calculateBreakEvenBorrowAPR,
  calculateOptimalLeverage,
};
