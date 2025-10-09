import { APTOS_CONFIG, MERKLE_CONFIG, TRADING_CONSTANTS, MARKETS, MarketName } from '../config/constants';
import { aptosClient, buildMerkleTransaction, TRADING_FUNCTIONS } from '../utils/aptosClient';
import { log } from '../utils/logger';

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
      log.error('Failed to initialize Merkle Service:', error);
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
    currentPrice?: bigint; // Optional current market price
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

    // For market orders, we need to provide current price for slippage protection
    // If not provided, fetch it from price service
    let marketPrice = params.currentPrice;
    if (!marketPrice || marketPrice === 0n) {
      // Import price service dynamically to avoid circular dependency
      const { priceService } = await import('../utils/priceService');
      const priceData = await priceService.getPrice(params.pair as MarketName);
      
      if (!priceData || !priceData.price || priceData.price <= 0) {
        throw new Error(`Unable to fetch current market price for ${params.pair}`);
      }
      
      // Convert price to microunits (6 decimals for USDC)
      marketPrice = BigInt(Math.floor(priceData.price * 1e6));
    }

    // Based on ABI: place_order_v3 actual function signature
    // Params: &signer, address, u64, u64, u64, bool, bool, bool, u64, u64, bool
    // Args: account_address, collateral_delta, size_delta, price, is_long, is_increase, is_market, stop_loss_price, take_profit_price, can_execute_above_price
    
    // Debug logging to identify undefined values
    log.trade('Market Order Parameters:', {
      userAddress: params.userAddress,
      sizeDelta: params.sizeDelta?.toString(),
      collateralDelta: params.collateralDelta?.toString(),
      marketPrice: marketPrice.toString(),
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

    // Calculate and validate leverage (contract will also validate this)
    const calculatedLeverage = Number(params.sizeDelta) / Number(params.collateralDelta);
    const maxLeverage = this.getMaxLeverage(params.pair);
    const minLeverage = this.getMinLeverage(params.pair);
    
    log.trade('Leverage validation:', {
      calculatedLeverage: calculatedLeverage.toFixed(2),
      minLeverage,
      maxLeverage,
      isValid: calculatedLeverage >= minLeverage && calculatedLeverage <= maxLeverage
    });

    if (calculatedLeverage > maxLeverage) {
      throw new Error(`Leverage ${calculatedLeverage.toFixed(2)}x exceeds maximum ${maxLeverage}x for ${params.pair}`);
    }
    if (calculatedLeverage < minLeverage) {
      throw new Error(`Leverage ${calculatedLeverage.toFixed(2)}x below minimum ${minLeverage}x for ${params.pair}`);
    }

    const args = [
      params.userAddress,               // 1. address: _user_address
      params.sizeDelta.toString(),      // 2. u64: _size_delta (position size in microunits)
      params.collateralDelta.toString(), // 3. u64: _collateral_delta (USDC amount in microunits)
      marketPrice.toString(),           // 4. u64: _price (CURRENT MARKET PRICE for slippage protection)
      params.isLong,                    // 5. bool: _is_long
      params.isIncrease,                // 6. bool: _is_increase
      true,                             // 7. bool: _is_market (true for market orders)
      "0",                              // 8. u64: _stop_loss_trigger_price (0 = no SL)
      "0",                              // 9. u64: _take_profit_trigger_price (0 = no TP)
      true,                             // 10. bool: _can_execute_above_price
      "0x0",                           // 11. address: _referrer (use zero-address if none)
    ];

    // Log final args array to see what's being passed
    log.trade('Final args array:', args);
    log.trade('Type arguments:', marketConfig.typeArguments);

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
    // Official Merkle Trade documentation requirements
    // https://docs.merkle.trade/trading/opening-a-trade#trading-limitations
    if (pair.includes('USD') && !pair.includes('JPY') && !pair.includes('EUR') && !pair.includes('AUD') && !pair.includes('NZD') && !pair.includes('CHF') && !pair.includes('XAU') && !pair.includes('XAG')) {
      return 267; // Crypto: ~267 USDC minimum (based on working official transactions)
    } else if (pair.includes('XAU') || pair.includes('XAG')) {
      return 600; // Commodities: 600 USDC minimum  
    } else {
      return 1500; // Forex: 1,500 USDC minimum
    }
  }

  getMaxLeverage(pair: string): number {
    // Official Merkle Trade documentation requirements
    // https://docs.merkle.trade/trading/trading-pairs
    if (pair.includes('USD') && !pair.includes('JPY') && !pair.includes('EUR') && !pair.includes('AUD') && !pair.includes('NZD') && !pair.includes('CHF') && !pair.includes('XAU') && !pair.includes('XAG')) {
      return 134; // Crypto: 3x to 134x (based on successful mainnet transactions)
    } else if (pair.includes('XAU')) {
      return 250; // XAU/USD: 5x to 250x
    } else if (pair.includes('XAG')) {
      return 150; // XAG/USD: 5x to 150x
    } else {
      return 1000; // Forex: 10x to 1000x
    }
  }

  getMinLeverage(pair: string): number {
    // Official Merkle Trade documentation requirements
    // https://docs.merkle.trade/trading/trading-pairs
    if (pair.includes('USD') && !pair.includes('JPY') && !pair.includes('EUR') && !pair.includes('AUD') && !pair.includes('NZD') && !pair.includes('CHF') && !pair.includes('XAU') && !pair.includes('XAG')) {
      return 3; // Crypto: 3x minimum
    } else if (pair.includes('XAU') || pair.includes('XAG')) {
      return 5; // Metals: 5x minimum
    } else {
      return 10; // Forex: 10x minimum
    }
  }

  // Official Merkle Trade profit cap (900% maximum)
  getProfitCap(): number {
    return 900; // 900% maximum profit cap as per official documentation
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
    log.trade(`Getting executable orders for ${pair}`);
    return [];
  }

  // Simulate keeper execution for market orders (local debug only)
  async simulateKeeperExecution(params: { pair: string; orderId: string; currentPrice: bigint; }) {
    log.trade(`Simulating keeper execution for order ${params.orderId} at price ${params.currentPrice}`);
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
      log.error('Error extracting order ID from events:', error);
      return null;
    }
  }

  // ===== CLOSE POSITION FUNCTIONALITY =====
  
  /**
   * Close a position (full or partial)
   * Creates a decrease order that will be executed by keeper
   * Based on official Merkle Trade transaction: 0x7b5235a62cc8db83f6b518cae8ffe7510a2d2ebde22fc3eddb9e407944d3494a
   */
  async closePosition(params: {
    pair: string;
    userAddress: string;
    positionId: string;
    sizeDelta: bigint;          // Amount to close (in microunits)
    collateralDelta: bigint;    // Collateral to withdraw (in microunits)
    isPartial: boolean;         // true for partial close, false for full close
    currentPrice?: bigint;      // Optional current market price
  }) {
    // Validate parameters
    if (!params.userAddress || params.userAddress === 'undefined') {
      throw new Error('userAddress is required');
    }
    if (!params.sizeDelta || params.sizeDelta === 0n) {
      throw new Error('sizeDelta is required and must be greater than 0');
    }

    // Get market configuration
    const marketConfig = MARKETS[params.pair as MarketName];
    if (!marketConfig) {
      throw new Error(`Unsupported market: ${params.pair}`);
    }

    // Fetch current price if not provided
    let marketPrice = params.currentPrice;
    if (!marketPrice || marketPrice === 0n) {
      const { priceService } = await import('../utils/priceService');
      const priceData = await priceService.getPrice(params.pair as MarketName);
      
      if (!priceData || !priceData.price || priceData.price <= 0) {
        throw new Error(`Unable to fetch current market price for ${params.pair}`);
      }
      
      // Convert price to microunits (6 decimals for USDC)
      marketPrice = BigInt(Math.floor(priceData.price * 1e6));
    }

    log.trade('Close Position Parameters:', {
      positionId: params.positionId,
      sizeDelta: params.sizeDelta.toString(),
      collateralDelta: params.collateralDelta.toString(),
      isPartial: params.isPartial,
      marketPrice: marketPrice.toString(),
      pair: params.pair
    });

    // Build close order transaction
    // This creates a DECREASE order that keeper will execute
    const args = [
      params.userAddress,                // 1. address: _user_address
      params.sizeDelta.toString(),       // 2. u64: _size_delta (position size to close)
      params.collateralDelta.toString(), // 3. u64: _collateral_delta (collateral to withdraw)
      marketPrice.toString(),            // 4. u64: _price (current market price)
      false,                             // 5. bool: _is_long (doesn't matter for close)
      false,                             // 6. bool: _is_increase (false = CLOSE/DECREASE)
      true,                              // 7. bool: _is_market (true for market close)
      "0",                              // 8. u64: _stop_loss_trigger_price
      "0",                              // 9. u64: _take_profit_trigger_price
      true,                              // 10. bool: _can_execute_above_price
      "0x0",                            // 11. address: _referrer
    ];

    const typeArguments = [...marketConfig.typeArguments];

    const closeTransaction = buildMerkleTransaction(
      TRADING_FUNCTIONS.PLACE_ORDER_V3,
      typeArguments,
      args
    );

    return {
      closeTransaction,
      needsExecution: true // Keeper will execute this
    };
  }

  /**
   * Update Stop Loss and Take Profit for an existing position
   * Creates an update order that modifies SL/TP prices
   */
  async updateTPSL(params: {
    pair: string;
    userAddress: string;
    positionId: string;
    stopLossPrice?: bigint;   // 0 or undefined = remove SL
    takeProfitPrice?: bigint; // 0 or undefined = remove TP
  }) {
    // Validate parameters
    if (!params.userAddress || params.userAddress === 'undefined') {
      throw new Error('userAddress is required');
    }

    // Get market configuration
    const marketConfig = MARKETS[params.pair as MarketName];
    if (!marketConfig) {
      throw new Error(`Unsupported market: ${params.pair}`);
    }

    const slPrice = params.stopLossPrice || 0n;
    const tpPrice = params.takeProfitPrice || 0n;

    log.trade('Update TP/SL Parameters:', {
      positionId: params.positionId,
      stopLossPrice: slPrice.toString(),
      takeProfitPrice: tpPrice.toString(),
      pair: params.pair
    });

    // Build TP/SL update transaction
    // This creates an order that updates SL/TP without changing position size
    const args = [
      params.userAddress,        // 1. address: _user_address
      "0",                      // 2. u64: _size_delta (0 = no size change)
      "0",                      // 3. u64: _collateral_delta (0 = no collateral change)
      "0",                      // 4. u64: _price (0 for update)
      false,                     // 5. bool: _is_long (doesn't matter)
      false,                     // 6. bool: _is_increase (false for update)
      false,                     // 7. bool: _is_market (false for SL/TP update)
      slPrice.toString(),        // 8. u64: _stop_loss_trigger_price (NEW SL)
      tpPrice.toString(),        // 9. u64: _take_profit_trigger_price (NEW TP)
      true,                      // 10. bool: _can_execute_above_price
      "0x0",                    // 11. address: _referrer
    ];

    const typeArguments = [...marketConfig.typeArguments];

    const updateTransaction = buildMerkleTransaction(
      TRADING_FUNCTIONS.PLACE_ORDER_V3,
      typeArguments,
      args
    );

    return {
      updateTransaction,
      needsExecution: true
    };
  }

  // ===== POSITION FETCHING FROM BLOCKCHAIN =====

  /**
   * Fetch active positions from blockchain events
   * Reads PositionEvent events to reconstruct current positions
   */
  async fetchPositions(userAddress: string) {
    try {
      log.trade('Fetching positions for address:', userAddress);

      // Query PositionEvent events from Merkle contract
      // Event type: 0x5ae6789dd2fec1a9ec9cccfb3acaf12e93d432f0a3a42c92fe1a9d490b7bbc06::trading::PositionEvent
      const eventType = `${MERKLE_CONFIG.contractAddress}::trading::PositionEvent`;
      
      // In production, use indexer or query events directly
      // For now, return empty array (will be populated by indexer/WebSocket)
      log.trade('Position fetching requires indexer integration');
      
      return [];
    } catch (error) {
      log.error('Error fetching positions:', error);
      return [];
    }
  }

  /**
   * Fetch trading history from blockchain events
   * Reads PositionEvent events to get trade history
   */
  async fetchTradingHistory(userAddress: string, limit: number = 50) {
    try {
      log.trade('Fetching trading history for address:', userAddress);

      // Query PositionEvent events for this user
      // Filter by event_type: 0=open, 1=increase, 2=decrease/close, 3=liquidation
      
      // In production, use indexer or query events directly
      log.trade('History fetching requires indexer integration');
      
      return [];
    } catch (error) {
      log.error('Error fetching trading history:', error);
      return [];
    }
  }

  /**
   * Parse PositionEvent from transaction response
   * Event structure from closedata.txt transaction
   */
  parsePositionEvent(event: any) {
    try {
      const data = event.data;
      
      return {
        uid: data.uid,
        orderId: data.order_id,
        user: data.user,
        eventType: data.event_type, // 0=open, 1=increase, 2=close, 3=liquidation
        isIncrease: data.is_increase,
        isLong: data.is_long,
        isProfit: data.is_profit,
        isPartial: data.is_partial,
        sizeDelta: BigInt(data.size_delta),
        collateralDelta: BigInt(data.collateral_delta),
        originalSize: BigInt(data.original_size),
        originalCollateral: BigInt(data.original_collateral),
        price: BigInt(data.price),
        pnlWithoutFee: BigInt(data.pnl_without_fee),
        entryExitFee: BigInt(data.entry_exit_fee),
        fundingFee: BigInt(data.funding_fee),
        isFundingFeeProfit: data.is_funding_fee_profit,
        rolloverFee: BigInt(data.rollover_fee),
        longOpenInterest: BigInt(data.long_open_interest),
        shortOpenInterest: BigInt(data.short_open_interest),
        pairType: data.pair_type,
        collateralType: data.collateral_type,
      };
    } catch (error) {
      log.error('Error parsing position event:', error);
      return null;
    }
  }
}

// Singleton instance
export const merkleService = new MerkleService();
