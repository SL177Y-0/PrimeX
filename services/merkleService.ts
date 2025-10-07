import { APTOS_CONFIG, MERKLE_CONFIG, MARKETS, MarketName } from '../config/constants';
import { aptosClient, buildMerkleTransaction, TRADING_FUNCTIONS } from '../utils/aptosClient';

// Simplified Merkle Service for core trading functionality
export class MerkleService {
  private initialized = false;
  private lastTradeTime: number = 0;
  private readonly TRADE_COOLDOWN = 60000; // 60 seconds

  constructor() {
    this.initialize();
  }

  private async initialize() {
    try {
      // For now, we'll use our existing direct contract integration
      // TODO: Integrate official Merkle SDK when API is stable
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize Merkle Service:', error);
    }
  }

  // Get Aptos instance
  getAptos() {
    return aptosClient;
  }

  // Trading Methods using our existing implementation
  async placeMarketOrder(params: {
    pair: string;
    userAddress: string;
    sizeDelta: bigint;
    collateralDelta: bigint;
    isLong: boolean;
    isIncrease: boolean;
  }) {
    // Validate all required parameters
    if (!params.userAddress || params.userAddress === 'undefined') {
      throw new Error('userAddress is required and cannot be undefined');
    }
    if (!params.sizeDelta || params.sizeDelta === 0n) {
      throw new Error('sizeDelta is required and must be greater than 0');
    }
    if (!params.collateralDelta || params.collateralDelta === 0n) {
      throw new Error('collateralDelta is required and must be greater than 0');
    }

    // Get market configuration with correct type arguments
    const marketConfig = MARKETS[params.pair as MarketName];
    if (!marketConfig) {
      throw new Error(`Unsupported market: ${params.pair}`);
    }

    // Based on ABI: place_order_v3 actual function signature
    // Params: &signer, address, u64, u64, u64, bool, bool, bool, u64, u64, bool
    // Args: account_address, collateral_delta, size_delta, price, is_long, is_increase, is_market, stop_loss_price, take_profit_price, can_execute_above_price
    
    // Debug logging to identify undefined values
    console.log('Market Order Parameters:', {
      userAddress: params.userAddress,
      sizeDelta: params.sizeDelta?.toString(),
      collateralDelta: params.collateralDelta?.toString(),
      isLong: params.isLong,
      isIncrease: params.isIncrease,
      pair: params.pair
    });

    // Validate all required parameters
    if (!params.userAddress) {
      throw new Error('userAddress is required');
    }
    if (!params.sizeDelta || params.sizeDelta <= 0n) {
      throw new Error('sizeDelta must be greater than 0');
    }
    if (!params.collateralDelta || params.collateralDelta <= 0n) {
      throw new Error('collateralDelta must be greater than 0');
    }

    const args = [
      params.userAddress,               // 1. address: _user_address
      params.sizeDelta.toString(),      // 2. u64: _size_delta (position size in microunits)
      params.collateralDelta.toString(), // 3. u64: _collateral_delta (USDC amount in microunits)
      "0",                              // 4. u64: _price (0 for market orders)
      params.isLong,                    // 5. bool: _is_long
      params.isIncrease,                // 6. bool: _is_increase
      true,                             // 7. bool: _is_market (true for market orders)
      "0",                              // 8. u64: _stop_loss_trigger_price (0 = no SL)
      "0",                              // 9. u64: _take_profit_trigger_price (0 = no TP)
      true,                             // 10. bool: _can_execute_above_price
      "0x0",                           // 11. address: _referrer (use zero-address if none)
    ];

    // Log final args array to see what's being passed
    console.log('Final args array:', args);
    console.log('Type arguments:', marketConfig.typeArguments);

    // Use market-specific type arguments [APT, USDC] in correct order
    const typeArguments = [...marketConfig.typeArguments];

    // Place the order via managed_trading entry
    const orderTransaction = buildMerkleTransaction(
      TRADING_FUNCTIONS.PLACE_ORDER_V3,
      typeArguments,
      args
    );

    // Return the order transaction (no separate initialize call needed)
    return {
      orderTransaction,
      requiresInit: false,
      needsExecution: true // Flag indicating this order needs keeper execution
    };
  }

  async placeLimitOrder(params: {
    pair: string;
    userAddress: string;
    sizeDelta: bigint;
    collateralDelta: bigint;
    price: bigint;
    isLong: boolean;
    isIncrease: boolean;
  }) {
    // Get market configuration with correct type arguments
    const marketConfig = MARKETS[params.pair as MarketName];
    if (!marketConfig) {
      throw new Error(`Unsupported market: ${params.pair}`);
    }

    // Based on ABI: place_order_v3 actual function signature
    // Params: &signer, address, u64, u64, u64, bool, bool, bool, u64, u64, bool
    // Args: account_address, collateral_delta, size_delta, price, is_long, is_increase, is_market, stop_loss_price, take_profit_price, can_execute_above_price
    
    const args = [
      params.userAddress,               // 1. address: _user_address
      params.sizeDelta.toString(),      // 2. u64: _size_delta (position size in microunits)
      params.collateralDelta.toString(), // 3. u64: _collateral_delta (USDC amount in microunits)
      params.price.toString(),          // 4. u64: _price (limit price)
      params.isLong,                    // 5. bool: _is_long
      params.isIncrease,                // 6. bool: _is_increase
      false,                            // 7. bool: _is_market (false for limit orders)
      "0",                              // 8. u64: _stop_loss_trigger_price (0 = no SL)
      "0",                              // 9. u64: _take_profit_trigger_price (0 = no TP)
      params.isLong,                    // 10. bool: _can_execute_above_price (true for buy limit, false for sell limit)
      "0x0",                           // 11. address: _referrer (zero-address)
    ];

    // Use market-specific type arguments [Collateral, Asset]
    const typeArguments = [...marketConfig.typeArguments];

    const orderTransaction = buildMerkleTransaction(
      TRADING_FUNCTIONS.PLACE_ORDER_V3,
      typeArguments,
      args
    );

    return {
      orderTransaction,
      requiresInit: false,
      needsExecution: true // Flag indicating this order needs keeper execution
    };
  }

  // Market Constraints Validation
  validateTradeConstraints(params: {
    pair: string;
    sizeDelta: number;
    collateralDelta: number;
    leverage: number;
  }) {
    const errors: string[] = [];

    // Minimum collateral check (always 2 USDC on mainnet)
    const minCollateral = 2; // Merkle Trade mainnet requirement
    
    if (params.collateralDelta < minCollateral) {
      errors.push(`Minimum collateral is ${minCollateral} USDC`);
    }

    // Minimum position size check - but allow leverage to meet this requirement
    const minPositionSize = this.getMinPositionSize(params.pair);
    if (params.sizeDelta < minPositionSize) {
      // Check if user can meet minimum position size with available leverage
      const maxPossiblePosition = params.collateralDelta * this.getMaxLeverage(params.pair);
      if (maxPossiblePosition < minPositionSize) {
        errors.push(`Minimum position size is ${minPositionSize} USDC for ${params.pair}. With ${params.collateralDelta} USDC collateral, you need at least ${(minPositionSize / params.collateralDelta).toFixed(1)}x leverage.`);
      } else {
        errors.push(`Minimum position size is ${minPositionSize} USDC for ${params.pair}. Current position: ${params.sizeDelta} USDC.`);
      }
    }

    // Maximum leverage check
    const maxLeverage = this.getMaxLeverage(params.pair);
    if (params.leverage > maxLeverage) {
      errors.push(`Maximum leverage is ${maxLeverage}x for ${params.pair}`);
    }

    // Minimum leverage check (must be at least 3x for crypto)
    const minLeverage = this.getMinLeverage(params.pair);
    if (params.leverage < minLeverage) {
      errors.push(`Minimum leverage is ${minLeverage}x for ${params.pair}`);
    }

    // Note: 900% profit cap applies to PnL/TP/SL, NOT position size
    // Position size is limited by leverage only (up to 150x for crypto)
    // Maximum profit = 9 × collateral (enforced in TP/SL, not here)

    // Validate position size matches collateral * leverage
    const expectedPositionSize = params.collateralDelta * params.leverage;
    const tolerance = 0.01; // 1% tolerance for rounding
    if (Math.abs(params.sizeDelta - expectedPositionSize) > tolerance) {
      errors.push(`Position size (${params.sizeDelta}) should equal collateral (${params.collateralDelta}) × leverage (${params.leverage}) = ${expectedPositionSize.toFixed(2)}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  getMinPositionSize(pair: string): number {
    // Crypto only: Official Merkle Trade requirements
    return 2; // All crypto pairs: 2 USDC minimum like official Merkle
  }

  getMaxLeverage(pair: string): number {
    // Crypto only: Merkle Trade guide limits
    return 150; // All crypto pairs: 3× – 150×
  }

  getMinLeverage(pair: string): number {
    // Crypto only: Merkle Trade guide limits
    return 3; // All crypto pairs: 3× minimum
  }

  // 🧮 Core Merkle Trade Formulas Implementation

  // Formula 1: Position Size = Collateral × Leverage
  calculatePositionSize(collateral: number, leverage: number): number {
    return collateral * leverage;
  }

  // Formula 2: PnL = (Current Price − Entry Price) × Position Size × (1 / Entry Price)
  calculatePnL(params: {
    currentPrice: number;
    entryPrice: number;
    positionSize: number;
    isLong: boolean;
  }): number {
    const { currentPrice, entryPrice, positionSize, isLong } = params;
    const priceDiff = isLong ? (currentPrice - entryPrice) : (entryPrice - currentPrice);
    return (priceDiff * positionSize) / entryPrice;
  }

  // Formula 3: Leverage = Position Size / Collateral
  calculateLeverage(positionSize: number, collateral: number): number {
    return positionSize / collateral;
  }

  // Formula 4: Liquidation Price (from guide)
  calculateLiquidationPrice(params: {
    entryPrice: number;
    leverage: number;
    isLong: boolean;
  }): number {
    const { entryPrice, leverage, isLong } = params;
    if (isLong) {
      return entryPrice * (1 - 1 / leverage); // For long positions
    } else {
      return entryPrice * (1 + 1 / leverage); // For short positions
    }
  }

  // Formula 5: Effective Entry Price = Oracle Price × (1 ± PriceImpact)
  calculateEffectiveEntryPrice(oraclePrice: number, priceImpact: number, isLong: boolean): number {
    const impactMultiplier = isLong ? (1 + priceImpact) : (1 - priceImpact);
    return oraclePrice * impactMultiplier;
  }

  // Formula 6: Funding Fee = Position Size × Funding Rate × Time
  calculateFundingFee(positionSize: number, fundingRate: number, timeHours: number): number {
    return positionSize * fundingRate * timeHours;
  }

  // Formula 7: Fee = Position Size × FeeRate
  calculateTradingFee(positionSize: number, feeRate: number = 0.0006): number {
    return positionSize * feeRate; // Default 0.06% fee
  }

  // Formula 8: Margin Ratio = Collateral / (Position Size / Leverage)
  calculateMarginRatio(collateral: number, positionSize: number, leverage: number): number {
    return collateral / (positionSize / leverage);
  }

  // Formula 9: Profit Cap = min(PnL, 9 × Collateral)
  calculateProfitCap(collateral: number): number {
    return collateral * 9; // 900% profit cap
  }

  // Price Impact Calculation (Skew Impact)
  calculatePriceImpact(currentSkew: number, tradeSize: number, maxSkew: number = 1000000): number {
    const newSkew = Math.abs(currentSkew + tradeSize);
    const skewRatio = newSkew / maxSkew;
    return Math.min(skewRatio * 0.02, 0.05); // Max 5% price impact
  }

  // Maintenance Margin Check
  isPositionLiquidatable(collateral: number, positionSize: number, maxLeverage: number): boolean {
    const requiredMargin = positionSize / maxLeverage;
    return collateral < requiredMargin;
  }

  // Legacy liquidation calculation (keeping for compatibility)
  calcLiquidationPrice(params: {
    entryPrice: number;
    collateral: number;
    size: number;
    isLong: boolean;
    maintenanceMargin: number;
  }) {
    const { entryPrice, collateral, size, isLong, maintenanceMargin = 0.1 } = params;
    const leverage = size / collateral;
    
    if (isLong) {
      return entryPrice * (1 - (1 / leverage) + maintenanceMargin);
    } else {
      return entryPrice * (1 + (1 / leverage) - maintenanceMargin);
    }
  }

  // Trade Cooldown Check
  canTrade(): boolean {
    const now = Date.now();
    return now - this.lastTradeTime >= this.TRADE_COOLDOWN;
  }

  getTradeTimeRemaining(): number {
    const now = Date.now();
    const remaining = this.TRADE_COOLDOWN - (now - this.lastTradeTime);
    return Math.max(0, remaining);
  }

  markTradeExecuted() {
    this.lastTradeTime = Date.now();
  }

  // Execute order function - simulates keeper execution
  async executeOrder(params: {
    pair: string;
    orderId: string;
    indexPrice: bigint;
    executorAddress: string;
  }) {
    // Get market configuration
    const marketConfig = MARKETS[params.pair as MarketName];
    if (!marketConfig) {
      throw new Error(`Unsupported market: ${params.pair}`);
    }

    // Build execute_order transaction for managed_trading entry
    const args = [
      params.orderId,                    // u64: _order_id
      params.indexPrice.toString(),      // u64: _fast_price (oracle price)
      [],                                // vector<u8>: _pyth_vaa (empty placeholder)
    ];

    const typeArguments = [...marketConfig.typeArguments];

    return buildMerkleTransaction(
      TRADING_FUNCTIONS.EXECUTE_ORDER,
      typeArguments,
      args
    );
  }

  // Get all executable market orders for a pair (stub for future indexer)
  async getExecutableOrders(pair: string) {
    const marketConfig = MARKETS[pair as MarketName];
    if (!marketConfig) {
      throw new Error(`Unsupported market: ${pair}`);
    }
    console.log(`Getting executable orders for ${pair}`);
    return [];
  }

  // Simulate keeper execution for market orders (local debug only)
  async simulateKeeperExecution(params: { pair: string; orderId: string; currentPrice: bigint; }) {
    console.log(`Simulating keeper execution for order ${params.orderId} at price ${params.currentPrice}`);
    return { success: true, message: `Order ${params.orderId} would be executed at ${params.currentPrice}`, executionPrice: params.currentPrice };
  }

  // Helper to extract order ID from transaction events
  extractOrderIdFromEvents(transactionResponse: any): string | null {
    try {
      const events = transactionResponse?.events || [];
      for (const event of events) {
        if (event.type?.includes('PlaceOrderEvent')) {
          return event.data?.order_id || event.data?.uid;
        }
      }
      return null;
    } catch (error) {
      console.error('Error extracting order ID from events:', error);
      return null;
    }
  }
}

// Singleton instance
export const merkleService = new MerkleService();
