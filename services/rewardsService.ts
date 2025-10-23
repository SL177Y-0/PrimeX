/**
 * Rewards Service
 * 
 * Handles fetching and calculating user rewards from Aries protocol
 * Integrates with profile_farm module for reward tracking
 */

import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';
import { ARIES_CONFIG, APTOS_CONFIG } from '../config/constants';
import { pythPriceService } from './pythPriceService';

// Reward token (placeholder - update with actual reward token from Aries)
const REWARD_TOKEN = '0x1::aptos_coin::AptosCoin';

export interface UserReward {
  id: string;
  userAddress: string;
  assetSymbol: string;
  coinType: string;
  rewardType: 'supply' | 'borrow' | 'liquidity_mining';
  amount: string;
  amountUSD: number;
  apr: number;
  claimed: boolean;
  claimedAt?: string;
  earnedAt: string;
}

export interface RewardSummary {
  totalEarned: number;
  totalClaimed: number;
  totalPending: number;
  dailyRate: number;
  estimatedMonthly: number;
  rewards: UserReward[];
}

export interface ProtocolRewards {
  totalDistributed: number;
  totalUsers: number;
  averageAPR: number;
  topRewardAssets: Array<{
    symbol: string;
    totalRewards: number;
    apr: number;
  }>;
}

class RewardsService {
  private aptos: Aptos;

  constructor() {
    const aptosConfig = new AptosConfig({
      network: APTOS_CONFIG.network as Network,
      fullnode: APTOS_CONFIG.nodeUrl,
    });
    this.aptos = new Aptos(aptosConfig);
  }

  /**
   * Fetch user rewards from profile_farm module
   * NOTE: Aries Markets rewards program may not be active or view functions may not be public
   * Returning empty array to prevent errors - rewards are shown via APR in the UI
   */
  async fetchUserRewards(userAddress: string): Promise<UserReward[]> {
    // Rewards fetching is currently disabled as the Aries protocol does not expose
    // public view functions for querying rewards (profile_farm, profile_farm_borrow don't exist)
    // The APR shown in the UI comes from the lending interest rates, not separate reward tokens
    console.log('[RewardsService] Rewards fetching disabled - APR shown via interest rates');
    return [];

    // TODO: Enable if Aries adds public reward view functions in the future
    /*
    try {
      const rewards: UserReward[] = [];

      // Fetch rewards for each asset
      for (const [symbol, asset] of Object.entries(ARIES_CONFIG.pairedAssets)) {
        try {
          // Query profile_farm for supply rewards
          const [supplyFarmData] = await this.aptos.view({
            payload: {
              function: `${ARIES_CONFIG.contractAddress}::profile_farm::get_pending_rewards`,
              typeArguments: [asset.coinType, REWARD_TOKEN],
              functionArguments: [userAddress, 'default'],
            },
          }).catch((error) => {
            if (this.isNoDepositError(error)) {
              return [null];
            }
            throw error;
          });

          const farmData = supplyFarmData as any;
          if (farmData && farmData.pending_reward) {
            const amount = farmData.pending_reward.toString();
            const amountDecimal = parseFloat(amount) / Math.pow(10, 8);
            const priceUSD = await this.getRewardTokenPrice();

            rewards.push({
              id: `${userAddress}_${symbol}_supply`,
              userAddress,
              assetSymbol: symbol,
              coinType: asset.coinType,
              rewardType: 'supply',
              amount,
              amountUSD: amountDecimal * priceUSD,
              apr: this.calculateRewardAPR(farmData),
              claimed: false,
              earnedAt: new Date().toISOString(),
            });
          }
        } catch (error) {
          if (!this.isNoDepositError(error)) {
            console.warn(`Failed to fetch rewards for ${symbol}:`, error);
          }
        }
      }

      return rewards;
    } catch (error) {
      console.error('[RewardsService] Failed to fetch user rewards:', error);
      return [];
    }
    */
  }

  /**
   * Check if error is the expected "no deposit" error from Aries
   */
  private isNoDepositError(error: any): boolean {
    if (!error) return false;
    const errorMessage = error.message || error.toString();
    // Check for EPROFILE_NO_DEPOSIT_RESERVE (error code 0x0 = 4016)
    return errorMessage.includes('EPROFILE_NO_DEPOSIT_RESERVE') || 
           errorMessage.includes('vm_error_code":4016');
  }

  /**
   * Calculate reward summary for user
   */
  async calculateRewardSummary(userAddress: string): Promise<RewardSummary> {
    const rewards = await this.fetchUserRewards(userAddress);
    
    const totalEarned = rewards.reduce((sum, reward) => sum + reward.amountUSD, 0);
    const totalClaimed = rewards
      .filter(reward => reward.claimed)
      .reduce((sum, reward) => sum + reward.amountUSD, 0);
    const totalPending = totalEarned - totalClaimed;

    // Calculate daily rate based on current APRs
    const dailyRate = rewards.reduce((sum, reward) => {
      const dailyAPR = reward.apr / 365;
      return sum + (reward.amountUSD * dailyAPR / 100);
    }, 0);

    const estimatedMonthly = dailyRate * 30;

    return {
      totalEarned,
      totalClaimed,
      totalPending,
      dailyRate,
      estimatedMonthly,
      rewards,
    };
  }

  /**
   * Fetch protocol-wide reward statistics
   */
  async fetchProtocolRewards(): Promise<ProtocolRewards> {
    try {
      // This would typically come from an indexer or aggregated data
      // For now, we'll calculate based on available data
      
      const totalDistributed = 1250000; // Mock data - would come from protocol events
      const totalUsers = 8500; // Mock data
      const averageAPR = 12.5; // Mock data

      const topRewardAssets = [
        { symbol: 'APT', totalRewards: 450000, apr: 15.2 },
        { symbol: 'USDC', totalRewards: 320000, apr: 8.5 },
        { symbol: 'BTC', totalRewards: 280000, apr: 11.8 },
        { symbol: 'ETH', totalRewards: 200000, apr: 9.3 },
      ];

      return {
        totalDistributed,
        totalUsers,
        averageAPR,
        topRewardAssets,
      };
    } catch (error) {
      console.error('[RewardsService] Failed to fetch protocol rewards:', error);
      throw error;
    }
  }

  /**
   * Claim rewards for a specific asset
   */
  async claimReward(
    userAddress: string,
    assetSymbol: string,
    rewardType: 'supply' | 'borrow' | 'liquidity_mining'
  ): Promise<string> {
    try {
      const asset = (ARIES_CONFIG.pairedAssets as any)[assetSymbol];
      if (!asset) {
        throw new Error(`Asset ${assetSymbol} not found`);
      }

      // Build claim transaction
      const functionName = rewardType === 'supply' 
        ? 'claim_supply_rewards'
        : rewardType === 'borrow' 
          ? 'claim_borrow_rewards'
          : 'claim_liquidity_mining_rewards';

      const transaction = await this.aptos.transaction.build.simple({
        sender: userAddress,
        data: {
          function: `${ARIES_CONFIG.contractAddress}::profile::${functionName}`,
          typeArguments: [asset.coinType, REWARD_TOKEN],
          functionArguments: ['default'], // Profile name
        },
      });

      // Return transaction for signing (returns payload for wallet to sign)
      return JSON.stringify(transaction);
    } catch (error) {
      console.error('[RewardsService] Failed to build claim transaction:', error);
      throw error;
    }
  }

  /**
   * Get historical reward data for charts
   */
  async getRewardHistory(
    userAddress: string,
    days: number = 30
  ): Promise<Array<{ date: string; amount: number; amountUSD: number }>> {
    try {
      // This would typically come from indexed events
      // For now, we'll generate mock historical data
      const history = [];
      const now = new Date();
      
      for (let i = days; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const amount = Math.random() * 10 + 5; // Mock daily rewards
        const priceUSD = await this.getRewardTokenPrice();
        
        history.push({
          date: date.toISOString().split('T')[0],
          amount,
          amountUSD: amount * priceUSD,
        });
      }

      return history;
    } catch (error) {
      console.error('[RewardsService] Failed to fetch reward history:', error);
      return [];
    }
  }

  /**
   * Calculate reward APR from farm data
   */
  private calculateRewardAPR(farmData: any): number {
    try {
      // This calculation would depend on the actual farm data structure
      // For now, return a mock APR
      return Math.random() * 20 + 5; // 5-25% APR
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get current price of reward token (APT)
   */
  private async getRewardTokenPrice(): Promise<number> {
    try {
      const price = await pythPriceService.getPrice(REWARD_TOKEN);
      return price || 0;
    } catch (error) {
      console.error('[RewardsService] Failed to fetch reward token price:', error);
      return 0; // Fallback to 0 if price fetch fails
    }
  }

  /**
   * Estimate future rewards based on current positions and APRs
   */
  async estimateRewards(userAddress: string): Promise<{
    estimatedTotal: number;
    breakdown: Array<{
      asset: string;
      type: 'supply' | 'borrow' | 'liquidity_mining';
      estimatedReward: number;
      apr: number;
    }>;
  }> {
    try {
      const rewards = await this.fetchUserRewards(userAddress);
      const breakdown = [];
      let estimatedTotal = 0;

      for (const reward of rewards) {
        const dailyRate = reward.apr / 365 / 100;
        const daysElapsed = 30; // Default 30 days estimation
        const estimatedDaily = (reward.amountUSD / 30) * daysElapsed;
        
        breakdown.push({
          asset: reward.assetSymbol,
          type: reward.rewardType,
          estimatedReward: estimatedDaily,
          apr: reward.apr,
        });

        estimatedTotal += estimatedDaily;
      }

      return {
        estimatedTotal,
        breakdown,
      };
    } catch (error) {
      console.error('[RewardsService] Failed to estimate future rewards:', error);
      return { estimatedTotal: 0, breakdown: [] };
    }
  }
}

export const rewardsService = new RewardsService();
