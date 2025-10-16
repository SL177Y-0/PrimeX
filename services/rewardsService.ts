/**
 * Rewards Service
 * 
 * Handles fetching and calculating user rewards from Aries protocol
 * Integrates with profile_farm module for reward tracking
 */

import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';
import { ARIES_CONFIG, APTOS_CONFIG } from '../config/constants';
import { priceOracleService } from './priceOracleService';

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
   */
  async fetchUserRewards(userAddress: string): Promise<UserReward[]> {
    try {
      const rewards: UserReward[] = [];

      // Fetch rewards for each asset
      for (const [symbol, asset] of Object.entries(ARIES_CONFIG.pairedAssets)) {
        try {
          // Query profile_farm for supply rewards
          const [supplyFarmData] = await this.aptos.view({
            payload: {
              function: `${ARIES_CONFIG.contractAddress}::profile::profile_farm`,
              typeArguments: [asset.coinType, ARIES_CONFIG.rewardToken],
              functionArguments: [userAddress, 'default'],
            },
          });

          if (supplyFarmData && supplyFarmData.pending_reward) {
            const amount = supplyFarmData.pending_reward.toString();
            const amountDecimal = parseFloat(amount) / Math.pow(10, 8); // Assuming 8 decimals for reward token
            const priceUSD = await this.getRewardTokenPrice();

            rewards.push({
              id: `${userAddress}_${symbol}_supply`,
              userAddress,
              assetSymbol: symbol,
              coinType: asset.coinType,
              rewardType: 'supply',
              amount,
              amountUSD: amountDecimal * priceUSD,
              apr: this.calculateRewardAPR(supplyFarmData),
              claimed: false,
              earnedAt: new Date().toISOString(),
            });
          }

          // Query profile_farm for borrow rewards (if applicable)
          const [borrowFarmData] = await this.aptos.view({
            payload: {
              function: `${ARIES_CONFIG.contractAddress}::profile::profile_farm_borrow`,
              typeArguments: [asset.coinType, ARIES_CONFIG.rewardToken],
              functionArguments: [userAddress, 'default'],
            },
          });

          if (borrowFarmData && borrowFarmData.pending_reward) {
            const amount = borrowFarmData.pending_reward.toString();
            const amountDecimal = parseFloat(amount) / Math.pow(10, 8);
            const priceUSD = await this.getRewardTokenPrice();

            rewards.push({
              id: `${userAddress}_${symbol}_borrow`,
              userAddress,
              assetSymbol: symbol,
              coinType: asset.coinType,
              rewardType: 'borrow',
              amount,
              amountUSD: amountDecimal * priceUSD,
              apr: this.calculateRewardAPR(borrowFarmData),
              claimed: false,
              earnedAt: new Date().toISOString(),
            });
          }
        } catch (error) {
          console.warn(`Failed to fetch rewards for ${symbol}:`, error);
          // Continue with other assets
        }
      }

      return rewards;
    } catch (error) {
      console.error('[RewardsService] Failed to fetch user rewards:', error);
      return [];
    }
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
   * Claim rewards for user
   */
  async claimRewards(
    userAddress: string,
    assetSymbol: string,
    rewardType: 'supply' | 'borrow'
  ): Promise<string> {
    try {
      const asset = ARIES_CONFIG.pairedAssets[assetSymbol];
      if (!asset) {
        throw new Error(`Asset ${assetSymbol} not found`);
      }

      // Build claim transaction
      const functionName = rewardType === 'supply' 
        ? 'claim_supply_rewards'
        : 'claim_borrow_rewards';

      const transaction = await this.aptos.transaction.build.simple({
        sender: userAddress,
        data: {
          function: `${ARIES_CONFIG.contractAddress}::profile::${functionName}`,
          typeArguments: [asset.coinType, ARIES_CONFIG.rewardToken],
          functionArguments: ['default'], // Profile name
        },
      });

      // Return transaction for signing
      return transaction;
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
   * Get reward token price in USD
   */
  private async getRewardTokenPrice(): Promise<number> {
    try {
      // Assuming reward token is APT for now
      const priceData = await priceOracleService.getPrice('APT');
      return priceData.priceUSD;
    } catch (error) {
      console.warn('Failed to fetch reward token price, using fallback');
      return 8.5; // Fallback price
    }
  }

  /**
   * Estimate future rewards based on current positions and APRs
   */
  async estimateFutureRewards(
    userAddress: string,
    days: number = 30
  ): Promise<{
    estimatedTotal: number;
    breakdown: Array<{
      asset: string;
      type: 'supply' | 'borrow';
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
        const estimatedReward = reward.amountUSD * dailyRate * days;
        
        breakdown.push({
          asset: reward.assetSymbol,
          type: reward.rewardType,
          estimatedReward,
          apr: reward.apr,
        });

        estimatedTotal += estimatedReward;
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
