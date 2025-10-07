import { PANORA_CONFIG, SWAP_TOKENS, SWAP_CONSTANTS } from '../config/constants';

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
   */
  async getSwapQuote(request: SwapQuoteRequest): Promise<SwapQuoteResponse> {
    try {
      // Build query parameters
      const params = new URLSearchParams({
        chainId: this.chainId.toString(),
        fromTokenAddress: request.fromTokenAddress,
        toTokenAddress: request.toTokenAddress,
        toWalletAddress: request.toWalletAddress,
      });

      // Add conditional parameters
      if (request.fromTokenAmount) {
        params.append('fromTokenAmount', request.fromTokenAmount);
      }
      if (request.toTokenAmount) {
        params.append('toTokenAmount', request.toTokenAmount);
      }
      if (request.slippagePercentage !== undefined) {
        params.append('slippagePercentage', request.slippagePercentage.toString());
      }
      if (request.integratorFeePercentage !== undefined) {
        params.append('integratorFeePercentage', request.integratorFeePercentage.toString());
      }
      if (request.integratorFeeAddress) {
        params.append('integratorFeeAddress', request.integratorFeeAddress);
      }
      if (request.includeSources) {
        params.append('includeSources', request.includeSources);
      }
      if (request.excludeSources) {
        params.append('excludeSources', request.excludeSources);
      }
      if (request.onlyDirectRoutes !== undefined) {
        params.append('onlyDirectRoutes', request.onlyDirectRoutes.toString());
      }

      const response = await fetch(`${this.baseUrl}?${params.toString()}`, {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `Panora API error: ${response.status} ${response.statusText}. ${
            errorData.message || 'Unknown error'
          }`
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching swap quote:', error);
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
   * Parse amount from smallest unit
   */
  parseTokenAmount(amount: string, decimals: number): number {
    return parseInt(amount) / Math.pow(10, decimals);
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
        console.error('Simulation failed:', response.status, response.statusText);
        return false;
      }

      const result = await response.json();
      return result.success === true;
    } catch (error) {
      console.error('Simulation error:', error);
      return false;
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
      console.error('Gas estimation error:', error);
      return SWAP_CONSTANTS.DEFAULT_GAS_LIMIT * SWAP_CONSTANTS.GAS_UNIT_PRICE;
    }
  }
}

export const panoraSwapService = new PanoraSwapService();
