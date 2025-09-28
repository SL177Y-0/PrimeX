import { create } from 'zustand';
import { 
  mockTickers, 
  mockTransactions, 
  mockPositions, 
  mockOrders, 
  mockTraders, 
  mockSquads,
  mockAlerts,
  Ticker, 
  Transaction, 
  Position, 
  Order, 
  Trader, 
  Squad,
  Alert,
  SquadProposal
} from '../data/mock';

interface AppState {
  // Theme
  themeMode: 'light' | 'dark' | 'auto';
  setThemeMode: (mode: 'light' | 'dark' | 'auto') => void;
  
  // Portfolio
  portfolioValue: number;
  portfolioChange: number;
  portfolioChangePercent: number;
  
  // Market data
  tickers: Ticker[];
  updateTicker: (symbol: string, updates: Partial<Ticker>) => void;
  
  // Transactions
  transactions: Transaction[];
  addTransaction: (transaction: Transaction) => void;
  
  // Positions
  positions: Position[];
  updatePosition: (id: string, updates: Partial<Position>) => void;
  closePosition: (id: string) => void;
  
  // Orders
  orders: Order[];
  addOrder: (order: Order) => void;
  cancelOrder: (id: string) => void;
  cancelAllOrders: () => void;
  
  // Copy Trading
  traders: Trader[];
  followedTraders: string[];
  followTrader: (traderId: string, settings: FollowSettings) => void;
  unfollowTrader: (traderId: string) => void;
  
  // Group Trading (Squads)
  squads: Squad[];
  joinedSquads: string[];
  joinSquad: (squadId: string) => void;
  leaveSquad: (squadId: string) => void;
  proposeSquadTrade: (squadId: string, proposal: Omit<SquadProposal, 'id' | 'timestamp' | 'votes' | 'status'>) => void;
  voteOnProposal: (squadId: string, proposalId: string, vote: 'up' | 'down') => void;
  
  // Alerts
  alerts: Alert[];
  addAlert: (alert: Omit<Alert, 'id' | 'timestamp'>) => void;
  toggleAlert: (id: string) => void;
  removeAlert: (id: string) => void;
  
  // Settings
  currency: 'USD' | 'EUR' | 'GBP' | 'JPY';
  setCurrency: (currency: 'USD' | 'EUR' | 'GBP' | 'JPY') => void;
  hideBalances: boolean;
  setHideBalances: (hide: boolean) => void;
  language: 'en' | 'es';
  setLanguage: (language: 'en' | 'es') => void;
  
  // Watchlist
  watchlist: string[];
  addToWatchlist: (symbol: string) => void;
  removeFromWatchlist: (symbol: string) => void;
  
  // UI State
  selectedTimeframe: '1D' | '1W' | '1M' | '1Y' | 'All';
  setSelectedTimeframe: (timeframe: '1D' | '1W' | '1M' | '1Y' | 'All') => void;
  
  // Loading states
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

interface FollowSettings {
  allocation: number;
  maxDailyLoss: number;
  maxPositionSize: number;
  autoCopyOpenPositions: boolean;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Theme
  themeMode: 'dark',
  setThemeMode: (mode) => set({ themeMode: mode }),
  
  // Portfolio
  portfolioValue: 20988.00,
  portfolioChange: 545.90,
  portfolioChangePercent: 13.5,
  
  // Market data
  tickers: mockTickers,
  updateTicker: (symbol, updates) => set((state) => ({
    tickers: state.tickers.map(ticker => 
      ticker.symbol === symbol ? { ...ticker, ...updates } : ticker
    ),
  })),
  
  // Transactions
  transactions: mockTransactions,
  addTransaction: (transaction) => set((state) => ({
    transactions: [transaction, ...state.transactions],
  })),
  
  // Positions
  positions: mockPositions,
  updatePosition: (id, updates) => set((state) => ({
    positions: state.positions.map(position => 
      position.id === id ? { ...position, ...updates } : position
    ),
  })),
  closePosition: (id) => set((state) => ({
    positions: state.positions.filter(position => position.id !== id),
  })),
  
  // Orders
  orders: mockOrders,
  addOrder: (order) => set((state) => ({
    orders: [...state.orders, order],
  })),
  cancelOrder: (id) => set((state) => ({
    orders: state.orders.filter(order => order.id !== id),
  })),
  cancelAllOrders: () => set((state) => ({
    orders: state.orders.filter(order => order.status === 'filled'),
  })),
  
  // Copy Trading
  traders: mockTraders,
  followedTraders: [],
  followTrader: (traderId, settings) => set((state) => ({
    followedTraders: [...state.followedTraders, traderId],
  })),
  unfollowTrader: (traderId) => set((state) => ({
    followedTraders: state.followedTraders.filter(id => id !== traderId),
  })),
  
  // Group Trading (Squads)
  squads: mockSquads,
  joinedSquads: ['1'], // Pre-joined to first squad
  joinSquad: (squadId) => set((state) => ({
    joinedSquads: [...state.joinedSquads, squadId],
  })),
  leaveSquad: (squadId) => set((state) => ({
    joinedSquads: state.joinedSquads.filter(id => id !== squadId),
  })),
  proposeSquadTrade: (squadId, proposal) => set((state) => ({
    squads: state.squads.map(squad => 
      squad.id === squadId 
        ? {
            ...squad,
            proposals: [
              ...squad.proposals,
              {
                ...proposal,
                id: Date.now().toString(),
                timestamp: Date.now(),
                votes: [],
                status: 'pending' as const,
              }
            ]
          }
        : squad
    ),
  })),
  voteOnProposal: (squadId, proposalId, vote) => set((state) => ({
    squads: state.squads.map(squad => 
      squad.id === squadId 
        ? {
            ...squad,
            proposals: squad.proposals.map(proposal =>
              proposal.id === proposalId
                ? {
                    ...proposal,
                    votes: [
                      ...proposal.votes.filter(v => v.memberId !== '1'), // Remove existing vote from current user
                      { memberId: '1', vote }
                    ]
                  }
                : proposal
            )
          }
        : squad
    ),
  })),
  
  // Alerts
  alerts: mockAlerts,
  addAlert: (alert) => set((state) => ({
    alerts: [
      ...state.alerts,
      {
        ...alert,
        id: Date.now().toString(),
        timestamp: Date.now(),
      }
    ],
  })),
  toggleAlert: (id) => set((state) => ({
    alerts: state.alerts.map(alert =>
      alert.id === id ? { ...alert, isActive: !alert.isActive } : alert
    ),
  })),
  removeAlert: (id) => set((state) => ({
    alerts: state.alerts.filter(alert => alert.id !== id),
  })),
  
  // Settings
  currency: 'USD',
  setCurrency: (currency) => set({ currency }),
  hideBalances: false,
  setHideBalances: (hide) => set({ hideBalances: hide }),
  language: 'en',
  setLanguage: (language) => set({ language }),
  
  // Watchlist
  watchlist: ['BTC', 'ETH', 'APT', 'SOL'],
  addToWatchlist: (symbol) => set((state) => ({
    watchlist: [...state.watchlist, symbol],
  })),
  removeFromWatchlist: (symbol) => set((state) => ({
    watchlist: state.watchlist.filter(s => s !== symbol),
  })),
  
  // UI State
  selectedTimeframe: '1D',
  setSelectedTimeframe: (timeframe) => set({ selectedTimeframe: timeframe }),
  
  // Loading states
  isLoading: false,
  setIsLoading: (loading) => set({ isLoading: loading }),
}));

// Mock websocket updates
setInterval(() => {
  const state = useAppStore.getState();
  const updatedTickers = state.tickers.map(ticker => ({
    ...ticker,
    price: ticker.price * (1 + (Math.random() - 0.5) * 0.002), // ±0.2% change
    pctChange: ticker.pctChange + (Math.random() - 0.5) * 0.1,
  }));
  
  useAppStore.setState({ tickers: updatedTickers });
}, 2000); // Update every 2 seconds