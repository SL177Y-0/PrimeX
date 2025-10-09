import { PANORA_CONFIG, SWAP_TOKENS, SWAP_CONSTANTS } from '../config/constants';
import { log } from '../utils/logger';

export interface SwapQuoteRequest {
  fromTokenAddress: string;
  toTokenAddress: string;
  fromTokenAmount?: string;
  toTokenAmount?: string;
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
  current_price?: string;
}

export interface SwapQuote {
  toTokenAmount: string;
  priceImpact: string;
  slippagePercentage: string;
  feeTokenAmount: string;
  minToTokenAmount: string;
  toTokenAmountUSD?: string;
  txData: {
    type: string;
    function: string;
    type_arguments: string[];
    arguments: any[];
  };
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
}

class PanoraSwapService {
  private baseUrl = PANORA_CONFIG.apiUrl;
  private apiKey = PANORA_CONFIG.apiKey;
  private chainId = PANORA_CONFIG.chainId;

  /**
   * Get swap quote from Panora API
   * Based on official Panora API documentation
   */
  async getSwapQuote(request: SwapQuoteRequest): Promise<SwapQuoteResponse> {
    try {
      // Validate required parameters
      if (!request.fromTokenAddress || !request.toTokenAddress) {
        throw new Error('fromTokenAddress and toTokenAddress are required');
      }
      
      if (!request.fromTokenAmount && !request.toTokenAmount) {
        throw new Error('Either fromTokenAmount or toTokenAmount must be provided');
      }

      // Build request body according to Panora API spec
      // Based on official docs: https://docs.panora.exchange/developer/swap/api
      const requestBody: any = {
        chainId: this.chainId.toString(), // Convert to string as per API spec
        fromTokenAddress: request.fromTokenAddress,
        toTokenAddress: request.toTokenAddress,
        toWalletAddress: request.toWalletAddress,
      };

      // Add amount (without decimals as per API spec)
      if (request.fromTokenAmount) {
        const amount = parseFloat(request.fromTokenAmount);
        if (isNaN(amount) || amount <= 0) {
          throw new Error('Invalid fromTokenAmount: must be a positive number');
        }
        requestBody.fromTokenAmount = amount;
      }
      if (request.toTokenAmount) {
        const amount = parseFloat(request.toTokenAmount);
        if (isNaN(amount) || amount <= 0) {
          throw new Error('Invalid toTokenAmount: must be a positive number');
        }
        requestBody.toTokenAmount = amount;
      }

      // Add optional parameters
      if (request.slippagePercentage !== undefined) {
        requestBody.slippagePercentage = request.slippagePercentage;
      }
      if (request.integratorFeePercentage !== undefined) {
        requestBody.integratorFeePercentage = request.integratorFeePercentage;
      }
      if (request.integratorFeeAddress) {
        requestBody.integratorFeeAddress = request.integratorFeeAddress;
      }

      log.debug('Panora API request', {
        url: this.baseUrl,
        method: 'POST',
        headers: {
          'x-api-key': `${this.apiKey.substring(0, 20)}...`,
          'Content-Type': 'application/json',
        },
        body: requestBody,
      });

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      log.debug('Panora response status', { status: response.status, statusText: response.statusText });

      if (!response.ok) {
        const errorText = await response.text();
        log.error('Panora API error response', errorText);
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText };
        }
        
        throw new Error(
          `Panora API error: ${response.status} ${response.statusText}. ${
            errorData.message || errorData.description || 'Unknown error'
          }`
        );
      }

      const data = await response.json();
      log.debug('Panora API response', data);
      return data;
    } catch (error) {
      log.error('Error fetching swap quote', error);
      throw error;
    }
  }

  /**
   * Validate transaction data before sending to wallet
   */
  validateTxData(txData: any): SwapValidationResult {
    try {
      // Rule 1: Check payload type
      if (txData.type !== 'entry_function_payload') {
        return { isValid: false, error: 'Invalid payload type' };
      }

      // Rule 2: Whitelist router address
      if (!txData.function || !txData.function.startsWith(PANORA_CONFIG.contractAddress)) {
        return { isValid: false, error: 'Invalid router address' };
      }

      // Rule 3: Validate function name contains expected patterns
      const validFunctionPatterns = [
        'aggregator_multi_step_route_exact_input_entry',
        'one_step_route_exact_input_entry',
        'swap_exact_in',
        'swap_exact_out'
      ];
      
      const hasValidFunction = validFunctionPatterns.some(pattern => 
        txData.function.includes(pattern)
      );
      
      if (!hasValidFunction) {
        return { isValid: false, error: 'Invalid function call' };
      }

      // Rule 4: Validate type_arguments array exists
      if (!Array.isArray(txData.type_arguments)) {
        return { isValid: false, error: 'Invalid type_arguments' };
      }

      // Rule 5: Validate arguments array exists
      if (!Array.isArray(txData.arguments)) {
        return { isValid: false, error: 'Invalid arguments' };
      }

      return { isValid: true };
    } catch (error) {
      return { isValid: false, error: `Validation error: ${error}` };
    }
  }

  /**
   * Get token information by symbol
   */
  getTokenBySymbol(symbol: string) {
    return SWAP_TOKENS[symbol as keyof typeof SWAP_TOKENS];
  }

  /**
   * Get all available tokens
   */
  getAllTokens() {
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
   * Parse amount from API response (supports decimal or base-unit strings)
   */
  parseTokenAmount(amount: string | number, decimals: number): number {
    if (typeof amount === 'number') {
      return amount;
    }

    if (!amount) {
      return 0;
    }

    const normalized = amount.trim();

    // Panora API often returns human-readable decimals (e.g. "0.918532")
    if (normalized.includes('.')) {
      const parsed = parseFloat(normalized);
      return Number.isNaN(parsed) ? 0 : parsed;
    }

    // Fallback for integer base-unit values
    try {
      const baseUnits = BigInt(normalized);
      return Number(baseUnits) / Math.pow(10, decimals);
    } catch {
      const parsed = parseFloat(normalized);
      return Number.isNaN(parsed) ? 0 : parsed / Math.pow(10, decimals);
    }
  }

  /**
   * Calculate price impact percentage
   */
  calculatePriceImpact(expectedPrice: number, actualPrice: number): number {
    return Math.abs((actualPrice - expectedPrice) / expectedPrice) * 100;
  }

  /**
   * Get price impact warning level
   */
  getPriceImpactLevel(priceImpact: number): 'low' | 'medium' | 'high' | 'critical' {
    if (priceImpact < 1) return 'low';
    if (priceImpact < SWAP_CONSTANTS.PRICE_IMPACT_WARNING) return 'medium';
    if (priceImpact < SWAP_CONSTANTS.HIGH_PRICE_IMPACT) return 'high';
    return 'critical';
  }

  /**
   * Simulate transaction before execution
   */
  async simulateTransaction(txData: any, senderAddress: string): Promise<boolean> {
    try {
      const simulationPayload = {
        sender: senderAddress,
        sequence_number: "0",
        max_gas_amount: SWAP_CONSTANTS.DEFAULT_GAS_LIMIT.toString(),
        gas_unit_price: SWAP_CONSTANTS.GAS_UNIT_PRICE.toString(),
        expiration_timestamp_secs: Math.floor(Date.now() / 1000 + 60).toString(),
        payload: txData,
      };

      const response = await fetch('https://fullnode.mainnet.aptoslabs.com/v1/transactions/simulate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(simulationPayload),
      });

      if (!response.ok) {
        log.error('Simulation failed', { status: response.status, statusText: response.statusText });
        return false;
      }

      const result = await response.json();
      return result.success === true;
    } catch (error) {
      log.error('Simulation error', error);
      return false;
    }
  }

  /**
   * Submit swap transaction via Petra wallet deep link
   * Based on SwapPanora guide: petra://api/v1/signAndSubmit?data=<base64>
   */
  async submitSwapViaPetra(txData: any): Promise<string> {
    try {
      // Encode transaction data as base64
      const txDataString = JSON.stringify(txData);
      const base64TxData = btoa(txDataString);
      
      // Create Petra deep link
      const petraDeepLink = `petra://api/v1/signAndSubmit?data=${base64TxData}`;
      
      log.info('Opening Petra wallet via deep link');
      
      // Open Petra wallet (this will work in React Native)
      if (typeof window !== 'undefined' && window.open) {
        window.open(petraDeepLink, '_blank');
      } else {
        // For React Native, use Linking
        const { Linking } = require('react-native');
        await Linking.openURL(petraDeepLink);
      }
      
      return 'Transaction sent to Petra wallet';
    } catch (error) {
      log.error('Error submitting to Petra', error);
      throw new Error('Failed to open Petra wallet');
    }
  }

  /**
   * Handle swap transaction result from wallet callback
   */
  handleSwapCallback(callbackUrl: string): { success: boolean; txHash?: string; error?: string } {
    try {
      const url = new URL(callbackUrl);
      const params = new URLSearchParams(url.search);
      
      if (params.get('success') === 'true') {
        return {
          success: true,
          txHash: params.get('txHash') || undefined,
        };
      } else {
        return {
          success: false,
          error: params.get('error') || 'Transaction failed',
        };
      }
    } catch (error) {
      return {
        success: false,
        error: 'Invalid callback URL',
      };
    }
  }

  /**
   * Get estimated gas fee for swap
   */
  async getEstimatedGasFee(txData: any, senderAddress: string): Promise<number> {
    try {
      const simulationPayload = {
        sender: senderAddress,
        sequence_number: "0",
        max_gas_amount: SWAP_CONSTANTS.DEFAULT_GAS_LIMIT.toString(),
        gas_unit_price: SWAP_CONSTANTS.GAS_UNIT_PRICE.toString(),
        expiration_timestamp_secs: Math.floor(Date.now() / 1000 + 60).toString(),
        payload: txData,
      };

      const response = await fetch('https://fullnode.mainnet.aptoslabs.com/v1/transactions/simulate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(simulationPayload),
      });

      if (response.ok) {
        const result = await response.json();
        return parseInt(result.gas_used || '0') * SWAP_CONSTANTS.GAS_UNIT_PRICE;
      }
      
      return SWAP_CONSTANTS.DEFAULT_GAS_LIMIT * SWAP_CONSTANTS.GAS_UNIT_PRICE;
    } catch (error) {
      log.error('Gas estimation error', error);
      return SWAP_CONSTANTS.DEFAULT_GAS_LIMIT * SWAP_CONSTANTS.GAS_UNIT_PRICE;
    }
  }
}

export const panoraSwapService = new PanoraSwapService();
