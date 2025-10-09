/**
 * Staking Interface - Amnis Liquid Staking
 * 
 * Modern UI for Amnis Finance liquid staking operations
 * Features:
 * - APT -> amAPT staking (1:1 liquid derivative)
 * - amAPT -> stAPT vault (auto-compounding)
 * - Instant & delayed unstaking options
 * - Real-time balance & APR display
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { useWallet } from '../app/providers/WalletProvider';
import { Card } from './Card';
import { GradientPillButton } from './GradientPillButton';
import { SoftButton } from './SoftButton';
import { SegmentedTabs } from './SegmentedTabs';
import {
  TrendingUp,
  Zap,
  Clock,
  Info,
  ArrowDownUp,
  Wallet as WalletIcon,
} from 'lucide-react-native';
import {
  getUserBalances,
  getStakingStats,
  buildStakeTransaction,
  buildMintStAptTransaction,
  buildRedeemStAptTransaction,
  buildInstantUnstakeTransaction,
  buildRequestUnstakeTransaction,
  toOctas,
  fromOctas,
  calculateAmAptOutput,
  calculateStAptOutput,
  calculateAmAptFromStApt,
  validateStakingAmount,
  estimateGasFee,
  formatAPR,
  type StakingBalance,
  type StakingStats,
} from '../services/amnisService';
import { AMNIS_CONFIG, STAKING_CONSTANTS } from '../config/constants';

type StakeMode = 'stake' | 'vault' | 'unstake';
type UnstakeMethod = 'instant' | 'delayed';

export function StakingInterface() {
  const { theme } = useTheme();
  const { connected, account, signAndSubmitTransaction } = useWallet();

  // State management
  const [mode, setMode] = useState<StakeMode>('stake');
  const [unstakeMethod, setUnstakeMethod] = useState<UnstakeMethod>('instant');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [balances, setBalances] = useState<StakingBalance>({
    apt: '0',
    amAPT: '0',
    stAPT: '0',
  });
  const [stats, setStats] = useState<StakingStats | null>(null);

  // Fetch data on mount and wallet connection
  useEffect(() => {
    if (connected && account) {
      fetchData();
      const interval = setInterval(fetchData, STAKING_CONSTANTS.REFRESH_INTERVAL);
      return () => clearInterval(interval);
    }
  }, [connected, account]);

  const fetchData = async () => {
    if (!account) return;
    
    setRefreshing(true);
    try {
      const [userBalances, stakingStats] = await Promise.all([
        getUserBalances(account.address),
        getStakingStats(),
      ]);
      setBalances(userBalances);
      setStats(stakingStats);
    } catch (error) {
      console.error('Error fetching staking data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Calculate outputs based on mode
  const calculateOutput = useCallback(() => {
    const inputAmount = parseFloat(amount) || 0;
    
    if (mode === 'stake') {
      return calculateAmAptOutput(inputAmount);
    } else if (mode === 'vault') {
      const rate = stats?.stAptExchangeRate || 1.0;
      return calculateStAptOutput(inputAmount, rate);
    } else {
      // unstake
      const rate = stats?.stAptExchangeRate || 1.0;
      return calculateAmAptFromStApt(inputAmount, rate);
    }
  }, [amount, mode, stats]);

  // Get current balance for selected mode
  const getCurrentBalance = useCallback(() => {
    if (mode === 'stake') return fromOctas(balances.apt);
    if (mode === 'vault') return fromOctas(balances.amAPT);
    return fromOctas(balances.stAPT); // unstake
  }, [mode, balances]);

  // Validate current input
  const validateInput = useCallback(() => {
    const inputAmount = parseFloat(amount) || 0;
    const balance = getCurrentBalance();
    const minAmount = AMNIS_CONFIG.minAmounts.stake;

    return validateStakingAmount(inputAmount, balance, minAmount);
  }, [amount, getCurrentBalance]);

  // Handle staking transaction
  const handleStake = async () => {
    if (!connected || !account) {
      Alert.alert('Wallet Not Connected', 'Please connect your wallet first');
      return;
    }

    const validation = validateInput();
    if (!validation.valid) {
      Alert.alert('Invalid Amount', validation.error || 'Please check your input');
      return;
    }

    setLoading(true);
    try {
      const amountOctas = toOctas(amount);
      let transaction;

      if (mode === 'stake') {
        transaction = buildStakeTransaction(amountOctas);
      } else if (mode === 'vault') {
        transaction = buildMintStAptTransaction(amountOctas);
      } else {
        // unstake
        if (unstakeMethod === 'instant') {
          transaction = buildInstantUnstakeTransaction(amountOctas);
        } else {
          transaction = buildRequestUnstakeTransaction(amountOctas);
        }
      }

      const result = await signAndSubmitTransaction(transaction);
      
      Alert.alert(
        'Transaction Submitted',
        `Transaction hash: ${result.hash.substring(0, 20)}...`,
        [
          {
            text: 'OK',
            onPress: () => {
              setAmount('');
              fetchData();
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Staking transaction failed:', error);
      Alert.alert(
        'Transaction Failed',
        error.message || 'Please try again'
      );
    } finally {
      setLoading(false);
    }
  };

  // Quick amount buttons
  const setQuickAmount = (percentage: number) => {
    const balance = getCurrentBalance();
    const quickAmount = (balance * percentage) / 100;
    setAmount(quickAmount.toFixed(6));
  };

  if (!connected || !account) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
        <View style={styles.emptyState}>
          <WalletIcon size={64} color={theme.colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>
            Wallet Not Connected
          </Text>
          <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
            Connect your Aptos wallet to start liquid staking
          </Text>
        </View>
      </View>
    );
  }

  const outputAmount = calculateOutput();
  const validation = validateInput();
  const estimatedFee = estimateGasFee();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.bg }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      bounces={true}
    >
      {/* Stats Cards */}
      <View style={styles.statsRow}>
        <Card style={[styles.statCard, { backgroundColor: theme.colors.chip }]} elevated>
          <View style={[styles.statIcon, { backgroundColor: `${theme.colors.positive}15` }]}>
            <TrendingUp size={18} color={theme.colors.positive} />
          </View>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
            amAPT APR
          </Text>
          <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>
            {formatAPR(stats?.estimatedAmAptAPR || AMNIS_CONFIG.estimatedAPR.amAPT)}
          </Text>
        </Card>

        <Card style={[styles.statCard, { backgroundColor: theme.colors.chip }]} elevated>
          <View style={[styles.statIcon, { backgroundColor: `${theme.colors.purple}15` }]}>
            <Zap size={18} color={theme.colors.purple} />
          </View>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
            stAPT APR
          </Text>
          <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>
            {formatAPR(stats?.estimatedStAptAPR || AMNIS_CONFIG.estimatedAPR.stAPT)}
          </Text>
        </Card>
      </View>

      {/* Mode Selector */}
      <Card style={[styles.card, { backgroundColor: theme.colors.chip }]}>
        <SegmentedTabs
          options={['Stake APT', 'stAPT Vault', 'Unstake']}
          selectedIndex={mode === 'stake' ? 0 : mode === 'vault' ? 1 : 2}
          onSelect={(index: number) => {
            const modes: StakeMode[] = ['stake', 'vault', 'unstake'];
            setMode(modes[index]);
          }}
        />
      </Card>

      {/* Balance Display */}
      <Card style={[styles.card, { backgroundColor: theme.colors.chip }]}>
        <View style={styles.balanceRow}>
          <Text style={[styles.balanceLabel, { color: theme.colors.textSecondary }]}>
            Available Balance
          </Text>
          <Pressable onPress={fetchData} disabled={refreshing}>
            {refreshing ? (
              <ActivityIndicator size="small" color={theme.colors.textSecondary} />
            ) : (
              <Text style={[styles.balanceValue, { color: theme.colors.textPrimary }]}>
                {getCurrentBalance().toFixed(6)}{' '}
                {mode === 'stake' ? 'APT' : mode === 'vault' ? 'amAPT' : 'stAPT'}
              </Text>
            )}
          </Pressable>
        </View>
      </Card>

      {/* Amount Input */}
      <Card style={[styles.card, { backgroundColor: theme.colors.chip }]}>
        <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
          Amount
        </Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={[
              styles.input,
              {
                color: theme.colors.textPrimary,
                backgroundColor: theme.colors.surface,
              },
            ]}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor={theme.colors.textSecondary}
          />
          <Text style={[styles.inputSuffix, { color: theme.colors.textSecondary }]}>
            {mode === 'stake' ? 'APT' : mode === 'vault' ? 'amAPT' : 'stAPT'}
          </Text>
        </View>

        {/* Quick Amount Buttons */}
        <View style={styles.quickButtons}>
          {[25, 50, 75, 100].map((percentage) => (
            <Pressable
              key={percentage}
              style={[styles.quickButton, { backgroundColor: theme.colors.surface }]}
              onPress={() => setQuickAmount(percentage)}
            >
              <Text style={[styles.quickButtonText, { color: theme.colors.textPrimary }]}>
                {percentage}%
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Output Display */}
        {parseFloat(amount) > 0 && (
          <View style={styles.outputContainer}>
            <ArrowDownUp size={16} color={theme.colors.textSecondary} />
            <Text style={[styles.outputText, { color: theme.colors.textPrimary }]}>
              You will receive: {outputAmount.toFixed(6)}{' '}
              {mode === 'stake' ? 'amAPT' : mode === 'vault' ? 'stAPT' : 'amAPT'}
            </Text>
          </View>
        )}
      </Card>

      {/* Unstake Method Selection */}
      {mode === 'unstake' && (
        <Card style={[styles.card, { backgroundColor: theme.colors.chip }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
            Unstake Method
          </Text>
          
          <Pressable
            style={[
              styles.methodOption,
              {
                backgroundColor: unstakeMethod === 'instant' ? theme.colors.surface : 'transparent',
                borderColor: unstakeMethod === 'instant' ? theme.colors.orange : theme.colors.surface,
              },
            ]}
            onPress={() => setUnstakeMethod('instant')}
          >
            <View style={styles.methodHeader}>
              <Zap size={20} color={theme.colors.orange} />
              <Text style={[styles.methodTitle, { color: theme.colors.textPrimary }]}>
                Instant Unstake
              </Text>
            </View>
            <Text style={[styles.methodDescription, { color: theme.colors.textSecondary }]}>
              Get APT immediately via DEX swap • Small fee applies (~0.3%)
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.methodOption,
              {
                backgroundColor: unstakeMethod === 'delayed' ? theme.colors.surface : 'transparent',
                borderColor: unstakeMethod === 'delayed' ? theme.colors.blue : theme.colors.surface,
              },
            ]}
            onPress={() => setUnstakeMethod('delayed')}
          >
            <View style={styles.methodHeader}>
              <Clock size={20} color={theme.colors.blue} />
              <Text style={[styles.methodTitle, { color: theme.colors.textPrimary }]}>
                Delayed Unstake
              </Text>
            </View>
            <Text style={[styles.methodDescription, { color: theme.colors.textSecondary }]}>
              14-day unbonding period • No fees • Claim after waiting period
            </Text>
          </Pressable>
        </Card>
      )}

      {/* Info Box */}
      <Card style={[styles.card, styles.infoBox, { backgroundColor: `${theme.colors.blue}10` }]}>
        <Info size={16} color={theme.colors.blue} />
        <Text style={[styles.infoText, { color: theme.colors.textPrimary }]}>
          {mode === 'stake' && 'Stake APT to receive amAPT (1:1). amAPT is liquid and can be used in DeFi while earning staking rewards.'}
          {mode === 'vault' && 'Stake amAPT in the stAPT vault for auto-compounding rewards. Higher APR but less liquid.'}
          {mode === 'unstake' && unstakeMethod === 'instant' && 'Instant unstake swaps your stAPT for APT via DEX. Quick but incurs a small swap fee.'}
          {mode === 'unstake' && unstakeMethod === 'delayed' && 'Delayed unstake has no fees but requires 14 days for unbonding. You can claim your APT after the period ends.'}
        </Text>
      </Card>

      {/* Action Button */}
      <View style={styles.actionContainer}>
        <GradientPillButton
          title={
            loading
              ? 'Processing...'
              : mode === 'stake'
              ? 'Stake APT'
              : mode === 'vault'
              ? 'Enter Vault'
              : 'Unstake'
          }
          onPress={handleStake}
          disabled={loading || !validation.valid}
          variant="primary"
          style={styles.actionButton}
        />
        {!validation.valid && validation.error && (
          <Text style={[styles.errorText, { color: theme.colors.negative }]}>
            {validation.error}
          </Text>
        )}
        <Text style={[styles.feeText, { color: theme.colors.textSecondary }]}>
          Estimated fee: ~{estimatedFee.toFixed(4)} APT
        </Text>
      </View>

      {/* Additional Info */}
      <View style={styles.additionalInfo}>
        <Text style={[styles.additionalInfoText, { color: theme.colors.textSecondary }]}>
          Powered by Amnis Finance • Liquid Staking on Aptos
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    minHeight: 300,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
    lineHeight: 20,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    minHeight: 120,
    justifyContent: 'center',
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    marginBottom: 6,
    textAlign: 'center',
  },
  statValue: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    textAlign: 'center',
  },
  card: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  balanceValue: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  input: {
    flex: 1,
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    padding: 16,
    borderRadius: 12,
  },
  inputSuffix: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    marginLeft: 12,
  },
  quickButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  quickButton: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  quickButtonText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
  },
  outputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  outputText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 12,
  },
  methodOption: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 12,
    minHeight: 80,
  },
  methodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  methodTitle: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    flex: 1,
  },
  methodDescription: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    lineHeight: 18,
    paddingLeft: 30,
  },
  infoBox: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    lineHeight: 18,
  },
  actionContainer: {
    marginTop: 8,
    marginBottom: 16,
  },
  actionButton: {
    marginBottom: 8,
  },
  errorText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
    marginBottom: 8,
  },
  feeText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
  },
  additionalInfo: {
    alignItems: 'center',
    marginTop: 16,
  },
  additionalInfoText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
});
