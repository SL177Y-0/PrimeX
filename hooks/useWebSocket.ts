/**
 * WebSocket Hook for Real-Time Updates
 * 
 * Provides real-time connection to PrimeX WebSocket server
 * Handles reconnection, authentication, and subscription management
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useWallet } from '../app/providers/WalletProvider';

interface WebSocketMessage {
  type: string;
  data?: any;
  error?: string;
  timestamp: number;
}

interface WebSocketConfig {
  url: string;
  reconnectInterval: number;
  maxReconnectAttempts: number;
  heartbeatInterval: number;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  isConnecting: boolean;
  lastMessage: WebSocketMessage | null;
  error: string | null;
  send: (message: any) => void;
  subscribe: (channel: string) => void;
  unsubscribe: (channel: string) => void;
  reconnect: () => void;
}

const DEFAULT_CONFIG: WebSocketConfig = {
  url: process.env.EXPO_PUBLIC_WS_URL || 'ws://localhost:8080',
  reconnectInterval: 3000,
  maxReconnectAttempts: 5,
  heartbeatInterval: 30000,
};

export function useWebSocket(config: Partial<WebSocketConfig> = {}): UseWebSocketReturn {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  const { account } = useWallet();
  
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const subscriptionsRef = useRef<Set<string>>(new Set());

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const ws = new WebSocket(fullConfig.url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('🔗 WebSocket connected');
        setIsConnected(true);
        setIsConnecting(false);
        setError(null);
        reconnectAttemptsRef.current = 0;

        // Authenticate if user is connected
        if (account?.address) {
          ws.send(JSON.stringify({
            type: 'auth',
            userId: account.address
          }));
        }

        // Re-subscribe to previous channels
        subscriptionsRef.current.forEach(channel => {
          ws.send(JSON.stringify({
            type: 'subscribe',
            channel
          }));
        });

        // Start heartbeat
        startHeartbeat();
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          setLastMessage(message);

          // Handle specific message types
          switch (message.type) {
            case 'error':
              setError(message.error || 'Unknown error');
              break;
            case 'welcome':
              console.log('👋 WebSocket welcome received');
              break;
            case 'auth_success':
              console.log('🔐 WebSocket authentication successful');
              break;
            case 'pong':
              // Reset heartbeat timer
              startHeartbeat();
              break;
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      ws.onclose = (event) => {
        console.log('🔌 WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);
        setIsConnecting(false);
        stopHeartbeat();

        // Attempt reconnection if not manually closed
        if (event.code !== 1000 && reconnectAttemptsRef.current < fullConfig.maxReconnectAttempts) {
          scheduleReconnect();
        }
      };

      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        setError('Connection error');
        setIsConnecting(false);
      };

    } catch (err) {
      console.error('Failed to create WebSocket connection:', err);
      setError('Failed to connect');
      setIsConnecting(false);
    }
  }, [fullConfig.url, account?.address]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    stopHeartbeat();

    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect');
      wsRef.current = null;
    }

    setIsConnected(false);
    setIsConnecting(false);
  }, []);

  const scheduleReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    reconnectAttemptsRef.current += 1;
    const delay = fullConfig.reconnectInterval * Math.pow(2, reconnectAttemptsRef.current - 1);

    console.log(`🔄 Scheduling reconnect attempt ${reconnectAttemptsRef.current} in ${delay}ms`);

    reconnectTimeoutRef.current = setTimeout(() => {
      connect();
    }, delay);
  }, [connect, fullConfig.reconnectInterval]);

  const startHeartbeat = useCallback(() => {
    stopHeartbeat();
    
    heartbeatTimeoutRef.current = setTimeout(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, fullConfig.heartbeatInterval);
  }, [fullConfig.heartbeatInterval]);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
      heartbeatTimeoutRef.current = null;
    }
  }, []);

  const send = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, message not sent:', message);
    }
  }, []);

  const subscribe = useCallback((channel: string) => {
    subscriptionsRef.current.add(channel);
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      send({ type: 'subscribe', channel });
    }
  }, [send]);

  const unsubscribe = useCallback((channel: string) => {
    subscriptionsRef.current.delete(channel);
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      send({ type: 'unsubscribe', channel });
    }
  }, [send]);

  const reconnect = useCallback(() => {
    disconnect();
    reconnectAttemptsRef.current = 0;
    setTimeout(connect, 1000);
  }, [disconnect, connect]);

  // Auto-connect on mount
  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Re-authenticate when account changes
  useEffect(() => {
    if (isConnected && account?.address) {
      send({
        type: 'auth',
        userId: account.address
      });
    }
  }, [isConnected, account?.address, send]);

  return {
    isConnected,
    isConnecting,
    lastMessage,
    error,
    send,
    subscribe,
    unsubscribe,
    reconnect,
  };
}

// Specialized hooks for specific data types

export function useRealtimePrices() {
  const { lastMessage, subscribe, unsubscribe, isConnected } = useWebSocket();
  const [prices, setPrices] = useState<Record<string, any>>({});

  useEffect(() => {
    if (isConnected) {
      subscribe('prices');
      return () => unsubscribe('prices');
    }
  }, [isConnected, subscribe, unsubscribe]);

  useEffect(() => {
    if (lastMessage?.type === 'price_update') {
      const priceData = lastMessage.data;
      setPrices(prev => ({
        ...prev,
        [priceData.symbol]: priceData
      }));
    } else if (lastMessage?.type === 'prices_update') {
      const pricesData = lastMessage.data;
      const pricesMap = pricesData.reduce((acc: any, price: any) => {
        acc[price.symbol] = price;
        return acc;
      }, {});
      setPrices(pricesMap);
    } else if (lastMessage?.type === 'prices_snapshot') {
      const pricesData = lastMessage.data;
      const pricesMap = pricesData.reduce((acc: any, price: any) => {
        acc[price.symbol] = price;
        return acc;
      }, {});
      setPrices(pricesMap);
    }
  }, [lastMessage]);

  return { prices, isConnected };
}

export function useRealtimePortfolio(userAddress?: string) {
  const { lastMessage, subscribe, unsubscribe, isConnected } = useWebSocket();
  const [portfolio, setPortfolio] = useState<any[]>([]);

  useEffect(() => {
    if (isConnected && userAddress) {
      subscribe('portfolio');
      return () => unsubscribe('portfolio');
    }
  }, [isConnected, userAddress, subscribe, unsubscribe]);

  useEffect(() => {
    if (lastMessage?.type === 'position_update') {
      const positionData = lastMessage.data;
      setPortfolio(prev => {
        const index = prev.findIndex(p => p.positionId === positionData.positionId);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = { ...updated[index], ...positionData };
          return updated;
        } else {
          return [...prev, positionData];
        }
      });
    } else if (lastMessage?.type === 'portfolio_snapshot') {
      setPortfolio(lastMessage.data);
    }
  }, [lastMessage]);

  return { portfolio, isConnected };
}

export function useRealtimeAPR() {
  const { lastMessage, subscribe, unsubscribe, isConnected } = useWebSocket();
  const [aprRates, setAPRRates] = useState<Record<string, any>>({});

  useEffect(() => {
    if (isConnected) {
      subscribe('apr_rates');
      return () => unsubscribe('apr_rates');
    }
  }, [isConnected, subscribe, unsubscribe]);

  useEffect(() => {
    if (lastMessage?.type === 'apr_update') {
      const aprData = lastMessage.data;
      setAPRRates(prev => ({
        ...prev,
        [aprData.symbol]: aprData
      }));
    } else if (lastMessage?.type === 'apr_snapshot') {
      const aprData = lastMessage.data;
      const aprMap = aprData.reduce((acc: any, rate: any) => {
        acc[rate.symbol] = rate;
        return acc;
      }, {});
      setAPRRates(aprMap);
    }
  }, [lastMessage]);

  return { aprRates, isConnected };
}
