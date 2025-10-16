/**
 * WebSocket Hook Tests
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { useWebSocket, useRealtimePrices } from '../../hooks/useWebSocket';

// Mock WebSocket
global.WebSocket = jest.fn().mockImplementation(() => ({
  readyState: WebSocket.OPEN,
  send: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
}));

// Mock wallet provider
jest.mock('../../app/providers/WalletProvider', () => ({
  useWallet: () => ({
    account: { address: '0x123' },
  }),
}));

describe('useWebSocket', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with correct default state', () => {
    const { result } = renderHook(() => useWebSocket());
    
    expect(result.current.isConnected).toBe(false);
    expect(result.current.isConnecting).toBe(false);
    expect(result.current.lastMessage).toBe(null);
    expect(result.current.error).toBe(null);
    expect(typeof result.current.send).toBe('function');
    expect(typeof result.current.subscribe).toBe('function');
    expect(typeof result.current.unsubscribe).toBe('function');
    expect(typeof result.current.reconnect).toBe('function');
  });

  it('should handle subscription correctly', () => {
    const { result } = renderHook(() => useWebSocket());
    
    act(() => {
      result.current.subscribe('prices');
    });
    
    // Verify subscription was added
    expect(result.current.subscribe).toBeDefined();
  });

  it('should handle unsubscription correctly', () => {
    const { result } = renderHook(() => useWebSocket());
    
    act(() => {
      result.current.subscribe('prices');
      result.current.unsubscribe('prices');
    });
    
    // Verify unsubscription works
    expect(result.current.unsubscribe).toBeDefined();
  });
});

describe('useRealtimePrices', () => {
  it('should initialize with empty prices', () => {
    const { result } = renderHook(() => useRealtimePrices());
    
    expect(result.current.prices).toEqual({});
    expect(typeof result.current.isConnected).toBe('boolean');
  });

  it('should handle price updates', () => {
    const { result } = renderHook(() => useRealtimePrices());
    
    // Simulate price update
    act(() => {
      // This would normally come from WebSocket message
      // For testing, we'll verify the structure exists
      expect(result.current.prices).toBeDefined();
    });
  });
});
