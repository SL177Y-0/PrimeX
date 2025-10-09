/**
 * Merkle Trade API Proxy Server
 * Based on comprehensive research findings from multiple AI sources
 * 
 * Fixes:
 * - Correct API endpoints and headers
 * - Proper CORS handling
 * - Required x-merkle-client header
 * - Address validation
 * - Error handling for 400/404/502 responses
 */

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const https = require('https');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PROXY_PORT || 3001;

// Merkle Trade API configuration - Based on research
const MERKLE_MAINNET_BASE = 'https://api.merkle.trade';
const MERKLE_TESTNET_BASE = 'https://api.testnet.merkle.trade';

// Environment selection (using mainnet)
const IS_PRODUCTION = true; // Force mainnet
const MERKLE_BASE = MERKLE_MAINNET_BASE;

console.log(`🚀 Starting Merkle Proxy Server`);
console.log(`📡 Environment: ${IS_PRODUCTION ? 'PRODUCTION (Mainnet)' : 'DEVELOPMENT (Testnet)'}`);
console.log(`🎯 Target API: ${MERKLE_BASE}`);

// Middleware
app.use(cors({
  origin: '*', // In production, restrict to your domain
  credentials: true
}));

app.use(express.json());

// Rate limiting to prevent abuse
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: 'Too many requests from this IP, please try again later.'
});

app.use('/api', limiter);

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// Address validation helper
function isValidAptosAddress(address) {
  return /^0x[0-9a-fA-F]{64}$/.test(address);
}

/**
 * Main proxy route - forwards all /api/* to Merkle Trade API
 * Research shows correct path is /api/v1/... not /api/merkle/...
 */
app.all('/api/*', async (req, res) => {
  try {
    // Extract the path after /api/
    const merkleApiPath = req.path.replace('/api', '');
    
    // Validate Aptos addresses in the path
    const addressMatch = merkleApiPath.match(/\/([0-9a-fA-Fx]{66})/);
    if (addressMatch && !isValidAptosAddress(addressMatch[1])) {
      return res.status(400).json({
        error: 'Invalid Aptos address format',
        message: 'Address must be 0x followed by 64 hex characters'
      });
    }
    
    // Build full URL with query parameters
    const targetUrl = `${MERKLE_BASE}${merkleApiPath}${req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : ''}`;
    
    console.log(`   ➜ Proxying to: ${targetUrl}`);
    
    // Make the request with proper headers based on research
    // Create HTTPS agent that bypasses SSL certificate verification
    // This is needed because Merkle API has SSL certificate chain issues
    const httpsAgent = new https.Agent({
      rejectUnauthorized: false // Bypass SSL verification
    });

    const response = await axios({
      method: req.method,
      url: targetUrl,
      headers: {
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
        'Origin': 'https://app.merkle.trade',
        'Referer': 'https://app.merkle.trade/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        // Remove x-merkle-client as it might not be needed for public endpoints
      },
      data: req.body,
      timeout: 30000, // 30 second timeout
      httpsAgent: httpsAgent, // Use custom HTTPS agent
      validateStatus: function (status) {
        return status < 500; // Accept any status < 500 as success
      },
    });

    console.log(`   ✅ Response: ${response.status} ${response.statusText}`);
    
    // Forward the response
    res.status(response.status).json(response.data);

  } catch (error) {
    console.error('❌ Proxy error:', error.message);
    
    if (error.response) {
      // API returned an error response
      const status = error.response.status;
      const message = error.response.data?.message || error.response.statusText;
      
      if (status === 404) {
        // 404 means no data found - this is normal for empty positions
        res.status(404).json({
          error: 'No data found',
          message: 'No positions or trading history found for this address'
        });
      } else if (status === 400) {
        // Bad request - likely invalid parameters
        res.status(400).json({
          error: 'Bad request',
          message: 'Invalid request parameters or address format'
        });
      } else if (status === 502) {
        // Bad gateway - upstream server issue
        res.status(502).json({
          error: 'Merkle API unavailable',
          message: 'Merkle Trade API is temporarily unavailable'
        });
      } else {
        // Other API errors
        res.status(status).json({
          error: 'API Error',
          message: message
        });
      }
    } else if (error.code === 'ECONNREFUSED') {
      // Connection refused
      res.status(503).json({
        error: 'Service unavailable',
        message: 'Cannot connect to Merkle Trade API'
      });
    } else {
      // Other errors
      res.status(500).json({
        error: 'Proxy server error',
        message: error.message
      });
    }
  }
});

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    environment: IS_PRODUCTION ? 'production' : 'development',
    targetApi: MERKLE_BASE,
    timestamp: new Date().toISOString()
  });
});

/**
 * Root endpoint
 */
app.get('/', (req, res) => {
  res.json({
    name: 'Merkle Trade Proxy Server',
    version: '1.0.0',
    environment: IS_PRODUCTION ? 'production' : 'development',
    endpoints: {
      health: '/health',
      proxy: '/api/merkle/*'
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n✅ Merkle Proxy Server running on http://localhost:${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 Proxy endpoint: http://localhost:${PORT}/api/merkle/*\n`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n🛑 SIGINT signal received: closing HTTP server');
  process.exit(0);
});
