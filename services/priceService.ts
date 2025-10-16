/**
 * Price Service
 * Fetches asset prices from various sources
 * Currently uses CoinGecko API with fallback to mock prices
 */

import { ARIES_ASSETS } from '../config/ariesAssets';

// Price cache
const priceCache = new Map<string, { price: number; timestamp: number }>();
const CACHE_DURATION = 30000; // 30 seconds

// CoinGecko API (free tier, no API key required)
const COINGECKO_API = 'https://api.coingecko.com/api/v3';

// Mock prices for development
const MOCK_PRICES: Record<string, number> = {
  APT: 10.50,
  USDC: 1.00,
  USDT: 1.00,
  WETH: 2500.00,
  WBTC: 45000.00,
  DAI: 1.00,
};

/**
 * Fetch price from CoinGecko
 */
async function fetchFromCoinGecko(coingeckoId: string): Promise<number | null> {
  try {
    const response = await fetch(
      `${COINGECKO_API}/simple/price?ids=${coingeckoId}&vs_currencies=usd`
    );
    
    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data[coingeckoId]?.usd || null;
  } catch (error) {
    console.warn('[PriceService] CoinGecko fetch failed:', error);
    return null;
  }
}

/**
 * Get price for a single asset
 */
export async function getAssetPrice(symbol: string): Promise<number> {
  const upperSymbol = symbol.toUpperCase();
  
  // Check cache
  const cached = priceCache.get(upperSymbol);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.price;
  }
  
  // Get asset metadata
  const asset = ARIES_ASSETS[upperSymbol];
  if (!asset) {
    console.warn(`[PriceService] Unknown asset: ${symbol}`);
    return 0;
  }
  
  // Try to fetch from CoinGecko
  if (asset.coingeckoId) {
    const price = await fetchFromCoinGecko(asset.coingeckoId);
    if (price !== null) {
      // Cache the price
      priceCache.set(upperSymbol, { price, timestamp: Date.now() });
      return price;
    }
  }
  
  // Fallback to mock price
  const mockPrice = MOCK_PRICES[upperSymbol] || 0;
  priceCache.set(upperSymbol, { price: mockPrice, timestamp: Date.now() });
  return mockPrice;
}

/**
 * Get prices for multiple assets
 */
export async function getAssetPrices(symbols: string[]): Promise<Record<string, number>> {
  const prices: Record<string, number> = {};
  
  // Batch fetch from CoinGecko
  const coingeckoIds = symbols
    .map(s => ARIES_ASSETS[s.toUpperCase()]?.coingeckoId)
    .filter(Boolean) as string[];
  
  if (coingeckoIds.length > 0) {
    try {
      const response = await fetch(
        `${COINGECKO_API}/simple/price?ids=${coingeckoIds.join(',')}&vs_currencies=usd`
      );
      
      if (response.ok) {
        const data = await response.json();
        
        // Map back to symbols
        symbols.forEach(symbol => {
          const asset = ARIES_ASSETS[symbol.toUpperCase()];
          if (asset?.coingeckoId && data[asset.coingeckoId]) {
            prices[symbol.toUpperCase()] = data[asset.coingeckoId].usd;
            priceCache.set(symbol.toUpperCase(), {
              price: data[asset.coingeckoId].usd,
              timestamp: Date.now(),
            });
          }
        });
      }
    } catch (error) {
      console.warn('[PriceService] Batch fetch failed:', error);
    }
  }
  
  // Fill missing prices with cached or mock values
  for (const symbol of symbols) {
    const upperSymbol = symbol.toUpperCase();
    if (!prices[upperSymbol]) {
      prices[upperSymbol] = await getAssetPrice(symbol);
    }
  }
  
  return prices;
}

/**
 * Get price by coin type
 */
export async function getPriceByCoinType(coinType: string): Promise<number> {
  // Find asset by coin type
  const asset = Object.values(ARIES_ASSETS).find(a => a.coinType === coinType);
  if (!asset) {
    console.warn(`[PriceService] Unknown coin type: ${coinType}`);
    return 0;
  }
  
  return getAssetPrice(asset.symbol);
}

/**
 * Get prices for multiple coin types
 */
export async function getPricesByCoinTypes(coinTypes: string[]): Promise<Record<string, number>> {
  const symbols = coinTypes
    .map(ct => Object.values(ARIES_ASSETS).find(a => a.coinType === ct)?.symbol)
    .filter(Boolean) as string[];
  
  const prices = await getAssetPrices(symbols);
  
  // Convert back to coin type keys
  const result: Record<string, number> = {};
  coinTypes.forEach(coinType => {
    const asset = Object.values(ARIES_ASSETS).find(a => a.coinType === coinType);
    if (asset && prices[asset.symbol]) {
      result[coinType] = prices[asset.symbol];
    }
  });
  
  return result;
}

/**
 * Clear price cache
 */
export function clearPriceCache(): void {
  priceCache.clear();
}

/**
 * Get all cached prices
 */
export function getCachedPrices(): Record<string, number> {
  const prices: Record<string, number> = {};
  priceCache.forEach((value, key) => {
    if (Date.now() - value.timestamp < CACHE_DURATION) {
      prices[key] = value.price;
    }
  });
  return prices;
}

/**
 * Preload all asset prices
 */
export async function preloadPrices(): Promise<void> {
  const symbols = Object.keys(ARIES_ASSETS);
  await getAssetPrices(symbols);
}

export default {
  getAssetPrice,
  getAssetPrices,
  getPriceByCoinType,
  getPricesByCoinTypes,
  clearPriceCache,
  getCachedPrices,
  preloadPrices,
};
