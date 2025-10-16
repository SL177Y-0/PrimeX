/**
 * Aries Helpers Tests
 */

import { AriesHelpers } from '../../utils/ariesHelpers';

describe('AriesHelpers', () => {
  describe('formatTokenAmount', () => {
    it('should format token amounts correctly', () => {
      expect(AriesHelpers.formatTokenAmount('100000000', 8)).toBe(1);
      expect(AriesHelpers.formatTokenAmount('150000000', 8)).toBe(1.5);
      expect(AriesHelpers.formatTokenAmount('1000000', 6)).toBe(1);
    });
  });

  describe('formatCurrency', () => {
    it('should format currency with appropriate suffixes', () => {
      expect(AriesHelpers.formatCurrency(1500)).toBe('$1.50K');
      expect(AriesHelpers.formatCurrency(1500000)).toBe('$1.50M');
      expect(AriesHelpers.formatCurrency(1500000000)).toBe('$1.50B');
      expect(AriesHelpers.formatCurrency(150)).toBe('$150.00');
    });
  });

  describe('formatPercent', () => {
    it('should format percentages correctly', () => {
      expect(AriesHelpers.formatPercent(5.25)).toBe('5.25%');
      expect(AriesHelpers.formatPercent(5.25, 1)).toBe('5.3%');
      expect(AriesHelpers.formatPercent(0)).toBe('0.00%');
    });
  });

  describe('extractRiskParams', () => {
    it('should extract risk parameters from reserve', () => {
      const mockReserve = {
        reserveConfig: {
          loanToValue: 7500,
          liquidationThreshold: 8000,
          liquidationBonusBips: 500,
          liquidationFeeHundredthBips: 50,
          borrowFactor: 10000,
        },
      };

      const riskParams = AriesHelpers.extractRiskParams(mockReserve as any);

      expect(riskParams.maxLTV).toBe(75);
      expect(riskParams.liquidationThreshold).toBe(80);
      expect(riskParams.liquidationPenalty).toBe(5);
      expect(riskParams.liquidationFee).toBe(0.5);
      expect(riskParams.borrowFactor).toBe(100);
    });
  });

  describe('calculateNetAPR', () => {
    it('should calculate net APR correctly', () => {
      const supplies = [
        { amountSuppliedUSD: 1000, currentAPR: 5 },
        { amountSuppliedUSD: 2000, currentAPR: 8 },
      ];

      const borrows = [
        { amountBorrowedUSD: 500, currentAPR: 12 },
      ];

      const netAPR = AriesHelpers.calculateNetAPR(supplies as any, borrows as any);

      // Expected: (1000*5 + 2000*8 - 500*12) / (1000 + 2000 - 500)
      // = (5000 + 16000 - 6000) / 2500 = 15000 / 2500 = 6
      expect(netAPR).toBeCloseTo(6, 1);
    });

    it('should handle empty positions', () => {
      expect(AriesHelpers.calculateNetAPR([], [])).toBe(0);
    });
  });

  describe('calculateBorrowingPower', () => {
    it('should calculate borrowing power correctly', () => {
      const totalSupplied = 10000;
      const totalBorrowed = 3000;
      const weightedLTV = 0.75;

      const borrowingPower = AriesHelpers.calculateBorrowingPower(
        totalSupplied,
        totalBorrowed,
        weightedLTV
      );

      // Expected: 10000 * 0.75 - 3000 = 4500
      expect(borrowingPower).toBe(4500);
    });

    it('should return 0 for negative borrowing power', () => {
      const totalSupplied = 1000;
      const totalBorrowed = 900;
      const weightedLTV = 0.75;

      const borrowingPower = AriesHelpers.calculateBorrowingPower(
        totalSupplied,
        totalBorrowed,
        weightedLTV
      );

      // Expected: 1000 * 0.75 - 900 = -150, but should return 0
      expect(borrowingPower).toBe(0);
    });
  });

  describe('calculateMaxSafeWithdrawal', () => {
    it('should calculate max safe withdrawal correctly', () => {
      const totalCollateral = 10000;
      const totalBorrowed = 5000;
      const liquidationThreshold = 0.8;
      const targetHealthFactor = 1.5;

      const maxWithdrawal = AriesHelpers.calculateMaxSafeWithdrawal(
        totalCollateral,
        totalBorrowed,
        liquidationThreshold,
        targetHealthFactor
      );

      // Expected: 10000 - (5000 * 1.5 / 0.8) = 10000 - 9375 = 625
      expect(maxWithdrawal).toBeCloseTo(625, 0);
    });

    it('should return full collateral when no debt', () => {
      const maxWithdrawal = AriesHelpers.calculateMaxSafeWithdrawal(
        10000,
        0,
        0.8,
        1.5
      );

      expect(maxWithdrawal).toBe(10000);
    });
  });

  describe('simulateWithdrawalHealthFactor', () => {
    it('should simulate health factor after withdrawal', () => {
      const currentCollateral = 10000;
      const withdrawAmount = 2000;
      const totalBorrowed = 5000;
      const liquidationThreshold = 0.8;

      const newHF = AriesHelpers.simulateWithdrawalHealthFactor(
        currentCollateral,
        withdrawAmount,
        totalBorrowed,
        liquidationThreshold
      );

      // Expected: (10000 - 2000) * 0.8 / 5000 = 6400 / 5000 = 1.28
      expect(newHF).toBeCloseTo(1.28, 2);
    });

    it('should return Infinity when no debt', () => {
      const newHF = AriesHelpers.simulateWithdrawalHealthFactor(
        10000,
        2000,
        0,
        0.8
      );

      expect(newHF).toBe(Infinity);
    });
  });

  describe('checkPoolLimits', () => {
    it('should check pool limits correctly', () => {
      const mockReserve = {
        totalLpSupply: '8000000000', // 80 tokens with 8 decimals
        totalBorrowed: '6000000000', // 60 tokens with 8 decimals
        reserveConfig: {
          depositLimit: '10000000000', // 100 tokens limit
          borrowLimit: '8000000000', // 80 tokens limit
        },
        decimals: 8,
      };

      const limits = AriesHelpers.checkPoolLimits(mockReserve as any);

      expect(limits.supplyUtilization).toBe(80); // 80/100 * 100
      expect(limits.borrowUtilization).toBe(75); // 60/80 * 100
      expect(limits.nearSupplyLimit).toBe(false); // 80% < 90%
      expect(limits.nearBorrowLimit).toBe(false); // 75% < 90%
    });

    it('should detect near limits', () => {
      const mockReserve = {
        totalLpSupply: '9500000000', // 95 tokens
        totalBorrowed: '7500000000', // 75 tokens
        reserveConfig: {
          depositLimit: '10000000000', // 100 tokens limit
          borrowLimit: '8000000000', // 80 tokens limit
        },
        decimals: 8,
      };

      const limits = AriesHelpers.checkPoolLimits(mockReserve as any);

      expect(limits.nearSupplyLimit).toBe(true); // 95% > 90%
      expect(limits.nearBorrowLimit).toBe(true); // 93.75% > 90%
    });
  });
});
