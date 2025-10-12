import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  aptosClient, 
  subscribeToContractEvents, 
  MERKLE_CONTRACT_ADDRESS,
  formatAmount,
  formatPrice 
} from '../utils/aptosClient';
import { useWallet } from '../app/providers/WalletProvider';

// Event types from Merkle contract
export interface TradeEvent {
  id: string;
  type: 'position_opened' | 'position_closed' | 'order_filled' | 'liquidation' | 'funding_payment';
  market: number;
  marketSymbol: string;
  user: string;
  size: number;
  price: number;
  side: 'long' | 'short';
  timestamp: number;
  txHash: string;
  blockHeight: number;
}

export interface OrderEvent {
  id: string;
  type: 'order_placed' | 'order_cancelled' | 'order_filled';
  market: number;
  marketSymbol: string;
  user: string;
  orderId: string;
  size: number;
  price: number;
  side: 'long' | 'short';
  orderType: 'market' | 'limit';
  timestamp: number;
  txHash: string;
}

export interface LiquidationEvent {
  id: string;
  type: 'liquidation';
  market: number;
  marketSymbol: string;
  user: string;
  liquidator: string;
  size: number;
  price: number;
  collateralSeized: number;
  timestamp: number;
  txHash: string;
}

export interface FundingEvent {
  id: string;
  type: 'funding_payment';
  market: number;
  marketSymbol: string;
  user: string;
  amount: number;
  rate: number;
  timestamp: number;
  txHash: string;
}

export type MerkleEvent = TradeEvent | OrderEvent | LiquidationEvent | FundingEvent;

// Market symbols mapping
const MARKET_SYMBOLS: Record<number, string> = {
  0: 'BTC/USD',
  1: 'ETH/USD', 
  2: 'APT/USD',
  3: 'SOL/USD',
  4: 'DOGE/USD',
};

// Event subscription configuration
interface EventSubscription {
  eventType: string;
  filter?: {
    user?: string;
    market?: number;
  };
}

export const useMerkleEvents = () => {
  const { account, connected } = useWallet();
  const [events, setEvents] = useState<MerkleEvent[]>([]);
  const [userEvents, setUserEvents] = useState<MerkleEvent[]>([]);
  const [latestEvent, setLatestEvent] = useState<MerkleEvent | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  
  // Keep track of subscription cleanup
  const subscriptionRef = useRef<(() => void) | null>(null);
  const eventCacheRef = useRef<Set<string>>(new Set());

  // Process raw event data from contract
  const processEvent = useCallback((rawEvent: any): MerkleEvent | null => {
    try {
      const eventType = rawEvent.type;
      const data = rawEvent.data;
      const marketSymbol = MARKET_SYMBOLS[data.market] || `Market ${data.market}`;
      
      const baseEvent = {
        id: `${rawEvent.transaction_hash}-${rawEvent.event_index}`,
        market: data.market,
        marketSymbol,
        user: data.user,
        timestamp: rawEvent.transaction_timestamp ? parseInt(rawEvent.transaction_timestamp) : Date.now(),
        txHash: rawEvent.transaction_hash,
      };

      // Skip if we've already processed this event
      if (eventCacheRef.current.has(baseEvent.id)) {
        return null;
      }
      eventCacheRef.current.add(baseEvent.id);

      switch (eventType) {
        case 'PositionOpened':
        case 'PositionClosed':
          return {
            ...baseEvent,
            type: eventType === 'PositionOpened' ? 'position_opened' : 'position_closed',
            size: formatAmount(data.size),
            price: formatPrice(data.price),
            side: data.is_long ? 'long' : 'short',
            blockHeight: rawEvent.transaction_version,
          } as TradeEvent;

        case 'OrderPlaced':
        case 'OrderCancelled': 
        case 'OrderFilled':
          return {
            ...baseEvent,
            type: eventType.toLowerCase().replace('order', 'order_') as OrderEvent['type'],
            orderId: data.order_id,
            size: formatAmount(data.size),
            price: formatPrice(data.price),
            side: data.is_long ? 'long' : 'short',
            orderType: data.order_type === 0 ? 'market' : 'limit',
          } as OrderEvent;

        case 'Liquidation':
          return {
            ...baseEvent,
            type: 'liquidation',
            liquidator: data.liquidator,
            size: formatAmount(data.size),
            price: formatPrice(data.price),
            collateralSeized: formatAmount(data.collateral_seized),
          } as LiquidationEvent;

        case 'FundingPayment':
          return {
            ...baseEvent,
            type: 'funding_payment',
            amount: formatAmount(data.amount),
            rate: formatAmount(data.rate),
          } as FundingEvent;

        default:
          // console.warn('Unknown event type:', eventType);
          return null;
      }
    } catch (err) {
      // console.error('Error processing event:', err);
      return null;
    }
  }, []);

  // Handle new events from subscription
  const handleNewEvent = useCallback((rawEvent: any) => {
    const processedEvent = processEvent(rawEvent);
    if (!processedEvent) return;

    setEvents(prev => {
      // Add to beginning and limit to last 100 events
      const updated = [processedEvent, ...prev].slice(0, 100);
      return updated;
    });

    // Update user-specific events if this event belongs to connected user
    if (account?.address && processedEvent.user === account.address) {
      setUserEvents(prev => {
        const updated = [processedEvent, ...prev].slice(0, 50);
        return updated;
      });
    }

    // Update latest event
    setLatestEvent(processedEvent);
  }, [processEvent, account?.address]);

  // Subscribe to contract events
  const subscribeToEvents = useCallback(async () => {
    if (!connected || isSubscribed) return;

    try {
      setLoading(true);
      setError(null);

      // Define event subscriptions
      const subscriptions: EventSubscription[] = [
        { eventType: 'PositionOpened' },
        { eventType: 'PositionClosed' },
        { eventType: 'OrderPlaced' },
        { eventType: 'OrderCancelled' },
        { eventType: 'OrderFilled' },
        { eventType: 'Liquidation' },
        { eventType: 'FundingPayment' },
      ];

      // Subscribe to events
      const cleanup = await subscribeToContractEvents(
        MERKLE_CONTRACT_ADDRESS,
        subscriptions.map(sub => sub.eventType),
        handleNewEvent
      );

      subscriptionRef.current = cleanup;
      setIsSubscribed(true);
    } catch (err) {
      // console.error('Error subscribing to events:', err);
      setError(err instanceof Error ? err.message : 'Failed to subscribe to events');
    } finally {
      setLoading(false);
    }
  }, [connected, isSubscribed, handleNewEvent]);

  // Unsubscribe from events
  const unsubscribeFromEvents = useCallback(() => {
    if (subscriptionRef.current) {
      subscriptionRef.current();
      subscriptionRef.current = null;
    }
    setIsSubscribed(false);
  }, []);

  // Fetch historical events for user
  const fetchUserHistory = useCallback(async (limit: number = 50) => {
    if (!account?.address || !connected) return;

    try {
      setLoading(true);
      
      // This would fetch historical events from the contract
      // For now, we'll use the subscription data
      const userSpecificEvents = events.filter(event => event.user === account.address);
      setUserEvents(userSpecificEvents.slice(0, limit));
    } catch (err) {
      // console.error('Error fetching user history:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch user history');
    } finally {
      setLoading(false);
    }
  }, [account?.address, connected, events]);

  // Get events by type
  const getEventsByType = useCallback((eventType: MerkleEvent['type']) => {
    return events.filter(event => event.type === eventType);
  }, [events]);

  // Get user events by type
  const getUserEventsByType = useCallback((eventType: MerkleEvent['type']) => {
    return userEvents.filter(event => event.type === eventType);
  }, [userEvents]);

  // Get events for specific market
  const getEventsByMarket = useCallback((market: number) => {
    return events.filter(event => event.market === market);
  }, [events]);

  // Clear events
  const clearEvents = useCallback(() => {
    setEvents([]);
    setUserEvents([]);
    setLatestEvent(null);
    eventCacheRef.current.clear();
  }, []);

  // Auto-subscribe when wallet connects
  useEffect(() => {
    if (connected && account?.address) {
      subscribeToEvents();
    } else {
      unsubscribeFromEvents();
      clearEvents();
    }

    // Cleanup on unmount
    return () => {
      unsubscribeFromEvents();
    };
  }, [connected, account?.address]); // Remove function dependencies to prevent loops

  // Fetch user history when account changes
  useEffect(() => {
    if (connected && account?.address && events.length > 0) {
      fetchUserHistory();
    }
  }, [connected, account?.address, events.length]); // Remove fetchUserHistory to prevent loops

  return {
    // Event data
    events,
    userEvents,
    latestEvent,
    
    // Subscription state
    isSubscribed,
    loading,
    error,
    
    // Actions
    subscribeToEvents,
    unsubscribeFromEvents,
    fetchUserHistory,
    clearEvents,
    
    // Filters
    getEventsByType,
    getUserEventsByType,
    getEventsByMarket,
    
    // Computed values
    totalEvents: events.length,
    userEventCount: userEvents.length,
    
    // Event type counts
    tradeCount: events.filter(e => e.type.includes('position')).length,
    orderCount: events.filter(e => e.type.includes('order')).length,
    liquidationCount: events.filter(e => e.type === 'liquidation').length,
    
    // Utilities
    clearError: () => setError(null),
  };
};
