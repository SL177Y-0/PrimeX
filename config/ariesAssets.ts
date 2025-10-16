/**
 * Aries Markets Asset Configuration
 * Maps coin types to metadata for display and calculations
 */

export interface AssetMetadata {
  coinType: string;
  symbol: string;
  name: string;
  decimals: number;
  icon?: string;
  coingeckoId?: string;
}

// Main Aptos assets supported by Aries Markets
export const ARIES_ASSETS: Record<string, AssetMetadata> = {
  APT: {
    coinType: '0x1::aptos_coin::AptosCoin',
    symbol: 'APT',
    name: 'Aptos',
    decimals: 8,
    coingeckoId: 'aptos',
  },
  
  USDC: {
    coinType: '0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::USDC',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    coingeckoId: 'usd-coin',
  },
  
  USDT: {
    coinType: '0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::USDT',
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 6,
    coingeckoId: 'tether',
  },
  
  WETH: {
    coinType: '0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::WETH',
    symbol: 'WETH',
    name: 'Wrapped Ethereum',
    decimals: 8,
    coingeckoId: 'weth',
  },
  
  WBTC: {
    coinType: '0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::WBTC',
    symbol: 'WBTC',
    name: 'Wrapped Bitcoin',
    decimals: 8,
    coingeckoId: 'wrapped-bitcoin',
  },
  
  DAI: {
    coinType: '0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::DAI',
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    decimals: 8,
    coingeckoId: 'dai',
  },
  
  // Add more assets as they are added to Aries Markets
};

// Reverse lookup: coin type to symbol
export const COIN_TYPE_TO_SYMBOL: Record<string, string> = Object.entries(ARIES_ASSETS).reduce(
  (acc, [symbol, metadata]) => {
    acc[metadata.coinType] = symbol;
    return acc;
  },
  {} as Record<string, string>
);

// Get asset metadata by coin type
export function getAssetMetadata(coinType: string): AssetMetadata | null {
  const symbol = COIN_TYPE_TO_SYMBOL[coinType];
  return symbol ? ARIES_ASSETS[symbol] : null;
}

// Get asset metadata by symbol
export function getAssetBySymbol(symbol: string): AssetMetadata | null {
  return ARIES_ASSETS[symbol.toUpperCase()] || null;
}

// Format amount for display
export function formatAssetAmount(amount: number | string, decimals: number, maxDecimals: number = 4): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numAmount)) return '0';
  
  // For very small amounts, show more decimals
  if (numAmount < 0.01 && numAmount > 0) {
    return numAmount.toFixed(Math.min(decimals, 8));
  }
  
  return numAmount.toFixed(maxDecimals);
}

// Convert display amount to base units
export function toBaseUnits(displayAmount: number, decimals: number): string {
  return Math.floor(displayAmount * Math.pow(10, decimals)).toString();
}

// Convert base units to display amount
export function fromBaseUnits(baseUnits: string, decimals: number): number {
  return parseFloat(baseUnits) / Math.pow(10, decimals);
}

// Check if asset is a stablecoin
export function isStablecoin(symbol: string): boolean {
  const stablecoins = ['USDC', 'USDT', 'DAI', 'BUSD', 'FRAX'];
  return stablecoins.includes(symbol.toUpperCase());
}

// Get asset icon (placeholder - can be replaced with actual icon URLs)
export function getAssetIcon(symbol: string): string {
  // TODO: Replace with actual icon URLs or import local SVGs
  return `https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/${symbol.toLowerCase()}/logo.png`;
}

// Get all supported assets
export function getAllAssets(): AssetMetadata[] {
  return Object.values(ARIES_ASSETS);
}

// Get assets by type (stablecoin, volatile, etc.)
export function getAssetsByType(type: 'stablecoin' | 'volatile'): AssetMetadata[] {
  return getAllAssets().filter(asset => {
    if (type === 'stablecoin') {
      return isStablecoin(asset.symbol);
    } else {
      return !isStablecoin(asset.symbol);
    }
  });
}

export default {
  ARIES_ASSETS,
  COIN_TYPE_TO_SYMBOL,
  getAssetMetadata,
  getAssetBySymbol,
  formatAssetAmount,
  toBaseUnits,
  fromBaseUnits,
  isStablecoin,
  getAssetIcon,
  getAllAssets,
  getAssetsByType,
};
