import { useState, useEffect, useCallback } from 'react';
import { 
  aptosClient, 
  getUserPositions, 
  getUserOrders,
  getAccountBalance,
  formatAmount, 
  formatPrice 
} from '../utils/aptosClient';
import { useWallet } from '../app/providers/WalletProvider';
import { calculatePnL, calculateLiquidationPrice } from './useMerkleTrading';

// Position interface from the contract ABI
export interface MerklePosition {
  id: string;
  market: number;
  marketSymbol: string;
  side: 'long' | 'short';
  size: number;
  collateral: number;
  entryPrice: number;
  liquidationPrice: number;
  unrealizedPnl: number;
  pnl: number;
  pnlPercentage: number;
  leverage: number;
  fundingFee: number;
  timestamp: number;
}

// Order interface
export interface MerkleOrder {
  id: string;
  market: number;
  marketSymbol: string;
  side: 'long' | 'short';
  size: number;
  price: number;
  orderType: 'market' | 'limit';
  status: 'pending' | 'filled' | 'cancelled';
  timestamp: number;
}

// Portfolio summary
export interface PortfolioSummary {
  totalBalance: number;
  totalPnl: number;
  totalCollateral: number;
  freeCollateral: number;
  marginRatio: number;
  positionCount: number;
  orderCount: number;
}

// Market price data (mock for now, would come from price oracle)
const MOCK_PRICES: Record<number, number> = {
  0: 43250.50, // BTC/USD
  1: 2650.75,  // ETH/USD
  2: 12.45,    // APT/USD
  3: 98.20,    // SOL/USD
  4: 0.085,    // DOGE/USD
};

const MARKET_SYMBOLS: Record<number, string> = {
  0: 'BTC/USD',
  1: 'ETH/USD',
  2: 'APT/USD',
  3: 'SOL/USD',
  4: 'DOGE/USD',
};

export const useMerklePositions = () => {
  const { account, connected } = useWallet();
  const [positions, setPositions] = useState<MerklePosition[]>([]);
  const [orders, setOrders] = useState<MerkleOrder[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioSummary>({
    totalBalance: 0,
    totalPnl: 0,
    totalCollateral: 0,
    freeCollateral: 0,
    marginRatio: 0,
    positionCount: 0,
    orderCount: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch positions from Merkle contract
  const fetchPositions = useCallback(async () => {
    if (!account?.address || !connected) {
      setPositions([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const rawPositions = await getUserPositions(account.address);
      
      const processedPositions: MerklePosition[] = rawPositions.map((pos: any, index: number) => {
        const marketSymbol = MARKET_SYMBOLS[pos.market] || `Market ${pos.market}`;
        const currentPrice = MOCK_PRICES[pos.market] || pos.entryPrice;
        const isLong = pos.side;
        
        // Calculate real-time PnL
        const unrealizedPnl = calculatePnL(
          pos.entryPrice,
          currentPrice,
          pos.size,
          isLong
        );

        // Calculate leverage
        const leverage = pos.collateral > 0 ? pos.size / pos.collateral : 0;
        
        // Calculate PnL percentage
        const pnlPercentage = pos.collateral > 0 ? (unrealizedPnl / pos.collateral) * 100 : 0;

        return {
          id: `${pos.market}-${index}`,
          market: pos.market,
          marketSymbol,
          side: isLong ? 'long' : 'short',
          size: pos.size,
          collateral: pos.collateral,
          entryPrice: pos.entryPrice,
          liquidationPrice: pos.liquidationPrice,
          unrealizedPnl,
          pnl: unrealizedPnl,
          pnlPercentage,
          leverage,
          fundingFee: 0, // Would be calculated from contract events
          timestamp: Date.now(), // Would come from contract
        };
      });

      setPositions(processedPositions);
    } catch (err) {
      console.error('Error fetching positions:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch positions');
    } finally {
      setLoading(false);
    }
  }, [account?.address, connected]);

  // Fetch orders from Merkle contract
  const fetchOrders = useCallback(async () => {
    if (!account?.address || !connected) {
      setOrders([]);
      return;
    }

    try {
      const rawOrders = await getUserOrders(account.address);
      
      const processedOrders: MerkleOrder[] = rawOrders.map((order: any, index: number) => {
        const marketSymbol = MARKET_SYMBOLS[order.market] || `Market ${order.market}`;
        
        return {
          id: `${order.market}-${order.id || index}`,
          market: order.market,
          marketSymbol,
          side: order.side ? 'long' : 'short',
          size: order.size,
          price: order.price,
          orderType: order.orderType === 0 ? 'market' : 'limit',
          status: order.status === 0 ? 'pending' : order.status === 1 ? 'filled' : 'cancelled',
          timestamp: Date.now(), // Would come from contract
        };
      });

      setOrders(processedOrders);
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch orders');
    }
  }, [account?.address, connected]);

  // Calculate portfolio summary
  const calculatePortfolio = useCallback(async () => {
    if (!account?.address || !connected) {
      setPortfolio({
        totalBalance: 0,
        totalPnl: 0,
        totalCollateral: 0,
        freeCollateral: 0,
        marginRatio: 0,
        positionCount: 0,
        orderCount: 0,
      });
      return;
    }

    try {
      // Get account balance (USDC)
      const balance = await getAccountBalance(account.address);
      
      // Calculate totals from positions
      const totalPnl = positions.reduce((sum, pos) => sum + pos.unrealizedPnl, 0);
      const totalCollateral = positions.reduce((sum, pos) => sum + pos.collateral, 0);
      const freeCollateral = Math.max(0, balance - totalCollateral);
      
      // Calculate margin ratio (simplified)
      const marginRatio = totalCollateral > 0 ? (balance + totalPnl) / totalCollateral : 0;

      setPortfolio({
        totalBalance: balance,
        totalPnl,
        totalCollateral,
        freeCollateral,
        marginRatio,
        positionCount: positions.length,
        orderCount: orders.length,
      });
    } catch (err) {
      console.error('Error calculating portfolio:', err);
    }
  }, [account?.address, connected, positions, orders]);

  // Refresh all data
  const refreshData = useCallback(async () => {
    if (!connected || !account?.address) return;
    
    await Promise.all([
      fetchPositions(),
      fetchOrders(),
    ]);
  }, [connected, account?.address, fetchPositions, fetchOrders]);

  // Auto-refresh data when wallet connects
  useEffect(() => {
    if (connected && account?.address) {
      refreshData();
    } else {
      setPositions([]);
      setOrders([]);
      setPortfolio({
        totalBalance: 0,
        totalPnl: 0,
        totalCollateral: 0,
        freeCollateral: 0,
        marginRatio: 0,
        positionCount: 0,
        orderCount: 0,
      });
    }
  }, [connected, account?.address]); // Remove refreshData from dependencies

  // Calculate portfolio when positions/orders change
  useEffect(() => {
    calculatePortfolio();
  }, [positions, orders]); // Remove calculatePortfolio from dependencies

  // Auto-refresh positions every 30 seconds
  useEffect(() => {
    if (!connected || !account?.address) return;

    const interval = setInterval(() => {
      fetchPositions();
    }, 30000);

    return () => clearInterval(interval);
  }, [connected, account?.address]); // Remove fetchPositions from dependencies

  return {
    // Data
    positions,
    orders,
    portfolio,
    
    // Computed values
    totalPnL: portfolio.totalPnl,
    totalCollateral: portfolio.totalCollateral,
    freeCollateral: portfolio.freeCollateral,
    marginRatio: portfolio.marginRatio,
    
    // State
    loading,
    error,
    
    // Actions
    refreshData,
    fetchPositions,
    fetchOrders,
    
    // Utilities
    clearError: () => setError(null),
  };
};
