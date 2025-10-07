import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, Alert, ScrollView, Dimensions, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Slider } from '@react-native-assets/slider';
import { useTheme } from '../theme/ThemeProvider';
import { useAccent } from '../theme/useAccent';
import { Card } from './Card';
import { useWallet } from '../app/providers/WalletProvider';
import { useMerkleTrading, PlaceOrderParams } from '../hooks/useMerkleTrading';
import { useMerklePositions } from '../hooks/useMerklePositions';
import { useMerkleEvents } from '../hooks/useMerkleEvents';
import { TRADING_CONSTANTS, APTOS_CONFIG } from '../config/constants';
import { priceService, PriceData } from '../utils/priceService';
import { MARKETS, MarketName } from '../config/constants';
import { TradingChart } from './TradingChart';
import { CandleChart, CandleData } from './CandleChart';
import { merkleService } from '../services/merkleService';
import { realMarketDataService, RealMarketData } from '../services/realMarketDataService';
import {
  TrendingUp, 
  TrendingDown, 
  Target, 
  Activity, 
  DollarSign,
  AlertCircle,
  X,
  Info,
  ArrowUpDown
} from 'lucide-react-native';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Responsive breakpoints
const BREAKPOINTS = {
  xs: 0,
  sm: 576,
  md: 768,
  lg: 992,
  xl: 1200,
} as const;

const getResponsiveValue = (values: { xs?: number; sm?: number; md?: number; lg?: number; xl?: number }, screenWidth: number) => {
  if (screenWidth >= BREAKPOINTS.xl && values.xl !== undefined) return values.xl;
  if (screenWidth >= BREAKPOINTS.lg && values.lg !== undefined) return values.lg;
  if (screenWidth >= BREAKPOINTS.md && values.md !== undefined) return values.md;
  if (screenWidth >= BREAKPOINTS.sm && values.sm !== undefined) return values.sm;
  return values.xs ?? 0;
};

export const TradingInterface: React.FC = () => {
  const { theme } = useTheme();
  const accent = useAccent();
  const { width: screenWidth } = Dimensions.get('window');
  const isMobile = screenWidth < BREAKPOINTS.md;
  
  const { connected, account } = useWallet();
  const { placeOrder, loading: tradingLoading, error: tradingError } = useMerkleTrading();
  const { positions, portfolio, totalPnL, loading: positionsLoading } = useMerklePositions();
  const { events, loading: eventsLoading } = useMerkleEvents();

  // Available Merkle trading pairs on testnet
  const AVAILABLE_MARKETS = Object.keys(MARKETS) as MarketName[];

  // Form state
  const [market, setMarket] = useState<MarketName>('APT_USD'); // Default to APT/USD
  const [showMarketSelector, setShowMarketSelector] = useState(false);
  const [side, setSide] = useState<'long' | 'short'>('long');
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [limitPrice, setLimitPrice] = useState('');
  const [marketSkew, setMarketSkew] = useState(0);
  const [positionCooldown, setPositionCooldown] = useState<Date | null>(null);
  // Get asset-specific limits and defaults based on Merkle Trade guide
  const getAssetLimits = (marketPair: MarketName) => {
    return {
      minLeverage: merkleService.getMinLeverage(marketPair),
      maxLeverage: merkleService.getMaxLeverage(marketPair),
      minPositionSize: merkleService.getMinPositionSize(marketPair),
      minCollateral: 2, // Always 2 USDC minimum
    };
  };

  const getAssetDefaults = (marketPair: MarketName) => {
    const limits = getAssetLimits(marketPair);
    
    // Calculate optimal starting values
    const defaultCollateral = Math.max(limits.minCollateral, 10);
    const defaultLeverage = Math.max(limits.minLeverage, Math.ceil(limits.minPositionSize / defaultCollateral));
    const defaultSize = defaultCollateral * defaultLeverage;
    
    return {
      size: defaultSize.toString(),
      collateral: defaultCollateral.toString(),
      leverage: defaultLeverage
    };
  };

  // Get current asset limits
  const assetLimits = getAssetLimits(market);
  
  const defaultValues = getAssetDefaults(market);
  const [size, setSize] = useState(defaultValues.size);
  const [collateral, setCollateral] = useState(defaultValues.collateral);
  // Simplified - always market orders like Merkle (no order type selector)
  const [price, setPrice] = useState('6.25');
  
  // Enhanced leverage trading features with asset-specific limits
  const [leverage, setLeverage] = useState(defaultValues.leverage);
  const [showOrderPreview, setShowOrderPreview] = useState(false);
  
  // Stop Loss and Take Profit features (like official Merkle.trade)
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  
  // Chart and market data state (only candle charts)
  const [chartType] = useState<'candle'>('candle');
  const [timeframe, setTimeframe] = useState<'1m' | '5m' | '15m' | '1h' | '4h' | '1d'>('15m');
  const [priceHistory, setPriceHistory] = useState<number[]>([]);
  const [candleData, setCandleData] = useState<CandleData[]>([]);
  const [marketData, setMarketData] = useState<RealMarketData | null>(null);
  const [fundingRate, setFundingRate] = useState<number>(0);
  const [nextFundingTime, setNextFundingTime] = useState<number>(0);
  const [longOpenInterest, setLongOpenInterest] = useState<number>(0);
  const [shortOpenInterest, setShortOpenInterest] = useState<number>(0);
  const [dataLoading, setDataLoading] = useState<boolean>(true);
  const [dataError, setDataError] = useState<string | null>(null);
  
  // Responsive spacing
  const spacing = {
    xs: getResponsiveValue({ xs: 8, sm: 12, md: 16, lg: 20, xl: 24 }, screenWidth),
    sm: getResponsiveValue({ xs: 12, sm: 16, md: 20, lg: 24, xl: 28 }, screenWidth),
    md: getResponsiveValue({ xs: 16, sm: 20, md: 24, lg: 28, xl: 32 }, screenWidth),
    lg: getResponsiveValue({ xs: 20, sm: 24, md: 28, lg: 32, xl: 36 }, screenWidth),
    xl: getResponsiveValue({ xs: 24, sm: 28, md: 32, lg: 36, xl: 40 }, screenWidth),
  };
  
  // Responsive font sizes
  const fontSize = {
    xs: getResponsiveValue({ xs: 10, sm: 11, md: 12, lg: 13, xl: 14 }, screenWidth),
    sm: getResponsiveValue({ xs: 12, sm: 13, md: 14, lg: 15, xl: 16 }, screenWidth),
    md: getResponsiveValue({ xs: 14, sm: 15, md: 16, lg: 17, xl: 18 }, screenWidth),
    lg: getResponsiveValue({ xs: 16, sm: 18, md: 20, lg: 22, xl: 24 }, screenWidth),
    xl: getResponsiveValue({ xs: 20, sm: 22, md: 24, lg: 26, xl: 28 }, screenWidth),
  };

  // Fetch real market data
  const fetchMarketData = useCallback(async () => {
    try {
      setDataLoading(true);
      setDataError(null);

      // Fetch current market data
      const currentData = await realMarketDataService.getDetailedMarketData(market);
      if (currentData) {
        setMarketData(currentData);
        setPrice(currentData.price.toFixed(2));
      }

      // Fetch price history for line chart
      const priceHistoryData = await realMarketDataService.getPriceHistory(market, 1);
      if (priceHistoryData.length > 0) {
        setPriceHistory(priceHistoryData);
      }

      // Fetch candlestick data
      const candlestickData = await realMarketDataService.getCandlestickData(market, 1);
      if (candlestickData.length > 0) {
        const formattedCandles: CandleData[] = candlestickData.map(candle => ({
          time: candle.timestamp,
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
          volume: candle.volume,
          value: candle.close,
          color: candle.close > candle.open ? theme.colors.positive : theme.colors.negative,
          timestamp: candle.timestamp,
        }));
        setCandleData(formattedCandles);
      }

      // Fetch funding rate data
      const fundingData = await realMarketDataService.getFundingRate(market);
      if (fundingData) {
        setFundingRate(fundingData.fundingRate);
        setNextFundingTime(fundingData.nextFundingTime);
      }

      // Set mock open interest data (would come from futures exchanges in production)
      setLongOpenInterest(Math.random() * 10000000);
      setShortOpenInterest(Math.random() * 10000000);

    } catch (error) {
      console.error('Error fetching market data:', error);
      setDataError('Failed to load market data');
    } finally {
      setDataLoading(false);
    }
  }, [market]);

  // Initialize market data and set up real-time updates
  useEffect(() => {
    fetchMarketData();

    // Subscribe to real-time price updates
    const unsubscribe = realMarketDataService.subscribeToPrice(market, (data) => {
      setMarketData(data);
      setPrice(data.price.toFixed(2));
    });

    return () => {
      unsubscribe();
    };
  }, [fetchMarketData, market]);
 

  const handlePlaceOrder = async () => {
    if (!connected) {
      Alert.alert('Wallet Not Connected', 'Please connect your wallet first');
      return;
    }

    // Validate collateral requirements
    const collateralValue = parseFloat(collateral);
    if (collateralValue < 2) {
      Alert.alert(
        'Insufficient Collateral', 
        `Minimum collateral required is 2 USDC. Current: ${collateralValue.toFixed(2)} USDC`
      );
      return;
    }
    
    if (collateralValue > 10000) {
      Alert.alert(
        'Collateral Too Large', 
        `Maximum collateral allowed is 10,000 USDC. Current: ${collateralValue.toFixed(2)} USDC`
      );
      return;
    }

    // Validate minimum position size
    const sizeValue = parseFloat(size);
    if (sizeValue < 2) { // Use fixed 2 USDC minimum like official Merkle
      Alert.alert(
        'Position Size Too Small', 
        `Minimum position size is 2 USDC. Current: ${sizeValue.toFixed(2)} USDC`
      );
      return;
    }

    // Validate maximum position size (1.5M USDC = 10k collateral × 150x leverage)
    if (sizeValue > 1500000) {
      Alert.alert(
        'Position Size Too Large', 
        `Maximum position size is 1,500,000 USDC. Current: ${sizeValue.toFixed(2)} USDC`
      );
      return;
    }

    // Validate leverage is within bounds
    const currentLeverage = leverage;
    if (currentLeverage < 3 || currentLeverage > 150) {
      Alert.alert(
        'Invalid Leverage', 
        `Leverage must be between 3x and 150x. Current: ${currentLeverage}x`
      );
      return;
    }

    try {
      const orderParams: PlaceOrderParams = {
        market,
        side,
        size: sizeValue,
        collateral: collateralValue,
        orderType,
        price: orderType === 'limit' ? parseFloat(limitPrice) : undefined,
        stopLoss: stopLoss ? parseFloat(stopLoss) : undefined,
        takeProfit: takeProfit ? parseFloat(takeProfit) : undefined,
      };

      const txHash = await placeOrder(orderParams);
      Alert.alert('Order Placed', `Transaction hash: ${txHash.substring(0, 10)}...`);
    } catch (error) {
      Alert.alert('Order Failed', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Helper functions with correlated calculations like official Merkle
  const handleLeverageChange = (value: number) => {
    const clampedLeverage = Math.max(assetLimits.minLeverage, Math.min(assetLimits.maxLeverage, value));
    setLeverage(clampedLeverage);
    
    // Update size based on current collateral and new leverage
    const currentCollateral = parseFloat(collateral) || 2;
    const newSize = currentCollateral * clampedLeverage;
    setSize(newSize.toFixed(2));
  };

  const handleSizeChange = (value: string) => {
    setSize(value);
    
    // Update collateral based on current leverage and new size
    const sizeValue = parseFloat(value) || 0;
    if (sizeValue > 0 && leverage > 0) {
      const newCollateral = sizeValue / leverage;
      setCollateral(Math.max(2, newCollateral).toFixed(2));
    }
  };

  const handleCollateralChange = (value: string) => {
    setCollateral(value);
    
    // Update size based on current leverage and new collateral
    const collateralValue = parseFloat(value) || 0;
    if (collateralValue > 0 && leverage > 0) {
      const newSize = collateralValue * leverage;
      setSize(newSize.toFixed(2));
    }
  };

  // Helper to suggest minimum leverage for small collateral amounts
  const getMinimumLeverageForTrade = () => {
    const collateralAmount = parseFloat(collateral);
    const minPositionSize = 2; // 2 USDC minimum like official Merkle
    const minCollateral = 2; // Minimum: 2 USDC
    
    if (collateralAmount >= minCollateral && collateralAmount < minPositionSize) {
      return Math.ceil(minPositionSize / collateralAmount);
    }
    return 3; // Minimum leverage for crypto
  };

  const getSuggestedTradeSetup = () => {
    const collateralAmount = parseFloat(collateral) || 2;
    const minLeverage = getMinimumLeverageForTrade();
    const suggestedSize = collateralAmount * minLeverage;
    
    return {
      collateral: Math.max(2, collateralAmount),
      leverage: minLeverage,
      size: suggestedSize
    };
  };

  // Removed TP/SL functions - simplified like Merkle Trade

  const calculateExecutionPrice = () => {
    // Always market orders now
    return parseFloat(price) * 1.001;
  };

  // Formula 4: Liquidation Price calculation from guide
  const calculateEstimatedLiqPrice = () => {
    const entryPrice = calculateExecutionPrice();
    return merkleService.calculateLiquidationPrice({
      entryPrice,
      leverage,
      isLong: side === 'long'
    });
  };

  // Calculate price impact based on trade size
  const calculatePriceImpact = () => {
    const tradeSize = parseFloat(size) || 0;
    const currentSkew = 0; // Would come from market data in production
    return merkleService.calculatePriceImpact(currentSkew, tradeSize);
  };

  // Calculate trading fees
  const calculateTradingFees = () => {
    const positionSize = parseFloat(size) || 0;
    return merkleService.calculateTradingFee(positionSize);
  };

  // Calculate profit cap for TP/SL validation
  const calculateProfitCap = () => {
    const collateralAmount = parseFloat(collateral) || 0;
    return merkleService.calculateProfitCap(collateralAmount);
  };

  const calculateMaxSlippage = () => {
    return parseFloat(size) * 0.001; // 0.1% max slippage
  };

  const calculateEstimatedFee = () => {
    const positionSize = parseFloat(size);
    if (isNaN(positionSize) || positionSize <= 0) return '0.00';
    const fee = positionSize * TRADING_CONSTANTS.FEES.TAKER_FEE;
    return fee.toFixed(4);
  };

  const calculateMarginUsage = () => {
    const tradeCollateral = parseFloat(collateral);
    if (isNaN(tradeCollateral) || !portfolio || portfolio.totalBalance <= 0) {
      return '0.00%';
    }
    const usage = (tradeCollateral / portfolio.totalBalance) * 100;
    return `${usage.toFixed(2)}%`;
  };

  const calculateAccountLeverage = () => {
    if (!portfolio || portfolio.totalBalance <= 0) {
      return '0.00x';
    }
    const totalPositionSize = positions.reduce((sum, pos) => sum + pos.size, 0);
    const newPositionSize = parseFloat(size);
    if (isNaN(newPositionSize)) {
      return '0.00x';
    }

    const currentLeverage = totalPositionSize / portfolio.totalBalance;
    const newLeverage = (totalPositionSize + newPositionSize) / portfolio.totalBalance;

    return `${currentLeverage.toFixed(2)}x ~ ${newLeverage.toFixed(2)}x`;
  };
  
  const AnimatedButton: React.FC<{
    onPress: () => void;
    children: React.ReactNode;
    style?: object;
    disabled?: boolean;
    variant?: 'primary' | 'secondary' | 'long' | 'short';
  }> = ({ onPress, children, style, disabled = false, variant = 'primary' }) => {
    const scale = useSharedValue(1);
    
    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }));
    
    const handlePress = () => {
      if (disabled) return;
      scale.value = withSpring(0.95, {}, () => {
        scale.value = withSpring(1);
      });
      onPress();
    };
    
    const getButtonColors = (): [string, string] => {
      switch (variant) {
        case 'long':
          return [theme.colors.buy, theme.colors.green];
        case 'short':
          return [theme.colors.sell, theme.colors.red];
        case 'secondary':
          return [theme.colors.chip, theme.colors.elevated];
        default:
          return [accent.from, accent.to];
      }
    };
    
    return (
      <AnimatedPressable onPress={handlePress} style={[animatedStyle, style]} disabled={disabled}>
        <LinearGradient
          colors={getButtonColors()}
          style={[
            {
              paddingHorizontal: spacing.lg,
              paddingVertical: spacing.md,
              borderRadius: theme.borderRadius.md,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: disabled ? 0.6 : 1,
            }
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {children}
        </LinearGradient>
      </AnimatedPressable>
    );
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.colors.bg }]}
      contentContainerStyle={{ paddingBottom: spacing.xl }}
      showsVerticalScrollIndicator={false}
    >
      {/* Market Overview & Chart Section */}
      <Card style={[
        styles.section, 
        { 
          backgroundColor: theme.colors.card,
          padding: isMobile ? spacing.sm : spacing.lg,
          marginHorizontal: isMobile ? spacing.xs : spacing.md,
          marginBottom: isMobile ? spacing.md : spacing.lg,
          borderRadius: theme.borderRadius.lg
        }
      ]}>
        {/* Market Header */}
        <View style={[
          styles.marketHeader,
          isMobile && { marginBottom: spacing.sm }
        ]}>
          <View style={styles.marketInfo}>
            <Text style={[
              styles.marketSymbol,
              { 
                color: theme.colors.textPrimary,
                fontSize: fontSize.xl,
                fontFamily: 'Inter-Bold'
              }
            ]}>{MARKETS[market as keyof typeof MARKETS]?.displayName || MARKETS[market as keyof typeof MARKETS]?.name || market}</Text>
            <Text style={[
              styles.marketPrice,
              { 
                color: theme.colors.textPrimary,
                fontSize: fontSize.lg,
                fontFamily: 'Inter-SemiBold'
              }
            ]}>
              {dataLoading ? 'Loading...' : marketData ? `$${marketData.price.toFixed(2)}` : 'N/A'}
            </Text>
            <Text style={[
              styles.marketChange,
              { 
                color: marketData && marketData.changePercent24h >= 0 ? theme.colors.positive : theme.colors.negative,
                fontSize: fontSize.md,
                fontFamily: 'Inter-Medium'
              }
            ]}>
              {dataLoading ? '...' : marketData ? 
                `${marketData.changePercent24h >= 0 ? '+' : ''}${marketData.changePercent24h.toFixed(2)}%` : 
                'N/A'
              }
            </Text>
          </View>
          
          {/* Market Stats - Compact Mobile Layout */}
          <View style={[
            styles.marketStats,
            isMobile && {
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: spacing.xs,
              marginBottom: spacing.sm
            }
          ]}>
            <View style={[styles.statItem, isMobile && { 
              flex: 0, 
              minWidth: '48%',
              backgroundColor: theme.colors.chip,
              padding: spacing.xs,
              borderRadius: 8
            }]}>
              <Text style={[styles.statLabel, { 
                color: theme.colors.textSecondary, 
                fontSize: isMobile ? fontSize.xs : fontSize.xs,
                textAlign: 'center',
                marginBottom: 2
              }]}>
                24h Volume
              </Text>
              <Text style={[styles.statValue, { 
                color: theme.colors.textPrimary, 
                fontSize: isMobile ? fontSize.xs : fontSize.sm,
                textAlign: 'center',
                fontFamily: 'Inter-SemiBold'
              }]}>
                {dataLoading ? '...' : marketData ? `$${(marketData.volume24h / 1e6).toFixed(1)}M` : 'N/A'}
              </Text>
            </View>
            <View style={[styles.statItem, isMobile && { 
              flex: 0, 
              minWidth: '48%',
              backgroundColor: theme.colors.chip,
              padding: spacing.xs,
              borderRadius: 8
            }]}>
              <Text style={[styles.statLabel, { 
                color: theme.colors.textSecondary, 
                fontSize: isMobile ? fontSize.xs : fontSize.xs,
                textAlign: 'center',
                marginBottom: 2
              }]}>
                Funding Rate
              </Text>
              <Text style={[
                styles.statValue, 
                { 
                  color: fundingRate >= 0 ? theme.colors.positive : theme.colors.negative,
                  fontSize: isMobile ? fontSize.xs : fontSize.sm,
                  textAlign: 'center',
                  fontFamily: 'Inter-SemiBold'
                }
              ]}>
                {(fundingRate * 100).toFixed(3)}%
              </Text>
            </View>
            <View style={[styles.statItem, isMobile && { 
              flex: 0, 
              minWidth: '48%',
              backgroundColor: theme.colors.chip,
              padding: spacing.xs,
              borderRadius: 8
            }]}>
              <Text style={[styles.statLabel, { 
                color: theme.colors.textSecondary, 
                fontSize: isMobile ? fontSize.xs : fontSize.xs,
                textAlign: 'center',
                marginBottom: 2
              }]}>
                Long OI
              </Text>
              <Text style={[styles.statValue, { 
                color: theme.colors.positive, 
                fontSize: isMobile ? fontSize.xs : fontSize.sm,
                textAlign: 'center',
                fontFamily: 'Inter-SemiBold'
              }]}>
                ${(longOpenInterest / 1e6).toFixed(1)}M
              </Text>
            </View>
            <View style={[styles.statItem, isMobile && { 
              flex: 0, 
              minWidth: '48%',
              backgroundColor: theme.colors.chip,
              padding: spacing.xs,
              borderRadius: 8
            }]}>
              <Text style={[styles.statLabel, { 
                color: theme.colors.textSecondary, 
                fontSize: isMobile ? fontSize.xs : fontSize.xs,
                textAlign: 'center',
                marginBottom: 2
              }]}>
                Short OI
              </Text>
              <Text style={[styles.statValue, { 
                color: theme.colors.negative, 
                fontSize: isMobile ? fontSize.xs : fontSize.sm,
                textAlign: 'center',
                fontFamily: 'Inter-SemiBold'
              }]}>
                ${(shortOpenInterest / 1e6).toFixed(1)}M
              </Text>
            </View>
          </View>
        </View>

        {/* Chart Controls - Compact */}
        <View style={[
          styles.chartControls,
          isMobile && {
            marginBottom: spacing.xs,
            paddingHorizontal: 0
          }
        ]}>
          <Text style={[
            {
              color: theme.colors.textPrimary,
              fontSize: isMobile ? fontSize.sm : fontSize.md,
              fontFamily: 'Inter-SemiBold'
            }
          ]}>Candlestick Chart</Text>
          
          <View style={[
            styles.timeframeSelector,
            isMobile && {
              gap: spacing.xs
            }
          ]}>
            {(['1h', '4h', '1d'] as const).map((tf) => (
              <Pressable
                key={tf}
                style={[
                  styles.timeframeButton,
                  timeframe === tf && styles.timeframeButtonActive,
                  { 
                    backgroundColor: timeframe === tf ? (typeof accent === 'string' ? accent : '#6366f1') : 'transparent',
                    paddingHorizontal: isMobile ? spacing.sm : spacing.md,
                    paddingVertical: isMobile ? spacing.xs : spacing.sm,
                    borderRadius: 6,
                    minWidth: isMobile ? 40 : 50
                  }
                ]}
                onPress={() => setTimeframe(tf)}
              >
                <Text style={[
                  styles.timeframeText,
                  { 
                    color: timeframe === tf ? '#FFFFFF' : theme.colors.textSecondary,
                    fontSize: isMobile ? fontSize.xs : fontSize.sm,
                    fontFamily: 'Inter-Medium',
                    textAlign: 'center'
                  }
                ]}>{tf}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Chart Component */}
        <View style={styles.chartContainer}>
          {dataError ? (
            <View style={{ 
              alignItems: 'center', 
              justifyContent: 'center', 
              height: isMobile ? 200 : 300,
              backgroundColor: theme.colors.chip,
              borderRadius: theme.borderRadius.md,
              padding: spacing.lg
            }}>
              <AlertCircle size={48} color={theme.colors.negative} />
              <Text style={[
                {
                  color: theme.colors.textSecondary,
                  fontSize: fontSize.md,
                  fontFamily: 'Inter-Medium',
                  marginTop: spacing.md,
                  textAlign: 'center'
                }
              ]}>{dataError}</Text>
              <Pressable
                style={[
                  {
                    backgroundColor: typeof accent === 'string' ? accent : '#6366f1',
                    paddingHorizontal: spacing.lg,
                    paddingVertical: spacing.sm,
                    borderRadius: theme.borderRadius.md,
                    marginTop: spacing.md
                  }
                ]}
                onPress={fetchMarketData}
              >
                <Text style={[
                  {
                    color: '#FFFFFF',
                    fontSize: fontSize.sm,
                    fontFamily: 'Inter-SemiBold'
                  }
                ]}>Retry</Text>
              </Pressable>
            </View>
          ) : dataLoading ? (
            <View style={{ 
              alignItems: 'center', 
              justifyContent: 'center', 
              height: isMobile ? 200 : 300,
              backgroundColor: theme.colors.chip,
              borderRadius: theme.borderRadius.md
            }}>
              <Activity size={32} color={theme.colors.textSecondary} />
              <Text style={[
                {
                  color: theme.colors.textSecondary,
                  fontSize: fontSize.md,
                  fontFamily: 'Inter-Medium',
                  marginTop: spacing.md
                }
              ]}>Loading chart data...</Text>
            </View>
          ) : (
            <CandleChart
              data={candleData}
              height={isMobile ? 250 : 350}
              width={screenWidth - (isMobile ? 32 : 64)}
              accent={typeof accent === 'string' ? accent : accent.from}
              showGrid={true}
              showVolume={true}
              showXAxis={true}
              showYAxis={true}
              showAxisLabels={true}
            />
          )}
        </View>
      </Card>


      {/* Trading Form Section */}
      {connected && (
        <Card style={[
          styles.section, 
          { 
            backgroundColor: theme.colors.card,
            padding: spacing.lg,
            marginHorizontal: spacing.md,
            marginBottom: spacing.lg,
            borderRadius: theme.borderRadius.lg
          }
        ]}>
          <View style={styles.sectionHeader}>
            <Target size={24} color={theme.colors.textPrimary} />
            <Text style={[
              styles.sectionTitle, 
              { 
                color: theme.colors.textPrimary,
                fontSize: fontSize.lg,
                fontFamily: 'Inter-SemiBold',
                marginLeft: spacing.sm
              }
            ]}>Place Order</Text>
          </View>
          
          {/* Market Selection */}
          <View style={[styles.inputGroup, { marginTop: spacing.lg }]}>
            <Text style={[
              styles.label,
              {
                color: theme.colors.textSecondary,
                fontSize: fontSize.sm,
                fontFamily: 'Inter-Medium',
                marginBottom: spacing.sm
              }
            ]}>Market</Text>
            <Pressable
              style={[
                styles.inputContainer,
                {
                  backgroundColor: theme.colors.chip,
                  borderRadius: theme.borderRadius.md,
                  borderWidth: 0,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.md,
                  flexDirection: 'row',
                  alignItems: 'center'
                }
              ]}
              onPress={() => setShowMarketSelector(true)}
            >
              <DollarSign size={20} color={theme.colors.textSecondary} style={{ marginRight: spacing.sm }} />
              <Text style={[
                {
                  color: theme.colors.textPrimary,
                  fontSize: fontSize.md,
                  fontFamily: 'Inter-Medium',
                  flex: 1
                }
              ]}>{MARKETS[market as keyof typeof MARKETS]?.displayName || MARKETS[market as keyof typeof MARKETS]?.name}</Text>
              <ArrowUpDown size={18} color={theme.colors.textSecondary} />
            </Pressable>
          </View>
          
          {/* Market Selector Modal */}
          <Modal
            visible={showMarketSelector}
            transparent
            animationType="fade"
            onRequestClose={() => setShowMarketSelector(false)}
          >
            <Pressable 
              style={styles.modalOverlay}
              onPress={() => setShowMarketSelector(false)}
            >
              <View style={[
                styles.modalContent,
                {
                  backgroundColor: theme.colors.surface,
                  borderRadius: theme.borderRadius.lg,
                  padding: spacing.lg,
                  borderWidth: 0,
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
                }
              ]}>
                <Text style={[
                  {
                    color: theme.colors.textPrimary,
                    fontSize: fontSize.lg,
                    fontFamily: 'Inter-Bold',
                    marginBottom: spacing.lg
                  }
                ]}>Select Trading Pair</Text>
                
                {AVAILABLE_MARKETS.map((mkt) => (
                  <Pressable
                    key={mkt}
                    style={[
                      styles.marketOption,
                      {
                        backgroundColor: market === mkt ? (accent.from + '20') : 'transparent',
                        borderRadius: theme.borderRadius.md,
                        padding: spacing.md,
                        marginBottom: spacing.sm,
                        borderWidth: market === mkt ? 1 : 0,
                        borderColor: market === mkt ? accent.from : 'transparent'
                      }
                    ]}
                    onPress={() => {
                      setMarket(mkt);
                      setShowMarketSelector(false);
                    }}
                  >
                    <Text style={[
                      {
                        color: market === mkt ? accent.from : theme.colors.textPrimary,
                        fontSize: fontSize.md,
                        fontFamily: market === mkt ? 'Inter-Bold' : 'Inter-Medium'
                      }
                    ]}>{MARKETS[mkt as keyof typeof MARKETS]?.displayName || MARKETS[mkt as keyof typeof MARKETS]?.name || mkt}</Text>
                  </Pressable>
                ))}
              </View>
            </Pressable>
          </Modal>

          {/* Side Selection */}
          <View style={styles.inputGroup}>
            <Text style={[
              styles.label,
              {
                color: theme.colors.textSecondary,
                fontSize: fontSize.sm,
                fontFamily: 'Inter-Medium',
                marginBottom: spacing.sm
              }
            ]}>Order Type</Text>
            <View style={[
              styles.segmentedControl,
              {
                backgroundColor: theme.colors.chip,
                borderRadius: theme.borderRadius.md,
                padding: 4,
                flexDirection: 'row',
                marginBottom: spacing.md
              }
            ]}>
              <Pressable
                style={[
                  styles.segment,
                  {
                    flex: 1,
                    paddingVertical: spacing.sm,
                    borderRadius: theme.borderRadius.xs,
                    backgroundColor: orderType === 'market' ? theme.colors.purple : 'transparent'
                  }
                ]}
                onPress={() => setOrderType('market')}
              >
                <Text style={[
                  styles.segmentText,
                  {
                    color: orderType === 'market' ? '#FFFFFF' : theme.colors.textPrimary,
                    fontSize: fontSize.sm,
                    fontFamily: 'Inter-SemiBold',
                    textAlign: 'center'
                  }
                ]}>Market</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.segment,
                  {
                    flex: 1,
                    paddingVertical: spacing.sm,
                    borderRadius: theme.borderRadius.xs,
                    backgroundColor: orderType === 'limit' ? theme.colors.purple : 'transparent'
                  }
                ]}
                onPress={() => setOrderType('limit')}
              >
                <Text style={[
                  styles.segmentText,
                  {
                    color: orderType === 'limit' ? '#FFFFFF' : theme.colors.textPrimary,
                    fontSize: fontSize.sm,
                    fontFamily: 'Inter-SemiBold',
                    textAlign: 'center'
                  }
                ]}>Limit</Text>
              </Pressable>
            </View>
          </View>

          {/* Long/Short Selector */}
          <View style={[styles.inputGroup]}>
            <View style={[
              styles.segmentedControl,
              {
                backgroundColor: theme.colors.chip,
                borderRadius: theme.borderRadius.md,
                padding: 4,
                flexDirection: 'row'
              }
            ]}>
              <Pressable
                style={[
                  styles.segment,
                  {
                    flex: 1,
                    paddingVertical: spacing.sm,
                    borderRadius: theme.borderRadius.xs,
                    backgroundColor: side === 'long' ? theme.colors.buy : 'transparent'
                  }
                ]}
                onPress={() => setSide('long')}
              >
                <View style={styles.segmentContent}>
                  <TrendingUp size={18} color={side === 'long' ? '#FFFFFF' : theme.colors.buy} />
                  <Text style={[
                    styles.segmentText,
                    {
                      color: side === 'long' ? '#FFFFFF' : theme.colors.textPrimary,
                      fontSize: fontSize.md,
                      fontFamily: 'Inter-SemiBold',
                      marginLeft: spacing.xs
                    }
                  ]}>Long</Text>
                </View>
              </Pressable>
              <Pressable
                style={[
                  styles.segment,
                  {
                    flex: 1,
                    paddingVertical: spacing.sm,
                    borderRadius: theme.borderRadius.xs,
                    backgroundColor: side === 'short' ? theme.colors.sell : 'transparent'
                  }
                ]}
                onPress={() => setSide('short')}
              >
                <View style={styles.segmentContent}>
                  <TrendingDown size={18} color={side === 'short' ? '#FFFFFF' : theme.colors.sell} />
                  <Text style={[
                    styles.segmentText,
                    {
                      color: side === 'short' ? '#FFFFFF' : theme.colors.textPrimary,
                      fontSize: fontSize.md,
                      fontFamily: 'Inter-SemiBold',
                      marginLeft: spacing.xs
                    }
                  ]}>Short</Text>
                </View>
              </Pressable>
            </View>
          </View>

          {/* Limit Price Input - Only show for limit orders */}
          {orderType === 'limit' && (
            <View style={[styles.inputGroup, { marginTop: spacing.md }]}>
              <Text style={[
                styles.label,
                {
                  color: theme.colors.textSecondary,
                  fontSize: fontSize.sm,
                  fontFamily: 'Inter-Medium',
                  marginBottom: spacing.sm
                }
              ]}>Limit Price</Text>
              <View style={[
                styles.inputContainer,
                {
                  backgroundColor: theme.colors.chip,
                  borderRadius: theme.borderRadius.md,
                  borderWidth: 0,
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm
                }
              ]}>
                <TextInput
                  style={[
                    {
                      color: theme.colors.textPrimary,
                      fontSize: fontSize.lg,
                      fontFamily: 'Inter-SemiBold',
                      flex: 1,
                      paddingVertical: spacing.xs,
                      borderWidth: 0,
                    }
                  ]}
                  value={limitPrice}
                  onChangeText={setLimitPrice}
                  placeholder="Enter limit price"
                  placeholderTextColor={theme.colors.textSecondary}
                  keyboardType="numeric"
                />
                <Text style={[
                  {
                    color: theme.colors.textSecondary,
                    fontSize: fontSize.sm,
                    fontFamily: 'Inter-Medium',
                    marginRight: 2,
                    marginLeft: -12
                  }
                ]}>USDC</Text>
              </View>
            </View>
          )}

          {/* Leverage Slider */}
          <View style={styles.inputGroup}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
              <Text style={[
                styles.label,
                {
                  color: theme.colors.textSecondary,
                  fontSize: fontSize.sm,
                  fontFamily: 'Inter-Medium',
                }
              ]}>Leverage</Text>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: theme.colors.chip,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.xs,
                borderRadius: theme.borderRadius.xs,
              }}>
                <Text style={[
                  {
                    color: theme.colors.purple,
                    fontSize: fontSize.xl,
                    fontFamily: 'Inter-Bold',
                  }
                ]}>{leverage}x</Text>
                <Text style={[
                  {
                    color: leverage < 25 ? theme.colors.positive : leverage < 50 ? theme.colors.orange : theme.colors.negative,
                    fontSize: fontSize.xs,
                    fontFamily: 'Inter-Medium',
                    marginLeft: spacing.xs
                  }
                ]}>
                  {leverage < 25 ? 'Low Risk' : leverage < 50 ? 'Med Risk' : 'High Risk'}
                </Text>
              </View>
            </View>
            <View style={{
              backgroundColor: theme.colors.chip,
              padding: spacing.md,
              borderRadius: theme.borderRadius.md,
              borderWidth: 0,
            }}>
              <Slider
                value={leverage}
                onValueChange={handleLeverageChange}
                minimumValue={assetLimits.minLeverage}
                maximumValue={assetLimits.maxLeverage}
                step={1}
                minimumTrackTintColor={theme.colors.purple}
                maximumTrackTintColor={theme.colors.border}
                thumbTintColor={theme.colors.purple}
                thumbStyle={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  boxShadow: `0 2px 4px ${theme.colors.purple}80`,
                  elevation: 4,
                }}
                trackStyle={{
                  height: 6,
                  borderRadius: 3,
                }}
              />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm }}>
                {(() => {
                  // Generate asset-specific leverage presets
                  const { minLeverage, maxLeverage } = assetLimits;
                  const range = maxLeverage - minLeverage;
                  const presets = [
                    minLeverage,
                    Math.round(minLeverage + range * 0.25),
                    Math.round(minLeverage + range * 0.5),
                    Math.round(minLeverage + range * 0.75),
                    maxLeverage
                  ];
                  return presets;
                })().map((val) => (
                  <Pressable
                    key={val}
                    onPress={() => handleLeverageChange(val)}
                    style={{
                      paddingHorizontal: spacing.xs,
                      paddingVertical: 2,
                    }}
                  >
                    <Text style={[
                      {
                        color: leverage === val ? theme.colors.purple : theme.colors.textSecondary,
                        fontSize: fontSize.xs,
                        fontFamily: leverage === val ? 'Inter-Bold' : 'Inter-Regular',
                      }
                    ]}>{val}x</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>

          {/* Size & Collateral Inputs */}
          <View style={[styles.inputRow, { flexDirection: isMobile ? 'column' : 'row', gap: spacing.md }]}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={[
                styles.label,
                {
                  color: theme.colors.textSecondary,
                  fontSize: fontSize.sm,
                  fontFamily: 'Inter-Medium',
                  marginBottom: spacing.sm
                }
              ]}>Amount</Text>
              <View style={[
                styles.inputContainer,
                {
                  backgroundColor: theme.colors.chip,
                  borderRadius: theme.borderRadius.md,
                  borderWidth: 0,
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm
                }
              ]}>
                <TextInput
                  style={[
                    {
                      color: theme.colors.textPrimary,
                      fontSize: fontSize.lg,
                      fontFamily: 'Inter-SemiBold',
                      flex: 1,
                      paddingVertical: spacing.xs,
                      borderWidth: 0,
                    }
                  ]}
                  value={size}
                  onChangeText={handleSizeChange}
                  placeholder="Min: 2 USDC"
                  placeholderTextColor={theme.colors.textSecondary}
                  keyboardType="numeric"
                />
                <Text style={[
                  {
                    color: theme.colors.textSecondary,
                    fontSize: fontSize.sm,
                    fontFamily: 'Inter-Medium',
                    marginRight: 2,
                    marginLeft: -12
                  }
                ]}>USDC</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm }}>
                {[2, 6, 50, 100, 500].map((amt) => (
                  <Pressable
                    key={amt}
                    onPress={() => handleSizeChange(amt.toString())}
                    style={{
                      backgroundColor: theme.colors.chip,
                      paddingHorizontal: spacing.sm,
                      paddingVertical: spacing.xs,
                      borderRadius: theme.borderRadius.xs,
                    }}
                  >
                    <Text style={[
                      {
                        color: theme.colors.textSecondary,
                        fontSize: fontSize.xs,
                        fontFamily: 'Inter-Medium',
                      }
                    ]}>{amt}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={[
                styles.label,
                {
                  color: theme.colors.textSecondary,
                  fontSize: fontSize.sm,
                  fontFamily: 'Inter-Medium',
                  marginBottom: spacing.sm
                }
              ]}>Collateral</Text>
              <View style={[
                styles.inputContainer,
                {
                  backgroundColor: theme.colors.chip,
                  borderRadius: theme.borderRadius.md,
                  borderWidth: 0,
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm
                }
              ]}>
                <Pressable style={{ marginRight: spacing.sm }}>
                  <ArrowUpDown size={16} color={theme.colors.textSecondary} />
                </Pressable>
                <TextInput
                  style={[
                    {
                      color: theme.colors.textPrimary,
                      fontSize: fontSize.lg,
                      fontFamily: 'Inter-SemiBold',
                      flex: 1,
                      paddingVertical: spacing.xs,
                      borderWidth: 0,
                    }
                  ]}
                  value={collateral}
                  onChangeText={handleCollateralChange}
                  placeholder={`Min: ${assetLimits.minCollateral} USDC`}
                  placeholderTextColor={theme.colors.textSecondary}
                  keyboardType="numeric"
                />
                <Text style={[
                  {
                    color: theme.colors.textSecondary,
                    fontSize: fontSize.sm,
                    fontFamily: 'Inter-Medium',
                    marginRight: 2,
                    marginLeft: -12
                  }
                ]}>USDC</Text>
              </View>
            </View>
          </View>

          {/* Advanced Options - Stop Loss & Take Profit */}
          <View style={{ marginTop: spacing.md }}>
            <Pressable
              onPress={() => setShowAdvancedOptions(!showAdvancedOptions)}
              style={[
                {
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: spacing.sm,
                  paddingHorizontal: spacing.md,
                  backgroundColor: theme.colors.chip,
                  borderRadius: theme.borderRadius.md,
                  borderWidth: 0,
                  borderColor: theme.colors.border
                }
              ]}
            >
              <Text style={[
                {
                  color: theme.colors.textPrimary,
                  fontSize: fontSize.sm,
                  fontFamily: 'Inter-SemiBold'
                }
              ]}>Advanced Options</Text>
              <Text style={[
                {
                  color: theme.colors.textSecondary,
                  fontSize: fontSize.xs,
                  fontFamily: 'Inter-Medium'
                }
              ]}>{showAdvancedOptions ? '▼' : '▶'}</Text>
            </Pressable>

            {showAdvancedOptions && (
              <View style={[
                {
                  backgroundColor: theme.colors.chip,
                  padding: spacing.md,
                  borderRadius: theme.borderRadius.md,
                  marginTop: spacing.xs,
                  borderWidth: 0
                }
              ]}>
                {/* Stop Loss */}
                <View style={{ marginBottom: spacing.md }}>
                  <Text style={[
                    {
                      color: theme.colors.textSecondary,
                      fontSize: fontSize.sm,
                      fontFamily: 'Inter-Medium',
                      marginBottom: spacing.sm
                    }
                  ]}>Stop Loss</Text>
                  <View style={[
                    {
                      backgroundColor: theme.colors.bg,
                      borderRadius: theme.borderRadius.md,
                      borderWidth: 0,
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: spacing.md,
                      paddingVertical: spacing.sm
                    }
                  ]}>
                    <TextInput
                      style={[
                        {
                          color: theme.colors.textPrimary,
                          fontSize: fontSize.md,
                          fontFamily: 'Inter-Medium',
                          flex: 1,
                          paddingVertical: spacing.xs,
                        }
                      ]}
                      value={stopLoss}
                      onChangeText={setStopLoss}
                      placeholder="Stop Loss Price"
                      placeholderTextColor={theme.colors.textSecondary}
                      keyboardType="numeric"
                    />
                    <Text style={[
                      {
                        color: theme.colors.textSecondary,
                        fontSize: fontSize.sm,
                        fontFamily: 'Inter-Medium'
                      }
                    ]}>USDC</Text>
                  </View>
                </View>

                {/* Take Profit */}
                <View>
                  <Text style={[
                    {
                      color: theme.colors.textSecondary,
                      fontSize: fontSize.sm,
                      fontFamily: 'Inter-Medium',
                      marginBottom: spacing.sm
                    }
                  ]}>Take Profit</Text>
                  <View style={[
                    {
                      backgroundColor: theme.colors.bg,
                      borderRadius: theme.borderRadius.md,
                      borderWidth: 0,
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: spacing.md,
                      paddingVertical: spacing.sm
                    }
                  ]}>
                    <TextInput
                      style={[
                        {
                          color: theme.colors.textPrimary,
                          fontSize: fontSize.md,
                          fontFamily: 'Inter-Medium',
                          flex: 1,
                          paddingVertical: spacing.xs,
                        }
                      ]}
                      value={takeProfit}
                      onChangeText={setTakeProfit}
                      placeholder="Take Profit Price"
                      placeholderTextColor={theme.colors.textSecondary}
                      keyboardType="numeric"
                    />
                    <Text style={[
                      {
                        color: theme.colors.textSecondary,
                        fontSize: fontSize.sm,
                        fontFamily: 'Inter-Medium'
                      }
                    ]}>USDC</Text>
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* Trading Summary - Key Metrics from Merkle Guide */}
          {parseFloat(size) > 0 && parseFloat(collateral) > 0 && (
            <View style={[
              {
                backgroundColor: theme.colors.chip,
                padding: spacing.md,
                borderRadius: theme.borderRadius.md,
                marginTop: spacing.md,
                borderWidth: 0
              }
            ]}>
              <Text style={[
                {
                  color: theme.colors.textPrimary,
                  fontSize: fontSize.sm,
                  fontFamily: 'Inter-SemiBold',
                  marginBottom: spacing.sm
                }
              ]}>📊 Trade Summary</Text>
              
              <View style={{ }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs }}>
                  <Text style={[{ color: theme.colors.textSecondary, fontSize: fontSize.xs, fontFamily: 'Inter-Medium' }]}>
                    Position Size
                  </Text>
                  <Text style={[{ color: theme.colors.textPrimary, fontSize: fontSize.xs, fontFamily: 'Inter-SemiBold' }]}>
                    ${parseFloat(size).toFixed(2)} USDC
                  </Text>
                </View>
                
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs }}>
                  <Text style={[{ color: theme.colors.textSecondary, fontSize: fontSize.xs, fontFamily: 'Inter-Medium' }]}>
                    Liquidation Price
                  </Text>
                  <Text style={[{ color: theme.colors.negative, fontSize: fontSize.xs, fontFamily: 'Inter-SemiBold' }]}>
                    ${calculateEstimatedLiqPrice().toFixed(4)}
                  </Text>
                </View>
                
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs }}>
                  <Text style={[{ color: theme.colors.textSecondary, fontSize: fontSize.xs, fontFamily: 'Inter-Medium' }]}>
                    Trading Fee
                  </Text>
                  <Text style={[{ color: theme.colors.textPrimary, fontSize: fontSize.xs, fontFamily: 'Inter-SemiBold' }]}>
                    ${calculateTradingFees().toFixed(2)}
                  </Text>
                </View>
                
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs }}>
                  <Text style={[{ color: theme.colors.textSecondary, fontSize: fontSize.xs, fontFamily: 'Inter-Medium' }]}>
                    Price Impact
                  </Text>
                  <Text style={[{ color: theme.colors.textPrimary, fontSize: fontSize.xs, fontFamily: 'Inter-SemiBold' }]}>
                    {(calculatePriceImpact() * 100).toFixed(3)}%
                  </Text>
                </View>
                
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={[{ color: theme.colors.textSecondary, fontSize: fontSize.xs, fontFamily: 'Inter-Medium' }]}>
                    Profit Cap (900%)
                  </Text>
                  <Text style={[{ color: theme.colors.textPrimary, fontSize: fontSize.xs, fontFamily: 'Inter-SemiBold' }]}>
                    ${calculateProfitCap().toFixed(2)}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Preview Order Button */}
          <AnimatedButton
            onPress={() => setShowOrderPreview(true)}
            disabled={tradingLoading || !size || !collateral}
            variant="secondary"
            style={{ marginTop: spacing.lg }}
          >
            <View style={styles.buttonContent}>
              <Info size={20} color={theme.colors.textPrimary} />
              <Text style={[
                styles.buttonText,
                {
                  color: theme.colors.textPrimary,
                  fontSize: fontSize.md,
                  fontFamily: 'Inter-Bold',
                  marginLeft: spacing.sm
                }
              ]}>
                Preview Order details
              </Text>
            </View>
          </AnimatedButton>

          {/* Place Order Button */}
          <AnimatedButton
            onPress={handlePlaceOrder}
            disabled={tradingLoading}
            variant={side}
            style={{ marginTop: spacing.md }}
          >
            <View style={styles.buttonContent}>
              {side === 'long' ? (
                <TrendingUp size={20} color="#FFFFFF" />
              ) : (
                <TrendingDown size={20} color="#FFFFFF" />
              )}
              <Text style={[
                styles.buttonText,
                {
                  fontSize: fontSize.md,
                  fontFamily: 'Inter-Bold',
                  marginLeft: spacing.sm
                }
              ]}>
                {tradingLoading ? 'Placing Order...' : `${side === 'long' ? 'Buy / Long' : 'Sell / Short'}`}
              </Text>
            </View>
          </AnimatedButton>

          {/* Error Display */}
          {tradingError && (
            <View style={[
              styles.errorContainer,
              {
                backgroundColor: `${theme.colors.negative}20`,
                padding: spacing.md,
                borderRadius: theme.borderRadius.md,
                marginTop: spacing.md,
                borderWidth: 1,
                borderColor: theme.colors.negative
              }
            ]}>
              <View style={styles.errorContent}>
                <AlertCircle size={20} color={theme.colors.negative} />
                <Text style={[
                  styles.errorText,
                  {
                    color: theme.colors.negative,
                    fontSize: fontSize.sm,
                    fontFamily: 'Inter-Medium',
                    marginLeft: spacing.sm,
                    flex: 1
                  }
                ]}>{tradingError}</Text>
              </View>
            </View>
          )}

          {false && (
            <View style={[
              {
                backgroundColor: `${theme.colors.blue}20`,
                padding: spacing.md,
                borderRadius: theme.borderRadius.md,
                marginTop: spacing.md,
                borderWidth: 1,
                borderColor: theme.colors.blue
              }
            ]}>
              <View style={styles.errorContent}>
                <Info size={20} color={theme.colors.blue} />
                <View style={{ marginLeft: spacing.sm, flex: 1 }}>
                  <Text style={[
                    {
                      color: theme.colors.blue,
                      fontSize: fontSize.sm,
                      fontFamily: 'Inter-SemiBold',
                      marginBottom: spacing.xs
                    }
                  ]}>💡 Crypto Trading Guide</Text>
                  <Text style={[
                    {
                      color: theme.colors.textSecondary,
                      fontSize: fontSize.xs,
                      fontFamily: 'Inter-Medium',
                      lineHeight: fontSize.xs * 1.4
                    }
                  ]}>
                    Crypto pairs: 3× – 150× leverage • Min: 2 USDC position • With {collateral} USDC collateral, use {getMinimumLeverageForTrade()}× leverage minimum.
                  </Text>
                  <View style={{ flexDirection: 'row', marginTop: spacing.sm }}>
                    <Pressable
                      style={[
                        {
                          backgroundColor: theme.colors.blue,
                          paddingHorizontal: spacing.md,
                          paddingVertical: spacing.xs,
                          borderRadius: theme.borderRadius.md,
                          flex: 1,
                          marginRight: spacing.xs
                        }
                      ]}
                      onPress={() => {
                        const suggested = getSuggestedTradeSetup();
                        setCollateral(suggested.collateral.toString());
                        setLeverage(suggested.leverage);
                        setSize(suggested.size.toString());
                      }}
                    >
                      <Text style={[
                        {
                          color: '#FFFFFF',
                          fontSize: fontSize.xs,
                          fontFamily: 'Inter-SemiBold',
                          textAlign: 'center'
                        }
                      ]}>Use {getMinimumLeverageForTrade()}x Leverage</Text>
                    </Pressable>
                    
                    <Pressable
                      style={[
                        {
                          backgroundColor: theme.colors.positive,
                          paddingHorizontal: spacing.md,
                          paddingVertical: spacing.xs,
                          borderRadius: theme.borderRadius.md,
                          flex: 1,
                          marginLeft: spacing.xs
                        }
                      ]}
                      onPress={() => {
                        // Setup for 2 USDC minimum
                        setCollateral('2');
                        setLeverage(3); // 2 × 3 = 6 USDC position
                        setSize('6');
                      }}
                    >
                      <Text style={[
                        {
                          color: '#FFFFFF',
                          fontSize: fontSize.xs,
                          fontFamily: 'Inter-SemiBold',
                          textAlign: 'center'
                        }
                      ]}>Use 2 USDC (3x)</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            </View>
          )}
        </Card>
      )}

      {/* Order Preview Modal */}
      <Modal
        visible={showOrderPreview}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowOrderPreview(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.95)',
          justifyContent: 'flex-end',
        }}>
          <View style={[
            {
              backgroundColor: theme.colors.bg,
              borderTopLeftRadius: theme.borderRadius.xl,
              borderTopRightRadius: theme.borderRadius.xl,
              paddingTop: spacing.xl,
              paddingBottom: spacing.xl * 2,
              paddingHorizontal: spacing.lg,
              maxHeight: '85%',
            }
          ]}>
            {/* Modal Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl }}>
              <Text style={[
                {
                  color: theme.colors.textPrimary,
                  fontSize: fontSize.xl,
                  fontFamily: 'Inter-Bold',
                }
              ]}>Order details</Text>
              <Pressable onPress={() => setShowOrderPreview(false)}>
                <X size={24} color={theme.colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Order Summary Card */}
              <View style={[
                {
                  backgroundColor: theme.colors.chip,
                  padding: spacing.lg,
                  borderRadius: theme.borderRadius.lg,
                  marginBottom: spacing.lg,
                }
              ]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md }}>
                  <Text style={[
                    {
                      color: theme.colors.textSecondary,
                      fontSize: fontSize.sm,
                      fontFamily: 'Inter-Medium',
                    }
                  ]}>Side</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {side === 'long' ? (
                      <TrendingUp size={16} color={theme.colors.positive} />
                    ) : (
                      <TrendingDown size={16} color={theme.colors.negative} />
                    )}
                    <Text style={[
                      {
                        color: side === 'long' ? theme.colors.positive : theme.colors.negative,
                        fontSize: fontSize.md,
                        fontFamily: 'Inter-Bold',
                        marginLeft: spacing.xs,
                      }
                    ]}>{side.toUpperCase()} {leverage}x</Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md }}>
                  <Text style={[
                    {
                      color: theme.colors.textSecondary,
                      fontSize: fontSize.sm,
                      fontFamily: 'Inter-Medium',
                    }
                  ]}>Entry Price</Text>
                  <Text style={[
                    {
                      color: theme.colors.textPrimary,
                      fontSize: fontSize.md,
                      fontFamily: 'Inter-SemiBold',
                    }
                  ]}>{formatCurrency(parseFloat(price))}</Text>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md }}>
                  <Text style={[
                    {
                      color: theme.colors.textSecondary,
                      fontSize: fontSize.sm,
                      fontFamily: 'Inter-Medium',
                    }
                  ]}>Est. Fee</Text>
                  <Text style={[
                    {
                      color: theme.colors.textPrimary,
                      fontSize: fontSize.md,
                      fontFamily: 'Inter-SemiBold',
                    }
                  ]}>{`${calculateEstimatedFee()} USDC`}</Text>
                </View>

                <View style={{ height: 1, backgroundColor: theme.colors.border, marginVertical: spacing.md }} />

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md }}>
                  <Text style={[
                    {
                      color: theme.colors.textSecondary,
                      fontSize: fontSize.sm,
                      fontFamily: 'Inter-Medium',
                    }
                  ]}>Max Slippage</Text>
                  <Text style={[
                    {
                      color: theme.colors.textPrimary,
                      fontSize: fontSize.md,
                      fontFamily: 'Inter-SemiBold',
                    }
                  ]}>
                    {calculateMaxSlippage().toFixed(2)} ~{(calculateMaxSlippage() * 100 / parseFloat(size)).toFixed(2)}%
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md }}>
                  <Text style={[
                    {
                      color: theme.colors.textSecondary,
                      fontSize: fontSize.sm,
                      fontFamily: 'Inter-Medium',
                    }
                  ]}>Position</Text>
                  <Text style={[
                    {
                      color: theme.colors.textPrimary,
                      fontSize: fontSize.md,
                      fontFamily: 'Inter-SemiBold',
                    }
                  ]}>{`Min: ${MARKETS[market]?.minSize || 0} ~ Max: ${MARKETS[market]?.maxLeverage * parseFloat(collateral)} ${market}`}</Text>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md }}>
                  <Text style={[
                    {
                      color: theme.colors.textSecondary,
                      fontSize: fontSize.sm,
                      fontFamily: 'Inter-Medium',
                    }
                  ]}>Est. Liq Price</Text>
                  <Text style={[
                    {
                      color: theme.colors.orange,
                      fontSize: fontSize.md,
                      fontFamily: 'Inter-Bold',
                    }
                  ]}>{formatCurrency(calculateEstimatedLiqPrice())}</Text>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md }}>
                  <Text style={[
                    {
                      color: theme.colors.textSecondary,
                      fontSize: fontSize.sm,
                      fontFamily: 'Inter-Medium',
                    }
                  ]}>Margin Usage</Text>
                  <Text style={[
                    {
                      color: theme.colors.textPrimary,
                      fontSize: fontSize.md,
                      fontFamily: 'Inter-SemiBold',
                    }
                  ]}>{calculateMarginUsage()}</Text>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md }}>
                  <Text style={[
                    {
                      color: theme.colors.textSecondary,
                      fontSize: fontSize.sm,
                      fontFamily: 'Inter-Medium',
                    }
                  ]}>Account Leverage</Text>
                  <Text style={[
                    {
                      color: theme.colors.purple,
                      fontSize: fontSize.md,
                      fontFamily: 'Inter-Bold',
                    }
                  ]}>{calculateAccountLeverage()}</Text>
                </View>
              </View>

              {/* Additional Info */}
              <View style={[
                {
                  backgroundColor: `${theme.colors.blue}15`,
                  padding: spacing.md,
                  borderRadius: theme.borderRadius.md,
                  marginBottom: spacing.lg,
                  borderWidth: 1,
                  borderColor: theme.colors.blue,
                }
              ]}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  <Info size={16} color={theme.colors.blue} style={{ marginTop: 2 }} />
                  <Text style={[
                    {
                      color: theme.colors.textSecondary,
                      fontSize: fontSize.xs,
                      fontFamily: 'Inter-Regular',
                      marginLeft: spacing.sm,
                      flex: 1,
                      lineHeight: 18,
                    }
                  ]}>
                    The estimated liquidation price is for reference only and will change depending on your total margin balance and position size.
                  </Text>
                </View>
              </View>

              {/* Confirm Button */}
              <AnimatedButton
                onPress={() => {
                  setShowOrderPreview(false);
                  handlePlaceOrder();
                }}
                disabled={tradingLoading}
                variant={side}
              >
                <View style={styles.buttonContent}>
                  <Text style={[
                    styles.buttonText,
                    {
                      fontSize: fontSize.md,
                      fontFamily: 'Inter-Bold',
                    }
                  ]}>Place Order</Text>
                </View>
              </AnimatedButton>

              {/* Cancel Button */}
              <Pressable
                onPress={() => setShowOrderPreview(false)}
                style={{
                  alignItems: 'center',
                  paddingVertical: spacing.md,
                  marginTop: spacing.md,
                }}
              >
                <Text style={[
                  {
                    color: theme.colors.textSecondary,
                    fontSize: fontSize.md,
                    fontFamily: 'Inter-SemiBold',
                  }
                ]}>Cancel</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Positions Section */}
      {connected && (
        <Card style={[
          styles.section, 
          { 
            backgroundColor: theme.colors.card,
            padding: spacing.lg,
            marginHorizontal: spacing.md,
            marginBottom: spacing.lg,
            borderRadius: theme.borderRadius.lg
          }
        ]}>
          <View style={styles.sectionHeader}>
            <Target size={24} color={theme.colors.textPrimary} />
            <Text style={[
              styles.sectionTitle, 
              { 
                color: theme.colors.textPrimary,
                fontSize: fontSize.lg,
                fontFamily: 'Inter-SemiBold',
                marginLeft: spacing.sm
              }
            ]}>Active Positions</Text>
          </View>
          
          {positionsLoading ? (
            <View style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
              <Activity size={24} color={theme.colors.textSecondary} />
              <Text style={[
                styles.loadingText,
                {
                  color: theme.colors.textSecondary,
                  fontSize: fontSize.sm,
                  fontFamily: 'Inter-Medium',
                  marginTop: spacing.sm
                }
              ]}>Loading positions...</Text>
            </View>
          ) : positions.length > 0 ? (
            <View style={{ marginTop: spacing.md }}>
              <View style={[
                styles.totalPnL,
                {
                  backgroundColor: theme.colors.chip,
                  padding: spacing.md,
                  borderRadius: theme.borderRadius.md,
                  marginBottom: spacing.lg
                }
              ]}>
                <Text style={[
                  {
                    color: theme.colors.textSecondary,
                    fontSize: fontSize.sm,
                    fontFamily: 'Inter-Medium',
                    textAlign: 'center'
                  }
                ]}>Total Portfolio PnL</Text>
                <Text style={[
                  {
                    color: totalPnL >= 0 ? theme.colors.positive : theme.colors.negative,
                    fontSize: fontSize.xl,
                    fontFamily: 'Inter-Bold',
                    textAlign: 'center',
                    marginTop: spacing.xs
                  }
                ]}>{formatCurrency(totalPnL)}</Text>
              </View>
              
              {positions.map((position: any, index) => (
                <Card key={index} style={[
                  styles.positionCard,
                  {
                    backgroundColor: theme.colors.chip,
                    padding: spacing.md,
                    borderRadius: theme.borderRadius.md,
                    marginBottom: spacing.sm,
                    borderWidth: 1,
                    borderColor: theme.colors.border
                  }
                ]}>
                  <View style={styles.positionHeader}>
                    <View style={styles.positionInfo}>
                      <Text style={[
                        styles.positionMarket,
                        {
                          color: theme.colors.textPrimary,
                          fontSize: fontSize.md,
                          fontFamily: 'Inter-Bold'
                        }
                      ]}>{position.market}</Text>
                      <Text style={[
                        styles.positionSide,
                        {
                          color: position.side === 'long' ? theme.colors.buy : theme.colors.sell,
                          fontSize: fontSize.sm,
                          fontFamily: 'Inter-SemiBold',
                          marginTop: spacing.xs
                        }
                      ]}>
                        {position.side.toUpperCase()} {position.leverage.toFixed(2)}x
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[
                        styles.positionSize,
                        {
                          color: theme.colors.textSecondary,
                          fontSize: fontSize.sm,
                          fontFamily: 'Inter-Medium'
                        }
                      ]}>Size: {formatCurrency(position.size)}</Text>
                      <Text style={[
                        styles.positionPnL,
                        {
                          color: position.pnl >= 0 ? theme.colors.positive : theme.colors.negative,
                          fontSize: fontSize.md,
                          fontFamily: 'Inter-Bold',
                          marginTop: spacing.xs
                        }
                      ]}>
                        {formatCurrency(position.pnl)} ({position.pnlPercentage.toFixed(2)}%)
                      </Text>
                    </View>
                  </View>
                </Card>
              ))}
            </View>
          ) : (
            <View style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
              <Target size={48} color={theme.colors.textSecondary} style={{ opacity: 0.5 }} />
              <Text style={[
                styles.noDataText,
                {
                  color: theme.colors.textSecondary,
                  fontSize: fontSize.sm,
                  fontFamily: 'Inter-Medium',
                  marginTop: spacing.md
                }
              ]}>No active positions</Text>
            </View>
          )}
        </Card>
      )}

      {/* Recent Events Section */}
      {connected && (
        <Card style={[
          styles.section, 
          { 
            backgroundColor: theme.colors.card,
            padding: spacing.lg,
            marginHorizontal: spacing.md,
            marginBottom: spacing.lg,
            borderRadius: theme.borderRadius.lg
          }
        ]}>
          <View style={styles.sectionHeader}>
            <Activity size={24} color={theme.colors.textPrimary} />
            <Text style={[
              styles.sectionTitle, 
              { 
                color: theme.colors.textPrimary,
                fontSize: fontSize.lg,
                fontFamily: 'Inter-SemiBold',
                marginLeft: spacing.sm
              }
            ]}>Recent Activity</Text>
          </View>
          
          {eventsLoading ? (
            <View style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
              <Activity size={24} color={theme.colors.textSecondary} />
              <Text style={[
                styles.loadingText,
                {
                  color: theme.colors.textSecondary,
                  fontSize: fontSize.sm,
                  fontFamily: 'Inter-Medium',
                  marginTop: spacing.sm
                }
              ]}>Loading events...</Text>
            </View>
          ) : events.length > 0 ? (
            <View style={{ marginTop: spacing.md }}>
              {events.slice(0, 5).map((event: any, index) => (
                <Card key={index} style={[
                  styles.eventCard,
                  {
                    backgroundColor: theme.colors.chip,
                    padding: spacing.md,
                    borderRadius: theme.borderRadius.md,
                    marginBottom: spacing.sm,
                    borderWidth: 1,
                    borderColor: theme.colors.border
                  }
                ]}>
                  <View style={styles.eventHeader}>
                    <Text style={[
                      styles.eventType,
                      {
                        color: theme.colors.textPrimary,
                        fontSize: fontSize.sm,
                        fontFamily: 'Inter-SemiBold'
                      }
                    ]}>{event.type.replace('_', ' ').toUpperCase()}</Text>
                    <Text style={[
                      styles.eventTime,
                      {
                        color: theme.colors.textSecondary,
                        fontSize: fontSize.xs,
                        fontFamily: 'Inter-Medium'
                      }
                    ]}>
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </Text>
                  </View>
                  <Text style={[
                    styles.eventDetails,
                    {
                      color: theme.colors.textSecondary,
                      fontSize: fontSize.sm,
                      fontFamily: 'Inter-Medium',
                      marginTop: spacing.xs
                    }
                  ]}>
                    {event.market} - {event.side.toUpperCase()} - {formatCurrency(event.size)}
                  </Text>
                </Card>
              ))}
            </View>
          ) : (
            <View style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
              <Activity size={48} color={theme.colors.textSecondary} style={{ opacity: 0.5 }} />
              <Text style={[
                styles.noDataText,
                {
                  color: theme.colors.textSecondary,
                  fontSize: fontSize.sm,
                  fontFamily: 'Inter-Medium',
                  marginTop: spacing.md
                }
              ]}>No recent activity</Text>
            </View>
          )}
        </Card>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    // Dynamic styles applied inline
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    // Dynamic styles applied inline
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    // Dynamic styles applied inline
  },
  connectedCard: {
    // Dynamic styles applied inline
  },
  connectedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  connectedLabel: {
    // Dynamic styles applied inline
  },
  accountText: {
    // Dynamic styles applied inline
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputRow: {
    // Dynamic styles applied inline
  },
  label: {
    // Dynamic styles applied inline
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    // Dynamic styles applied inline
  },
  segmentedControl: {
    // Dynamic styles applied inline
  },
  segment: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentText: {
    // Dynamic styles applied inline
  },
  leverageCard: {
    // Dynamic styles applied inline
  },
  leverageContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leverageLabel: {
    // Dynamic styles applied inline
  },
  leverageValue: {
    // Dynamic styles applied inline
  },
  errorContainer: {
    // Dynamic styles applied inline
  },
  errorContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorText: {
    // Dynamic styles applied inline
  },
  loadingText: {
    textAlign: 'center',
    fontStyle: 'italic',
  },
  noDataText: {
    textAlign: 'center',
    fontStyle: 'italic',
  },
  totalPnL: {
    textAlign: 'center',
    marginBottom: 12,
  },
  positionCard: {
    marginBottom: 8,
  },
  positionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  positionInfo: {
    flex: 1,
  },
  positionMarket: {
    // Dynamic styles applied inline
  },
  positionSide: {
    // Dynamic styles applied inline
  },
  positionSize: {
    // Dynamic styles applied inline
  },
  positionPnL: {
    // Dynamic styles applied inline
  },
  eventCard: {
    marginBottom: 8,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  eventType: {
    // Dynamic styles applied inline
  },
  eventDetails: {
    // Dynamic styles applied inline
  },
  eventTime: {
    // Dynamic styles applied inline
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)', // More opaque
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  marketOption: {
    // Dynamic styles applied inline
  },
  // Chart-related styles
  marketHeader: {
    marginBottom: 12,
  },
  marketInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  marketSymbol: {
    // Dynamic styles applied inline
  },
  marketPrice: {
    // Dynamic styles applied inline
  },
  marketChange: {
    // Dynamic styles applied inline
  },
  marketStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  marketStatsMobile: {
    flexDirection: 'column',
    gap: 8,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    textAlign: 'center',
    marginBottom: 4,
  },
  statValue: {
    textAlign: 'center',
    fontWeight: '600',
  },
  chartControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  chartTypeSelector: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 2,
  },
  chartTypeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  chartTypeButtonActive: {
    // Background color applied inline
  },
  chartTypeText: {
    fontWeight: '500',
  },
  timeframeSelector: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 2,
    gap: 2,
  },
  timeframeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  timeframeButtonActive: {
    // Background color applied inline
  },
  timeframeText: {
    fontWeight: '500',
  },
  chartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
});

export default TradingInterface;
