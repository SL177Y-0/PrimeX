// App Configuration Constants
export const APP_CONFIG = {
  name: process.env.EXPO_PUBLIC_APP_NAME || 'PrismX',
  scheme: process.env.EXPO_PUBLIC_APP_SCHEME || 'prismx',
  version: '1.0.0',
  deepLinkBase: process.env.EXPO_PUBLIC_DEEP_LINK_BASE || 'prismx://',
} as const;

// Aptos Network Configuration
// NOTE: Merkle Trade only exists on MAINNET, not testnet
export const APTOS_CONFIG = {
  network: process.env.EXPO_PUBLIC_APTOS_NETWORK || 'mainnet', // Force mainnet for Merkle Trade
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
  tradingModule: 'managed_trading',
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

// Merkle Asset Type Arguments (from successful mainnet transaction analysis)
export const MERKLE_ASSET_TYPES = {
  // Base asset type address - using standard Aptos types
  ASSET_ADDRESS: '0x1::aptos_coin',
  
  // Pair types - using correct Merkle Trade pair_types module structure
  APT_USD: '0x5ae6789dd2fec1a9ec9cccfb3acaf12e93d432f0a3a42c92fe1a9d490b7bbc06::pair_types::APT_USD',
  BTC_USD: '0x5ae6789dd2fec1a9ec9cccfb3acaf12e93d432f0a3a42c92fe1a9d490b7bbc06::pair_types::BTC_USD',
  ETH_USD: '0x5ae6789dd2fec1a9ec9cccfb3acaf12e93d432f0a3a42c92fe1a9d490b7bbc06::pair_types::ETH_USD',
  SOL_USD: '0x5ae6789dd2fec1a9ec9cccfb3acaf12e93d432f0a3a42c92fe1a9d490b7bbc06::pair_types::SOL_USD',
  DOGE_USD: '0x5ae6789dd2fec1a9ec9cccfb3acaf12e93d432f0a3a42c92fe1a9d490b7bbc06::pair_types::DOGE_USD',
  
  // Collateral types - using fa_box wrapper types
  USDC: '0x5ae6789dd2fec1a9ec9cccfb3acaf12e93d432f0a3a42c92fe1a9d490b7bbc06::fa_box::W_USDC',
} as const;

// Market Configuration
// NOTE: Keys use underscore format (APT_USD) to match Merkle's pair naming convention
export const MARKETS = {
  'APT_USD': {
    id: '1',
    name: 'APT/USDC',
    displayName: 'APT/USDC',
    baseAsset: 'APT',
    quoteAsset: 'USDC',
    decimals: 8,
    minSize: 2, // 2 USDC minimum like official Merkle
    maxLeverage: 150,
    minLeverage: 3,
    // Correct order from official Merkle.trade: [PairType, CollateralType] - APT_USD pair, USDC collateral
    typeArguments: [MERKLE_ASSET_TYPES.APT_USD, MERKLE_ASSET_TYPES.USDC],
  },
  'BTC_USD': {
    id: '2',
    name: 'BTC/USDC',
    displayName: 'BTC/USDC',
    baseAsset: 'BTC',
    quoteAsset: 'USDC',
    decimals: 8,
    minSize: 2, // 2 USDC minimum like official Merkle
    maxLeverage: 150,
    minLeverage: 3,
    // Merkle type arguments: [PairType, CollateralType] - BTC_USD pair, USDC collateral
    typeArguments: [MERKLE_ASSET_TYPES.BTC_USD, MERKLE_ASSET_TYPES.USDC],
  },
  'ETH_USD': {
    id: '3',
    name: 'ETH/USDC',
    displayName: 'ETH/USDC',
    baseAsset: 'ETH',
    quoteAsset: 'USDC',
    decimals: 8,
    minSize: 2, // 2 USDC minimum like official Merkle
    maxLeverage: 150,
    minLeverage: 3,
    typeArguments: [MERKLE_ASSET_TYPES.ETH_USD, MERKLE_ASSET_TYPES.USDC],
  },
  'SOL_USD': {
    id: '4',
    name: 'SOL/USDC',
    displayName: 'SOL/USDC',
    baseAsset: 'SOL',
    quoteAsset: 'USDC',
    decimals: 8,
    minSize: 2, // 2 USDC minimum like official Merkle
    maxLeverage: 150,
    minLeverage: 3,
    typeArguments: [MERKLE_ASSET_TYPES.SOL_USD, MERKLE_ASSET_TYPES.USDC],
  },
  'DOGE_USD': {
    id: '5',
    name: 'DOGE/USDC',
    displayName: 'DOGE/USDC',
    baseAsset: 'DOGE',
    quoteAsset: 'USDC',
    decimals: 8,
    minSize: 2, // 2 USDC minimum like official Merkle
    maxLeverage: 150,
    minLeverage: 3,
    typeArguments: [MERKLE_ASSET_TYPES.DOGE_USD, MERKLE_ASSET_TYPES.USDC],
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
    MIN_LEVERAGE: 3,
    MAX_LEVERAGE: 150,
    LIQUIDATION_THRESHOLD: 0.9, // 90%
    MIN_COLLATERAL: 2, // USDC minimum like official Merkle.trade
    MAX_COLLATERAL: 10000, // 10k USDC maximum to match position limits
    MAX_POSITION_SIZE: 1500000, // 1.5M USD maximum (10k collateral × 150x leverage)
  },
  
  // Fee Structure - Official Merkle Trade Rates
  FEES: {
    MAKER_FEE: 0.0003, // 0.03% for BTC/ETH (official Merkle rate)
    TAKER_FEE: 0.0006, // 0.06% for BTC/ETH (official Merkle rate)
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

// Panora Swap Configuration
// Panora Exchange Configuration
// Based on official docs: https://docs.panora.exchange/developer/swap/api
export const PANORA_CONFIG = {
  contractAddress: '0x1c3206329806286fd2223647c9f9b130e66baeb6d7224a18c1f642ffe48f3b4c',
  apiUrl: 'https://api.panora.exchange/swap',
  apiKey: 'a4^KV_EaTf4MW#ZdvgGKX#HUD^3IFEAOV_kzpIE^3BQGA8pDnrkT7JcIy#HNlLGi', // Official public API key
  chainId: 1, // Aptos Mainnet (1 = mainnet, 2 = testnet)
  defaultSlippage: 1, // 1% default slippage
  maxSlippage: 50, // 50% maximum
  minSlippage: 0.1, // 0.1% minimum
} as const;

// Swap Token Configuration - Panora API Token Addresses
// APT uses shorthand "0xa" for Panora API compatibility
// Other tokens use full Move resource addresses
export const SWAP_TOKENS = {
  APT: {
    address: '0xa', // Panora shorthand for native APT (0x1::aptos_coin::AptosCoin)
    symbol: 'APT',
    name: 'Aptos',
    decimals: 8,
    logoUrl: 'https://assets.coingecko.com/coins/images/26455/small/aptos_round.png',
    isNative: true,
  },
  USDC: {
    // Panora API expects base address only (from official docs example)
    // This is the correct LayerZero bridged USDC contract on Aptos mainnet
    address: '0xbae207659db88bea0cbead6da0ed00aac12edcdda169e591cd41c94180b46f3b',
    symbol: 'USDC',
    name: 'USD Coin (LayerZero)',
    decimals: 6,
    logoUrl: 'https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png',
    isNative: false,
  },
} as const;

// Popular swap pairs - Only APT/USDC for now
export const POPULAR_SWAP_PAIRS = [
  { from: 'APT', to: 'USDC' },
  { from: 'USDC', to: 'APT' },
] as const;

// Swap Constants
export const SWAP_CONSTANTS = {
  MIN_AMOUNT: 0.001, // Minimum swap amount
  MAX_AMOUNT: 1000000, // Maximum swap amount
  QUOTE_REFRESH_INTERVAL: 10000, // 10 seconds
  PRICE_IMPACT_WARNING: 5, // 5% price impact warning
  HIGH_PRICE_IMPACT: 15, // 15% high price impact
  DEFAULT_GAS_LIMIT: 100000,
  GAS_UNIT_PRICE: 100,
} as const;

// Amnis Liquid Staking Configuration
// Based on official Amnis Finance protocol: https://amnis.finance
// Contract address verified on mainnet explorer
export const AMNIS_CONFIG = {
  contractAddress: '0x111ae3e5bc816a5e63c2da97d0aa3886519e0cd5e4b046659fa35796bd11542a',
  
  // Contract Modules
  modules: {
    router: 'router', // Main entry point for user transactions
    amaptToken: 'amapt_token', // amAPT token module
    staptToken: 'stapt_token', // stAPT token module
    delegationManager: 'delegation_manager', // Validator delegation
    withdrawal: 'withdrawal', // Withdrawal queue management
    packageManager: 'package_manager', // Contract upgrades
    treasury: 'treasury', // Protocol treasury
    aptosGovernance: 'aptos_governance', // Governance participation
  },
  
  // Entry Functions (from router.move)
  functions: {
    // APT -> amAPT (1:1 liquid staking) - ENTRY FUNCTION
    depositEntry: 'deposit_entry',
    // APT -> stAPT directly - ENTRY FUNCTION
    depositAndStakeEntry: 'deposit_and_stake_entry',
    // amAPT -> stAPT (auto-compounding vault) - ENTRY FUNCTION
    stakeEntry: 'stake_entry',
    // stAPT -> amAPT (redeem from vault) - ENTRY FUNCTION
    unstakeEntry: 'unstake_entry',
    // amAPT -> APT delayed (30 days, no fee) - ENTRY FUNCTION
    requestWithdrawEntry: 'request_withdrawal_entry',
    claimWithdrawEntry: 'withdraw_entry',
    // View functions
    totalApt: 'total_apt',
    stakePools: 'stake_pools',
  },
  
  // Token Types
  tokenTypes: {
    APT: '0x1::aptos_coin::AptosCoin',
    amAPT: '0x111ae3e5bc816a5e63c2da97d0aa3886519e0cd5e4b046659fa35796bd11542a::amapt_token::AmnisApt',
    stAPT: '0x111ae3e5bc816a5e63c2da97d0aa3886519e0cd5e4b046659fa35796bd11542a::stapt_token::StakedApt',
  },
  
  // Token Decimals (all use 8 decimals like APT)
  decimals: {
    APT: 8,
    amAPT: 8,
    stAPT: 8,
  },
  
  // Minimum Amounts
  minAmounts: {
    stake: 0.01, // 0.01 APT minimum (no strict minimum)
    unstake: 0.01, // 0.01 amAPT minimum
    staptVault: 0.01, // 0.01 amAPT minimum for stAPT vault
  },
  
  // Protocol Parameters
  unbondingPeriod: 30 * 24 * 60 * 60, // 30 days in seconds (Aptos lockup period)
  depositFeeBps: 8, // <0.0008% deposit fee (refunded after epoch)
  performanceFeeBps: 700, // 7% performance fee on rewards
  
  // APR Estimates (from official docs and analytics)
  estimatedAPR: {
    amAPT: 7.89, // Current 1:1 staking APR (updated)
    stAPT: 10.5, // Auto-compounding vault APR
  },
  
  // API Endpoints
  api: {
    baseUrl: 'https://api.amnis.finance',
    endpoints: {
      totalSupply: '/api/v1/am-apt/total-supply',
      circulatingSupply: '/api/v1/am-apt/circulating-supply',
    },
  },
  
  // External APIs for metrics
  externalApis: {
    coingecko: {
      priceUrl: 'https://api.coingecko.com/api/v3/simple/price',
      tokenId: 'amnis-aptos',
      historicalUrl: 'https://api.coingecko.com/api/v3/coins/amnis-aptos/market_chart',
    },
    defiLlama: {
      protocolUrl: 'https://api.llama.fi/protocol/amnis-finance',
    },
  },
  
  // Market Stats (updated from on-chain data - Jan 2025)
  stats: {
    totalStakers: 460000, // ~460k stakers (from Aptos Foundation)
    marketShare: 82, // >82% of Aptos liquid staking market
    tvlUSD: 130000000, // ~$130M TVL (current)
    totalAptStaked: 33000000, // ~33M APT staked
    holders: 43354, // On-chain verified holders
  },
} as const;

// Staking Constants
export const STAKING_CONSTANTS = {
  REFRESH_INTERVAL: 30000, // 30 seconds
  TRANSACTION_TIMEOUT: 60000, // 60 seconds
  DEFAULT_SLIPPAGE: 1, // 1% for instant unstake
  HIGH_SLIPPAGE_WARNING: 5, // 5% warning threshold
} as const;

// Type exports for better TypeScript support
export type MarketName = keyof typeof MARKETS;
export type WalletName = typeof WALLET_CONFIG.supportedWallets[number];
export type OrderType = typeof TRADING_CONSTANTS.ORDER_TYPES[keyof typeof TRADING_CONSTANTS.ORDER_TYPES];
export type TradingFunction = typeof TRADING_FUNCTIONS[keyof typeof TRADING_FUNCTIONS];
export type EventType = typeof EVENT_TYPES[keyof typeof EVENT_TYPES];
export type SwapToken = keyof typeof SWAP_TOKENS;
export type AmnisTokenType = 'APT' | 'amAPT' | 'stAPT';
