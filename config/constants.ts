// App Configuration Constants
export const APP_CONFIG = {
  name: process.env.EXPO_PUBLIC_APP_NAME || 'PrismX',
  scheme: process.env.EXPO_PUBLIC_APP_SCHEME || 'prismx',
  version: '1.0.0',
  deepLinkBase: process.env.EXPO_PUBLIC_DEEP_LINK_BASE || 'prismx://',
} as const;

// Aptos Network Configuration
export const APTOS_CONFIG = {
  network: process.env.EXPO_PUBLIC_APTOS_NETWORK || 'mainnet',
  nodeUrl: process.env.EXPO_PUBLIC_APTOS_NODE_URL || 'https://fullnode.mainnet.aptoslabs.com/v1',
  testnetUrl: 'https://fullnode.testnet.aptoslabs.com/v1',
  apiKeys: {
    mainnet: process.env.EXPO_PUBLIC_APTOS_MAINNET_API_KEY,
    testnet: process.env.EXPO_PUBLIC_APTOS_TESTNET_API_KEY,
  },
} as const;

// Merkle Contract Configuration
export const MERKLE_CONFIG = {
  contractAddress: process.env.EXPO_PUBLIC_MERKLE_CONTRACT_ADDRESS || '0x5ae6789dd2fec1a9ec9cccfb3acaf12e93d432f0a3a42c92fe1a9d490b7bbc06',
  tradingModule: 'trading',
  tradingCalcModule: 'trading_calc',
} as const;

// Trading Functions (from ABI)
export const TRADING_FUNCTIONS = {
  // Order Management
  PLACE_ORDER: 'place_order',
  PLACE_ORDER_V3: 'place_order_v3',
  CANCEL_ORDER: 'cancel_order',
  CANCEL_ORDER_V3: 'cancel_order_v3',
  
  // Position Management
  EXECUTE_EXIT_POSITION: 'execute_exit_position',
  EXECUTE_EXIT_POSITION_V2: 'execute_exit_position_v2',
  EXECUTE_EXIT_POSITION_V3: 'execute_exit_position_v3',
  
  // Risk Management
  UPDATE_POSITION_TP_SL: 'update_position_tp_sl',
  UPDATE_POSITION_TP_SL_V3: 'update_position_tp_sl_v3',
  
  // Order Execution
  EXECUTE_ORDER: 'execute_order',
  EXECUTE_ORDER_V2: 'execute_order_v2',
  EXECUTE_ORDER_V3: 'execute_order_v3',
  EXECUTE_ORDER_ALL: 'execute_order_all',
  EXECUTE_ORDER_ALL_V2: 'execute_order_all_v2',
  EXECUTE_ORDER_ALL_V3: 'execute_order_all_v3',
  EXECUTE_ORDER_SELF: 'execute_order_self',
  
  // Admin Functions
  INITIALIZE: 'initialize',
  INITIALIZE_V2: 'initialize_v2',
  INITIALIZE_USER_IF_NEEDED: 'initialize_user_if_needed',
  PAUSE: 'pause',
  RESTART: 'restart',
} as const;

// Event Types (from ABI)
export const EVENT_TYPES = {
  PLACE_ORDER_EVENT: 'PlaceOrderEvent',
  CANCEL_ORDER_EVENT: 'CancelOrderEvent',
  POSITION_EVENT: 'PositionEvent',
  UPDATE_TPSL_EVENT: 'UpdateTPSLEvent',
} as const;

// Market Configuration
export const MARKETS = {
  'APT/USD': {
    id: '1',
    name: 'APT/USD',
    baseAsset: 'APT',
    quoteAsset: 'USD',
    decimals: 8,
    minSize: 0.01,
    maxLeverage: 50,
  },
  'BTC/USD': {
    id: '2',
    name: 'BTC/USD',
    baseAsset: 'BTC',
    quoteAsset: 'USD',
    decimals: 8,
    minSize: 0.001,
    maxLeverage: 100,
  },
  'ETH/USD': {
    id: '3',
    name: 'ETH/USD',
    baseAsset: 'ETH',
    quoteAsset: 'USD',
    decimals: 8,
    minSize: 0.01,
    maxLeverage: 75,
  },
} as const;

// Trading Constants
export const TRADING_CONSTANTS = {
  // Order Types
  ORDER_TYPES: {
    MARKET: 'market',
    LIMIT: 'limit',
    STOP: 'stop',
    STOP_LIMIT: 'stop_limit',
  },
  
  // Position Sides
  POSITION_SIDES: {
    LONG: true,
    SHORT: false,
  },
  
  // Decimal Precision
  DECIMALS: {
    PRICE: 8,
    SIZE: 8,
    COLLATERAL: 8,
    PERCENTAGE: 2,
  },
  
  // Risk Parameters
  RISK: {
    MIN_LEVERAGE: 1,
    MAX_LEVERAGE: 100,
    LIQUIDATION_THRESHOLD: 0.9, // 90%
    MIN_COLLATERAL: 1, // USD
    MAX_POSITION_SIZE: 1000000, // USD
  },
  
  // Fee Structure
  FEES: {
    MAKER_FEE: 0.0005, // 0.05%
    TAKER_FEE: 0.001,  // 0.1%
    FUNDING_RATE_INTERVAL: 3600, // 1 hour in seconds
  },
} as const;

// Wallet Configuration
export const WALLET_CONFIG = {
  walletConnect: {
    projectId: process.env.EXPO_PUBLIC_WALLETCONNECT_PROJECT_ID,
    metadata: {
      name: APP_CONFIG.name,
      description: 'Aptos DeFi Trading Platform',
      url: 'https://prismx.app',
      icons: ['https://prismx.app/icon.png'],
    },
  },
  supportedWallets: ['Petra', 'Martian', 'Pontem', 'Fewcha'] as const,
  autoConnect: true,
  connectionTimeout: 30000, // 30 seconds
} as const;

// API Configuration
export const API_CONFIG = {
  // Price Oracles
  pyth: {
    endpoint: process.env.EXPO_PUBLIC_PYTH_ENDPOINT || 'https://hermes.pyth.network',
    aptUsdPriceId: '0x03ae4db29ed4ae33d323568895aa00337e658e348b37509f5372ae51f0af00d5',
  },
  
  switchboard: {
    endpoint: process.env.EXPO_PUBLIC_SWITCHBOARD_ENDPOINT || 'https://api.switchboard.xyz',
  },
  
  // External APIs
  coingecko: {
    apiKey: process.env.EXPO_PUBLIC_COINGECKO_API_KEY,
    baseUrl: 'https://api.coingecko.com/api/v3',
  },
  
  coinmarketcap: {
    apiKey: process.env.EXPO_PUBLIC_COINMARKETCAP_API_KEY,
    baseUrl: 'https://pro-api.coinmarketcap.com/v1',
  },
  
  // Request Configuration
  timeout: 10000, // 10 seconds
  retries: 3,
  retryDelay: 1000, // 1 second
} as const;

// UI Configuration
export const UI_CONFIG = {
  // Refresh Intervals
  refreshIntervals: {
    positions: 30000, // 30 seconds
    prices: 5000,     // 5 seconds
    events: 60000,    // 1 minute
    portfolio: 15000, // 15 seconds
  },
  
  // Animation Durations
  animations: {
    fast: 150,
    normal: 300,
    slow: 500,
  },
  
  // Breakpoints
  breakpoints: {
    xs: 0,
    sm: 576,
    md: 768,
    lg: 992,
    xl: 1200,
  },
  
  // Colors
  colors: {
    success: '#10b981',
    error: '#ef4444',
    warning: '#f59e0b',
    info: '#3b82f6',
    primary: '#6366f1',
  },
} as const;

// Development Configuration
export const DEV_CONFIG = {
  enableLogs: process.env.EXPO_PUBLIC_ENABLE_LOGS === 'true',
  enableDevMode: process.env.EXPO_PUBLIC_ENABLE_DEV_MODE === 'true',
  mockData: process.env.NODE_ENV === 'development',
  debugTransactions: process.env.NODE_ENV === 'development',
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  WALLET_NOT_CONNECTED: 'Wallet not connected',
  INSUFFICIENT_BALANCE: 'Insufficient balance',
  INVALID_AMOUNT: 'Invalid amount',
  NETWORK_ERROR: 'Network error occurred',
  TRANSACTION_FAILED: 'Transaction failed',
  POSITION_NOT_FOUND: 'Position not found',
  ORDER_NOT_FOUND: 'Order not found',
  MARKET_CLOSED: 'Market is closed',
  LEVERAGE_TOO_HIGH: 'Leverage exceeds maximum allowed',
  SIZE_TOO_SMALL: 'Position size below minimum',
  PRICE_IMPACT_TOO_HIGH: 'Price impact too high',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  WALLET_CONNECTED: 'Wallet connected successfully',
  ORDER_PLACED: 'Order placed successfully',
  POSITION_CLOSED: 'Position closed successfully',
  ORDER_CANCELLED: 'Order cancelled successfully',
  TPSL_UPDATED: 'Stop loss/Take profit updated',
} as const;

// Helper function to get market configuration
export const getMarketConfig = (marketName: string) => {
  return MARKETS[marketName as keyof typeof MARKETS];
};

// Helper function to build contract function identifier
export const buildFunctionId = (functionName: string, module: string = MERKLE_CONFIG.tradingModule) => {
  return `${MERKLE_CONFIG.contractAddress}::${module}::${functionName}`;
};

// Helper function to build event type identifier
export const buildEventType = (eventType: string, module: string = MERKLE_CONFIG.tradingModule) => {
  return `${MERKLE_CONFIG.contractAddress}::${module}::${eventType}`;
};

// Type exports for better TypeScript support
export type MarketName = keyof typeof MARKETS;
export type WalletName = typeof WALLET_CONFIG.supportedWallets[number];
export type OrderType = typeof TRADING_CONSTANTS.ORDER_TYPES[keyof typeof TRADING_CONSTANTS.ORDER_TYPES];
export type TradingFunction = typeof TRADING_FUNCTIONS[keyof typeof TRADING_FUNCTIONS];
export type EventType = typeof EVENT_TYPES[keyof typeof EVENT_TYPES];
