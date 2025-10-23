/**
 * WebSocket Server for Real-Time Updates
 * 
 * Provides real-time price feeds, position updates, and portfolio changes
 * Integrates with Supabase real-time and external price oracles
 */

import { WebSocketServer, WebSocket } from 'ws';
import { createClient } from '@supabase/supabase-js';
import { EventEmitter } from 'events';

interface ClientConnection {
  ws: WebSocket;
  userId?: string;
  subscriptions: Set<string>;
  lastPing: number;
}

interface PriceUpdate {
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
  timestamp: number;
}

interface PositionUpdate {
  userId: string;
  positionId: string;
  asset: string;
  type: 'supply' | 'borrow';
  amount: string;
  amountUSD: string;
  pnl: string;
  pnlPercent: string;
}

export class PrimeXWebSocketServer extends EventEmitter {
  private wss: WebSocketServer;
  private clients: Map<string, ClientConnection> = new Map();
  private supabase: any;
  private priceUpdateInterval: ReturnType<typeof setInterval> | null = null;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  constructor(port: number = 8080) {
    super();
    
    this.wss = new WebSocketServer({ port });
    this.supabase = createClient(
      process.env.SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    this.setupWebSocketServer();
    this.setupSupabaseSubscriptions();
    this.startPriceUpdates();
    this.startHeartbeat();

    console.log(`🚀 PrimeX WebSocket Server running on port ${port}`);
  }

  private setupWebSocketServer() {
    this.wss.on('connection', (ws: WebSocket, req) => {
      const clientId = this.generateClientId();
      const client: ClientConnection = {
        ws,
        subscriptions: new Set(),
        lastPing: Date.now()
      };

      this.clients.set(clientId, client);
      console.log(`📱 Client connected: ${clientId}`);

      // Send welcome message
      this.sendToClient(clientId, {
        type: 'welcome',
        clientId,
        timestamp: Date.now()
      });

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleClientMessage(clientId, message);
        } catch (error) {
          console.error('Invalid message format:', error);
          this.sendError(clientId, 'Invalid message format');
        }
      });

      ws.on('close', () => {
        console.log(`📱 Client disconnected: ${clientId}`);
        this.clients.delete(clientId);
      });

      ws.on('error', (error) => {
        console.error(`WebSocket error for client ${clientId}:`, error);
        this.clients.delete(clientId);
      });

      ws.on('pong', () => {
        const client = this.clients.get(clientId);
        if (client) {
          client.lastPing = Date.now();
        }
      });
    });
  }

  private handleClientMessage(clientId: string, message: any) {
    const client = this.clients.get(clientId);
    if (!client) return;

    switch (message.type) {
      case 'auth':
        this.handleAuth(clientId, message.userId);
        break;

      case 'subscribe':
        this.handleSubscribe(clientId, message.channel);
        break;

      case 'unsubscribe':
        this.handleUnsubscribe(clientId, message.channel);
        break;

      case 'ping':
        this.sendToClient(clientId, { type: 'pong', timestamp: Date.now() });
        break;

      default:
        this.sendError(clientId, `Unknown message type: ${message.type}`);
    }
  }

  private handleAuth(clientId: string, userId: string) {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.userId = userId;
    
    this.sendToClient(clientId, {
      type: 'auth_success',
      userId,
      timestamp: Date.now()
    });

    console.log(`🔐 Client ${clientId} authenticated as user ${userId}`);
  }

  private handleSubscribe(clientId: string, channel: string) {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.subscriptions.add(channel);
    
    this.sendToClient(clientId, {
      type: 'subscribed',
      channel,
      timestamp: Date.now()
    });

    console.log(`📺 Client ${clientId} subscribed to ${channel}`);

    // Send initial data for the channel
    this.sendInitialChannelData(clientId, channel);
  }

  private handleUnsubscribe(clientId: string, channel: string) {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.subscriptions.delete(channel);
    
    this.sendToClient(clientId, {
      type: 'unsubscribed',
      channel,
      timestamp: Date.now()
    });

    console.log(`📺 Client ${clientId} unsubscribed from ${channel}`);
  }

  private async sendInitialChannelData(clientId: string, channel: string) {
    const client = this.clients.get(clientId);
    if (!client) return;

    try {
      switch (channel) {
        case 'prices':
          const prices = await this.getCurrentPrices();
          this.sendToClient(clientId, {
            type: 'prices_snapshot',
            data: prices,
            timestamp: Date.now()
          });
          break;

        case 'portfolio':
          if (client.userId) {
            const portfolio = await this.getUserPortfolio(client.userId);
            this.sendToClient(clientId, {
              type: 'portfolio_snapshot',
              data: portfolio,
              timestamp: Date.now()
            });
          }
          break;

        case 'apr_rates':
          const aprRates = await this.getAPRRates();
          this.sendToClient(clientId, {
            type: 'apr_snapshot',
            data: aprRates,
            timestamp: Date.now()
          });
          break;
      }
    } catch (error) {
      console.error(`Error sending initial data for ${channel}:`, error);
      this.sendError(clientId, `Failed to load ${channel} data`);
    }
  }

  private setupSupabaseSubscriptions() {
    // Subscribe to position changes
    this.supabase
      .channel('positions_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'positions' },
        (payload: any) => {
          this.handlePositionChange(payload);
        }
      )
      .subscribe();

    // Subscribe to price changes
    this.supabase
      .channel('price_changes')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'price_history' },
        (payload: any) => {
          this.handlePriceChange(payload);
        }
      )
      .subscribe();

    // Subscribe to APR changes
    this.supabase
      .channel('apr_changes')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'apr_history' },
        (payload: any) => {
          this.handleAPRChange(payload);
        }
      )
      .subscribe();

    console.log('📡 Supabase real-time subscriptions active');
  }

  private handlePositionChange(payload: any) {
    const { eventType, new: newRecord, old: oldRecord } = payload;
    const record = newRecord || oldRecord;

    if (!record) return;

    const update: PositionUpdate = {
      userId: record.user_address,
      positionId: record.id,
      asset: record.asset_symbol,
      type: record.position_type,
      amount: record.amount,
      amountUSD: record.amount_usd,
      pnl: record.pnl || '0',
      pnlPercent: record.pnl_percent || '0'
    };

    // Send to clients subscribed to portfolio updates for this user
    this.broadcastToUserSubscribers(record.user_address, 'portfolio', {
      type: 'position_update',
      eventType,
      data: update,
      timestamp: Date.now()
    });
  }

  private handlePriceChange(payload: any) {
    const { new: record } = payload;
    if (!record) return;

    const priceUpdate: PriceUpdate = {
      symbol: record.symbol,
      price: parseFloat(record.price_usd),
      change24h: 0, // Calculate from previous price
      volume24h: parseFloat(record.volume_24h || '0'),
      timestamp: Date.now()
    };

    // Broadcast to all clients subscribed to prices
    this.broadcastToSubscribers('prices', {
      type: 'price_update',
      data: priceUpdate,
      timestamp: Date.now()
    });
  }

  private handleAPRChange(payload: any) {
    const { new: record } = payload;
    if (!record) return;

    const aprUpdate = {
      symbol: record.symbol,
      supplyAPR: parseFloat(record.supply_apr),
      borrowAPR: parseFloat(record.borrow_apr),
      utilization: parseFloat(record.utilization),
      timestamp: Date.now()
    };

    // Broadcast to all clients subscribed to APR rates
    this.broadcastToSubscribers('apr_rates', {
      type: 'apr_update',
      data: aprUpdate,
      timestamp: Date.now()
    });
  }

  private startPriceUpdates() {
    // Update prices every 5 seconds
    this.priceUpdateInterval = setInterval(async () => {
      try {
        await this.fetchAndBroadcastPrices();
      } catch (error) {
        console.error('Error updating prices:', error);
      }
    }, 5000);
  }

  private startHeartbeat() {
    // Send ping to all clients every 30 seconds
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      
      for (const [clientId, client] of this.clients.entries()) {
        // Remove clients that haven't responded to ping in 60 seconds
        if (now - client.lastPing > 60000) {
          console.log(`💀 Removing inactive client: ${clientId}`);
          client.ws.terminate();
          this.clients.delete(clientId);
          continue;
        }

        // Send ping
        if (client.ws.readyState === WebSocket.OPEN) {
          client.ws.ping();
        }
      }
    }, 30000);
  }

  private async fetchAndBroadcastPrices() {
    // This would integrate with your price oracle service
    // For now, we'll use mock data
    const mockPrices: PriceUpdate[] = [
      { symbol: 'APT', price: 8.45, change24h: 2.3, volume24h: 12500000, timestamp: Date.now() },
      { symbol: 'BTC', price: 43250, change24h: -1.2, volume24h: 890000000, timestamp: Date.now() },
      { symbol: 'ETH', price: 2680, change24h: 0.8, volume24h: 450000000, timestamp: Date.now() },
      { symbol: 'SOL', price: 98.5, change24h: 3.1, volume24h: 78000000, timestamp: Date.now() },
      { symbol: 'USDC', price: 1.0, change24h: 0.0, volume24h: 1200000000, timestamp: Date.now() }
    ];

    this.broadcastToSubscribers('prices', {
      type: 'prices_update',
      data: mockPrices,
      timestamp: Date.now()
    });
  }

  private async getCurrentPrices(): Promise<PriceUpdate[]> {
    // Fetch current prices from database or external API
    const { data } = await this.supabase
      .from('price_history')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(10);

    return data?.map((record: any) => ({
      symbol: record.symbol,
      price: parseFloat(record.price_usd),
      change24h: 0, // Calculate from historical data
      volume24h: parseFloat(record.volume_24h || '0'),
      timestamp: new Date(record.timestamp).getTime()
    })) || [];
  }

  private async getUserPortfolio(userId: string) {
    const { data } = await this.supabase
      .from('positions')
      .select('*')
      .eq('user_address', userId);

    return data || [];
  }

  private async getAPRRates() {
    const { data } = await this.supabase
      .from('apr_history')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(10);

    return data || [];
  }

  private broadcastToSubscribers(channel: string, message: any) {
    for (const [clientId, client] of this.clients.entries()) {
      if (client.subscriptions.has(channel)) {
        this.sendToClient(clientId, message);
      }
    }
  }

  private broadcastToUserSubscribers(userId: string, channel: string, message: any) {
    for (const [clientId, client] of this.clients.entries()) {
      if (client.userId === userId && client.subscriptions.has(channel)) {
        this.sendToClient(clientId, message);
      }
    }
  }

  private sendToClient(clientId: string, message: any) {
    const client = this.clients.get(clientId);
    if (!client || client.ws.readyState !== WebSocket.OPEN) return;

    try {
      client.ws.send(JSON.stringify(message));
    } catch (error) {
      console.error(`Error sending message to client ${clientId}:`, error);
      this.clients.delete(clientId);
    }
  }

  private sendError(clientId: string, error: string) {
    this.sendToClient(clientId, {
      type: 'error',
      error,
      timestamp: Date.now()
    });
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public close() {
    if (this.priceUpdateInterval) {
      clearInterval(this.priceUpdateInterval);
    }
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    this.wss.close();
    console.log('🛑 WebSocket server closed');
  }
}

// Start server if this file is run directly
if (require.main === module) {
  const port = parseInt(process.env.WS_PORT || '8080');
  new PrimeXWebSocketServer(port);
}
