import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, Alert, ScrollView, Dimensions, Modal, Switch } from 'react-native';
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
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Activity, 
  DollarSign,
  Zap,
  Shield,
  AlertCircle,
  X,
  Info,
  Percent,
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
  
  const { connected, account, connectExtension, connectDeepLink, disconnect, connecting, isExtensionAvailable } = useWallet();
  const { placeOrder, loading: tradingLoading, error: tradingError } = useMerkleTrading();
  const { positions, totalPnL, loading: positionsLoading } = useMerklePositions();
  const { events, loading: eventsLoading } = useMerkleEvents();

  // Available Merkle trading pairs on testnet
  const AVAILABLE_MARKETS = [
    'APT/USD',
    'BTC/USD',
    'ETH/USD',
    'SOL/USD',
    'DOGE/USD'
  ];

  // Form state
  const [market, setMarket] = useState('APT/USD'); // Default to APT/USD for Aptos testnet
  const [showMarketSelector, setShowMarketSelector] = useState(false);
  const [side, setSide] = useState<'long' | 'short'>('long');
  const [size, setSize] = useState('100');
  const [collateral, setCollateral] = useState('10');
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [price, setPrice] = useState('6.25');
  
  // Enhanced leverage trading features
  const [leverage, setLeverage] = useState(10);
  const [marginMode, setMarginMode] = useState<'cross' | 'isolated'>('isolated');
  const [stopLoss, setStopLoss] = useState('0');
  const [stopLossPercent, setStopLossPercent] = useState('0');
  const [takeProfit, setTakeProfit] = useState('900');
  const [takeProfitPercent, setTakeProfitPercent] = useState('900');
  const [tpslEnabled, setTpslEnabled] = useState(false);
  const [reduceOnly, setReduceOnly] = useState(false);
  const [showOrderPreview, setShowOrderPreview] = useState(false);
  
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

  const handleConnectExtension = async () => {
    try {
      await connectExtension('Petra');
    } catch (error) {
      Alert.alert('Extension Connection Error', 'Failed to connect to Petra extension. Make sure it\'s installed and unlocked.');
    }
  };

  const handleConnectDeepLink = async () => {
    try {
      await connectDeepLink('Petra');
    } catch (error) {
      Alert.alert('Connection Error', 'Failed to connect wallet via deep link');
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
    } catch (error) {
      Alert.alert('Disconnect Error', 'Failed to disconnect wallet');
    }
  };

  const handlePlaceOrder = async () => {
    if (!connected) {
      Alert.alert('Wallet Not Connected', 'Please connect your wallet first');
      return;
    }

    try {
      const orderParams: PlaceOrderParams = {
        market,
        side,
        size: parseFloat(size),
        collateral: parseFloat(collateral),
        orderType,
        price: orderType === 'limit' ? parseFloat(price) : undefined,
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

  // Helper functions for leverage calculations
  const handleLeverageChange = (value: number) => {
    setLeverage(value);
    const newCollateral = parseFloat(size) / value;
    setCollateral(newCollateral.toFixed(2));
  };

  const handleSizeChange = (value: string) => {
    setSize(value);
    if (value && parseFloat(value) > 0) {
      const newCollateral = parseFloat(value) / leverage;
      setCollateral(newCollateral.toFixed(2));
    }
  };

  const handleCollateralChange = (value: string) => {
    setCollateral(value);
    if (value && parseFloat(value) > 0) {
      const newLeverage = parseFloat(size) / parseFloat(value);
      if (newLeverage >= 1 && newLeverage <= 100) {
        setLeverage(Math.round(newLeverage));
      }
    }
  };

  const setStopLossFromPercent = (percent: number) => {
    setStopLossPercent(percent.toString());
    setStopLoss(percent.toString());
  };

  const setTakeProfitFromPercent = (percent: number) => {
    setTakeProfitPercent(percent.toString());
    setTakeProfit(percent.toString());
  };

  const calculateExecutionPrice = () => {
    return orderType === 'limit' ? parseFloat(price) : parseFloat(price) * 1.001;
  };

  const calculateEstimatedLiqPrice = () => {
    const entryPrice = calculateExecutionPrice();
    const liqPrice = side === 'long' 
      ? entryPrice * (1 - 1 / leverage)
      : entryPrice * (1 + 1 / leverage);
    return liqPrice;
  };

  const calculateMaxSlippage = () => {
    return parseFloat(size) * 0.001; // 0.1% max slippage
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
      {/* Wallet Connection Section */}
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
          <Wallet size={24} color={theme.colors.textPrimary} />
          <Text style={[
            styles.sectionTitle, 
            { 
              color: theme.colors.textPrimary,
              fontSize: fontSize.lg,
              fontFamily: 'Inter-SemiBold',
              marginLeft: spacing.sm
            }
          ]}>Wallet Connection</Text>
        </View>
        
        {!connected ? (
          <View style={{ marginTop: spacing.md, gap: spacing.md }}>
            {/* Extension Connection Button */}
            {isExtensionAvailable && (
              <AnimatedButton 
                onPress={handleConnectExtension}
                disabled={connecting}
              >
                <View style={styles.buttonContent}>
                  <Wallet size={20} color="#FFFFFF" />
                  <Text style={[
                    styles.buttonText,
                    { 
                      fontSize: fontSize.md,
                      fontFamily: 'Inter-SemiBold',
                      marginLeft: spacing.sm
                    }
                  ]}>
                    {connecting ? 'Connecting...' : 'Connect Petra Extension'}
                  </Text>
                </View>
              </AnimatedButton>
            )}
            
            {/* Deep Link Connection Button */}
            <AnimatedButton 
              onPress={handleConnectDeepLink}
              disabled={connecting}
              variant="secondary"
            >
              <View style={styles.buttonContent}>
                <Wallet size={20} color={theme.colors.textPrimary} />
                <Text style={[
                  styles.buttonText,
                  { 
                    color: theme.colors.textPrimary,
                    fontSize: fontSize.md,
                    fontFamily: 'Inter-SemiBold',
                    marginLeft: spacing.sm
                  }
                ]}>
                  {connecting ? 'Connecting...' : 'Connect Petra Mobile'}
                </Text>
              </View>
            </AnimatedButton>
            
            {/* Extension Not Available Message */}
            {!isExtensionAvailable && (
              <View style={[
                {
                  backgroundColor: theme.colors.chip,
                  padding: spacing.md,
                  borderRadius: theme.borderRadius.md,
                  borderLeftWidth: 3,
                  borderLeftColor: theme.colors.orange,
                }
              ]}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <AlertCircle size={16} color={theme.colors.orange} />
                  <Text style={[
                    {
                      color: theme.colors.textSecondary,
                      fontSize: fontSize.sm,
                      fontFamily: 'Inter-Medium',
                      marginLeft: spacing.sm,
                      flex: 1
                    }
                  ]}>
                    Petra extension not detected. Install it for the best experience, or use mobile connection.
                  </Text>
                </View>
              </View>
            )}
          </View>
        ) : (
          <View style={{ marginTop: spacing.md }}>
            <View style={[
              styles.connectedCard,
              {
                backgroundColor: theme.colors.chip,
                padding: spacing.md,
                borderRadius: theme.borderRadius.md,
                marginBottom: spacing.md
              }
            ]}>
              <View style={styles.connectedInfo}>
                <Shield size={20} color={theme.colors.positive} />
                <View style={{ marginLeft: spacing.sm, flex: 1 }}>
                  <Text style={[
                    styles.connectedLabel,
                    { 
                      color: theme.colors.textSecondary,
                      fontSize: fontSize.sm,
                      fontFamily: 'Inter-Medium'
                    }
                  ]}>Connected Wallet</Text>
                  <Text 
                    style={[
                      styles.accountText,
                      { 
                        color: theme.colors.textPrimary,
                        fontSize: fontSize.md,
                        fontFamily: 'Inter-SemiBold'
                      }
                    ]}
                    numberOfLines={1}
                    ellipsizeMode="middle"
                  >
                    {account?.address ? `${account.address.substring(0, 6)}...${account.address.substring(account.address.length - 4)}` : ''}
                  </Text>
                </View>
              </View>
            </View>
            <AnimatedButton 
              onPress={handleDisconnect}
              variant="secondary"
            >
              <Text style={[
                styles.buttonText,
                { 
                  color: theme.colors.textPrimary,
                  fontSize: fontSize.md,
                  fontFamily: 'Inter-SemiBold'
                }
              ]}>Disconnect</Text>
            </AnimatedButton>
          </View>
        )}
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
                  borderWidth: 1,
                  borderColor: theme.colors.border,
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
              ]}>{market}</Text>
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
                  borderWidth: 1,
                  borderColor: theme.colors.border,
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
                    ]}>{mkt}</Text>
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
            ]}>Position Side</Text>
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
                    paddingVertical: spacing.md,
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
                    paddingVertical: spacing.md,
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

          {/* Order Type */}
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
                flexDirection: 'row'
              }
            ]}>
              <Pressable
                style={[
                  styles.segment,
                  {
                    flex: 1,
                    paddingVertical: spacing.md,
                    borderRadius: theme.borderRadius.xs,
                    backgroundColor: orderType === 'market' ? theme.colors.purple : 'transparent'
                  }
                ]}
                onPress={() => setOrderType('market')}
              >
                <View style={styles.segmentContent}>
                  <Zap size={18} color={orderType === 'market' ? '#FFFFFF' : theme.colors.purple} />
                  <Text style={[
                    styles.segmentText,
                    {
                      color: orderType === 'market' ? '#FFFFFF' : theme.colors.textPrimary,
                      fontSize: fontSize.md,
                      fontFamily: 'Inter-SemiBold',
                      marginLeft: spacing.xs
                    }
                  ]}>Market</Text>
                </View>
              </Pressable>
              <Pressable
                style={[
                  styles.segment,
                  {
                    flex: 1,
                    paddingVertical: spacing.md,
                    borderRadius: theme.borderRadius.xs,
                    backgroundColor: orderType === 'limit' ? theme.colors.blue : 'transparent'
                  }
                ]}
                onPress={() => setOrderType('limit')}
              >
                <View style={styles.segmentContent}>
                  <Target size={18} color={orderType === 'limit' ? '#FFFFFF' : theme.colors.blue} />
                  <Text style={[
                    styles.segmentText,
                    {
                      color: orderType === 'limit' ? '#FFFFFF' : theme.colors.textPrimary,
                      fontSize: fontSize.md,
                      fontFamily: 'Inter-SemiBold',
                      marginLeft: spacing.xs
                    }
                  ]}>Limit</Text>
                </View>
              </Pressable>
            </View>
          </View>

          {/* Margin Mode Selection */}
          <View style={styles.inputGroup}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
              <Text style={[
                styles.label,
                {
                  color: theme.colors.textSecondary,
                  fontSize: fontSize.sm,
                  fontFamily: 'Inter-Medium',
                }
              ]}>Margin Mode</Text>
              <Pressable style={{ marginLeft: spacing.xs }}>
                <Info size={14} color={theme.colors.textSecondary} />
              </Pressable>
            </View>
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
                    paddingVertical: spacing.md,
                    borderRadius: theme.borderRadius.xs,
                    backgroundColor: marginMode === 'cross' ? theme.colors.purple : 'transparent'
                  }
                ]}
                onPress={() => setMarginMode('cross')}
              >
                <View style={styles.segmentContent}>
                  <Text style={[
                    styles.segmentText,
                    {
                      color: marginMode === 'cross' ? '#FFFFFF' : theme.colors.textPrimary,
                      fontSize: fontSize.md,
                      fontFamily: 'Inter-SemiBold',
                    }
                  ]}>Cross</Text>
                </View>
              </Pressable>
              <Pressable
                style={[
                  styles.segment,
                  {
                    flex: 1,
                    paddingVertical: spacing.md,
                    borderRadius: theme.borderRadius.xs,
                    backgroundColor: marginMode === 'isolated' ? theme.colors.blue : 'transparent'
                  }
                ]}
                onPress={() => setMarginMode('isolated')}
              >
                <View style={styles.segmentContent}>
                  <Text style={[
                    styles.segmentText,
                    {
                      color: marginMode === 'isolated' ? '#FFFFFF' : theme.colors.textPrimary,
                      fontSize: fontSize.md,
                      fontFamily: 'Inter-SemiBold',
                    }
                  ]}>Isolated</Text>
                </View>
              </Pressable>
            </View>
            <Text style={[
              {
                color: theme.colors.textSecondary,
                fontSize: fontSize.xs,
                fontFamily: 'Inter-Regular',
                marginTop: spacing.xs,
                fontStyle: 'italic'
              }
            ]}>
              {marginMode === 'cross' 
                ? '* Trading of margin modes only applies to the selected contract.' 
                : '* Higher leverage increases risk. Manage it wisely.'}
            </Text>
          </View>

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
              borderWidth: 1,
              borderColor: theme.colors.border,
            }}>
              <Slider
                value={leverage}
                onValueChange={handleLeverageChange}
                minimumValue={1}
                maximumValue={100}
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
                {[1, 25, 50, 75, 100].map((val) => (
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
                  borderWidth: 1,
                  borderColor: theme.colors.border,
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
                      paddingVertical: spacing.xs
                    }
                  ]}
                  value={size}
                  onChangeText={handleSizeChange}
                  placeholder="5.500"
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
                {[100, 200, 500, 1000, 5000].map((amt) => (
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
                  borderWidth: 1,
                  borderColor: theme.colors.border,
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
                      paddingVertical: spacing.xs
                    }
                  ]}
                  value={collateral}
                  onChangeText={handleCollateralChange}
                  placeholder="0.001"
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

          {/* Price Input (for limit orders) */}
          {orderType === 'limit' && (
            <View style={styles.inputGroup}>
              <Text style={[
                styles.label,
                {
                  color: theme.colors.textSecondary,
                  fontSize: fontSize.sm,
                  fontFamily: 'Inter-Medium',
                  marginBottom: spacing.sm
                }
              ]}>Price (USD)</Text>
              <View style={[
                styles.inputContainer,
                {
                  backgroundColor: theme.colors.chip,
                  borderRadius: theme.borderRadius.md,
                  borderWidth: 1,
                  borderColor: theme.colors.border
                }
              ]}>
                <Target size={20} color={theme.colors.textSecondary} style={{ marginLeft: spacing.md }} />
                <TextInput
                  style={[
                    styles.input,
                    {
                      color: theme.colors.textPrimary,
                      fontSize: fontSize.md,
                      fontFamily: 'Inter-Medium',
                      flex: 1,
                      paddingHorizontal: spacing.md,
                      paddingVertical: spacing.md
                    }
                  ]}
                  value={price}
                  onChangeText={setPrice}
                  placeholder="6.25"
                  placeholderTextColor={theme.colors.textSecondary}
                  keyboardType="numeric"
                />
              </View>
            </View>
          )}

          {/* Stop Loss & Take Profit Section */}
          <View style={styles.inputGroup}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm }}>
              <Text style={[
                styles.label,
                {
                  color: theme.colors.textSecondary,
                  fontSize: fontSize.sm,
                  fontFamily: 'Inter-Medium',
                }
              ]}>Stop Loss</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={[
                  {
                    color: theme.colors.textSecondary,
                    fontSize: fontSize.xs,
                    fontFamily: 'Inter-Regular',
                    marginRight: spacing.xs
                  }
                ]}>USDC</Text>
                <Pressable>
                  <Percent size={14} color={theme.colors.textSecondary} />
                </Pressable>
              </View>
            </View>
            <View style={[
              styles.inputContainer,
              {
                backgroundColor: theme.colors.chip,
                borderRadius: theme.borderRadius.md,
                borderWidth: 1,
                borderColor: theme.colors.border
              }
            ]}>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: theme.colors.textPrimary,
                    fontSize: fontSize.md,
                    fontFamily: 'Inter-Medium',
                    flex: 1,
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.md
                  }
                ]}
                value={stopLoss}
                onChangeText={setStopLoss}
                placeholder="0"
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="numeric"
              />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm }}>
              {[0, -10, -25, -50, -75].map((percent) => (
                <Pressable
                  key={percent}
                  onPress={() => setStopLossFromPercent(percent)}
                  style={{
                    backgroundColor: percent === 0 ? theme.colors.chip : `${theme.colors.negative}20`,
                    paddingHorizontal: spacing.sm,
                    paddingVertical: spacing.xs,
                    borderRadius: theme.borderRadius.xs,
                    borderWidth: percent === 0 ? 0 : 1,
                    borderColor: percent === 0 ? 'transparent' : theme.colors.negative,
                  }}
                >
                  <Text style={[
                    {
                      color: percent === 0 ? theme.colors.textSecondary : theme.colors.negative,
                      fontSize: fontSize.xs,
                      fontFamily: 'Inter-SemiBold',
                    }
                  ]}>{percent === 0 ? '0%' : `${percent}%`}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm }}>
              <Text style={[
                styles.label,
                {
                  color: theme.colors.textSecondary,
                  fontSize: fontSize.sm,
                  fontFamily: 'Inter-Medium',
                }
              ]}>Take Profit</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={[
                  {
                    color: theme.colors.textSecondary,
                    fontSize: fontSize.xs,
                    fontFamily: 'Inter-Regular',
                    marginRight: spacing.xs
                  }
                ]}>USDC</Text>
                <Pressable>
                  <Percent size={14} color={theme.colors.textSecondary} />
                </Pressable>
              </View>
            </View>
            <View style={[
              styles.inputContainer,
              {
                backgroundColor: theme.colors.chip,
                borderRadius: theme.borderRadius.md,
                borderWidth: 1,
                borderColor: theme.colors.border
              }
            ]}>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: theme.colors.textPrimary,
                    fontSize: fontSize.md,
                    fontFamily: 'Inter-Medium',
                    flex: 1,
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.md
                  }
                ]}
                value={takeProfit}
                onChangeText={setTakeProfit}
                placeholder="900"
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="numeric"
              />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm }}>
              {[25, 50, 100, 300, 900].map((percent) => (
                <Pressable
                  key={percent}
                  onPress={() => setTakeProfitFromPercent(percent)}
                  style={{
                    backgroundColor: `${theme.colors.positive}20`,
                    paddingHorizontal: spacing.sm,
                    paddingVertical: spacing.xs,
                    borderRadius: theme.borderRadius.xs,
                    borderWidth: 1,
                    borderColor: theme.colors.positive,
                  }}
                >
                  <Text style={[
                    {
                      color: theme.colors.positive,
                      fontSize: fontSize.xs,
                      fontFamily: 'Inter-SemiBold',
                    }
                  ]}>{percent}%</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* TP/SL and Reduce Only Toggles */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginVertical: spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Switch
                value={tpslEnabled}
                onValueChange={setTpslEnabled}
                trackColor={{ false: theme.colors.border, true: theme.colors.positive }}
                thumbColor={tpslEnabled ? '#FFFFFF' : theme.colors.textSecondary}
              />
              <Text style={[
                {
                  color: theme.colors.textPrimary,
                  fontSize: fontSize.sm,
                  fontFamily: 'Inter-Medium',
                  marginLeft: spacing.sm
                }
              ]}>TP/SL</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Switch
                value={reduceOnly}
                onValueChange={setReduceOnly}
                trackColor={{ false: theme.colors.border, true: theme.colors.blue }}
                thumbColor={reduceOnly ? '#FFFFFF' : theme.colors.textSecondary}
              />
              <Text style={[
                {
                  color: theme.colors.textPrimary,
                  fontSize: fontSize.sm,
                  fontFamily: 'Inter-Medium',
                  marginLeft: spacing.sm
                }
              ]}>Reduce only</Text>
            </View>
          </View>

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
                  ]}>0.05 USDC</Text>
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
                  ]}>Min: $10 ~ Max: $50,000 {market}</Text>
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
                  ]}>{((parseFloat(collateral) / 100000) * 100).toFixed(2)}%</Text>
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
                  ]}>3.7 ~ 7.32x</Text>
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
});

export default TradingInterface;
