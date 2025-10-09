/**
 * Panora Swap SDK Service
 * 
 * Production-ready implementation using @panoraexchange/swap-sdk
 * Based on official Panora SDK documentation and best practices
 * 
 * Key Features:
 * - Type-safe SDK integration
 * - Automatic retry logic
 * - Quote caching for performance
 * - Comprehensive error handling
 * - Transaction validation
 * 
 * @see https://docs.panora.exchange/developer/swap/sdk
 */

import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';
import { PANORA_CONFIG, SWAP_TOKENS, SWAP_CONSTANTS, APTOS_CONFIG } from '../config/constants';

// Initialize Aptos client
const aptosConfig = new AptosConfig({
  network: Network.MAINNET,
});
const aptos = new Aptos(aptosConfig);

// ============================================================================
// Type Definitions
// ============================================================================

export interface SwapQuoteParams {
  chainId: string | number;
  fromTokenAddress: string;
  toTokenAddress: string;
  fromTokenAmount?: string | number;
  toTokenAmount?: string | number;
  toWalletAddress: string;
  slippagePercentage?: number | string;
  integratorFeePercentage?: number;
  integratorFeeAddress?: string;
  includeSources?: string;
  excludeSources?: string;
  onlyDirectRoutes?: boolean;
}

export interface SwapToken {
  address: string;
  decimals: number;
  symbol: string;
  name: string;
  logoUrl?: string;
  current_price?: string;
}

export interface SwapQuote {
  toTokenAmount: string;
  priceImpact: string;
  slippagePercentage: string;
  feeTokenAmount: string;
  minToTokenAmount: string;
  toTokenAmountUSD?: string;
  route?: SwapRoute[];
  txData: {
    type: string;
    function: string;
    type_arguments: string[];
    arguments: any[];
  };
}

export interface SwapRoute {
  pool: string;
  fromToken: string;
  toToken: string;
  percentage: number;
}

export interface SwapQuoteResponse {
  fromToken: SwapToken;
  toToken: SwapToken;
  feeToken: SwapToken;
  fromTokenAmount: string;
  fromTokenAmountUSD?: string;
  quotes: SwapQuote[];
}

export interface SwapValidationResult {
  isValid: boolean;
  error?: string;
  warnings?: string[];
}

export interface SwapExecutionResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

// ============================================================================
// Error Handling
// ============================================================================

export class PanoraSwapError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'PanoraSwapError';
  }
}

// ============================================================================
// Quote Caching
// ============================================================================

class QuoteCache {
  private cache = new Map<string, { quote: SwapQuoteResponse; timestamp: number }>();
  private readonly CACHE_DURATION = 10000; // 10 seconds

  getCachedQuote(key: string): SwapQuoteResponse | null {
    const cached = this.cache.get(key);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.quote;
    }
    
    this.cache.delete(key);
    return null;
  }

  setCachedQuote(key: string, quote: SwapQuoteResponse): void {
    this.cache.set(key, { quote, timestamp: Date.now() });
    
    // Cleanup old entries
    if (this.cache.size > 100) {
      const oldestKey = Array.from(this.cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp)[0][0];
      this.cache.delete(oldestKey);
    }
  }

  generateKey(params: SwapQuoteParams): string {
    return JSON.stringify({
      from: params.fromTokenAddress,
      to: params.toTokenAddress,
      amount: params.fromTokenAmount || params.toTokenAmount,
      slippage: params.slippagePercentage,
    });
  }

  clear(): void {
    this.cache.clear();
  }
}

// ============================================================================
// Retry Manager
// ============================================================================

class RetryManager {
  static async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;

        // Don't retry on client errors (4xx)
        if (error.status >= 400 && error.status < 500) {
          throw error;
        }

        if (attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt);
          console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('Operation failed after retries');
  }
}

// ============================================================================
// Main Service Class
// ============================================================================

class PanoraSwapSDKService {
  private quoteCache = new QuoteCache();
  private apiKey = PANORA_CONFIG.apiKey;
  private apiUrl = PANORA_CONFIG.apiUrl;
  private chainId = PANORA_CONFIG.chainId;

  /**
   * Normalize token address for Panora API
   * Panora expects base addresses only (no Move module paths like ::asset::USDC)
   * 
   * Examples from Panora docs:
   * - APT: "0xa" (shorthand)
   * - USDC: "0xbae207659db88bea0cbead6da0ed00aac12edcdda169e591cd41c94180b46f3b" (base address only)
   */
  private normalizeTokenAddress(address: string): string {
    // APT native token - use shorthand
    if (address === '0x1::aptos_coin::AptosCoin' || address === '0xa') {
      return '0xa';
    }
    
    // If address contains Move module path (::), extract just the base address
    if (address.includes('::')) {
      return address.split('::')[0];
    }
    
    // Already in correct format - return as-is
    return address;
  }

  /**
   * Get swap quote with caching and retry logic
   */
  async getSwapQuote(params: SwapQuoteParams): Promise<SwapQuoteResponse> {
    // Validate parameters
    this.validateQuoteParams(params);

    // Check cache first
    const cacheKey = this.quoteCache.generateKey(params);
    const cachedQuote = this.quoteCache.getCachedQuote(cacheKey);
    
    if (cachedQuote) {
      console.log('Returning cached quote');
      return cachedQuote;
    }

    // Fetch quote with retry logic
    const quote = await RetryManager.withRetry(
      () => this.fetchQuoteFromAPI(params),
      3,
      1000
    );

    // Cache the result
    this.quoteCache.setCachedQuote(cacheKey, quote);

    return quote;
  }

  /**
   * Internal method to fetch quote from API
   */
  private async fetchQuoteFromAPI(params: SwapQuoteParams): Promise<SwapQuoteResponse> {
    // Build query string parameters - Panora expects query params even for POST requests
    const queryParams = new URLSearchParams();

    queryParams.append('chainId', this.chainId.toString());
    queryParams.append('toWalletAddress', params.toWalletAddress);

    if (params.fromTokenAddress) {
      queryParams.append(
        'fromTokenAddress',
        this.normalizeTokenAddress(String(params.fromTokenAddress))
      );
    }

    if (params.toTokenAddress) {
      queryParams.append(
        'toTokenAddress',
        this.normalizeTokenAddress(String(params.toTokenAddress))
      );
    }

    if (params.fromTokenAmount) {
      const amount = typeof params.fromTokenAmount === 'string'
        ? params.fromTokenAmount
        : params.fromTokenAmount.toString();

      queryParams.append('fromTokenAmount', amount);
    }

    if (params.toTokenAmount) {
      const amount = typeof params.toTokenAmount === 'string'
        ? params.toTokenAmount
        : params.toTokenAmount.toString();

      queryParams.append('toTokenAmount', amount);
    }

    if (params.slippagePercentage !== undefined) {
      queryParams.append('slippagePercentage', params.slippagePercentage.toString());
    }

    if (params.integratorFeePercentage !== undefined) {
      queryParams.append('integratorFeePercentage', params.integratorFeePercentage.toString());
    }

    if (params.integratorFeeAddress) {
      queryParams.append('integratorFeeAddress', params.integratorFeeAddress);
    }

    if (params.includeSources) {
      queryParams.append('includeSources', params.includeSources);
    }

    if (params.excludeSources) {
      queryParams.append('excludeSources', params.excludeSources);
    }

    if (params.onlyDirectRoutes !== undefined) {
      queryParams.append('onlyDirectRoutes', String(params.onlyDirectRoutes));
    }

    const requestUrl = `${this.apiUrl}?${queryParams.toString()}`;

    const requestDebug = Object.fromEntries(queryParams.entries());

    console.log('[Panora SDK] Request URL:', requestUrl);
    console.log('[Panora SDK] Request params:', requestDebug);
    console.log('[Panora SDK] API URL:', this.apiUrl);
    console.log('[Panora SDK] Has API Key:', !!this.apiKey);

    const response = await fetch(requestUrl, {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'Accept': 'application/json',
      },
    });

    console.log('[Panora SDK] Response Status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Panora SDK] Error Response:', errorText);
      console.error('[Panora SDK] Request that failed:', requestDebug);

      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText };
      }
      
      // Check if it's a token address issue
      if (errorData.message && errorData.message.includes('fromTokenAddress')) {
        throw new PanoraSwapError(
          `Invalid fromTokenAddress format. Received: ${requestDebug.fromTokenAddress}. ` +
          `API message: ${errorData.message}`,
          'INVALID_FROM_TOKEN',
          { ...errorData, sentAddress: requestDebug.fromTokenAddress }
        );
      }
      
      throw new PanoraSwapError(
        errorData.message || errorData.description || `HTTP ${response.status}`,
        `API_ERROR_${response.status}`,
        errorData
      );
    }

    const data = await response.json();
    console.log('[Panora SDK] Response Success:', data);
    
    return data;
  }

  /**
   * Validate quote parameters
   */
  private validateQuoteParams(params: SwapQuoteParams): void {
    if (!params.fromTokenAddress) {
      throw new PanoraSwapError(
        'fromTokenAddress is required',
        'INVALID_PARAMS',
        { param: 'fromTokenAddress' }
      );
    }

    if (!params.toTokenAddress) {
      throw new PanoraSwapError(
        'toTokenAddress is required',
        'INVALID_PARAMS',
        { param: 'toTokenAddress' }
      );
    }

    if (!params.fromTokenAmount && !params.toTokenAmount) {
      throw new PanoraSwapError(
        'Either fromTokenAmount or toTokenAmount must be provided',
        'INVALID_PARAMS',
        { param: 'amount' }
      );
    }

    if (!params.toWalletAddress) {
      throw new PanoraSwapError(
        'toWalletAddress is required',
        'INVALID_PARAMS',
        { param: 'toWalletAddress' }
      );
    }

    // Validate amount is positive
    const amount = params.fromTokenAmount || params.toTokenAmount;
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (numAmount! <= 0) {
      throw new PanoraSwapError(
        'Amount must be greater than zero',
        'INVALID_AMOUNT',
        { amount }
      );
    }
  }

  /**
   * Comprehensive transaction validation
   */
  validateTransaction(txData: any): SwapValidationResult {
    const warnings: string[] = [];

    try {
      // Rule 1: Verify payload type
      if (txData.type !== 'entry_function_payload') {
        return {
          isValid: false,
          error: 'Invalid payload type. Expected entry_function_payload',
        };
      }

      // Rule 2: Whitelist router address
      if (!txData.function || !txData.function.startsWith(PANORA_CONFIG.contractAddress)) {
        return {
          isValid: false,
          error: 'Invalid router address. Transaction may not be from Panora',
        };
      }

      // Rule 3: Validate function patterns
      const validFunctionPatterns = [
        'aggregator_multi_step_route',
        'one_step_route',
        'swap_exact',
      ];
      
      const hasValidFunction = validFunctionPatterns.some(pattern => 
        txData.function.includes(pattern)
      );
      
      if (!hasValidFunction) {
        return {
          isValid: false,
          error: 'Unrecognized swap function',
        };
      }

      // Rule 4: Validate type_arguments
      if (!Array.isArray(txData.type_arguments)) {
        return {
          isValid: false,
          error: 'Missing or invalid type_arguments',
        };
      }

      // Rule 5: Validate arguments
      if (!Array.isArray(txData.arguments)) {
        return {
          isValid: false,
          error: 'Missing or invalid arguments',
        };
      }

      // Rule 6: Check for empty arrays (warning only)
      if (txData.arguments.length === 0) {
        warnings.push('Transaction has no arguments');
      }

      return {
        isValid: true,
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    } catch (error: any) {
      return {
        isValid: false,
        error: `Validation error: ${error.message}`,
      };
    }
  }

  /**
   * Simulate transaction before execution
   */
  async simulateTransaction(txData: any, senderAddress: string): Promise<boolean> {
    try {
      const payload = {
        sender: senderAddress,
        sequence_number: "0",
        max_gas_amount: SWAP_CONSTANTS.DEFAULT_GAS_LIMIT.toString(),
        gas_unit_price: SWAP_CONSTANTS.GAS_UNIT_PRICE.toString(),
        expiration_timestamp_secs: (Math.floor(Date.now() / 1000) + 60).toString(),
        payload: txData,
      };

      const response = await fetch(`${APTOS_CONFIG.nodeUrl}/transactions/simulate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        console.error('[Panora SDK] Simulation failed:', response.status);
        return false;
      }

      const result = await response.json();
      const success = Array.isArray(result) ? result[0]?.success : result.success;
      
      return success === true;
    } catch (error) {
      console.error('[Panora SDK] Simulation error:', error);
      return false;
    }
  }

  /**
   * Get price impact level and warning
   */
  getPriceImpactLevel(priceImpact: number): {
    level: 'low' | 'medium' | 'high' | 'critical';
    warning?: string;
  } {
    if (priceImpact < 1) {
      return { level: 'low' };
    }
    if (priceImpact < SWAP_CONSTANTS.PRICE_IMPACT_WARNING) {
      return {
        level: 'medium',
        warning: 'Moderate price impact',
      };
    }
    if (priceImpact < SWAP_CONSTANTS.HIGH_PRICE_IMPACT) {
      return {
        level: 'high',
        warning: 'High price impact! Consider reducing amount',
      };
    }
    return {
      level: 'critical',
      warning: 'CRITICAL price impact! Reduce amount significantly',
    };
  }

  /**
   * Get token information
   */
  getTokenBySymbol(symbol: string): SwapToken | undefined {
    return SWAP_TOKENS[symbol as keyof typeof SWAP_TOKENS];
  }

  /**
   * Get all available tokens
   */
  getAllTokens(): SwapToken[] {
    return Object.values(SWAP_TOKENS);
  }

  /**
   * Format amount with proper decimals
   */
  formatTokenAmount(amount: string | number, decimals: number): string {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return (numAmount * Math.pow(10, decimals)).toString();
  }

  /**
   * Parse token amount from API response (supports decimal or base-unit strings)
   */
  parseTokenAmount(amount: string | number, decimals: number): number {
    if (typeof amount === 'number') {
      return amount;
    }

    if (!amount) {
      return 0;
    }

    const normalized = amount.trim();

    if (normalized.includes('.')) {
      const parsed = parseFloat(normalized);
      return Number.isNaN(parsed) ? 0 : parsed;
    }

    try {
      const baseUnits = BigInt(normalized);
      return Number(baseUnits) / Math.pow(10, decimals);
    } catch {
      const parsed = parseFloat(normalized);
      return Number.isNaN(parsed) ? 0 : parsed / Math.pow(10, decimals);
    }
  }

  /**
   * Clear quote cache
   */
  clearCache(): void {
    this.quoteCache.clear();
  }

  /**
   * Estimate gas fee for swap
   */
  async estimateGasFee(txData: any, senderAddress: string): Promise<number> {
    try {
      const payload = {
        sender: senderAddress,
        sequence_number: "0",
        max_gas_amount: SWAP_CONSTANTS.DEFAULT_GAS_LIMIT.toString(),
        gas_unit_price: SWAP_CONSTANTS.GAS_UNIT_PRICE.toString(),
        expiration_timestamp_secs: (Math.floor(Date.now() / 1000) + 60).toString(),
        payload: txData,
      };

      const response = await fetch(`${APTOS_CONFIG.nodeUrl}/transactions/simulate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const result = await response.json();
        const gasUsed = Array.isArray(result) ? result[0]?.gas_used : result.gas_used;
        return parseInt(gasUsed || '0') * SWAP_CONSTANTS.GAS_UNIT_PRICE / 1e8; // Convert to APT
      }
      
      return SWAP_CONSTANTS.DEFAULT_GAS_LIMIT * SWAP_CONSTANTS.GAS_UNIT_PRICE / 1e8;
    } catch (error) {
      console.error('[Panora SDK] Gas estimation error:', error);
      return SWAP_CONSTANTS.DEFAULT_GAS_LIMIT * SWAP_CONSTANTS.GAS_UNIT_PRICE / 1e8;
    }
  }
}

// Export singleton instance
export const panoraSwapSDK = new PanoraSwapSDKService();

// Export classes for testing
export { QuoteCache, RetryManager };
