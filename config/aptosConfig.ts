/**
 * Aptos Network Configuration
 * Supports multiple RPC providers with automatic fallback
 * Based on Aries Markets network mode documentation
 */

export type NetworkMode = 'mainnet-official' | 'mainnet-nodereal' | 'mainnet-blast' | 'testnet';

export interface AptosRPCConfig {
  name: string;
  url: string;
  requiresApiKey: boolean;
  priority: number; // Lower = higher priority
}

// Environment variables for API keys
const NODEREAL_API_KEY = process.env.EXPO_PUBLIC_NODEREAL_API_KEY || '';
const BLAST_API_KEY = process.env.EXPO_PUBLIC_BLAST_API_KEY || '';

export const RPC_ENDPOINTS: Record<NetworkMode, AptosRPCConfig> = {
  'mainnet-nodereal': {
    name: 'Mainnet NodeReal',
    url: NODEREAL_API_KEY 
      ? `https://aptos-mainnet.nodereal.io/v1/${NODEREAL_API_KEY}`
      : 'https://aptos-mainnet.nodereal.io/v1',
    requiresApiKey: true,
    priority: 1,
  },
  'mainnet-blast': {
    name: 'Mainnet Blast API',
    url: BLAST_API_KEY
      ? `https://aptos-mainnet.blastapi.io/${BLAST_API_KEY}`
      : 'https://aptos-mainnet.blastapi.io',
    requiresApiKey: true,
    priority: 2,
  },
  'mainnet-official': {
    name: 'Mainnet Official',
    url: 'https://fullnode.mainnet.aptoslabs.com/v1',
    requiresApiKey: false,
    priority: 3, // Fallback only (rate-limited)
  },
  'testnet': {
    name: 'Testnet NodeReal',
    url: NODEREAL_API_KEY
      ? `https://aptos-testnet.nodereal.io/v1/${NODEREAL_API_KEY}`
      : 'https://aptos-testnet.nodereal.io/v1',
    requiresApiKey: true,
    priority: 1,
  },
};

// Ordered list of endpoints for automatic fallback
export function getOrderedEndpoints(network: 'mainnet' | 'testnet' = 'mainnet'): AptosRPCConfig[] {
  if (network === 'testnet') {
    return [RPC_ENDPOINTS.testnet];
  }
  
  return [
    RPC_ENDPOINTS['mainnet-nodereal'],
    RPC_ENDPOINTS['mainnet-blast'],
    RPC_ENDPOINTS['mainnet-official'],
  ].filter(endpoint => {
    // Skip endpoints that require API keys if none provided
    if (endpoint.requiresApiKey) {
      return endpoint.url.includes('nodereal') ? !!NODEREAL_API_KEY : !!BLAST_API_KEY;
    }
    return true;
  }).sort((a, b) => a.priority - b.priority);
}

// Get primary RPC URL
export function getPrimaryRPCUrl(network: 'mainnet' | 'testnet' = 'mainnet'): string {
  const endpoints = getOrderedEndpoints(network);
  return endpoints[0]?.url || RPC_ENDPOINTS['mainnet-official'].url;
}

// Health check for endpoints
export async function checkEndpointHealth(url: string): Promise<boolean> {
  try {
    const response = await fetch(`${url}/`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    return response.ok;
  } catch {
    return false;
  }
}

// Get healthy endpoint with fallback
export async function getHealthyEndpoint(network: 'mainnet' | 'testnet' = 'mainnet'): Promise<string> {
  const endpoints = getOrderedEndpoints(network);
  
  for (const endpoint of endpoints) {
    const isHealthy = await checkEndpointHealth(endpoint.url);
    if (isHealthy) {
      console.log(`[AptosConfig] Using ${endpoint.name}`);
      return endpoint.url;
    }
  }
  
  // Fallback to official node if all fail
  console.warn('[AptosConfig] All preferred endpoints failed, using official node');
  return RPC_ENDPOINTS['mainnet-official'].url;
}

// Retry logic with exponential backoff
export async function fetchWithRetry<T>(
  fetchFn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fetchFn();
    } catch (error: any) {
      const isRateLimitError = error?.status === 429 || error?.message?.includes('rate limit');
      const isLastAttempt = attempt === maxRetries - 1;
      
      if (isLastAttempt) {
        throw error;
      }
      
      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
      console.warn(`[AptosConfig] Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error('fetchWithRetry: max retries exceeded');
}
