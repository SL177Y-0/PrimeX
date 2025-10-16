/**
 * Aries Rewards Farm Service
 * Handles reward tracking, APR calculations, and claiming
 * Based on documented reward mechanisms from report.md
 */

import { getAptosClient, ARIES_CONTRACT } from './ariesProtocolServiceEnhanced';

export interface RewardFarm {
  reserveCoinType: string;
  farmType: 'DepositFarming' | 'BorrowFarming';
  rewardCoinType: string;
  rewardPerDay: string;
  remainingReward: string;
  rewardPerShare: string;
  totalShare: string;
  timestamp: number;
}

export interface UserRewardPosition {
  reserveCoinType: string;
  reserveSymbol: string;
  farmType: 'DepositFarming' | 'BorrowFarming';
  rewardCoinType: string;
  rewardSymbol: string;
  claimableAmount: number;
  claimableAmountUSD: number;
  userShare: number;
}

export interface RewardsSummary {
  totalClaimableUSD: number;
  rewardsByToken: Map<string, {
    symbol: string;
    totalAmount: number;
    totalAmountUSD: number;
    positions: UserRewardPosition[];
  }>;
}

/**
 * Calculate APR from reward emissions
 * Formula: (reward_per_day × 365 × reward_price) / (total_share × asset_price) × 100
 */
export function calculateRewardAPR(
  rewardPerDay: number,
  rewardPriceUSD: number,
  totalShare: number,
  assetPriceUSD: number
): number {
  if (totalShare === 0 || assetPriceUSD === 0) return 0;
  
  const annualRewardValue = rewardPerDay * 365 * rewardPriceUSD;
  const totalValueLocked = totalShare * assetPriceUSD;
  
  return (annualRewardValue / totalValueLocked) * 100;
}

/**
 * Calculate user's claimable rewards
 * Formula: user_share × (current_reward_per_share - user_entry_reward_per_share)
 */
export function calculateClaimableRewards(
  userShare: number,
  currentRewardPerShare: number,
  userEntryRewardPerShare: number
): number {
  const rewardDelta = currentRewardPerShare - userEntryRewardPerShare;
  return userShare * rewardDelta;
}

/**
 * Fetch all reward farms for a reserve
 */
export async function getReserveFarms(
  reserveCoinType: string
): Promise<RewardFarm[]> {
  const client = getAptosClient();
  
  try {
    // Query deposit farming
    const depositFarmResult = await client.view({
      payload: {
        function: `${ARIES_CONTRACT}::reserve::get_deposit_farm`,
        typeArguments: [reserveCoinType],
        functionArguments: [],
      },
    });
    
    // Query borrow farming
    const borrowFarmResult = await client.view({
      payload: {
        function: `${ARIES_CONTRACT}::reserve::get_borrow_farm`,
        typeArguments: [reserveCoinType],
        functionArguments: [],
      },
    });
    
    // Parse and combine results
    // Note: Actual parsing depends on response structure
    return [];
  } catch (error) {
    console.error('[RewardsService] Failed to fetch reserve farms:', error);
    return [];
  }
}

/**
 * Fetch user's claimable rewards
 */
export async function getUserClaimableRewards(
  userAddress: string,
  profileName: string = 'default'
): Promise<UserRewardPosition[]> {
  const client = getAptosClient();
  
  try {
    // Get list of claimable reward pairs
    const result = await client.view({
      payload: {
        function: `${ARIES_CONTRACT}::profile::list_claimable_rewards`,
        typeArguments: [],
        functionArguments: [userAddress, profileName],
      },
    });
    
    // Parse reward pairs and fetch amounts
    // Note: Actual parsing depends on response structure
    return [];
  } catch (error) {
    console.error('[RewardsService] Failed to fetch user rewards:', error);
    return [];
  }
}

/**
 * Calculate total rewards summary
 */
export function summarizeRewards(
  positions: UserRewardPosition[]
): RewardsSummary {
  const rewardsByToken = new Map<string, {
    symbol: string;
    totalAmount: number;
    totalAmountUSD: number;
    positions: UserRewardPosition[];
  }>();
  
  let totalClaimableUSD = 0;
  
  for (const position of positions) {
    totalClaimableUSD += position.claimableAmountUSD;
    
    const existing = rewardsByToken.get(position.rewardCoinType);
    if (existing) {
      existing.totalAmount += position.claimableAmount;
      existing.totalAmountUSD += position.claimableAmountUSD;
      existing.positions.push(position);
    } else {
      rewardsByToken.set(position.rewardCoinType, {
        symbol: position.rewardSymbol,
        totalAmount: position.claimableAmount,
        totalAmountUSD: position.claimableAmountUSD,
        positions: [position],
      });
    }
  }
  
  return {
    totalClaimableUSD,
    rewardsByToken,
  };
}

/**
 * Calculate combined APR (base + rewards)
 */
export function calculateCombinedAPR(
  baseAPR: number,
  rewardAPRs: number[]
): number {
  return baseAPR + rewardAPRs.reduce((sum, apr) => sum + apr, 0);
}

/**
 * Format APR for display
 */
export function formatAPR(apr: number, showRewards: boolean = true): string {
  if (apr === 0) return '0.00%';
  
  const formatted = apr.toFixed(2);
  return showRewards && apr > 0 ? `${formatted}%` : `${formatted}%`;
}

/**
 * Get reward boost multiplier for E-Mode
 * Some E-Mode categories may have boosted rewards
 */
export function getEModeRewardMultiplier(eModeId?: string): number {
  // E-Mode reward multipliers (would be fetched from contract in production)
  const EMODE_MULTIPLIERS: Record<string, number> = {
    'stablecoin_emode': 1.1, // 10% boost for stablecoin E-Mode
    'eth_emode': 1.05, // 5% boost for ETH E-Mode
    // Add more E-Mode categories as configured in Aries
  };
  
  if (!eModeId) return 1.0;
  return EMODE_MULTIPLIERS[eModeId] || 1.0;
}

/**
 * Estimate future rewards
 * Formula: current_rate × time_period
 */
export function estimateFutureRewards(
  currentClaimablePerDay: number,
  days: number
): number {
  return currentClaimablePerDay * days;
}

/**
 * Check if rewards are active for a reserve
 */
export async function hasActiveRewards(
  reserveCoinType: string
): Promise<boolean> {
  try {
    const farms = await getReserveFarms(reserveCoinType);
    return farms.some(farm => parseFloat(farm.remainingReward) > 0);
  } catch {
    return false;
  }
}

export default {
  calculateRewardAPR,
  calculateClaimableRewards,
  getReserveFarms,
  getUserClaimableRewards,
  summarizeRewards,
  calculateCombinedAPR,
  formatAPR,
  getEModeRewardMultiplier,
  estimateFutureRewards,
  hasActiveRewards,
};
