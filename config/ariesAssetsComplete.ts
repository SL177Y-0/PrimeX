/**
 * Aries Markets Complete Asset Configuration
 * Based on official Aries Markets platform data (October 2025)
 * 
 * This file contains ALL assets supported by Aries Markets with complete metadata
 * including risk parameters, decimals, and pricing information.
 */

export interface AriesAssetMetadata {
  coinType: string;              // Full Move type address
  symbol: string;                // Display symbol (e.g., "APT", "USDC")
  name: string;                  // Full asset name
  decimals: number;              // Token decimals (6 or 8)
  coingeckoId?: string;          // CoinGecko API identifier
  logoUrl?: string;              // Asset logo URL
  isPaired: boolean;             // true = paired pool, false = isolated pool
  isStablecoin: boolean;         // true for stablecoins
  
  // Risk Parameters (base values, may be overridden by E-Mode)
  loanToValue: number;           // LTV ratio (0-1, e.g., 0.70 = 70%)
  liquidationThreshold: number;  // Liquidation threshold (0-1, e.g., 0.75 = 75%)
  borrowFactor: number;          // Borrow factor for two-sided risk (0-1)
  liquidationBonus: number;      // Bonus for liquidators (e.g., 0.05 = 5%)
  
  // Fee Parameters
  borrowFeeHundredthBips: number;    // Borrow fee (in 1/100 bps)
  flashLoanFeeHundredthBips: number; // Flash loan fee
  
  // Limits
  depositLimit: string;          // Maximum deposit limit (in base units)
  borrowLimit: string;           // Maximum borrow limit (in base units)
}

/**
 * Complete list of ALL Aries Markets assets
 * Data sourced from official Aries Markets platform
 */
export const ARIES_ASSETS: Record<string, AriesAssetMetadata> = {
  // ============================================================================
  // PAIRED POOL ASSETS (Main Pool - Cross-Margin)
  // ============================================================================
  
  USDT: {
    coinType: '0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::USDT',
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 6,
    coingeckoId: 'tether',
    logoUrl: 'https://tether.to/images/logoCircle.png',
    isPaired: true,
    isStablecoin: true,
    loanToValue: 0.80,
    liquidationThreshold: 0.85,
    borrowFactor: 1.0,
    liquidationBonus: 0.03,
    borrowFeeHundredthBips: 10,
    flashLoanFeeHundredthBips: 0,
    depositLimit: '300000000000000',
    borrowLimit: '230000000000000',
  },
  
  USDC: {
    coinType: '0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::USDC',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    coingeckoId: 'usd-coin',
    logoUrl: 'https://cdn.jsdelivr.net/gh/PanoraExchange/Aptos-Tokens@main/logos/USDC.svg',
    isPaired: true,
    isStablecoin: true,
    loanToValue: 0.80,
    liquidationThreshold: 0.85,
    borrowFactor: 1.0,
    liquidationBonus: 0.03,
    borrowFeeHundredthBips: 10,
    flashLoanFeeHundredthBips: 0,
    depositLimit: '300000000000000',
    borrowLimit: '230000000000000',
  },
  
  APT: {
    coinType: '0x1::aptos_coin::AptosCoin',
    symbol: 'APT',
    name: 'Aptos',
    decimals: 8,
    coingeckoId: 'aptos',
    logoUrl: 'https://assets.panora.exchange/tokens/aptos/apt.svg',
    isPaired: true,
    isStablecoin: false,
    loanToValue: 0.70,
    liquidationThreshold: 0.75,
    borrowFactor: 1.0,
    liquidationBonus: 0.03,
    borrowFeeHundredthBips: 10,
    flashLoanFeeHundredthBips: 0,
    depositLimit: '100000000000000',
    borrowLimit: '80000000000000',
  },
  
  WBTC: {
    coinType: '0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::WBTC',
    symbol: 'WBTC',
    name: 'Wrapped Bitcoin',
    decimals: 6,
    coingeckoId: 'wrapped-bitcoin',
    logoUrl: 'https://cdn.jsdelivr.net/gh/PanoraExchange/Aptos-Tokens@main/logos/WBTC.png',
    isPaired: true,
    isStablecoin: false,
    loanToValue: 0.61,
    liquidationThreshold: 0.66,
    borrowFactor: 0.90,
    liquidationBonus: 0.03,
    borrowFeeHundredthBips: 10,
    flashLoanFeeHundredthBips: 30,
    depositLimit: '5000000000',
    borrowLimit: '4000000000',
  },
  
  xBTC: {
    coinType: '0x04c8224db7414ace4a2c666943dff3cec6c7577424aca3d2e49c5db5ca7e32b9::xbtc::XBTC',
    symbol: 'xBTC',
    name: 'xBTC',
    decimals: 8,
    coingeckoId: 'wrapped-bitcoin',
    logoUrl: 'https://imagedelivery.net/EkHGc8d8EsSm3q13Qvkcjw/092099c5-543c-49ca-5166-3c0dda98a300/middle',
    isPaired: true,
    isStablecoin: false,
    loanToValue: 0.62,
    liquidationThreshold: 0.67,
    borrowFactor: 0.90,
    liquidationBonus: 0.03,
    borrowFeeHundredthBips: 10,
    flashLoanFeeHundredthBips: 0,
    depositLimit: '5000000000',
    borrowLimit: '4000000000',
  },
  
  aBTC: {
    coinType: '0x4e1854f6d332c9525e258fb6e66f84b6af8aba687bbcb832a24768c4e175feec::abtc::ABTC',
    symbol: 'aBTC',
    name: 'Avalon BTC',
    decimals: 8,
    coingeckoId: 'wrapped-bitcoin',
    logoUrl: 'https://assets.panora.exchange/tokens/aptos/aBTC.svg',
    isPaired: true,
    isStablecoin: false,
    loanToValue: 0.09,
    liquidationThreshold: 0.12,
    borrowFactor: 0.70,
    liquidationBonus: 0.10,
    borrowFeeHundredthBips: 10,
    flashLoanFeeHundredthBips: 0,
    depositLimit: '1000000000',
    borrowLimit: '500000000',
  },
  
  WETH: {
    coinType: '0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::WETH',
    symbol: 'WETH',
    name: 'Wrapped Ether',
    decimals: 6,
    coingeckoId: 'ethereum',
    logoUrl: 'https://assets.panora.exchange/tokens/aptos/whWETH.png',
    isPaired: true,
    isStablecoin: false,
    loanToValue: 0.70,
    liquidationThreshold: 0.75,
    borrowFactor: 0.85,
    liquidationBonus: 0.03,
    borrowFeeHundredthBips: 10,
    flashLoanFeeHundredthBips: 0,
    depositLimit: '10000000000',
    borrowLimit: '8000000000',
  },
  
  zWETH: {
    coinType: '0xcc8a89c8dce9693d354449f1f73e60e14e347417854f029db5bc8e7454008abb::coin::T',
    symbol: 'zWETH',
    name: 'LayerZero Wrapped ETH',
    decimals: 6,
    coingeckoId: 'ethereum',
    logoUrl: 'https://assets.panora.exchange/tokens/aptos/lzWETH.png',
    isPaired: true,
    isStablecoin: false,
    loanToValue: 0.70,
    liquidationThreshold: 0.75,
    borrowFactor: 0.85,
    liquidationBonus: 0.03,
    borrowFeeHundredthBips: 10,
    flashLoanFeeHundredthBips: 0,
    depositLimit: '10000000000',
    borrowLimit: '8000000000',
  },
  
  stAPT: {
    coinType: '0x111ae3e5bc816a5e63c2da97d0aa3886519e0cd5e4b046659fa35796bd11542a::stapt_token::StakedApt',
    symbol: 'stAPT',
    name: 'Staked APT (Amnis)',
    decimals: 8,
    coingeckoId: 'amnis-staked-aptos-coin',
    logoUrl: 'https://assets.panora.exchange/tokens/aptos/stAptAmnis.svg',
    isPaired: true,
    isStablecoin: false,
    loanToValue: 0.65,
    liquidationThreshold: 0.45,
    borrowFactor: 0.85,
    liquidationBonus: 0.05,
    borrowFeeHundredthBips: 10,
    flashLoanFeeHundredthBips: 0,
    depositLimit: '50000000000000',
    borrowLimit: '40000000000000',
  },
  
  zWBTC: {
    coinType: '0xdd89c0e695df0692205912fb69fc290418bed0dbe6e4573d744a6d5e6bab6c13::coin::T',
    symbol: 'zWBTC',
    name: 'LayerZero Wrapped BTC',
    decimals: 8,
    coingeckoId: 'wrapped-bitcoin',
    logoUrl: 'https://assets.panora.exchange/tokens/aptos/lzWBTC.png',
    isPaired: true,
    isStablecoin: false,
    loanToValue: 0.60,
    liquidationThreshold: 0.65,
    borrowFactor: 0.90,
    liquidationBonus: 0.03,
    borrowFeeHundredthBips: 10,
    flashLoanFeeHundredthBips: 0,
    depositLimit: '5000000000',
    borrowLimit: '4000000000',
  },
  
  CAKE: {
    coinType: '0x159df6b7689437016108a019fd5bef736bac692b6d4a1f10c941f6fbb9a74ca6::oft::CakeOFT',
    symbol: 'CAKE',
    name: 'PancakeSwap',
    decimals: 8,
    coingeckoId: 'pancakeswap-token',
    logoUrl: 'https://app.ariesmarkets.xyz/static/pancakeswap.548f49d0.jpeg',
    isPaired: true,
    isStablecoin: false,
    loanToValue: 0.50,
    liquidationThreshold: 0.55,
    borrowFactor: 0.80,
    liquidationBonus: 0.05,
    borrowFeeHundredthBips: 10,
    flashLoanFeeHundredthBips: 0,
    depositLimit: '50000000000000',
    borrowLimit: '40000000000000',
  },
  
  amAPT: {
    coinType: '0x111ae3e5bc816a5e63c2da97d0aa3886519e0cd5e4b046659fa35796bd11542a::amapt_token::AmnisApt',
    symbol: 'amAPT',
    name: 'Amnis APT',
    decimals: 8,
    coingeckoId: 'amnis-aptos',
    logoUrl: 'https://assets.panora.exchange/tokens/aptos/amAPT.png',
    isPaired: true,
    isStablecoin: false,
    loanToValue: 0.40,
    liquidationThreshold: 0.45,
    borrowFactor: 0.85,
    liquidationBonus: 0.05,
    borrowFeeHundredthBips: 10,
    flashLoanFeeHundredthBips: 0,
    depositLimit: '30000000000000',
    borrowLimit: '25000000000000',
  },
  
  sUSDe: {
    coinType: '0xb00b643e390c638e1c9ccfe2b5d54d9cbbf77110e0d72ec6b0af0b3399a23b72::susde::SUSDe',
    symbol: 'sUSDe',
    name: 'Staked USDe',
    decimals: 6,
    coingeckoId: 'ethena-staked-usde',
    logoUrl: 'https://cdn.jsdelivr.net/gh/PanoraExchange/Aptos-Tokens@main/logos/sUSDe.png',
    isPaired: true,
    isStablecoin: true,
    loanToValue: 0.70,
    liquidationThreshold: 0.75,
    borrowFactor: 0.95,
    liquidationBonus: 0.03,
    borrowFeeHundredthBips: 10,
    flashLoanFeeHundredthBips: 0,
    depositLimit: '10000000000',
    borrowLimit: '8000000000',
  },
  
  // ============================================================================
  // WRAPPED COIN VARIANTS (For Pyth Price Feed Compatibility)
  // ============================================================================
  
  wUSDC: {
    coinType: '0x9770fa9c725cbd97eb50b2be5f7416efdfd1f1554beb0750d4dae4c64e860da3::wrapped_coins::WrappedUSDC',
    symbol: 'wUSDC',
    name: 'Wrapped USDC',
    decimals: 6,
    coingeckoId: 'usd-coin',
    logoUrl: 'https://cdn.jsdelivr.net/gh/PanoraExchange/Aptos-Tokens@main/logos/USDC.svg',
    isPaired: true,
    isStablecoin: true,
    loanToValue: 0.80,
    liquidationThreshold: 0.85,
    borrowFactor: 1.0,
    liquidationBonus: 0.03,
    borrowFeeHundredthBips: 10,
    flashLoanFeeHundredthBips: 0,
    depositLimit: '300000000000000',
    borrowLimit: '230000000000000',
  },

  zUSDC: {
    coinType: '0xbae207659db88bea0cbead6da0ed00aac12edcdda169e591cd41c94180b46f3b::coin::T',
    symbol: 'zUSDC',
    name: 'LayerZero USDC',
    decimals: 6,
    coingeckoId: 'usd-coin',
    logoUrl: 'https://cdn.jsdelivr.net/gh/PanoraExchange/Aptos-Tokens@main/logos/USDC.svg',
    isPaired: true,
    isStablecoin: true,
    loanToValue: 0.80,
    liquidationThreshold: 0.85,
    borrowFactor: 1.0,
    liquidationBonus: 0.03,
    borrowFeeHundredthBips: 10,
    flashLoanFeeHundredthBips: 0,
    depositLimit: '300000000000000',
    borrowLimit: '230000000000000',
  },

  wUSDT: {
    coinType: '0x9770fa9c725cbd97eb50b2be5f7416efdfd1f1554beb0750d4dae4c64e860da3::fa_to_coin_wrapper::WrappedUSDT',
    symbol: 'wUSDT',
    name: 'Wrapped USDT',
    decimals: 6,
    coingeckoId: 'tether',
    logoUrl: 'https://tether.to/images/logoCircle.png',
    isPaired: true,
    isStablecoin: true,
    loanToValue: 0.80,
    liquidationThreshold: 0.85,
    borrowFactor: 1.0,
    liquidationBonus: 0.03,
    borrowFeeHundredthBips: 10,
    flashLoanFeeHundredthBips: 0,
    depositLimit: '300000000000000',
    borrowLimit: '230000000000000',
  },

  // ============================================================================
  // MERKLE LP POOL ASSETS (Isolated Pool)
  // ============================================================================
  
  MKLP: {
    coinType: '0xc91d826e29a3183eb3b6f6aa3a722089fdffb8e9642b94c5fcd4c48d035c0080::type::MKLP',
    symbol: 'MKLP',
    name: 'Merkle LP Token',
    decimals: 8,
    coingeckoId: '',
    logoUrl: 'https://assets.panora.exchange/tokens/aptos/mklp.png',
    isPaired: false,  // Isolated pool
    isStablecoin: false,
    loanToValue: 0.15,
    liquidationThreshold: 0.20,
    borrowFactor: 0.60,
    liquidationBonus: 0.10,
    borrowFeeHundredthBips: 10,
    flashLoanFeeHundredthBips: 0,
    depositLimit: '1000000000000',
    borrowLimit: '500000000000',
  },
};

// ============================================================================
// E-MODE CATEGORIES
// ============================================================================

export interface EModeCategory {
  id: string;
  label: string;
  assets: string[];              // Asset symbols in this category
  loanToValue: number;           // Enhanced LTV for E-Mode
  liquidationThreshold: number;   // Enhanced liquidation threshold
  liquidationBonus: number;      // Liquidation bonus for category
}

export const EMODE_CATEGORIES: Record<string, EModeCategory> = {
  STABLES: {
    id: 'STABLES',
    label: 'Stablecoins',
    assets: ['USDT', 'USDC', 'sUSDe'],
    loanToValue: 0.90,
    liquidationThreshold: 0.93,
    liquidationBonus: 0.02,
  },
  
  APT_FAMILY: {
    id: 'APT_FAMILY',
    label: 'Aptos Ecosystem',
    assets: ['APT', 'stAPT', 'amAPT'],
    loanToValue: 0.80,
    liquidationThreshold: 0.85,
    liquidationBonus: 0.03,
  },
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get asset metadata by coin type
 */
export function getAssetByCoinType(coinType: string): AriesAssetMetadata | null {
  const entry = Object.entries(ARIES_ASSETS).find(([_, asset]) => asset.coinType === coinType);
  return entry ? entry[1] : null;
}

/**
 * Get asset metadata by symbol
 */
export function getAssetBySymbol(symbol: string): AriesAssetMetadata | null {
  return ARIES_ASSETS[symbol.toUpperCase()] || null;
}

/**
 * Get all paired pool assets
 */
export function getPairedAssets(): AriesAssetMetadata[] {
  return Object.values(ARIES_ASSETS).filter(asset => asset.isPaired);
}

/**
 * Get all isolated pool assets
 */
export function getIsolatedAssets(): AriesAssetMetadata[] {
  return Object.values(ARIES_ASSETS).filter(asset => !asset.isPaired);
}

/**
 * Get all stablecoin assets
 */
export function getStablecoins(): AriesAssetMetadata[] {
  return Object.values(ARIES_ASSETS).filter(asset => asset.isStablecoin);
}

/**
 * Check if an asset is a stablecoin
 */
export function isStablecoin(symbol: string): boolean {
  const asset = getAssetBySymbol(symbol);
  return asset?.isStablecoin ?? false;
}

/**
 * Format asset amount for display
 */
export function formatAssetAmount(
  amount: number | string,
  decimals: number,
  maxDecimals: number = 4
): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numAmount)) return '0';
  
  // For very small amounts, show more decimals
  if (numAmount < 0.01 && numAmount > 0) {
    return numAmount.toFixed(Math.min(decimals, 8));
  }
  
  return numAmount.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
  });
}

/**
 * Convert display amount to base units (lamports)
 */
export function toBaseUnits(displayAmount: number, decimals: number): string {
  return Math.floor(displayAmount * Math.pow(10, decimals)).toString();
}

/**
 * Convert base units to display amount
 */
export function fromBaseUnits(baseUnits: string | number, decimals: number): number {
  const units = typeof baseUnits === 'string' ? BigInt(baseUnits) : BigInt(Math.floor(baseUnits));
  return Number(units) / Math.pow(10, decimals);
}

/**
 * Get E-Mode category for an asset
 */
export function getAssetEModeCategory(symbol: string): EModeCategory | null {
  const category = Object.values(EMODE_CATEGORIES).find(cat => 
    cat.assets.includes(symbol.toUpperCase())
  );
  return category || null;
}

/**
 * Check if portfolio is eligible for E-Mode
 */
export function isEModeEligible(
  depositSymbols: string[],
  borrowSymbols: string[],
  category: EModeCategory
): boolean {
  const allSymbols = [...depositSymbols, ...borrowSymbols];
  return allSymbols.every(symbol => category.assets.includes(symbol.toUpperCase()));
}

export default {
  ARIES_ASSETS,
  EMODE_CATEGORIES,
  getAssetByCoinType,
  getAssetBySymbol,
  getPairedAssets,
  getIsolatedAssets,
  getStablecoins,
  isStablecoin,
  formatAssetAmount,
  toBaseUnits,
  fromBaseUnits,
  getAssetEModeCategory,
  isEModeEligible,
};
