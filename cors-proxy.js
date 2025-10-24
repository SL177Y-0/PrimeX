/**
 * Universal CORS Proxy Gateway for PrimeX
 * Handles: CoinGecko, Pyth, Aries, NodeReal, Aptos GraphQL, Merkle, Sentry
 * Run with: node cors-proxy.js or npm run start:proxy
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PROXY_PORT || 3001;

// ============================================================================
// Configuration & API Keys
// ============================================================================

const API_KEYS = {
  COINGECKO: process.env.COINGECKO_API_KEY || '',
  NODEREAL: process.env.NODEREAL_API_KEY || 'dbe3294d24374cad9d0886ca12d0aeb7',
  PYTH: process.env.PYTH_API_KEY || '',
};

const ALLOWED_TARGETS = {
  coingecko: 'https://api.coingecko.com',
  aries: 'https://api-v2.ariesmarkets.xyz',
  pyth: 'https://hermes.pyth.network',
  aptos: 'https://api.mainnet.aptoslabs.com',
  nodereal: 'https://aptos-mainnet.nodereal.io',
  merkle: 'https://api.merkle.trade',
};

// ============================================================================
// Rate Limiting & Caching
// ============================================================================

const requestLog = new Map(); // Track requests per endpoint
const cache = new Map(); // Simple in-memory cache
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10; // 10 requests per minute per endpoint (demo tier limit)
const CACHE_TTL = 120000; // 2 minutes cache (reduce API calls)

function checkRateLimit(endpoint) {
  const now = Date.now();
  const key = endpoint;
  
  if (!requestLog.has(key)) {
    requestLog.set(key, []);
  }
  
  const requests = requestLog.get(key).filter(time => now - time < RATE_LIMIT_WINDOW);
  
  if (requests.length >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }
  
  requests.push(now);
  requestLog.set(key, requests);
  return true;
}

function getCache(key) {
  const cached = cache.get(key);
  if (!cached) return null;
  
  if (Date.now() - cached.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  
  return cached.data;
}

function setCache(key, data) {
  cache.set(key, {
    data,
    timestamp: Date.now(),
  });
}

// ============================================================================
// Middleware
// ============================================================================

app.use(cors({
  origin: true, // Allow all origins dynamically (not wildcard)
  credentials: true, // Allow credentials
  methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'x-api-key', 
    'x-aptos-client',
    'x-aptos-typescript-sdk-version',
    'x-aptos-typescript-sdk-origin-method', // ← Missing header!
    'x-aptos-ledger-version',
    'x-aptos-chain-id',
  ],
  exposedHeaders: ['*'],
  maxAge: 86400, // 24 hours
}));

app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ============================================================================
// Proxy Routes
// ============================================================================

// CoinGecko Proxy
app.use('/api/coingecko', async (req, res) => {
  try {
    const apiPath = req.path.substring(1);
    const queryString = new URL(req.url, 'http://localhost').search;
    const targetUrl = `${ALLOWED_TARGETS.coingecko}/${apiPath}${queryString}`;
    
    // Check cache first
    const cacheKey = `coingecko:${targetUrl}`;
    const cached = getCache(cacheKey);
    if (cached) {
      console.log('  ✓ Cache hit');
      return res.json(cached);
    }
    
    // Rate limiting
    if (!checkRateLimit('coingecko')) {
      return res.status(429).json({ error: 'Rate limit exceeded. Try again later.' });
    }
    
    console.log(`  → Proxying to: ${targetUrl}`);
    
    const headers = {
      'Accept': 'application/json',
      'User-Agent': 'PrimeX/1.0',
    };
    
    if (API_KEYS.COINGECKO) {
      // CoinGecko Demo/Pro API keys use x-cg-demo-api-key header
      headers['x-cg-demo-api-key'] = API_KEYS.COINGECKO;
    }
    
    const response = await fetch(targetUrl, { method: 'GET', headers });
    
    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }
    
    const data = await response.json();
    setCache(cacheKey, data);
    
    res.json(data);
  } catch (error) {
    console.error('  ✗ CoinGecko proxy error:', error.message);
    
    // If we have cached data, return it even if expired (better than error)
    const cached = cache.get(cacheKey);
    if (cached && cached.data) {
      console.log('  ⚠ Returning stale cache due to error');
      return res.json(cached.data);
    }
    
    res.status(500).json({ error: error.message });
  }
});

// Aries Markets tRPC Proxy (for @aries-markets/api SDK)
// Aries API is SLOW - sometimes takes 15-20+ seconds to respond
app.use('/api/aries-trpc', async (req, res) => {
  try {
    // Set long timeouts - Aries API is notoriously slow
    req.setTimeout(30000); // 30 seconds
    res.setTimeout(30000);
    
    const targetUrl = `${ALLOWED_TARGETS.aries}`;
    
    // tRPC uses GET requests with query parameters for queries
    // Build full URL with query string
    const queryString = new URL(req.url, 'http://localhost').search;
    const fullUrl = `${targetUrl}${req.path}${queryString}`;
    
    console.log(`  → Proxying tRPC to: ${fullUrl}`);
    console.log(`  → Method: ${req.method}`);
    console.log(`  → Note: Aries API can be slow (10-20s), please be patient...`);
    
    const response = await fetch(fullUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Origin': 'https://app.ariesmarkets.xyz',
        'Referer': 'https://app.ariesmarkets.xyz/',
      },
      body: req.method === 'POST' ? JSON.stringify(req.body) : undefined,
      // Note: fetch API doesn't support timeout directly, handled by req/res timeout
    });
    
    if (!response.ok) {
      console.error(`  ✗ Aries tRPC error: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error(`  ✗ Response: ${errorText.substring(0, 500)}`);
      
      // For 502/504 errors, suggest retry
      if (response.status === 502 || response.status === 504) {
        console.error(`  ⚠️ Gateway timeout - Aries API is overloaded, client will retry`);
      }
      
      return res.status(response.status).json({ error: errorText });
    }
    
    const data = await response.json();
    console.log(`  ✓ tRPC Success`);
    res.json(data);
  } catch (error) {
    console.error('  ✗ Aries tRPC proxy error:', error.message);
    
    // Suggest retry for timeout errors
    if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
      console.error(`  ⚠️ Timeout - Aries API is slow, client will retry`);
    }
    
    res.status(500).json({ error: error.message });
  }
});

// Aries Markets REST Proxy (legacy, for direct API calls)
app.use('/api/aries', async (req, res) => {
  try {
    const apiPath = req.path.substring(1);
    const queryString = new URL(req.url, 'http://localhost').search;
    const targetUrl = `${ALLOWED_TARGETS.aries}/${apiPath}${queryString}`;
    
    const cacheKey = `aries:${targetUrl}`;
    const cached = getCache(cacheKey);
    if (cached) {
      console.log('  ✓ Cache hit');
      return res.json(cached);
    }
    
    console.log(`  → Proxying to: ${targetUrl}`);
    
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Origin': 'https://app.ariesmarkets.xyz',
        'Referer': 'https://app.ariesmarkets.xyz/',
      },
      timeout: 10000,
    });
    
    if (!response.ok) {
      console.error(`  ✗ Aries API HTTP error: ${response.status} ${response.statusText}`);
      // Try to get error details
      const errorText = await response.text();
      console.error(`  ✗ Response: ${errorText}`);
      throw new Error(`Aries API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    setCache(cacheKey, data);
    
    console.log(`  ✓ Success: ${Object.keys(data).length || 0} items`);
    res.json(data);
  } catch (error) {
    console.error('  ✗ Aries proxy error:', error.message);
    
    // If we have cached data (even expired), return it
    const cached = cache.get(cacheKey);
    if (cached && cached.data) {
      console.log('  ⚠ Returning stale cache due to error');
      return res.json(cached.data);
    }
    
    // Otherwise return empty array/object depending on endpoint
    const emptyResponse = apiPath.includes('coinInfo') ? [] : {};
    console.log('  ⚠ Returning empty response');
    res.json(emptyResponse);
  }
});

// Pyth/Hermes Proxy
app.use('/api/pyth', async (req, res) => {
  try {
    const apiPath = req.path.substring(1);
    const queryString = new URL(req.url, 'http://localhost').search;
    const targetUrl = `${ALLOWED_TARGETS.pyth}/${apiPath}${queryString}`;
    
    console.log(`  → Proxying to: ${targetUrl}`);
    
    const headers = {
      'Accept': 'application/json',
      'User-Agent': 'PrimeX/1.0',
    };
    
    if (API_KEYS.PYTH) {
      headers['Authorization'] = `Bearer ${API_KEYS.PYTH}`;
    }
    
    try {
      const response = await fetch(targetUrl, {
        method: req.method,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        timeout: 15000, // 15 second timeout
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`  ✓ tRPC Success (${response.status})`);
      
      // Log data size for debugging
      const dataStr = JSON.stringify(data);
      console.log(`  → Response size: ${(dataStr.length / 1024).toFixed(2)}KB`);
      
      res.json(data);
    } catch (error) {
      console.error('  ✗ tRPC Error:', error.message);
      console.error('  ✗ Target URL:', targetUrl);
      res.status(500).json({ error: 'Failed to proxy tRPC request', details: error.message });
    }
  } catch (error) {
    console.error('  ✗ Pyth proxy error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// NodeReal Proxy (Aptos RPC with API key)
app.use('/api/nodereal', async (req, res) => {
  try {
    const apiPath = req.path.substring(1);
    const targetUrl = `${ALLOWED_TARGETS.nodereal}/v1/${API_KEYS.NODEREAL}/${apiPath}`;
    
    console.log(`  → Proxying to: ${targetUrl}`);
    
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'PrimeX/1.0',
      },
      body: req.method === 'POST' ? JSON.stringify(req.body) : undefined,
    });
    
    if (!response.ok) {
      throw new Error(`NodeReal API error: ${response.status}`);
    }
    
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('  ✗ NodeReal proxy error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Aptos RPC Proxy (for ariesSDKService - direct blockchain queries)
// This proxies ALL Aptos RPC calls to NodeReal with API key
app.use('/api/aptos-rpc', async (req, res) => {
  try {
    // Build full NodeReal URL with API key
    const targetUrl = `${ALLOWED_TARGETS.nodereal}/v1/${API_KEYS.NODEREAL}/v1`;
    
    // Get the path from the request (e.g., /accounts/0x.../resource/...)
    const apiPath = req.path === '/' ? '' : req.path;
    const fullUrl = `${targetUrl}${apiPath}`;
    
    console.log(`  → Proxying Aptos RPC to: ${fullUrl}`);
    console.log(`  → Method: ${req.method}`);
    if (req.method === 'POST' && req.body) {
      console.log(`  → POST Body:`, JSON.stringify(req.body, null, 2));
    }
    
    const response = await fetch(fullUrl, {
      method: req.method,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'PrimeX/1.0',
      },
      body: req.method === 'POST' ? JSON.stringify(req.body) : undefined,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`  ✗ NodeReal RPC error: ${response.status} ${response.statusText}`);
      console.error(`  ✗ Response: ${errorText.substring(0, 500)}`);
      return res.status(response.status).json({ 
        error: `NodeReal RPC error: ${response.status}`,
        details: errorText 
      });
    }
    
    const data = await response.json();
    console.log(`  ✓ RPC Success`);
    res.json(data);
  } catch (error) {
    console.error('  ✗ Aptos RPC proxy error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Aptos GraphQL Proxy
app.use('/api/aptos/graphql', async (req, res) => {
  try {
    const targetUrl = `${ALLOWED_TARGETS.aptos}/v1/graphql`;
    
    console.log(`  → Proxying GraphQL to: ${targetUrl}`);
    
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'PrimeX/1.0',
      },
      body: JSON.stringify(req.body),
    });
    
    if (!response.ok) {
      throw new Error(`Aptos GraphQL error: ${response.status}`);
    }
    
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('  ✗ Aptos GraphQL proxy error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Merkle Trade Proxy
app.use('/api/merkle', async (req, res) => {
  try {
    const apiPath = req.path.substring(1);
    const network = req.query.network || req.headers['x-merkle-network'] || 'mainnet';
    const baseUrl = network === 'mainnet' 
      ? ALLOWED_TARGETS.merkle
      : 'https://api.testnet.merkle.trade';
    
    const targetUrl = `${baseUrl}/${apiPath}`;
    
    console.log(`  → Proxying to: ${targetUrl}`);
    
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'PrimeX/1.0',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Merkle API error: ${response.status}`);
    }
    
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('  ✗ Merkle proxy error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    cacheSize: cache.size,
    timestamp: new Date().toISOString(),
  });
});

// Cache stats
app.get('/cache/stats', (req, res) => {
  res.json({
    size: cache.size,
    keys: Array.from(cache.keys()),
  });
});

// Clear cache
app.post('/cache/clear', (req, res) => {
  cache.clear();
  res.json({ message: 'Cache cleared' });
});

// ============================================================================
// Start Server
// ============================================================================

app.listen(PORT, () => {
  console.log('\n🚀 PrimeX Universal Proxy Gateway');
  console.log(`   Local: http://localhost:${PORT}`);
  console.log('\n📡 Available Routes:');
  console.log('/api/coingecko/*   → CoinGecko API');
  console.log('/api/aries/*       → Aries Markets API');
  console.log('/api/aries-trpc/*  → Aries tRPC API');
  console.log('/api/pyth/*        → Pyth/Hermes Oracle');
  console.log('/api/nodereal/*    → NodeReal Aptos RPC');
  console.log('/api/aptos-rpc/*   → Aptos RPC (NodeReal with API key)');
  console.log('/api/aptos/graphql → Aptos GraphQL');
  console.log('/api/merkle/*      → Merkle Trade API');
  console.log('\n🛠  Management:');
  console.log('   /health           → Health check');
  console.log('   /cache/stats      → Cache statistics');
  console.log('   POST /cache/clear → Clear cache');
  console.log('\n✅ NodeReal API Key: ' + (API_KEYS.NODEREAL ? 'Configured' : 'Missing'));
  console.log('✅ CoinGecko API Key: ' + (API_KEYS.COINGECKO ? 'Configured' : 'Not set (using free tier)'));
  console.log('\n');
});
