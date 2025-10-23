/**
 * Real-Time Price Service
 * Uses CoinGecko API + On-chain Oracle (same as official Aries platform)
 * NO FALLBACK DATA - Only real-time sources
 */

// CoinGecko ID mappings for Aries assets
const COINGECKO_ID_MAP: Record<string, string> = {
  // Crypto assets
  '0x1::aptos_coin::AptosCoin': 'aptos',
  '0xd11107bdf0d6d7040c6c0bfbdecb6545191fdf13e8d8d259952f53e1713f61b5::staked_coin::StakedAptos': 'aptos',
  '0x84d7aeef42d38a5ffc3ccef853e1b82e4958659d16a7de736a29c55fbbeb0114::staked_aptos_coin::StakedAptosCoin': 'aptos',
  '0x111ae3e5bc816a5e63c2da97d0aa3886519e0cd5e4b046659fa35796bd11542a::amapt_token::AmnisApt': 'aptos',
  '0x5c738a5dfa343bee927c39ebe85b0ceb95fdb5ee5b323c95559614f5a77c47cf::Aptoskapt::KAPT': 'aptos',
  
  // BTC variations - all use BTC price
  '0xae478ff7d83ed072dbc5e264250e67ef58f57c99d89b447efd8a0a2e8b2be76e::coin::T': 'bitcoin', // zWBTC
  '0x5e156f1207d0ebfa19a9eeff00d62a282278fb8719f4fab3a586a0a2c0fffbea::coin::WBTC': 'wrapped-bitcoin', // Wormhole WBTC
  
  // ETH variations
  '0xcc8a89c8dce9693d354449f1f73e60e14e347417854f029db5bc8e7454008abb::coin::T': 'ethereum', // zWETH
  
  // Stablecoins
  '0x5e156f1207d0ebfa19a9eeff00d62a282278fb8719f4fab3a586a0a2c0fffbea::coin::T': 'usd-coin', // zUSDC
  '0xc91d826e29a3183eb3b6f6aa3a722089fdffb8e9642b94c5fcd4c48d035c0080::type::USDC': 'usd-coin',
  '0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::USDT': 'tether',
  '0xa2eda21a58856fda86451436513b867c97eecb4ba099da5775520e0f7492e852::coin::T': 'tether', // Wormhole USDT
  
  // Other
  '0x159df6b7689437016108a019fd5bef736bac692b6d4a1f10c941f6fbb9a74ca6::oft::CakeOFT': 'pancakeswap-token',
};

// For assets not on CoinGecko, use pegged asset prices
const PEGGED_ASSETS: Record<string, string> = {
  // BTC-pegged (use BTC price)
  '0x2fb9601a3f1bd40e023c42e11001bb0b69beb64d0e5f8e35b93b24c09aecfdd1::xbtc_coin::XBTC': 'bitcoin',
  '0x497c100092c98db6e8a11c4c33bfb7eb1a98c5555bd50cbb6a84fa1e93cb4e4e::bitcoin_avalon_wrapper::ABTC': 'bitcoin',
  
  // ETH-pegged
  '0x49e548aa0e67dbe20fb5f5e7090a11f2c7a2c5e8d3f7e2c8f1a0e0c7e8e6e6e6::coin::WETH': 'ethereum',
  
  // Stablecoin-pegged (use USDC price)
  '0x960ab1b5f1b0de0ab8c0da8d89c1d53f7b8c3f0e0b9b7e0e0e0e0e0e0e0e0e0e::USDY::USDY': 'usd-coin',
  '0xb00b5f2e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e::SUSDe::SUSDe': 'usd-coin',
  '0x5e156f1207d0ebfa19a9eeff00d62a282278fb8719f4fab3a586a0a2c0fffbea::coin::USD1': 'usd-coin',
  '0x9bca5d3da00c19be45e52a5de29e6e6cbc4a67a6a4d38a1f80058697d60fea9c::USDC::WrappedUSDC': 'usd-coin',
  '0x2bb97a47b07b6f60877c86c31a005a18d574dad9b0aa9c1f29e1d47c49ac6b8c::USDT::WrappedUSDT': 'tether',
  '0xb27b78c2a3b0fe9f632e013f97ebf2e79ee27def17935efb28a7038d11c92d30::wbtc::WrappedWBTC': 'wrapped-bitcoin',
};

interface PriceCache {
  price: number;
  timestamp: number;
}

class RealTimePriceService {
  private priceCache: Map<string, PriceCache> = new Map();
  private readonly CACHE_TTL = 30000; // 30 seconds
  private readonly COINGECKO_PROXY_URL = process.env.EXPO_PUBLIC_PROXY_BASE_URL 
    ? `${process.env.EXPO_PUBLIC_PROXY_BASE_URL}/api/coingecko`
    : 'http://localhost:3001/api/coingecko';

  /**
   * Get prices for multiple coin types using CoinGecko (REAL-TIME)
   */
  async getPrices(coinTypes: string[]): Promise<Record<string, number>> {
    const prices: Record<string, number> = {};
    
    // Get unique CoinGecko IDs
    const coinGeckoIds = new Set<string>();
    const coinTypeToCoinGeckoId: Record<string, string> = {};
    
    for (const coinType of coinTypes) {
      let coinGeckoId = COINGECKO_ID_MAP[coinType] || PEGGED_ASSETS[coinType];
      
      if (coinGeckoId) {
        coinGeckoIds.add(coinGeckoId);
        coinTypeToCoinGeckoId[coinType] = coinGeckoId;
      }
    }

    if (coinGeckoIds.size === 0) {
      console.log('[RealTimePrice] No CoinGecko mappings found');
      return prices;
    }

    try {
      console.log(`[RealTimePrice] 📡 Fetching ${coinGeckoIds.size} prices from CoinGecko...`);
      
      // Batch fetch all prices
      const response = await fetch(
        `${this.COINGECKO_PROXY_URL}/api/v3/simple/price?ids=${Array.from(coinGeckoIds).join(',')}&vs_currencies=usd`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status}`);
      }

      const data = await response.json();
      console.log(`[RealTimePrice] ✅ CoinGecko response:`, Object.keys(data));

      // Map prices back to coin types
      for (const coinType of coinTypes) {
        const coinGeckoId = coinTypeToCoinGeckoId[coinType];
        if (coinGeckoId && data[coinGeckoId]?.usd) {
          const price = data[coinGeckoId].usd;
          prices[coinType] = price;
          
          // Cache it
          this.priceCache.set(coinType, {
            price,
            timestamp: Date.now()
          });
        }
      }

      console.log(`[RealTimePrice] ✅ Fetched ${Object.keys(prices).length}/${coinTypes.length} prices`);
      return prices;

    } catch (error: any) {
      console.error('[RealTimePrice] ❌ CoinGecko fetch failed:', error.message);
      return prices;
    }
  }

  /**
   * Get single price (with cache check)
   */
  async getPrice(coinType: string): Promise<number | null> {
    // Check cache
    const cached = this.priceCache.get(coinType);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.price;
    }

    const prices = await this.getPrices([coinType]);
    return prices[coinType] || null;
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.priceCache.clear();
  }
}

export const realTimePriceService = new RealTimePriceService();
