/**
 * Rewards Service Tests
 */

import { rewardsService } from '../../services/rewardsService';

// Mock Aptos SDK
jest.mock('@aptos-labs/ts-sdk', () => ({
  Aptos: jest.fn().mockImplementation(() => ({
    view: jest.fn(),
  })),
  AptosConfig: jest.fn(),
  Network: {},
}));

// Mock price oracle service
jest.mock('../../services/priceOracleService', () => ({
  priceOracleService: {
    getPrice: jest.fn().mockResolvedValue({ priceUSD: 8.5 }),
  },
}));

describe('RewardsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchUserRewards', () => {
    it('should fetch user rewards successfully', async () => {
      const mockUserAddress = '0x123';
      const rewards = await rewardsService.fetchUserRewards(mockUserAddress);
      
      expect(Array.isArray(rewards)).toBe(true);
    });

    it('should handle errors gracefully', async () => {
      const mockUserAddress = '0xinvalid';
      const rewards = await rewardsService.fetchUserRewards(mockUserAddress);
      
      expect(rewards).toEqual([]);
    });
  });

  describe('calculateRewardSummary', () => {
    it('should calculate reward summary correctly', async () => {
      const mockUserAddress = '0x123';
      const summary = await rewardsService.calculateRewardSummary(mockUserAddress);
      
      expect(summary).toHaveProperty('totalEarned');
      expect(summary).toHaveProperty('totalClaimed');
      expect(summary).toHaveProperty('totalPending');
      expect(summary).toHaveProperty('dailyRate');
      expect(summary).toHaveProperty('estimatedMonthly');
      expect(summary).toHaveProperty('rewards');
      
      expect(typeof summary.totalEarned).toBe('number');
      expect(typeof summary.dailyRate).toBe('number');
      expect(Array.isArray(summary.rewards)).toBe(true);
    });
  });

  describe('fetchProtocolRewards', () => {
    it('should fetch protocol rewards', async () => {
      const protocolRewards = await rewardsService.fetchProtocolRewards();
      
      expect(protocolRewards).toHaveProperty('totalDistributed');
      expect(protocolRewards).toHaveProperty('totalUsers');
      expect(protocolRewards).toHaveProperty('averageAPR');
      expect(protocolRewards).toHaveProperty('topRewardAssets');
      
      expect(typeof protocolRewards.totalDistributed).toBe('number');
      expect(Array.isArray(protocolRewards.topRewardAssets)).toBe(true);
    });
  });

  describe('getRewardHistory', () => {
    it('should return reward history', async () => {
      const mockUserAddress = '0x123';
      const history = await rewardsService.getRewardHistory(mockUserAddress, 7);
      
      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBe(8); // 7 days + today
      
      if (history.length > 0) {
        expect(history[0]).toHaveProperty('date');
        expect(history[0]).toHaveProperty('amount');
        expect(history[0]).toHaveProperty('amountUSD');
      }
    });
  });

  describe('estimateFutureRewards', () => {
    it('should estimate future rewards', async () => {
      const mockUserAddress = '0x123';
      const estimation = await rewardsService.estimateFutureRewards(mockUserAddress, 30);
      
      expect(estimation).toHaveProperty('estimatedTotal');
      expect(estimation).toHaveProperty('breakdown');
      
      expect(typeof estimation.estimatedTotal).toBe('number');
      expect(Array.isArray(estimation.breakdown)).toBe(true);
    });
  });
});
