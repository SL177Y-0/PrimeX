import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Modal,
  ScrollView,
  Alert,
  Image,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import {
  ChevronDown,
  ArrowUpDown,
  Settings,
  X,
  RefreshCw,
  AlertTriangle,
  Zap,
} from 'lucide-react-native';

import { useTheme } from '../theme/ThemeProvider';
import { useAccent } from '../theme/useAccent';
import { useWallet } from '../app/providers/WalletProvider';
import { Card } from './Card';
import { GradientPillButton } from './GradientPillButton';
import { ModalSheet } from './ModalSheet';
import { SWAP_TOKENS, POPULAR_SWAP_PAIRS, PANORA_CONFIG } from '../config/constants';
import { panoraSwapSDK, PanoraSwapError } from '../services/panoraSwapSDK';
import type { SwapQuoteResponse, SwapQuoteParams } from '../services/panoraSwapSDK';
import { fetchTokenBalances, formatBalance } from '../services/balanceService';

// Alias for backward compatibility
const panoraSwapService = panoraSwapSDK;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Responsive breakpoints
const BREAKPOINTS = {
  xs: 0,
  sm: 576,
  md: 768,
  lg: 992,
  xl: 1200,
} as const;

// Responsive utilities
const getResponsiveValue = (values: { xs?: any; sm?: any; md?: any; lg?: any; xl?: any }, screenWidth: number) => {
  if (screenWidth >= BREAKPOINTS.xl && values.xl !== undefined) return values.xl;
  if (screenWidth >= BREAKPOINTS.lg && values.lg !== undefined) return values.lg;
  if (screenWidth >= BREAKPOINTS.md && values.md !== undefined) return values.md;
  if (screenWidth >= BREAKPOINTS.sm && values.sm !== undefined) return values.sm;
  return values.xs;
};

interface TokenSelectorProps {
  selectedToken: string;
  onTokenSelect: (token: string) => void;
  label: string;
  amount: string;
  onAmountChange: (amount: string) => void;
  isLoading?: boolean;
  readOnly?: boolean;
  balance?: string;
}

function TokenSelector({
  selectedToken,
  onTokenSelect,
  label,
  amount,
  onAmountChange,
  isLoading = false,
  readOnly = false,
  balance,
}: TokenSelectorProps) {
  const { theme } = useTheme();
  const accent = useAccent();
  const [showTokenModal, setShowTokenModal] = useState(false);

  const token = SWAP_TOKENS[selectedToken as keyof typeof SWAP_TOKENS];

  const handleMaxPress = () => {
    if (balance && !readOnly && balance !== 'Connect wallet' && balance !== 'Loading...') {
      // Extract numeric value from balance string
      const numericBalance = parseFloat(balance);
      if (!isNaN(numericBalance) && numericBalance > 0) {
        onAmountChange(numericBalance.toString());
      }
    }
  };

  return (
    <>
      <View style={[styles.tokenSelector, styles.glassmorphism]}>
        <View style={styles.tokenSelectorHeader}>
          <Text style={[styles.tokenLabel, { color: theme.colors.textSecondary }]}>
            {label}
          </Text>
          {balance && (
            <View style={styles.balanceContainer}>
              <Text style={[styles.balanceText, { color: theme.colors.textSecondary }]}>
                Balance: {balance}
              </Text>
            </View>
          )}
        </View>

        <Pressable
          onPress={() => setShowTokenModal(true)}
          style={[styles.tokenButton, { borderColor: theme.colors.border }]}
        >
          <Image source={{ uri: token.logoUrl }} style={styles.tokenLogo} />
          <Text style={[styles.tokenSymbol, { color: theme.colors.textPrimary }]}>
            {token.symbol}
          </Text>
          <ChevronDown size={16} color={theme.colors.textSecondary} />
        </Pressable>

        <View style={styles.amountInputContainer}>
          <TextInput
            nativeID="swapAmountInput"
            accessibilityLabel="Swap amount input"
            style={[
              styles.amountInput,
              {
                color: theme.colors.textPrimary,
              },
            ]}
            value={amount}
            onChangeText={onAmountChange}
            placeholder="0.0"
            placeholderTextColor={theme.colors.textSecondary}
            keyboardType="numeric"
            editable={!readOnly && !isLoading}
            selectTextOnFocus={true}
            autoCorrect={false}
            autoCapitalize="none"
            blurOnSubmit={false}
          />
          {isLoading && (
            <ActivityIndicator
              size="small"
              color={accent.from}
              style={styles.loadingIndicator}
            />
          )}
        </View>
        
        {/* MAX Button at bottom of panel */}
        {balance && !readOnly && (
          <View style={styles.maxButtonContainer}>
            <Pressable onPress={handleMaxPress} style={[styles.maxButton, { borderColor: accent.from }]}>
              <Text style={[styles.maxButtonText, { color: accent.from }]}>MAX</Text>
            </Pressable>
          </View>
        )}
      </View>

      <ModalSheet
        isVisible={showTokenModal}
        onClose={() => setShowTokenModal(false)}
        title="Select Token"
      >
        <View style={styles.tokenList}>
          {Object.entries(SWAP_TOKENS).map(([symbol, tokenData]) => (
            <Pressable
              key={symbol}
              onPress={() => {
                onTokenSelect(symbol);
                setShowTokenModal(false);
              }}
              style={[
                styles.tokenListItem,
                { backgroundColor: theme.colors.surface },
                selectedToken === symbol && {
                  backgroundColor: `${accent.from}20`,
                  borderColor: accent.from,
                  borderWidth: 1,
                },
              ]}
            >
              <Image source={{ uri: tokenData.logoUrl }} style={styles.tokenListLogo} />
              <View style={styles.tokenListInfo}>
                <Text style={[styles.tokenListSymbol, { color: theme.colors.textPrimary }]}>
                  {tokenData.symbol}
                </Text>
                <Text style={[styles.tokenListName, { color: theme.colors.textSecondary }]}>
                  {tokenData.name}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      </ModalSheet>
    </>
  );
}

interface SwapDetailsProps {
  quote: SwapQuoteResponse | null;
  slippage: number;
  onSlippageChange: (slippage: number) => void;
  fromAmount: string;
}

const parseQuoteAmount = (value: string | number | undefined, decimals: number): number => {
  if (value === undefined || value === null) {
    return 0;
  }

  if (typeof value === 'number') {
    return value;
  }

  const normalized = value.trim();
  if (!normalized) {
    return 0;
  }

  if (normalized.includes('.')) {
    const parsed = parseFloat(normalized);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  try {
    const baseUnits = BigInt(normalized);
    return Number(baseUnits) / Math.pow(10, decimals);
  } catch (error) {
    const parsed = parseFloat(normalized);
    return Number.isNaN(parsed) ? 0 : parsed / Math.pow(10, decimals);
  }
};

function SwapDetails({ quote, slippage, onSlippageChange, fromAmount }: SwapDetailsProps) {
  const { theme } = useTheme();
  const accent = useAccent();
  const [showSettings, setShowSettings] = useState(false);

  if (!quote) return null;

  const priceImpact = parseFloat(quote.quotes[0]?.priceImpact || '0');
  const priceImpactData = panoraSwapService.getPriceImpactLevel(priceImpact);
  const priceImpactLevel = priceImpactData.level;
  
  const priceImpactColor = 
    priceImpactLevel === 'low' ? theme.colors.positive :
    priceImpactLevel === 'medium' ? theme.colors.orange :
    priceImpactLevel === 'high' ? theme.colors.negative :
    theme.colors.red;

  return (
    <>
      <View style={[styles.swapDetails, styles.glassmorphism]}>
        <View style={styles.swapDetailsHeader}>
          <Text style={[styles.swapDetailsTitle, { color: theme.colors.textPrimary }]}>Swap Details</Text>
          <Pressable
            onPress={() => setShowSettings(true)}
            style={styles.settingsButton}
          >
            <Settings size={16} color={theme.colors.textSecondary} />
          </Pressable>
        </View>

        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
            Rate
          </Text>
          <Text style={[styles.detailValue, { color: theme.colors.textPrimary }]}>
            1 {quote.fromToken.symbol} = {(() => {
              const toAmount = parseQuoteAmount(quote.quotes[0].toTokenAmount, quote.toToken.decimals);
              const inputAmount = parseFloat(fromAmount);
              const baseAmount = Number.isFinite(inputAmount) && inputAmount > 0
                ? inputAmount
                : parseQuoteAmount(quote.fromTokenAmount, quote.fromToken.decimals);
              if (!baseAmount || !Number.isFinite(baseAmount)) {
                return '0.000000';
              }
              return (toAmount / baseAmount).toFixed(6);
            })()} {quote.toToken.symbol}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
            Price Impact
          </Text>
          <View style={styles.priceImpactContainer}>
            {priceImpactLevel !== 'low' && (
              <AlertTriangle size={12} color={priceImpactColor} />
            )}
            {priceImpactData.warning && (
              <Text style={[styles.warningText, { color: priceImpactColor }]}>
                {priceImpactData.warning}
              </Text>
            )}
            <Text style={[styles.detailValue, { color: priceImpactColor }]}>
              {priceImpact.toFixed(2)}%
            </Text>
          </View>
        </View>

        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
            Slippage
          </Text>
          <Text style={[styles.detailValue, { color: theme.colors.textPrimary }]}>
            {slippage}%
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
            Min. Received
          </Text>
          <Text style={[styles.detailValue, { color: theme.colors.textPrimary }]}>
            {parseQuoteAmount(
              quote.quotes[0].minToTokenAmount,
              quote.toToken.decimals
            ).toFixed(6)} {quote.toToken.symbol}
          </Text>
        </View>
      </View>

      <ModalSheet
        isVisible={showSettings}
        onClose={() => setShowSettings(false)}
        title="Swap Settings"
      >
        <View style={styles.settingsContent}>
          <Text style={[styles.settingsLabel, { color: theme.colors.textPrimary }]}>
            Slippage Tolerance
          </Text>
          <View style={styles.slippageButtons}>
            {[0.1, 0.5, 1, 3].map((value) => (
              <Pressable
                key={value}
                onPress={() => onSlippageChange(value)}
                style={[
                  styles.slippageButton,
                  { backgroundColor: theme.colors.surface },
                  slippage === value && {
                    backgroundColor: accent.from,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.slippageButtonText,
                    { color: theme.colors.textPrimary },
                    slippage === value && { color: theme.colors.textPrimary },
                  ]}
                >
                  {value}%
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </ModalSheet>
    </>
  );
}

export function SwapInterface() {
  const { theme } = useTheme();
  const accentColors = useAccent();
  const { connected, account, signAndSubmitTransaction, connectExtension } = useWallet();
  
  // Real token balances - fetched from blockchain
  const [tokenBalances, setTokenBalances] = useState<Record<string, number>>({});
  const [loadingBalances, setLoadingBalances] = useState(false);
  
  // Responsive dimensions
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const isMobile = screenWidth < BREAKPOINTS.md;
  const isTablet = screenWidth >= BREAKPOINTS.md && screenWidth < BREAKPOINTS.lg;
  
  // Responsive spacing
  const spacing = {
    xs: getResponsiveValue({ xs: 4, sm: 6, md: 8, lg: 10, xl: 12 }, screenWidth),
    sm: getResponsiveValue({ xs: 8, sm: 12, md: 16, lg: 20, xl: 24 }, screenWidth),
    md: getResponsiveValue({ xs: 12, sm: 16, md: 20, lg: 24, xl: 28 }, screenWidth),
    lg: getResponsiveValue({ xs: 16, sm: 20, md: 24, lg: 28, xl: 32 }, screenWidth),
    xl: getResponsiveValue({ xs: 20, sm: 24, md: 28, lg: 32, xl: 36 }, screenWidth),
  };
  
  // Responsive font sizes
  const fontSize = {
    xs: getResponsiveValue({ xs: 10, sm: 11, md: 12, lg: 13, xl: 14 }, screenWidth),
    sm: getResponsiveValue({ xs: 12, sm: 13, md: 14, lg: 15, xl: 16 }, screenWidth),
    md: getResponsiveValue({ xs: 14, sm: 15, md: 16, lg: 17, xl: 18 }, screenWidth),
    lg: getResponsiveValue({ xs: 16, sm: 18, md: 20, lg: 22, xl: 24 }, screenWidth),
    xl: getResponsiveValue({ xs: 18, sm: 20, md: 22, lg: 24, xl: 26 }, screenWidth),
    xxl: getResponsiveValue({ xs: 20, sm: 22, md: 24, lg: 26, xl: 28 }, screenWidth),
  };
  
  // Fetch real balances when wallet connects
  useEffect(() => {
    const fetchBalances = async () => {
      if (!connected || !account?.address) {
        setTokenBalances({});
        return;
      }
      
      setLoadingBalances(true);
      try {
        const balances = await fetchTokenBalances(account.address);
        setTokenBalances(balances);
      } catch (error) {
        setTokenBalances({});
      } finally {
        setLoadingBalances(false);
      }
    };
    
    fetchBalances();
    
    // Refresh balances every 30 seconds
    const interval = setInterval(fetchBalances, 30000);
    return () => clearInterval(interval);
  }, [connected, account?.address]);
  
  const [fromToken, setFromToken] = useState('APT');
  const [toToken, setToToken] = useState('USDC');
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [quote, setQuote] = useState<SwapQuoteResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showTokenSelector, setShowTokenSelector] = useState(false);
  const [selectorType, setSelectorType] = useState<'from' | 'to'>('from');
  const [showSlippageModal, setShowSlippageModal] = useState(false);
  const [slippage, setSlippage] = useState(0.5);
  const [isSwapping, setIsSwapping] = useState(false);

  // Animation values
  const swapButtonScale = useSharedValue(1);
  const swapIconRotation = useSharedValue(0);

  // Animated styles
  const swapButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: swapButtonScale.value }],
  }));

  const swapIconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${swapIconRotation.value}deg` }],
  }));

  // Fetch quote when inputs change
  const fetchQuote = useCallback(async () => {
    if (!fromAmount || parseFloat(fromAmount) <= 0) {
      setQuote(null);
      setToAmount('');
      return;
    }

    setIsLoading(true);
    try {
      const fromTokenData = SWAP_TOKENS[fromToken as keyof typeof SWAP_TOKENS];
      const toTokenData = SWAP_TOKENS[toToken as keyof typeof SWAP_TOKENS];

      // Validate token data
      if (!fromTokenData || !toTokenData) {
        Alert.alert('Error', 'Invalid token configuration');
        return;
      }

      if (!fromTokenData.address || !toTokenData.address) {
        Alert.alert('Error', 'Token addresses not configured');
        return;
      }

      // Panora API expects amount WITHOUT decimals (e.g., 10.5 not 1050000000)
      const cleanAmount = fromAmount;

      const quoteResponse = await panoraSwapService.getSwapQuote({
        chainId: PANORA_CONFIG.chainId,
        fromTokenAddress: fromTokenData.address,
        toTokenAddress: toTokenData.address,
        fromTokenAmount: cleanAmount, // Send raw amount (e.g., "10.5")
        toWalletAddress: account?.address || '0x1', // Use actual wallet address if connected
        slippagePercentage: slippage,
      });

      setQuote(quoteResponse);
      
      // Check if quotes array exists and has data
      if (!quoteResponse.quotes || !Array.isArray(quoteResponse.quotes) || quoteResponse.quotes.length === 0) {
        Alert.alert('Error', 'No swap quotes available. Please try again.');
        setToAmount('');
        return;
      }
      
      const firstQuote = quoteResponse.quotes[0];
      
      // Try to get toTokenAmount from different possible locations
      let toTokenAmount = (firstQuote as any).toTokenAmount;
      
      // Fallback: some APIs might have it at the response level
      if (!toTokenAmount && (quoteResponse as any).toTokenAmount) {
        toTokenAmount = (quoteResponse as any).toTokenAmount;
      }
      
      // Fallback: some APIs might use different field names
      if (!toTokenAmount && (firstQuote as any).receiveAmount) {
        toTokenAmount = (firstQuote as any).receiveAmount;
      }
      
      if (!toTokenAmount && (firstQuote as any).outputAmount) {
        toTokenAmount = (firstQuote as any).outputAmount;
      }
      
      if (!toTokenAmount) {
        Alert.alert('Error', 'Could not parse swap quote. Please try again.');
        setToAmount('');
        return;
      }
      
      const numericToAmount = parseQuoteAmount(toTokenAmount, toTokenData.decimals);
      setToAmount(numericToAmount.toFixed(6));
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch swap quote. Please try again.');
      setQuote(null);
      setToAmount('');
    } finally {
      setIsLoading(false);
    }
  }, [fromAmount, fromToken, toToken, slippage, account?.address]);

  // Debounced quote fetching
  useEffect(() => {
    const timer = setTimeout(fetchQuote, 500);
    return () => clearTimeout(timer);
  }, [fetchQuote]);

  // Handle token swap
  const handleSwapTokens = () => {
    swapIconRotation.value = withSpring(swapIconRotation.value + 180);
    
    const tempToken = fromToken;
    setFromToken(toToken);
    setToToken(tempToken);
    setFromAmount(toAmount);
    setToAmount('');
    setQuote(null);
  };


  // Handle swap execution
  const handleSwap = async () => {
    if (!quote || !fromAmount) {
      Alert.alert('Error', 'Missing swap data');
      return;
    }

    if (!connected || !account?.address) {
      Alert.alert('Wallet Required', 'Please connect your wallet to perform swaps', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Connect Wallet', onPress: () => connectExtension('Petra') }
      ]);
      return;
    }

    setIsSwapping(true);
    swapButtonScale.value = withSpring(0.95, {}, () => {
      swapButtonScale.value = withSpring(1);
    });

    try {
      // Validate transaction data
      const txData = quote.quotes[0].txData;

      const validation = panoraSwapService.validateTransaction(txData);
      if (!validation.isValid) {
        Alert.alert('Security Error', validation.error || 'Invalid transaction data');
        return;
      }

      // Show warning if there are any
      // Simulate transaction before execution
      const canSimulate = await panoraSwapService.simulateTransaction(
        txData,
        account.address
      );

      if (!canSimulate) {
        Alert.alert('Simulation Failed', 'Transaction simulation failed. The swap may not succeed.');
        return;
      }

      // Execute swap transaction via wallet provider
      const result = await signAndSubmitTransaction(txData);
      Alert.alert(
        'Success',
        `Swap completed successfully!\nTransaction: ${result.hash.slice(0, 10)}...`,
        [{ text: 'OK' }]
      );
      
      // Reset form and refresh balances
      setFromAmount('');
      setToAmount('');
      setQuote(null);
      
      // Refresh balances after swap
      if (account?.address) {
        const balances = await fetchTokenBalances(account.address);
        setTokenBalances(balances);
      }
    } catch (error) {
      Alert.alert('Error', 'Swap failed. Please try again.');
    } finally {
      setIsSwapping(false);
    }
  };

  // Quick swap pairs
  const handleQuickSwap = (pair: { from: string; to: string }) => {
    setFromToken(pair.from);
    setToToken(pair.to);
    setFromAmount('');
    setToAmount('');
    setQuote(null);
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.colors.bg }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Quick Swap Pairs */}
      <View style={styles.quickSwapContainer}>
        <Text style={[styles.quickSwapTitle, { color: theme.colors.textSecondary }]}>
          Popular Pairs
        </Text>
        <View style={styles.quickSwapPairs}>
          {POPULAR_SWAP_PAIRS.slice(0, 3).map((pair, index) => (
            <Pressable
              key={index}
              onPress={() => handleQuickSwap(pair)}
              style={[styles.quickSwapPair, styles.modernChip]}
            >
              <Text style={[styles.quickSwapPairText, { color: theme.colors.textPrimary }]}>
                {pair.from}/{pair.to}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* From Token */}
      <TokenSelector
        selectedToken={fromToken}
        onTokenSelect={setFromToken}
        label="From"
        amount={fromAmount}
        onAmountChange={setFromAmount}
        balance={connected ? (loadingBalances ? "Loading..." : formatBalance(tokenBalances[fromToken] || 0, 2)) : "Connect wallet"}
      />

      {/* Swap Button */}
      <View style={styles.swapButtonContainer}>
        <AnimatedPressable
          onPress={handleSwapTokens}
          style={[styles.swapButton, swapButtonAnimatedStyle]}
        >
          <LinearGradient
            colors={['#10B981', '#059669', '#047857']}
            style={styles.swapButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Animated.View style={swapIconAnimatedStyle}>
              <ArrowUpDown size={20} color={theme.colors.textPrimary} />
            </Animated.View>
          </LinearGradient>
        </AnimatedPressable>
      </View>

      {/* To Token */}
      <TokenSelector
        selectedToken={toToken}
        onTokenSelect={setToToken}
        label="To"
        amount={toAmount}
        onAmountChange={setToAmount}
        isLoading={isLoading}
        readOnly={true}
        balance={connected ? (loadingBalances ? "Loading..." : formatBalance(tokenBalances[toToken] || 0, 2)) : "Connect wallet"}
      />

      {/* Swap Details */}
      <SwapDetails
        quote={quote}
        slippage={slippage}
        onSlippageChange={setSlippage}
        fromAmount={fromAmount}
      />

      {/* Swap Execute Button */}
      <GradientPillButton
        title={isSwapping ? 'Swapping...' : 'Swap'}
        onPress={handleSwap}
        disabled={!quote || isSwapping || isLoading}
        style={styles.executeButton}
        accent="#10B981"
        icon={isSwapping ? undefined : <Zap size={20} color={theme.colors.textPrimary} />}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 16,
    paddingBottom: 32,
  },
  quickSwapContainer: {
    gap: 12,
    marginBottom: 8,
  },
  quickSwapTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  quickSwapPairs: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  quickSwapPair: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center',
  },
  quickSwapPairText: {
    fontSize: 12,
    fontWeight: '600',
  },
  tokenCard: {
    padding: 20,
    borderRadius: 20,
    gap: 16,
    minHeight: 120,
  },
  tokenSelectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  tokenLabel: {
    fontSize: 16,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  balanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  balanceText: {
    fontSize: 14,
    fontWeight: '500',
  },
  maxButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
    minWidth: 60,
    alignItems: 'center',
  },
  maxButtonText: {
    fontSize: 12,
    fontWeight: '700',
  },
  tokenButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  tokenLogo: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  tokenSymbol: {
    fontSize: 18,
    fontWeight: '700',
  },
  amountInputContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 80,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    marginBottom: 12,
  },
  amountInput: {
    flex: 1,
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'left',
    paddingVertical: 0,
    paddingHorizontal: 0,
    backgroundColor: 'transparent',
    minHeight: 48,
    borderWidth: 0,
    outlineStyle: 'none',
  } as any,
  loadingIndicator: {
    marginLeft: 8,
  },
  swapButtonContainer: {
    alignItems: 'center',
    marginVertical: -12,
    zIndex: 1,
  },
  swapButton: {
    width: 48,
    height: 48,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  swapButtonGradient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  swapDetails: {
    padding: 20,
    borderRadius: 20,
    gap: 16,
    position: 'relative',
    marginTop: 8,
  },
  settingsButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  detailLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  priceImpactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  warningText: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    marginLeft: 4,
  },
  executeButton: {
    marginTop: 24,
    marginHorizontal: 4,
  },
  tokenList: {
    gap: 8,
  },
  tokenListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  tokenListLogo: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  tokenListInfo: {
    flex: 1,
  },
  tokenListSymbol: {
    fontSize: 16,
    fontWeight: '600',
  },
  tokenListName: {
    fontSize: 12,
  },
  slippageModal: {
    padding: 24,
    gap: 20,
  },
  slippageTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  slippageButtons: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  slippageButton: {
    flex: 1,
    minWidth: 80,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
  },
  slippageButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  tokenSelector: {
    padding: 20,
    borderRadius: 20,
    gap: 16,
    minHeight: 120,
    overflow: 'hidden',
  },
  settingsContent: {
    gap: 20,
    paddingVertical: 8,
  },
  settingsLabel: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  glassmorphism: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    backdropFilter: 'blur(20px)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
    position: 'relative',
  },
  modernChip: {
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  maxButtonContainer: {
    alignItems: 'flex-end',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  swapDetailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  swapDetailsTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
});

