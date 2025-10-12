/**
 * Simple CORS Proxy for Merkle API
 * Run with: node cors-proxy.js
 */

const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = 3001;

// Enable CORS for all origins
app.use(cors());
app.use(express.json());

// Proxy endpoint - use middleware to catch all paths
app.use('/api/merkle', async (req, res) => {
  try {
    // Extract the path after /api/merkle (req.path starts with /)
    const apiPath = req.path.substring(1); // Remove leading /
    
    // Check for network query parameter or header, default to mainnet
    const network = req.query.network || req.headers['x-merkle-network'] || 'mainnet';
    
    // Select base URL based on network
    const baseUrl = network === 'mainnet' 
      ? 'https://api.merkle.trade'
      : 'https://api.merkle.trade';
    
    const targetUrl = `${baseUrl}/${apiPath}`;
    
    console.log(`[${network.toUpperCase()}] Proxying request to:`, targetUrl);
    
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'TRADE_APP_PROXY/1.0',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    console.log('Response status:', response.status);
    console.log('Data items:', Array.isArray(data) ? data.length : data.items?.length || 0);
    
    res.json(data);
  } catch (error) {
    console.error('Proxy error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 CORS Proxy running on http://localhost:${PORT}`);
  console.log(`   Mainnet: https://api.merkle.trade`);
  console.log(`   Testnet: https://api.testnet.merkle.trade`);
  console.log(`   Usage: Add ?network=testnet or ?network=mainnet to API calls`);
});
