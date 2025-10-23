/**
 * Pyth Network Price Service
 * Official price oracle used by Aries Markets
 */

import { AptosPriceServiceConnection } from '@pythnetwork/pyth-aptos-js';

// Pyth Price Feed IDs for Aries Markets assets (Mainnet)
const PYTH_PRICE_FEEDS: Record<string, string> = {
  // Crypto
  'APT': '0x03ae4db29ed4ae33d323568895aa00337e658e348b37509f5372ae51f0af00d5',
  'BTC': '0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43',
  'WBTC': '0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43',
  'ETH': '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',
  'WETH': '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',
  
  // Stablecoins
  'USDC': '0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a',
  'USDT': '0x2b89b9dc8fdf9f34709a5b106b472f0f39bb6ca9ce04b0fd7f2e971688e2e53b',
  
  // Other
  'CAKE': '0x2356af9529a1064d1e0c2c3c54e0aff1655a8dbdcc92b8201e5e9b715d761cc1',
};

// Map Aries coin types to Pyth price feed keys
const COIN_TYPE_TO_PYTH_KEY: Record<string, string> = {
  // APT variations
  '0x1::aptos_coin::AptosCoin': 'APT',
  '0xd11107bdf0d6d7040c6c0bfbdecb6545191fdf13e8d8d259952f53e1713f61b5::staked_coin::StakedAptos': 'APT',
  '0x84d7aeef42d38a5ffc3ccef853e1b82e4958659d16a7de736a29c55fbbeb0114::staked_aptos_coin::StakedAptosCoin': 'APT',
  '0x111ae3e5bc816a5e63c2da97d0aa3886519e0cd5e4b046659fa35796bd11542a::amapt_token::AmnisApt': 'APT',
  '0x5c738a5dfa343bee927c39ebe85b0ceb95fdb5ee5b323c95559614f5a77c47cf::Aptoskapt::KAPT': 'APT',
  
  // BTC variations
  '0xae478ff7d83ed072dbc5e264250e67ef58f57c99d89b447efd8a0a2e8b2be76e::coin::T': 'BTC', // zWBTC
  '0xae478ff7d83ed072dbc5e264250e67ef58f57c99d89b447efd8a0a2e8b2be76e::coin::WBTC': 'WBTC',
  '0x5e156f1207d0ebfa19a9eeff00d62a282278fb8719f4fab3a586a0a2c0fffbea::coin::WBTC': 'WBTC', // Wormhole WBTC
  '0x04ca6c3a7d87ea53e9140de4c5e02d2c9c6e1e1c2621cd4e8aa7e9f49ad5d4d5::XBTC::XBTC': 'BTC', // xBTC
  '0x4a64fe4527fb1c5f6e3b9353e2f0a5bea11c8e4f2e9e8b5f2f3e1e7e5e1e1e1a::coin::ABTC': 'BTC', // aBTC
  
  // ETH variations
  '0xcc8a89c8dce9693d354449f1f73e60e14e347417854f029db5bc8e7454008abb::coin::T': 'ETH', // zWETH
  '0x49e548aa0e67dbe20fb5f5e7090a11f2c7a2c5e8d3f7e2c8f1a0e0c7e8e6e6e6::coin::WETH': 'WETH',
  
  // Stablecoins
  '0x5e156f1207d0ebfa19a9eeff00d62a282278fb8719f4fab3a586a0a2c0fffbea::coin::T': 'USDC', // zUSDC
  '0xc91d826e29a3183eb3b6f6aa3a722089fdffb8e9642b94c5fcd4c48d035c0080::type::USDC': 'USDC',
  '0x5e156f1207d0ebfa19a9eeff00d62a282278fb8719f4fab3a586a0a2c0fffbea::coin::USDC': 'USDC', // Wormhole USDC
  '0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::USDT': 'USDT',
  '0xa2eda21a58856fda86451436513b867c97eecb4ba099da5775520e0f7492e852::coin::T': 'USDT', // Wormhole USDT
  '0x960ab1b5f1b0de0ab8c0da8d89c1d53f7b8c3f0e0b9b7e0e0e0e0e0e0e0e0e0e::USDY::USDY': 'USDC', // USDY (stablecoin)
  '0xb00b5f2e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e::SUSDe::SUSDe': 'USDC', // sUSDe (stablecoin)
  '0x5e156f1207d0ebfa19a9eeff00d62a282278fb8719f4fab3a586a0a2c0fffbea::coin::USD1': 'USDC', // USD1
  
  // Others
  '0x159df6b7689437016108a019fd5bef736bac692b6d4a1f10c941f6fbb9a74ca6::oft::CakeOFT': 'CAKE',
};

class PythPriceService {
  private connection: AptosPriceServiceConnection;
  private priceCache: Map<string, { price: number; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 30000; // 30 seconds

  constructor() {
    this.connection = new AptosPriceServiceConnection('https://hermes.pyth.network');
  }

  /**
   * Get price for a specific coin type
   */
  async getPrice(coinType: string): Promise<number | null> {
    const pythKey = COIN_TYPE_TO_PYTH_KEY[coinType];
    if (!pythKey) {
      console.log(`[Pyth] No price feed for ${coinType}`);
      return null;
    }

    // Check cache
    const cached = this.priceCache.get(coinType);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.price;
    }

    try {
      const priceId = PYTH_PRICE_FEEDS[pythKey];
      if (!priceId) return null;

      const priceFeeds = await this.connection.getLatestPriceFeeds([priceId]);
      if (!priceFeeds || priceFeeds.length === 0) return null;

      const priceFeed = priceFeeds[0];
      const price = priceFeed.getPriceNoOlderThan(60); // Max 60 seconds old
      
      if (price) {
        const priceValue = Number(price.price) * Math.pow(10, price.expo);
        
        // Cache it
        this.priceCache.set(coinType, {
          price: priceValue,
          timestamp: Date.now()
        });
        
        return priceValue;
      }

      return null;
    } catch (error) {
      console.warn(`[Pyth] Failed to fetch price for ${coinType}:`, error);
      return null;
    }
  }

  /**
   * Get prices for multiple coin types in parallel
   */
  async getPrices(coinTypes: string[]): Promise<Record<string, number>> {
    const prices: Record<string, number> = {};
    
    // Get unique Pyth price feed IDs
    const uniquePriceIds = new Set<string>();
    const coinTypeToPriceId: Record<string, string> = {};
    
    for (const coinType of coinTypes) {
      const pythKey = COIN_TYPE_TO_PYTH_KEY[coinType];
      if (pythKey && PYTH_PRICE_FEEDS[pythKey]) {
        const priceId = PYTH_PRICE_FEEDS[pythKey];
        uniquePriceIds.add(priceId);
        coinTypeToPriceId[coinType] = priceId;
      }
    }

    if (uniquePriceIds.size === 0) {
      console.log('[Pyth] No valid price feeds to fetch');
      return prices;
    }

    try {
      console.log(`[Pyth] 📡 Fetching ${uniquePriceIds.size} price feeds from Hermes...`);
      console.log(`[Pyth] 🔗 Hermes URL: https://hermes.pyth.network`);
      console.log(`[Pyth] 📋 Price IDs:`, Array.from(uniquePriceIds).map(id => id.substring(0, 10) + '...'));
      
      const priceFeeds = await this.connection.getLatestPriceFeeds(Array.from(uniquePriceIds));
      
      console.log(`[Pyth] 📦 Received ${priceFeeds?.length || 0} price feeds`);
      
      if (!priceFeeds || priceFeeds.length === 0) {
        console.error('[Pyth] ❌ No price feeds returned from Hermes');
        return prices;
      }
      
      const priceMap = new Map<string, number>();

      // Build price map
      priceFeeds.forEach((feed) => {
        try {
          const price = feed.getPriceNoOlderThan(60);
          if (price) {
            const priceValue = Number(price.price) * Math.pow(10, price.expo);
            priceMap.set(feed.id, priceValue);
          }
        } catch (error) {
          console.warn(`[Pyth] Failed to parse price feed:`, error);
        }
      });

      // Map back to coin types
      for (const coinType of coinTypes) {
        const priceId = coinTypeToPriceId[coinType];
        if (priceId && priceMap.has(priceId)) {
          const price = priceMap.get(priceId)!;
          prices[coinType] = price;
          
          // Cache it
          this.priceCache.set(coinType, {
            price,
            timestamp: Date.now()
          });
        }
      }

      console.log(`[Pyth] ✅ Fetched ${Object.keys(prices).length} prices`);
      return prices;

    } catch (error: any) {
      console.error('[Pyth] ❌ CRITICAL ERROR fetching prices');
      console.error('[Pyth] Error type:', error?.constructor?.name);
      console.error('[Pyth] Error message:', error?.message);
      console.error('[Pyth] Error details:', JSON.stringify(error, null, 2));
      if (error?.response) {
        console.error('[Pyth] Response status:', error.response.status);
        console.error('[Pyth] Response data:', error.response.data);
      }
      return prices;
    }
  }

  /**
   * Clear price cache
   */
  clearCache() {
    this.priceCache.clear();
  }
}

export const pythPriceService = new PythPriceService();
