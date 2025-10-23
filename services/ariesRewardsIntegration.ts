/**
 * Aries Rewards Integration Service
 * Fetches and manages user rewards from Aries Markets
 */

import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';

const CONTRACT_ADDRESS = '0x9770fa9c725cbd97eb50b2be5f7416efdfd1f5907926a9e58338f964a01b17fa';
const APTOS_NODE_URL = process.env.EXPO_PUBLIC_APTOS_NODE_URL || 'https://aptos-mainnet.nodereal.io/v1/dbe3294d24374cad9d0886ca12d0aeb7/v1';

export interface RewardPosition {
  reserveCoinAddress: string;
  rewardCoinAddress: string;
  share: number;
  unclaimedAmount: number;
  lastRewardPerShare: number;
  rewardAPR: number;
  valueUSD: number;
}

export interface UserRewards {
  depositRewards: RewardPosition[];
  borrowRewards: RewardPosition[];
  totalUnclaimedUSD: number;
  totalRewardAPR: number;
}

class AriesRewardsIntegrationService {
  private aptosClient: Aptos;

  constructor() {
    const aptosConfig = new AptosConfig({
      network: Network.MAINNET,
      fullnode: APTOS_NODE_URL,
    });
    this.aptosClient = new Aptos(aptosConfig);
  }

  /**
   * Fetch user deposit rewards
   */
  async fetchDepositRewards(
    userAddress: string,
    profileName: string = 'Main Account'
  ): Promise<RewardPosition[]> {
    try {
      const [rewardData] = await this.aptosClient.view({
        payload: {
          function: `${CONTRACT_ADDRESS}::profile::get_deposit_farms`,
          typeArguments: [],
          functionArguments: [userAddress, profileName],
        },
      });

      return this.parseRewardData(rewardData as any);
    } catch (error) {
      console.log('[AriesRewards] No deposit rewards found:', error);
      return [];
    }
  }

  /**
   * Fetch user borrow rewards
   */
  async fetchBorrowRewards(
    userAddress: string,
    profileName: string = 'Main Account'
  ): Promise<RewardPosition[]> {
    try {
      const [rewardData] = await this.aptosClient.view({
        payload: {
          function: `${CONTRACT_ADDRESS}::profile::get_borrow_farms`,
          typeArguments: [],
          functionArguments: [userAddress, profileName],
        },
      });

      return this.parseRewardData(rewardData as any);
    } catch (error) {
      console.log('[AriesRewards] No borrow rewards found:', error);
      return [];
    }
  }

  /**
   * Fetch all user rewards
   */
  async fetchAllRewards(
    userAddress: string,
    profileName: string = 'Main Account'
  ): Promise<UserRewards> {
    const [depositRewards, borrowRewards] = await Promise.all([
      this.fetchDepositRewards(userAddress, profileName),
      this.fetchBorrowRewards(userAddress, profileName),
    ]);

    const totalUnclaimedUSD = [
      ...depositRewards,
      ...borrowRewards,
    ].reduce((sum, reward) => sum + reward.valueUSD, 0);

    const totalRewardAPR = [
      ...depositRewards,
      ...borrowRewards,
    ].reduce((sum, reward) => sum + reward.rewardAPR, 0);

    return {
      depositRewards,
      borrowRewards,
      totalUnclaimedUSD,
      totalRewardAPR,
    };
  }

  /**
   * Claim deposit rewards
   */
  async claimDepositRewards(
    userAddress: string,
    reserveCoinType: string,
    rewardCoinType: string,
    profileName: string = 'Main Account'
  ) {
    return {
      function: `${CONTRACT_ADDRESS}::controller::claim_deposit_reward` as `${string}::${string}::${string}`,
      typeArguments: [reserveCoinType, rewardCoinType],
      functionArguments: [profileName],
    };
  }

  /**
   * Claim borrow rewards
   */
  async claimBorrowRewards(
    userAddress: string,
    reserveCoinType: string,
    rewardCoinType: string,
    profileName: string = 'Main Account'
  ) {
    return {
      function: `${CONTRACT_ADDRESS}::controller::claim_borrow_reward` as `${string}::${string}::${string}`,
      typeArguments: [reserveCoinType, rewardCoinType],
      functionArguments: [profileName],
    };
  }

  /**
   * Claim all rewards
   */
  async claimAllRewards(
    userAddress: string,
    profileName: string = 'Main Account'
  ) {
    const rewards = await this.fetchAllRewards(userAddress, profileName);
    
    const transactions = [];

    // Add deposit reward claims
    for (const reward of rewards.depositRewards) {
      if (reward.unclaimedAmount > 0) {
        transactions.push(
          await this.claimDepositRewards(
            userAddress,
            reward.reserveCoinAddress,
            reward.rewardCoinAddress,
            profileName
          )
        );
      }
    }

    // Add borrow reward claims
    for (const reward of rewards.borrowRewards) {
      if (reward.unclaimedAmount > 0) {
        transactions.push(
          await this.claimBorrowRewards(
            userAddress,
            reward.reserveCoinAddress,
            reward.rewardCoinAddress,
            profileName
          )
        );
      }
    }

    return transactions;
  }

  /**
   * Parse reward data from contract response
   */
  private parseRewardData(rawData: any): RewardPosition[] {
    if (!rawData || !Array.isArray(rawData)) {
      return [];
    }

    return rawData.map((item: any) => ({
      reserveCoinAddress: item.reserve_coin_address || '',
      rewardCoinAddress: item.reward_coin_address || '',
      share: parseFloat(item.share || '0'),
      unclaimedAmount: parseFloat(item.reward?.unclaimed_amount || '0'),
      lastRewardPerShare: parseFloat(item.reward?.last_reward_per_share || '0'),
      rewardAPR: this.calculateRewardAPR(item),
      valueUSD: 0, // Will be calculated with price data
    }));
  }

  /**
   * Calculate reward APR
   */
  private calculateRewardAPR(rewardData: any): number {
    // Simplified APR calculation
    // In production, this would use actual reward emission rates and pool data
    const rewardPerDay = parseFloat(rewardData.reward_config?.reward_per_day || '0');
    const totalShares = parseFloat(rewardData.total_shares || '1');
    
    if (totalShares === 0) return 0;
    
    // Annual reward rate
    const annualReward = rewardPerDay * 365;
    const apr = (annualReward / totalShares) * 100;
    
    return apr;
  }

  /**
   * Get reward token price (placeholder - integrate with price service)
   */
  async getRewardTokenPrice(coinType: string): Promise<number> {
    // TODO: Integrate with pythPriceService or ariesSDKService
    // For now, return 0 and let the caller handle price fetching
    return 0;
  }
}

export const ariesRewardsIntegration = new AriesRewardsIntegrationService();
export default ariesRewardsIntegration;
