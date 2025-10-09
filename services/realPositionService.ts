/**
 * Real Position Service - Connects to Merkle Trade Indexer
 * Fetches real position data from blockchain events
 */

import { aptosClient } from '../utils/aptosClient';
import { MERKLE_CONFIG } from '../config/constants';
import { Position, TradeHistoryItem, normalizePosition, normalizeHistory } from '../types/merkle';
import { log } from '../utils/logger';

export interface PositionEvent {
  sequence_number: string;
  creation_number: string;
  account_address: string;
  type: string;
  data: {
    user: string;
    pair_id: string;
    position_id: string;
    event_type: number; // 0=open, 1=increase, 2=close, 3=liquidation
    size_delta: string;
    collateral_delta: string;
    price: string;
    pnl?: string;
    fee?: string;
    timestamp: string;
  };
}

export interface OrderEvent {
  sequence_number: string;
  creation_number: string;
  account_address: string;
  type: string;
  data: {
    user: string;
    order_id: string;
    pair_id: string;
    side: boolean; // true = long, false = short
    size_delta: string;
    collateral_delta: string;
    price: string;
    is_increase: boolean;
    is_market: boolean;
    timestamp: string;
  };
}

class RealPositionService {
  private positions: Map<string, Position> = new Map();
  private activities: TradeHistoryItem[] = [];
  private subscribers: Set<(positions: Position[], activities: TradeHistoryItem[]) => void> = new Set();
  private isInitialized = false;

  /**
   * Initialize the service and fetch initial data
   */
  async initialize(userAddress: string): Promise<void> {
    if (this.isInitialized) return;

    try {
      log.info('Initializing Real Position Service for user:', userAddress);
      
      // Fetch historical events to build current state
      await this.fetchHistoricalEvents(userAddress);
      
      this.isInitialized = true;
      log.info('Real Position Service initialized successfully');
    } catch (error) {
      log.error('Failed to initialize Real Position Service:', error);
      throw error;
    }
  }

  /**
   * Fetch historical events to reconstruct position state
   */
  private async fetchHistoricalEvents(userAddress: string): Promise<void> {
    try {
      // Fetch PositionEvent events
      const positionEvents = await this.fetchPositionEvents(userAddress);
      
      // Fetch OrderEvent events  
      const orderEvents = await this.fetchOrderEvents(userAddress);

      // Process events chronologically
      const allEvents = [...positionEvents, ...orderEvents].sort(
        (a, b) => parseInt(a.sequence_number) - parseInt(b.sequence_number)
      );

      // Rebuild state from events
      for (const event of allEvents) {
        this.processEvent(event);
      }

      this.notifySubscribers();
    } catch (error) {
      log.error('Failed to fetch historical events:', error);
      throw error;
    }
  }

  /**
   * Fetch PositionEvent events from Aptos
   */
  private async fetchPositionEvents(userAddress: string): Promise<PositionEvent[]> {
    try {
      // Use getAccountEventsByEventType for newer Aptos SDK
      const events = await aptosClient.getAccountEventsByEventType({
        accountAddress: MERKLE_CONFIG.contractAddress,
        eventType: `${MERKLE_CONFIG.contractAddress}::trading::PositionEvent`,
        options: {
          limit: 1000,
          offset: 0,
        }
      });

      // Filter events for this user
      return events
        .filter((event: any) => event.data.user === userAddress)
        .map((event: any) => ({
          sequence_number: event.sequence_number,
          creation_number: event.guid.creation_number,
          account_address: event.guid.account_address,
          type: event.type,
          data: event.data,
        }));
    } catch (error) {
      log.error('Failed to fetch position events:', error);
      return [];
    }
  }

  /**
   * Fetch OrderEvent events from Aptos
   */
  private async fetchOrderEvents(userAddress: string): Promise<OrderEvent[]> {
    try {
      // Use getAccountEventsByEventType for newer Aptos SDK
      const events = await aptosClient.getAccountEventsByEventType({
        accountAddress: MERKLE_CONFIG.contractAddress,
        eventType: `${MERKLE_CONFIG.contractAddress}::trading::OrderEvent`,
        options: {
          limit: 1000,
          offset: 0,
        }
      });

      // Filter events for this user
      return events
        .filter((event: any) => event.data.user === userAddress)
        .map((event: any) => ({
          sequence_number: event.sequence_number,
          creation_number: event.guid.creation_number,
          account_address: event.guid.account_address,
          type: event.type,
          data: event.data,
        }));
    } catch (error) {
      log.error('Failed to fetch order events:', error);
      return [];
    }
  }

  /**
   * Process a single event and update state
   */
  private processEvent(event: PositionEvent | OrderEvent): void {
    try {
      if (event.type.includes('PositionEvent')) {
        this.processPositionEvent(event as PositionEvent);
      } else if (event.type.includes('OrderEvent')) {
        this.processOrderEvent(event as OrderEvent);
      }
    } catch (error) {
      log.error('Failed to process event:', error);
    }
  }

  /**
   * Process PositionEvent
   */
  private processPositionEvent(event: PositionEvent): void {
    const { data } = event;
    const positionId = data.position_id;

    // Convert microunits to regular units
    const sizeUSDC = parseInt(data.size_delta) / 1e6;
    const collateralUSDC = parseInt(data.collateral_delta) / 1e6;
    const price = parseInt(data.price) / 1e6;
    const pnlUSDC = data.pnl ? parseInt(data.pnl) / 1e6 : 0;

    switch (data.event_type) {
      case 0: // Position opened
        const newPosition: Position = {
          id: positionId,
          pair: data.pair_id,
          side: 'long', // Determine from order data
          sizeUSDC,
          collateralUSDC,
          leverage: sizeUSDC / collateralUSDC,
          entryPrice: price,
          markPrice: price,
          pnlUSDC: 0,
          pnlPercent: 0,
          timestamp: parseInt(data.timestamp),
          status: 'OPEN',
        };
        this.positions.set(positionId, newPosition);
        break;

      case 1: // Position increased
        const existingPos = this.positions.get(positionId);
        if (existingPos) {
          existingPos.sizeUSDC += sizeUSDC;
          existingPos.collateralUSDC += collateralUSDC;
          existingPos.leverage = existingPos.sizeUSDC / existingPos.collateralUSDC;
        }
        break;

      case 2: // Position closed/decreased
        const closingPos = this.positions.get(positionId);
        if (closingPos) {
          if (sizeUSDC >= closingPos.sizeUSDC) {
            // Full close
            closingPos.status = 'CLOSED';
            closingPos.pnlUSDC = pnlUSDC;
            closingPos.pnlPercent = (pnlUSDC / closingPos.collateralUSDC) * 100;
          } else {
            // Partial close
            closingPos.sizeUSDC -= sizeUSDC;
            closingPos.collateralUSDC -= collateralUSDC;
            closingPos.leverage = closingPos.sizeUSDC / closingPos.collateralUSDC;
          }
        }
        break;

      case 3: // Position liquidated
        const liquidatedPos = this.positions.get(positionId);
        if (liquidatedPos) {
          liquidatedPos.status = 'LIQUIDATED';
          liquidatedPos.pnlUSDC = pnlUSDC;
          liquidatedPos.pnlPercent = (pnlUSDC / liquidatedPos.collateralUSDC) * 100;
        }
        break;
    }

    // Add to activity history
    const activity: TradeHistoryItem = {
      id: `${event.sequence_number}-${positionId}`,
      action: this.getActionFromEventType(data.event_type),
      pair: data.pair_id,
      sizeUSDC,
      price,
      pnlUSDC,
      timestamp: parseInt(data.timestamp),
    };
    this.activities.push(activity);
  }

  /**
   * Process OrderEvent
   */
  private processOrderEvent(event: OrderEvent): void {
    const { data } = event;
    
    const activity: TradeHistoryItem = {
      id: `${event.sequence_number}-${data.order_id}`,
      action: 'order_placed',
      pair: data.pair_id,
      side: data.side ? 'long' : 'short',
      sizeUSDC: parseInt(data.size_delta) / 1e6,
      price: parseInt(data.price) / 1e6,
      timestamp: parseInt(data.timestamp),
    };
    this.activities.push(activity);
  }

  /**
   * Convert event type to action
   */
  private getActionFromEventType(eventType: number): TradeHistoryItem['action'] {
    switch (eventType) {
      case 0: return 'open';
      case 1: return 'increase';
      case 2: return 'close';
      case 3: return 'liquidated';
      default: return 'open';
    }
  }

  /**
   * Get current positions
   */
  getPositions(): Position[] {
    return Array.from(this.positions.values())
      .filter(pos => pos.status === 'OPEN');
  }

  /**
   * Get trading history
   */
  getActivities(): TradeHistoryItem[] {
    return [...this.activities].sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Subscribe to position updates
   */
  subscribe(callback: (positions: Position[], activities: TradeHistoryItem[]) => void): () => void {
    this.subscribers.add(callback);
    
    // Send initial data
    callback(this.getPositions(), this.getActivities());
    
    // Return unsubscribe function
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Notify all subscribers
   */
  private notifySubscribers(): void {
    const positions = this.getPositions();
    const activities = this.getActivities();
    
    this.subscribers.forEach(callback => {
      try {
        callback(positions, activities);
      } catch (error) {
        log.error('Error in subscriber callback:', error);
      }
    });
  }

  /**
   * Refresh data from blockchain
   */
  async refresh(userAddress: string): Promise<void> {
    try {
      // Clear current state
      this.positions.clear();
      this.activities = [];
      
      // Refetch from blockchain
      await this.fetchHistoricalEvents(userAddress);
    } catch (error) {
      log.error('Failed to refresh position data:', error);
      throw error;
    }
  }

  /**
   * Start real-time monitoring (WebSocket or polling)
   */
  startRealTimeUpdates(userAddress: string): void {
    // TODO: Implement WebSocket connection to Aptos or polling
    // For now, we'll use polling every 30 seconds
    setInterval(async () => {
      try {
        await this.refresh(userAddress);
      } catch (error) {
        log.error('Error in real-time update:', error);
      }
    }, 30000);
  }
}

// Export singleton instance
export const realPositionService = new RealPositionService();
