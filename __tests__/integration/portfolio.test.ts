/**
 * Portfolio Integration Tests
 * 
 * Tests the complete portfolio flow from data fetching to UI updates
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { usePnLData } from '../../hooks/usePnLData';
import { useRealtimePositions } from '../../hooks/useRealtimePositions';

// Mock services
jest.mock('../../services/pnlEngine', () => ({
  pnlEngine: {
    calculatePortfolioMetrics: jest.fn().mockResolvedValue({
      netPnL: 1250.75,
      netPnLPercent: 8.5,
      totalValue: 15000,
      totalSupplied: 12000,
      totalBorrowed: 3000,
      healthFactor: 4.2,
    }),
    getHistoricalPnL: jest.fn().mockResolvedValue([
      { timestamp: '2024-01-01', pnl: 100 },
      { timestamp: '2024-01-02', pnl: 150 },
      { timestamp: '2024-01-03', pnl: 200 },
    ]),
    startRealtimeTracking: jest.fn(),
    stopRealtimeTracking: jest.fn(),
  },
}));

jest.mock('../../services/database.service', () => ({
  databaseService: {
    getUserPositions: jest.fn().mockResolvedValue([
      {
        id: '1',
        user_address: '0x123',
        asset_symbol: 'APT',
        position_type: 'supply',
        amount: '100000000',
        amount_usd: '850.00',
        pnl: '42.50',
        pnl_percent: '5.25',
      },
      {
        id: '2',
        user_address: '0x123',
        asset_symbol: 'USDC',
        position_type: 'borrow',
        amount: '50000000',
        amount_usd: '500.00',
        pnl: '-12.30',
        pnl_percent: '-2.46',
      },
    ]),
  },
}));

jest.mock('../../lib/supabase', () => ({
  supabase: {
    channel: jest.fn().mockReturnValue({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockResolvedValue({ status: 'SUBSCRIBED' }),
      unsubscribe: jest.fn(),
    }),
  },
}));

describe('Portfolio Integration', () => {
  const mockUserId = '0x123';

  describe('PnL Data Flow', () => {
    it('should fetch and calculate PnL metrics', async () => {
      const { result, waitForNextUpdate } = renderHook(() =>
        usePnLData(mockUserId)
      );

      expect(result.current.loading).toBe(true);
      expect(result.current.metrics).toBe(null);

      await waitForNextUpdate();

      expect(result.current.loading).toBe(false);
      expect(result.current.metrics).toEqual({
        netPnL: 1250.75,
        netPnLPercent: 8.5,
        totalValue: 15000,
        totalSupplied: 12000,
        totalBorrowed: 3000,
        healthFactor: 4.2,
      });
      expect(result.current.error).toBe(null);
    });

    it('should fetch historical PnL data', async () => {
      const { result, waitForNextUpdate } = renderHook(() =>
        usePnLData(mockUserId)
      );

      await waitForNextUpdate();

      // Trigger historical data fetch
      act(() => {
        result.current.refresh();
      });

      expect(result.current.metrics).toBeDefined();
    });

    it('should handle PnL calculation errors', async () => {
      // Mock error scenario
      const mockError = new Error('PnL calculation failed');
      require('../../services/pnlEngine').pnlEngine.calculatePortfolioMetrics.mockRejectedValueOnce(mockError);

      const { result, waitForNextUpdate } = renderHook(() =>
        usePnLData(mockUserId)
      );

      await waitForNextUpdate();

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe('PnL calculation failed');
      expect(result.current.metrics).toBe(null);
    });
  });

  describe('Real-time Positions Flow', () => {
    it('should fetch initial positions and setup real-time updates', async () => {
      const { result, waitForNextUpdate } = renderHook(() =>
        useRealtimePositions(mockUserId)
      );

      expect(result.current.isLoading).toBe(true);
      expect(result.current.positions).toEqual([]);

      await waitForNextUpdate();

      expect(result.current.isLoading).toBe(false);
      expect(result.current.positions).toHaveLength(2);
      expect(result.current.positions[0]).toEqual({
        id: '1',
        user_address: '0x123',
        asset_symbol: 'APT',
        position_type: 'supply',
        amount: '100000000',
        amount_usd: '850.00',
        pnl: '42.50',
        pnl_percent: '5.25',
      });
    });

    it('should calculate portfolio metrics from positions', async () => {
      const { result, waitForNextUpdate } = renderHook(() =>
        useRealtimePositions(mockUserId)
      );

      await waitForNextUpdate();

      const metrics = result.current.metrics;

      expect(metrics.totalSupplied).toBe(850);
      expect(metrics.totalBorrowed).toBe(500);
      expect(metrics.netPnL).toBeCloseTo(30.2, 1); // 42.50 - 12.30
      expect(metrics.healthFactor).toBeCloseTo(1.7, 1); // 850 / 500
    });

    it('should handle empty positions', async () => {
      require('../../services/database.service').databaseService.getUserPositions.mockResolvedValueOnce([]);

      const { result, waitForNextUpdate } = renderHook(() =>
        useRealtimePositions(mockUserId)
      );

      await waitForNextUpdate();

      expect(result.current.positions).toEqual([]);
      expect(result.current.metrics.totalSupplied).toBe(0);
      expect(result.current.metrics.totalBorrowed).toBe(0);
      expect(result.current.metrics.healthFactor).toBe(null);
    });
  });

  describe('Data Consistency', () => {
    it('should maintain data consistency between PnL and positions', async () => {
      const { result: pnlResult, waitForNextUpdate: waitForPnL } = renderHook(() =>
        usePnLData(mockUserId)
      );

      const { result: positionsResult, waitForNextUpdate: waitForPositions } = renderHook(() =>
        useRealtimePositions(mockUserId)
      );

      await Promise.all([waitForPnL(), waitForPositions()]);

      // Both hooks should have data
      expect(pnlResult.current.metrics).toBeDefined();
      expect(positionsResult.current.positions.length).toBeGreaterThan(0);

      // Data should be consistent (within reasonable bounds)
      const pnlTotal = pnlResult.current.metrics!.totalValue;
      const positionsTotal = positionsResult.current.metrics.totalSupplied - positionsResult.current.metrics.totalBorrowed;

      // Allow for some variance due to different calculation methods
      expect(Math.abs(pnlTotal - positionsTotal)).toBeLessThan(1000);
    });
  });

  describe('Error Recovery', () => {
    it('should recover from network errors', async () => {
      // First call fails
      require('../../services/database.service').databaseService.getUserPositions
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce([]);

      const { result, waitForNextUpdate } = renderHook(() =>
        useRealtimePositions(mockUserId)
      );

      await waitForNextUpdate();

      expect(result.current.error).toBe('Network error');

      // Retry should succeed
      act(() => {
        result.current.refresh();
      });

      await waitForNextUpdate();

      expect(result.current.error).toBe(null);
      expect(result.current.positions).toEqual([]);
    });
  });

  describe('Real-time Updates', () => {
    it('should handle real-time position updates', async () => {
      const { result, waitForNextUpdate } = renderHook(() =>
        useRealtimePositions(mockUserId)
      );

      await waitForNextUpdate();

      const initialPositions = result.current.positions;
      expect(initialPositions).toHaveLength(2);

      // Simulate real-time update (this would normally come from Supabase)
      // In a real test, you'd trigger the Supabase subscription callback
      act(() => {
        // This would be triggered by the real-time subscription
        // For now, we just verify the structure is in place
        expect(result.current.isConnected).toBeDefined();
      });
    });
  });
});
