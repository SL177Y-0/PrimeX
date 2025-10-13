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
import * as Linking from 'expo-linking';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { ChevronDown, Settings, AlertTriangle, ArrowUpDown, Zap } from 'lucide-react-native';
import { GradientPillButton } from './GradientPillButton';
import { ModalSheet } from './ModalSheet';
import { SWAP_TOKENS, POPULAR_SWAP_PAIRS, PANORA_CONFIG } from '../config/constants';
import { panoraSwapSDK } from '../services/panoraSwapSDK';
import type { SwapQuoteResponse } from '../services/panoraSwapSDK';
import { fetchTokenBalances, formatBalance } from '../services/balanceService';
import { useResponsive } from '../hooks/useResponsive';
import { BREAKPOINTS } from '../hooks/useResponsive';
import { useTheme } from '../theme/ThemeProvider';
import { useAccent } from '../theme/useAccent';
import { PAGE_ACCENTS } from '../theme/pageAccents';
import { useWallet } from '../app/providers/WalletProvider';

// Alias for backward compatibility
const panoraSwapService = panoraSwapSDK;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

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
  const { spacing, fontSize, value } = useResponsive();
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
      <View
        style={[
          styles.tokenSelector,
          styles.glassmorphism,
          {
            padding: spacing.md,
            borderRadius: value({ xs: 14, md: 18 }),
            gap: spacing.sm,
          },
        ]}
      >
        <View
          style={[
            styles.tokenSelectorHeader,
            { marginBottom: spacing.xs },
          ]}
        >
          <Text
            style={[
              styles.tokenLabel,
              { color: theme.colors.textSecondary, fontSize: value({ xs: fontSize.sm, md: 15 }) },
            ]}
          >
            {label}
          </Text>
          {balance && (
            <View style={styles.balanceContainer}>
              <Text
                style={[
                  styles.balanceText,
                  { color: theme.colors.textSecondary, fontSize: value({ xs: fontSize.xs, md: fontSize.sm }) },
                ]}
              >
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
        <View style={[styles.tokenList, { gap: spacing.xs }]}>
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
  const { spacing, fontSize, value } = useResponsive();
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
      <View style={[styles.swapDetails, styles.glassmorphism, { padding: spacing.md, borderRadius: value({ xs: 14, md: 18 }), gap: spacing.sm }]}>
        <View style={[styles.swapDetailsHeader, { marginBottom: spacing.sm }]}>
          <Text style={[styles.swapDetailsTitle, { color: theme.colors.textPrimary, fontSize: value({ xs: fontSize.md, md: 16 }) }]}>Swap Details</Text>
          <Pressable
            onPress={() => setShowSettings(true)}
            style={[styles.settingsButton, { padding: spacing.xs, borderRadius: 8 }]}
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
  // Use page-specific cyan accent
  const pageAccent = PAGE_ACCENTS.SWAP;
  const { connected, account, signAndSubmitTransaction, connectExtension } = useWallet();
  const { value, spacing, fontSize } = useResponsive();
  // Real token balances - fetched from blockchain
  const [tokenBalances, setTokenBalances] = useState<Record<string, number>>({});
  const [loadingBalances, setLoadingBalances] = useState(false);
  
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
  const [slippage, setSlippage] = useState(0.5);
  const [isSwapping, setIsSwapping] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [swapResultDetails, setSwapResultDetails] = useState<{
    txHash: string;
    fromSymbol: string;
    toSymbol: string;
    fromAmount: string;
    toAmount: string;
  } | null>(null);

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
        if (__DEV__) {
          console.warn('[Swap] Panora txData validation failed', validation.error, txData);
        }
        Alert.alert('Security Error', validation.error || 'Invalid transaction data');
        return;
      }

      const normalizedPayload = validation.normalizedTxData ?? txData;

      // Simulate transaction before execution
      const canSimulate = await panoraSwapService.simulateTransaction(
        normalizedPayload,
        account.address
      );

      if (!canSimulate) {
        Alert.alert('Simulation Failed', 'Transaction simulation failed. The swap may not succeed.');
        return;
      }

      // Execute swap transaction via wallet provider
      const result = await signAndSubmitTransaction(normalizedPayload);

      const confirmed = await panoraSwapService.waitForTransactionConfirmation(result.hash);

      if (!confirmed) {
        Alert.alert('Warning', 'Transaction submitted but confirmation timed out. Check wallet history.');
      }

      const fromTokenData = SWAP_TOKENS[fromToken as keyof typeof SWAP_TOKENS];
      const toTokenData = SWAP_TOKENS[toToken as keyof typeof SWAP_TOKENS];

      setSwapResultDetails({
        txHash: result.hash,
        fromSymbol: fromTokenData?.symbol || fromToken,
        toSymbol: toTokenData?.symbol || toToken,
        fromAmount,
        toAmount: normalizedPayload.arguments?.length ? String(toAmount) : toAmount,
      });

      setShowSuccessModal(true);
      
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

      <Modal
        visible={showSuccessModal && !!swapResultDetails}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.successModal}>
            <Text style={[styles.successTitle, { color: theme.colors.textPrimary }]}>Swap Successful</Text>
            {swapResultDetails && (
              <View style={styles.successBody}>
                <Text style={[styles.successAmounts, { color: theme.colors.textPrimary }]}>
                  {parseFloat(swapResultDetails.fromAmount || '0').toFixed(6)} {swapResultDetails.fromSymbol} → {swapResultDetails.toAmount || '0'} {swapResultDetails.toSymbol}
                </Text>
                <Text style={[styles.successSubtext, { color: theme.colors.textSecondary }]}>Tx Hash</Text>
                <Pressable
                  onPress={() => {
                    if (!swapResultDetails?.txHash) {
                      return;
                    }
                    Alert.alert('Transaction Hash', swapResultDetails.txHash);
                  }}
                >
                  <Text style={[styles.successHash, { color: pageAccent.primary }]}>
                    {swapResultDetails.txHash.slice(0, 10)}...
                  </Text>
                </Pressable>
                <GradientPillButton
                  title="View on Explorer"
                  onPress={async () => {
                    if (!swapResultDetails?.txHash) return;
                    const url = `https://explorer.aptoslabs.com/txn/${swapResultDetails.txHash}?network=mainnet`;
                    try {
                      const supported = await Linking.canOpenURL(url);
                      if (supported) {
                        await Linking.openURL(url);
                      } else {
                        Alert.alert('Explorer Unavailable', url);
                      }
                    } catch (err) {
                      Alert.alert('Explorer Error', `Unable to open explorer.\n${url}`);
                    }
                  }}
                  style={styles.explorerButton}
                  variant="primary"
                  accent="EXPLORER"
                />
              </View>
            )}
            <GradientPillButton
              title="Close"
              onPress={() => setShowSuccessModal(false)}
              style={styles.successButton}
              variant="primary"
              accent="DANGER"
            />
          </View>
        </View>
      </Modal>
      
      {/* Powered by Footer */}
      <View style={{
        paddingVertical: spacing.lg,
        paddingHorizontal: spacing.md,
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        marginTop: spacing.xl,
      }}>
        <Text style={{
          color: theme.colors.textSecondary,
          fontSize: fontSize.xs,
          fontFamily: 'Inter-Medium',
          letterSpacing: 0.5,
        }}>
          Powered by{' '}
          <Text style={{
            color: pageAccent.primary,
            fontFamily: 'Inter-SemiBold',
          }}>
            PanoraSwap
          </Text>
        </Text>
      </View>

      {/* Loading Overlay */}
      <Modal
        visible={isLoading || isSwapping}
        transparent
        animationType="fade"
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.9)',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <ActivityIndicator size="large" color={pageAccent.primary} />
          <Text style={{
            color: '#FFFFFF',
            fontSize: fontSize.md,
            fontFamily: 'Inter-Medium',
            textAlign: 'center',
            marginTop: spacing.md,
          }}>
            Loading...
          </Text>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 12,
    paddingBottom: 24,
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
    minHeight: 100,
  },
  tokenSelector: {
    overflow: 'hidden',
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
  maxButtonContainer: {
    alignItems: 'flex-end',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
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
  glassmorphism: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
    position: 'relative',
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
    position: 'relative',
    marginTop: 8,
  },
  swapDetailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  settingsButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
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
    marginTop: 16,
    marginHorizontal: 0,
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
    padding: 16,
    gap: 16,
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
  swapDetailsTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  successModal: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 20,
    padding: 20,
    gap: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    backgroundColor: '#101418',
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  successBody: {
    gap: 12,
    alignItems: 'center',
  },
  successAmounts: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  successSubtext: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  successHash: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  successButton: {
    marginTop: 8,
  },
  explorerButton: {
    marginTop: 12,
  },
});
