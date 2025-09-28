export interface Ticker {
  id: string;
  symbol: string;
  name: string;
  price: number;
  pctChange: number;
  sparkline: number[];
  candles: {
    '1D': CandleData[];
    '1W': CandleData[];
    '1M': CandleData[];
    '1Y': CandleData[];
    'All': CandleData[];
  };
  logo: string;
  marketCap: number;
  volume24h: number;
  circulating: number;
}

export interface CandleData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Transaction {
  id: string;
  type: 'buy' | 'sell' | 'deposit' | 'withdraw';
  symbol?: string;
  amount: number;
  price?: number;
  timestamp: number;
  status: 'completed' | 'pending' | 'failed';
}

export interface Position {
  id: string;
  symbol: string;
  side: 'long' | 'short';
  size: number;
  entryPrice: number;
  markPrice: number;
  pnl: number;
  pnlPercent: number;
}

export interface Order {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit' | 'stop' | 'stop-limit' | 'take-profit' | 'trailing' | 'oco';
  size: number;
  price?: number;
  stopPrice?: number;
  takeProfitPrice?: number;
  trailingAmount?: number;
  status: 'open' | 'filled' | 'cancelled' | 'partial';
  timestamp: number;
}

export interface Trader {
  id: string;
  name: string;
  avatar: string;
  roi: number;
  drawdown: number;
  followers: number;
  aum: number;
  winRate: number;
  strategy: string;
  riskLevel: 'Low' | 'Medium' | 'High';
}

export interface Squad {
  id: string;
  name: string;
  members: SquadMember[];
  pooledBalance: number;
  currentPnL: number;
  pnlPercent: number;
  strategy: string;
  nextRebalance: number;
  trades: SquadTrade[];
  proposals: SquadProposal[];
}

export interface SquadMember {
  id: string;
  name: string;
  avatar: string;
  allocation: number;
  weight: number;
}

export interface SquadTrade {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  amount: number;
  price: number;
  timestamp: number;
  proposedBy: string;
}

export interface SquadProposal {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  allocation: number;
  proposedBy: string;
  timestamp: number;
  votes: { memberId: string; vote: 'up' | 'down' }[];
  status: 'pending' | 'approved' | 'rejected';
}

export interface Alert {
  id: string;
  symbol: string;
  type: 'price' | 'percent' | 'volume';
  condition: 'above' | 'below';
  value: number;
  isActive: boolean;
  triggered: boolean;
  timestamp: number;
}

export const mockTickers: Ticker[] = [
  {
    id: '1',
    symbol: 'BTC',
    name: 'Bitcoin',
    price: 67842.50,
    pctChange: 2.45,
    sparkline: [65000, 65200, 66100, 66800, 67200, 67500, 67842, 67600, 67800, 67842, 68100, 67950, 67842, 68200, 67900, 67842, 68000, 67750, 67842, 67900],
    candles: {
      '1D': generateCandles(67842.50, 24),
      '1W': generateCandles(67842.50, 168),
      '1M': generateCandles(67842.50, 720),
      '1Y': generateCandles(67842.50, 8760),
      'All': generateCandles(67842.50, 17520),
    },
    logo: '₿',
    marketCap: 1340000000000,
    volume24h: 28500000000,
    circulating: 19750000,
  },
  {
    id: '2',
    symbol: 'ETH',
    name: 'Ethereum',
    price: 3421.80,
    pctChange: 1.89,
    sparkline: [3350, 3380, 3400, 3420, 3410, 3415, 3421, 3418, 3422, 3421, 3430, 3425, 3421, 3435, 3420, 3421, 3428, 3415, 3421, 3425],
    candles: {
      '1D': generateCandles(3421.80, 24),
      '1W': generateCandles(3421.80, 168),
      '1M': generateCandles(3421.80, 720),
      '1Y': generateCandles(3421.80, 8760),
      'All': generateCandles(3421.80, 17520),
    },
    logo: 'Ξ',
    marketCap: 411000000000,
    volume24h: 15200000000,
    circulating: 120280000,
  },
  {
    id: '3',
    symbol: 'APT',
    name: 'Aptos',
    price: 12.45,
    pctChange: 8.23,
    sparkline: [11.2, 11.5, 11.8, 12.1, 12.3, 12.4, 12.45, 12.42, 12.44, 12.45, 12.50, 12.48, 12.45, 12.52, 12.40, 12.45, 12.47, 12.43, 12.45, 12.46],
    candles: {
      '1D': generateCandles(12.45, 24),
      '1W': generateCandles(12.45, 168),
      '1M': generateCandles(12.45, 720),
      '1Y': generateCandles(12.45, 8760),
      'All': generateCandles(12.45, 17520),
    },
    logo: '⬟',
    marketCap: 5800000000,
    volume24h: 180000000,
    circulating: 466000000,
  },
  {
    id: '4',
    symbol: 'SOL',
    name: 'Solana',
    price: 185.92,
    pctChange: -0.87,
    sparkline: [188, 187, 186, 185, 186, 185.5, 185.92, 186.1, 185.8, 185.92, 186.2, 185.7, 185.92, 186.5, 185.6, 185.92, 186.0, 185.8, 185.92, 186.1],
    candles: {
      '1D': generateCandles(185.92, 24),
      '1W': generateCandles(185.92, 168),
      '1M': generateCandles(185.92, 720),
      '1Y': generateCandles(185.92, 8760),
      'All': generateCandles(185.92, 17520),
    },
    logo: '◎',
    marketCap: 89000000000,
    volume24h: 3200000000,
    circulating: 478000000,
  },
  {
    id: '5',
    symbol: 'ADA',
    name: 'Cardano',
    price: 0.4892,
    pctChange: 3.12,
    sparkline: [0.47, 0.475, 0.48, 0.485, 0.487, 0.488, 0.4892, 0.489, 0.4895, 0.4892, 0.490, 0.488, 0.4892, 0.491, 0.487, 0.4892, 0.490, 0.488, 0.4892, 0.489],
    candles: {
      '1D': generateCandles(0.4892, 24),
      '1W': generateCandles(0.4892, 168),
      '1M': generateCandles(0.4892, 720),
      '1Y': generateCandles(0.4892, 8760),
      'All': generateCandles(0.4892, 17520),
    },
    logo: '₳',
    marketCap: 17200000000,
    volume24h: 420000000,
    circulating: 35200000000,
  },
  {
    id: '6',
    symbol: 'XRP',
    name: 'XRP',
    price: 0.6234,
    pctChange: -2.15,
    sparkline: [0.64, 0.635, 0.63, 0.625, 0.628, 0.624, 0.6234, 0.625, 0.622, 0.6234, 0.626, 0.621, 0.6234, 0.627, 0.620, 0.6234, 0.625, 0.622, 0.6234, 0.624],
    candles: {
      '1D': generateCandles(0.6234, 24),
      '1W': generateCandles(0.6234, 168),
      '1M': generateCandles(0.6234, 720),
      '1Y': generateCandles(0.6234, 8760),
      'All': generateCandles(0.6234, 17520),
    },
    logo: '◉',
    marketCap: 35400000000,
    volume24h: 1800000000,
    circulating: 56800000000,
  },
  {
    id: '7',
    symbol: 'DOT',
    name: 'Polkadot',
    price: 7.89,
    pctChange: -1.23,
    sparkline: [8.1, 8.0, 7.95, 7.9, 7.85, 7.88, 7.89, 7.87, 7.91, 7.89, 7.92, 7.88, 7.89, 7.94, 7.86, 7.89, 7.90, 7.87, 7.89, 7.91],
    candles: {
      '1D': generateCandles(7.89, 24),
      '1W': generateCandles(7.89, 168),
      '1M': generateCandles(7.89, 720),
      '1Y': generateCandles(7.89, 8760),
      'All': generateCandles(7.89, 17520),
    },
    logo: '●',
    marketCap: 9800000000,
    volume24h: 320000000,
    circulating: 1240000000,
  },
  {
    id: '8',
    symbol: 'MATIC',
    name: 'Polygon',
    price: 0.8934,
    pctChange: 4.56,
    sparkline: [0.85, 0.86, 0.87, 0.88, 0.89, 0.891, 0.8934, 0.892, 0.894, 0.8934, 0.895, 0.891, 0.8934, 0.896, 0.890, 0.8934, 0.894, 0.892, 0.8934, 0.893],
    candles: {
      '1D': generateCandles(0.8934, 24),
      '1W': generateCandles(0.8934, 168),
      '1M': generateCandles(0.8934, 720),
      '1Y': generateCandles(0.8934, 8760),
      'All': generateCandles(0.8934, 17520),
    },
    logo: '⬟',
    marketCap: 8900000000,
    volume24h: 450000000,
    circulating: 10000000000,
  },
  {
    id: '9',
    symbol: 'AVAX',
    name: 'Avalanche',
    price: 38.67,
    pctChange: -2.34,
    sparkline: [39.5, 39.2, 38.9, 38.7, 38.6, 38.65, 38.67, 38.64, 38.69, 38.67, 38.72, 38.63, 38.67, 38.75, 38.60, 38.67, 38.70, 38.64, 38.67, 38.68],
    candles: {
      '1D': generateCandles(38.67, 24),
      '1W': generateCandles(38.67, 168),
      '1M': generateCandles(38.67, 720),
      '1Y': generateCandles(38.67, 8760),
      'All': generateCandles(38.67, 17520),
    },
    logo: '▲',
    marketCap: 15600000000,
    volume24h: 680000000,
    circulating: 403000000,
  },
  {
    id: '10',
    symbol: 'DOGE',
    name: 'Dogecoin',
    price: 0.0789,
    pctChange: 12.45,
    sparkline: [0.070, 0.072, 0.074, 0.076, 0.078, 0.0785, 0.0789, 0.0787, 0.0791, 0.0789, 0.0792, 0.0786, 0.0789, 0.0794, 0.0784, 0.0789, 0.0790, 0.0787, 0.0789, 0.0788],
    candles: {
      '1D': generateCandles(0.0789, 24),
      '1W': generateCandles(0.0789, 168),
      '1M': generateCandles(0.0789, 720),
      '1Y': generateCandles(0.0789, 8760),
      'All': generateCandles(0.0789, 17520),
    },
    logo: 'Ð',
    marketCap: 11500000000,
    volume24h: 890000000,
    circulating: 145800000000,
  },
  {
    id: '11',
    symbol: 'TRX',
    name: 'TRON',
    price: 0.1234,
    pctChange: -0.89,
    sparkline: [0.124, 0.1235, 0.123, 0.1232, 0.1233, 0.1234, 0.1234, 0.1233, 0.1235, 0.1234, 0.1236, 0.1232, 0.1234, 0.1237, 0.1231, 0.1234, 0.1235, 0.1233, 0.1234, 0.1234],
    candles: {
      '1D': generateCandles(0.1234, 24),
      '1W': generateCandles(0.1234, 168),
      '1M': generateCandles(0.1234, 720),
      '1Y': generateCandles(0.1234, 8760),
      'All': generateCandles(0.1234, 17520),
    },
    logo: '◉',
    marketCap: 10900000000,
    volume24h: 1200000000,
    circulating: 88300000000,
  },
  {
    id: '12',
    symbol: 'LTC',
    name: 'Litecoin',
    price: 98.45,
    pctChange: 1.67,
    sparkline: [97.0, 97.5, 98.0, 98.2, 98.3, 98.4, 98.45, 98.42, 98.47, 98.45, 98.50, 98.40, 98.45, 98.52, 98.38, 98.45, 98.48, 98.42, 98.45, 98.46],
    candles: {
      '1D': generateCandles(98.45, 24),
      '1W': generateCandles(98.45, 168),
      '1M': generateCandles(98.45, 720),
      '1Y': generateCandles(98.45, 8760),
      'All': generateCandles(98.45, 17520),
    },
    logo: 'Ł',
    marketCap: 7300000000,
    volume24h: 580000000,
    circulating: 74100000,
  },
  {
    id: '13',
    symbol: 'LINK',
    name: 'Chainlink',
    price: 14.78,
    pctChange: 3.21,
    sparkline: [14.3, 14.4, 14.5, 14.6, 14.7, 14.75, 14.78, 14.76, 14.79, 14.78, 14.81, 14.74, 14.78, 14.83, 14.72, 14.78, 14.80, 14.76, 14.78, 14.77],
    candles: {
      '1D': generateCandles(14.78, 24),
      '1W': generateCandles(14.78, 168),
      '1M': generateCandles(14.78, 720),
      '1Y': generateCandles(14.78, 8760),
      'All': generateCandles(14.78, 17520),
    },
    logo: '🔗',
    marketCap: 8900000000,
    volume24h: 420000000,
    circulating: 602000000,
  },
];

export const mockBiggestMovers = mockTickers.filter(t => Math.abs(t.pctChange) > 5);

export const mockTransactions: Transaction[] = [
  {
    id: '1',
    type: 'buy',
    symbol: 'BTC',
    amount: 0.025,
    price: 67500,
    timestamp: Date.now() - 3600000,
    status: 'completed',
  },
  {
    id: '2',
    type: 'sell',
    symbol: 'ETH',
    amount: 1.5,
    price: 3400,
    timestamp: Date.now() - 7200000,
    status: 'completed',
  },
  {
    id: '3',
    type: 'deposit',
    amount: 5000,
    timestamp: Date.now() - 86400000,
    status: 'completed',
  },
  {
    id: '4',
    type: 'buy',
    symbol: 'APT',
    amount: 100,
    price: 12.20,
    timestamp: Date.now() - 172800000,
    status: 'completed',
  },
  {
    id: '5',
    type: 'withdraw',
    amount: 2000,
    timestamp: Date.now() - 259200000,
    status: 'completed',
  },
  {
    id: '6',
    type: 'sell',
    symbol: 'SOL',
    amount: 5,
    price: 188.50,
    timestamp: Date.now() - 345600000,
    status: 'completed',
  },
  {
    id: '7',
    type: 'buy',
    symbol: 'ADA',
    amount: 1000,
    price: 0.47,
    timestamp: Date.now() - 432000000,
    status: 'completed',
  },
  {
    id: '8',
    type: 'deposit',
    amount: 10000,
    timestamp: Date.now() - 518400000,
    status: 'completed',
  },
];

export const mockPositions: Position[] = [
  {
    id: '1',
    symbol: 'BTC',
    side: 'long',
    size: 0.5,
    entryPrice: 65000,
    markPrice: 67842.50,
    pnl: 1421.25,
    pnlPercent: 4.37,
  },
  {
    id: '2',
    symbol: 'ETH',
    side: 'long',
    size: 2.0,
    entryPrice: 3300,
    markPrice: 3421.80,
    pnl: 243.60,
    pnlPercent: 3.69,
  },
  {
    id: '3',
    symbol: 'APT',
    side: 'short',
    size: 50,
    entryPrice: 13.00,
    markPrice: 12.45,
    pnl: 27.50,
    pnlPercent: 4.23,
  },
];

export const mockOrders: Order[] = [
  {
    id: '1',
    symbol: 'APT',
    side: 'buy',
    type: 'limit',
    size: 100,
    price: 12.00,
    status: 'open',
    timestamp: Date.now() - 1800000,
  },
  {
    id: '2',
    symbol: 'BTC',
    side: 'sell',
    type: 'stop-limit',
    size: 0.1,
    price: 66000,
    stopPrice: 66500,
    status: 'open',
    timestamp: Date.now() - 3600000,
  },
  {
    id: '3',
    symbol: 'ETH',
    side: 'buy',
    type: 'take-profit',
    size: 1.0,
    price: 3500,
    takeProfitPrice: 3600,
    status: 'partial',
    timestamp: Date.now() - 7200000,
  },
];

export const mockTraders: Trader[] = [
  {
    id: '1',
    name: 'CryptoKing',
    avatar: '👑',
    roi: 89.5,
    drawdown: 12.3,
    followers: 15420,
    aum: 2850000,
    winRate: 78.5,
    strategy: 'Momentum',
    riskLevel: 'Medium',
  },
  {
    id: '2',
    name: 'DefiMaster',
    avatar: '🏆',
    roi: 156.8,
    drawdown: 18.7,
    followers: 8960,
    aum: 1250000,
    winRate: 82.1,
    strategy: 'Arbitrage',
    riskLevel: 'Low',
  },
  {
    id: '3',
    name: 'AltcoinPro',
    avatar: '🚀',
    roi: 234.2,
    drawdown: 28.4,
    followers: 12340,
    aum: 890000,
    winRate: 65.8,
    strategy: 'Growth',
    riskLevel: 'High',
  },
];

export const mockSquads: Squad[] = [
  {
    id: '1',
    name: 'Crypto Legends',
    members: [
      { id: '1', name: 'You', avatar: '👤', allocation: 5000, weight: 0.25 },
      { id: '2', name: 'Alice', avatar: '👩', allocation: 8000, weight: 0.40 },
      { id: '3', name: 'Bob', avatar: '👨', allocation: 4000, weight: 0.20 },
      { id: '4', name: 'Carol', avatar: '👱‍♀️', allocation: 3000, weight: 0.15 },
    ],
    pooledBalance: 20000,
    currentPnL: 2850,
    pnlPercent: 14.25,
    strategy: 'Momentum',
    nextRebalance: Date.now() + 3600000 * 6, // 6 hours
    trades: [
      {
        id: '1',
        symbol: 'BTC',
        side: 'buy',
        amount: 0.2,
        price: 67000,
        timestamp: Date.now() - 7200000,
        proposedBy: 'Alice',
      },
      {
        id: '2',
        symbol: 'ETH',
        side: 'sell',
        amount: 1.5,
        price: 3400,
        timestamp: Date.now() - 14400000,
        proposedBy: 'Bob',
      },
    ],
    proposals: [
      {
        id: '1',
        symbol: 'APT',
        side: 'buy',
        allocation: 0.15,
        proposedBy: 'Carol',
        timestamp: Date.now() - 1800000,
        votes: [
          { memberId: '2', vote: 'up' },
          { memberId: '3', vote: 'up' },
        ],
        status: 'pending',
      },
    ],
  },
];

export const mockAlerts: Alert[] = [
  {
    id: '1',
    symbol: 'BTC',
    type: 'price',
    condition: 'above',
    value: 70000,
    isActive: true,
    triggered: false,
    timestamp: Date.now() - 86400000,
  },
  {
    id: '2',
    symbol: 'ETH',
    type: 'percent',
    condition: 'below',
    value: -5,
    isActive: true,
    triggered: false,
    timestamp: Date.now() - 172800000,
  },
  {
    id: '3',
    symbol: 'APT',
    type: 'price',
    condition: 'above',
    value: 15,
    isActive: false,
    triggered: true,
    timestamp: Date.now() - 259200000,
  },
  {
    id: '4',
    symbol: 'SOL',
    type: 'volume',
    condition: 'above',
    value: 5000000000,
    isActive: true,
    triggered: false,
    timestamp: Date.now() - 345600000,
  },
];

function generateCandles(currentPrice: number, hours: number): CandleData[] {
  const candles: CandleData[] = [];
  let price = currentPrice * 0.9; // Start 10% lower
  
  for (let i = 0; i < Math.min(hours, 100); i++) {
    const open = price;
    const volatility = 0.02; // 2% max change per hour
    const change = (Math.random() - 0.5) * volatility * price;
    const close = Math.max(0, open + change);
    const high = Math.max(open, close) * (1 + Math.random() * 0.01);
    const low = Math.min(open, close) * (1 - Math.random() * 0.01);
    
    candles.push({
      timestamp: Date.now() - (hours - i) * 3600000,
      open,
      high,
      low,
      close,
      volume: Math.random() * 1000000,
    });
    
    price = close;
  }
  
  return candles;
}