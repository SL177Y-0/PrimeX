/**
 * Application Configuration
 * Controls various app behaviors and feature flags
 */

export const APP_CONFIG = {
  // Data source configuration
  USE_REAL_BLOCKCHAIN_DATA: true, // Using real Merkle Trade SDK
  USE_MOCK_POSITIONS: false, // Use real data from official SDK
  
  // Development settings
  ENABLE_DEBUG_LOGS: true,
  ENABLE_PERFORMANCE_MONITORING: false,
  
  // Real-time updates
  POSITION_REFRESH_INTERVAL: 30000, // 30 seconds
  PRICE_UPDATE_INTERVAL: 5000, // 5 seconds
  
  // UI settings
  DEFAULT_LEVERAGE: 150,
  DEFAULT_COLLATERAL: 2, // USDC
  MAX_POSITION_SIZE: 1500000, // USDC
  MIN_POSITION_SIZE: 2, // USDC
  
  // Network settings
  NETWORK: 'testnet' as 'mainnet' | 'testnet' | 'devnet',
  
  // Feature flags
  FEATURES: {
    CLOSE_POSITION: true,
    SL_TP_MANAGEMENT: true,
    PARTIAL_CLOSE: true,
    REAL_TIME_UPDATES: false, // Enable when WebSocket is ready
    POSITION_HISTORY: true,
    ADVANCED_CHARTS: true,
  }
} as const;

export type AppConfig = typeof APP_CONFIG;
