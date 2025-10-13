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
import { LinearGradient } from 'expo-linear-gradient';
import { useResponsive } from '../hooks/useResponsive';
import { useTheme } from '../theme/ThemeProvider';
import { PAGE_ACCENTS } from '../theme/pageAccents';
import { globalTextInputStyle } from '../styles/globalStyles';
import { useWallet } from '../app/providers/WalletProvider';
import { GradientPillButton } from './GradientPillButton';
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
  const { spacing, fontSize, value } = useResponsive();
  const { theme } = useTheme();
  // Use page-specific blue accent
  const pageAccent = PAGE_ACCENTS.STAKING;
  const { connected, account, signAndSubmitTransaction } = useWallet();
  const [mode, setMode] = useState<StakeMode>('stake');
  const [unstakeMethod, setUnstakeMethod] = useState<UnstakeMethod>('instant');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [balances, setBalances] = useState<StakingBalance>({ apt: '0', amAPT: '0', stAPT: '0' });
  const [stats, setStats] = useState<StakingStats | null>(null);

  useEffect(() => {
    if (!connected || !account) return;

    fetchData();
    const interval = setInterval(fetchData, STAKING_CONSTANTS.REFRESH_INTERVAL);
    return () => clearInterval(interval);
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
      console.error('[StakingInterface] Error fetching staking data:', error);
      console.error('[StakingInterface] Error details:', {
        accountAddress: account?.address,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally{
      setRefreshing(false);
    }
  };

  const calculateOutput = useCallback(() => {
    const inputAmount = parseFloat(amount) || 0;
    if (mode === 'stake') {
      return calculateAmAptOutput(inputAmount);
    }
    if (mode === 'vault') {
      const rate = stats?.stAptExchangeRate || 1.0;
      return calculateStAptOutput(inputAmount, rate);
    }
    const rate = stats?.stAptExchangeRate || 1.0;
    return calculateAmAptFromStApt(inputAmount, rate);
  }, [amount, mode, stats]);

  const getCurrentBalance = useCallback(() => {
    if (mode === 'stake') return fromOctas(balances.apt);
    if (mode === 'vault') return fromOctas(balances.amAPT);
    return fromOctas(balances.stAPT);
  }, [mode, balances]);

  const validateInput = useCallback(() => {
    const inputAmount = parseFloat(amount) || 0;
    const balance = getCurrentBalance();
    const minAmount = AMNIS_CONFIG.minAmounts.stake;
    return validateStakingAmount(inputAmount, balance, minAmount);
  }, [amount, getCurrentBalance]);

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
        transaction = buildStakeTransaction(amountOctas, account.address);
      } else if (mode === 'vault') {
        transaction = buildMintStAptTransaction(amountOctas, account.address);
      } else {
        transaction =
          unstakeMethod === 'instant'
            ? buildInstantUnstakeTransaction(amountOctas, account.address)
            : buildRequestUnstakeTransaction(amountOctas);
      }

      const result = await signAndSubmitTransaction(transaction);
      Alert.alert('Transaction Submitted', `Transaction hash: ${result.hash.substring(0, 20)}...`, [
        {
          text: 'OK',
          onPress: () => {
            setAmount('');
            fetchData();
          },
        },
      ]);
    } catch (error: any) {
      console.error('[StakingInterface] Transaction failed:', error);
      console.error('[StakingInterface] Transaction details:', {
        mode,
        unstakeMethod,
        amount,
        accountAddress: account?.address,
        errorMessage: error?.message || 'Unknown error',
        errorStack: error?.stack,
      });
      Alert.alert('Transaction Failed', error.message || 'Please try again');
    } finally {
      setLoading(false);
    }
  };

  const setQuickAmount = (percentage: number) => {
    const balance = getCurrentBalance();
    const quickAmount = (balance * percentage) / 100;
    setAmount(quickAmount.toFixed(6));
  };
  const outputAmount = calculateOutput();
  const validation = validateInput();
  const estimatedFee = estimateGasFee();

  const aprCards = [
    {
      key: 'liquid',
      gradient: ['#1A1B25', '#12121C'] as const,
      icon: <TrendingUp size={18} color={pageAccent.primary} />,
      label: 'amAPT APR',
      value:
        stats?.estimatedAmAptAPR != null
          ? formatAPR(stats.estimatedAmAptAPR)
          : '—',
    },
    {
      key: 'vault',
      gradient: ['#1A1B25', '#12121C'] as const,
      icon: <Zap size={18} color={pageAccent.secondary} />,
      label: 'stAPT APR',
      value:
        stats?.estimatedStAptAPR != null
          ? formatAPR(stats.estimatedStAptAPR)
          : '—',
    },
  ];

  if (!connected || !account) {
    return (
      <View style={[styles.container, styles.disconnectedContainer]}>
        <LinearGradient colors={['#050608', '#050608']} style={styles.disconnectedCard}>
          <WalletIcon size={60} color="rgba(255,255,255,0.35)" />
          <Text style={styles.disconnectedTitle}>Wallet Not Connected</Text>
          <Text style={styles.disconnectedSubtitle}>
            Connect your Aptos wallet to start earning liquid staking rewards.
          </Text>
        </LinearGradient>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.scrollContent, { paddingBottom: 10 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Stake & Earn</Text>
        <Text style={styles.headerSubtitle}>Powered by Amnis Finance</Text>
      </View>

      <View style={styles.statsRow}>
        {aprCards.map((card) => (
          <LinearGradient key={card.key} colors={card.gradient as any} style={styles.statCard}>
            <View style={styles.statIcon}>{card.icon}</View>
            <Text style={styles.statLabel}>{card.label}</Text>
            <Text style={styles.statValue}>{card.value}</Text>
          </LinearGradient>
        ))}
      </View>

      <LinearGradient colors={['#1A1B25', '#12121C'] as const} style={styles.glassCard}>
        <SegmentedTabs
          options={['Stake APT', 'stAPT Vault', 'Unstake']}
          selectedIndex={mode === 'stake' ? 0 : mode === 'vault' ? 1 : 2}
          onSelect={(index: number) => {
            const modes: StakeMode[] = ['stake', 'vault', 'unstake'];
            setMode(modes[index]);
          }}
          accent="blue"
        />
      </LinearGradient>

      <LinearGradient colors={['#050608', '#050608'] as const} style={styles.balanceCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.balanceLabel}>Available Balance</Text>
          <Text style={styles.balanceValue}>
            {getCurrentBalance().toFixed(6)} {mode === 'stake' ? 'APT' : mode === 'vault' ? 'amAPT' : 'stAPT'}
          </Text>
          {account && (
            <Text style={[styles.balanceLabel, { fontSize: 10, marginTop: 4 }]}>
              {account.address.slice(0, 6)}...{account.address.slice(-4)}
            </Text>
          )}
        </View>
        <Pressable style={styles.refreshButton} onPress={fetchData} disabled={refreshing}>
          {refreshing ? (
            <ActivityIndicator size="small" color={pageAccent.primary} />
          ) : (
            <Text style={[styles.refreshText, { color: pageAccent.primary }]}>Refresh</Text>
          )}
        </Pressable>
      </LinearGradient>

      <View style={styles.inputCard}>
        <Text style={[styles.inputLabel, { fontSize: fontSize.sm }]}>Amount</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            style={[styles.input, { fontSize: value({ xs: 20, md: 22, lg: 24 }) }, globalTextInputStyle]}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor="rgba(255,255,255,0.35)"
          />
          <Text style={styles.inputSuffix}>
            {mode === 'stake' ? 'APT' : mode === 'vault' ? 'amAPT' : 'stAPT'}
          </Text>
        </View>

        <View style={styles.quickButtonsRow}>
          {[25, 50, 75, 100].map((percentage) => (
            <Pressable key={percentage} style={styles.quickButton} onPress={() => setQuickAmount(percentage)}>
              <Text style={styles.quickButtonText}>{percentage}%</Text>
            </Pressable>
          ))}
        </View>

        {parseFloat(amount) > 0 && (
          <View style={styles.outputRow}>
            <ArrowDownUp size={16} color={pageAccent.primary} />
            <Text style={styles.outputText}>
              You will receive {outputAmount.toFixed(6)}{' '}
              {mode === 'stake' ? 'amAPT' : mode === 'vault' ? 'stAPT' : 'amAPT'}
            </Text>
          </View>
        )}
      </View>

      {mode === 'unstake' && (
        <View style={styles.methodGroup}>
          <Pressable
            style={[
              styles.methodCard,
              unstakeMethod === 'instant' && {
                ...styles.methodCardActive,
                borderColor: pageAccent.primary,
                shadowColor: pageAccent.primary,
              },
            ]}
            onPress={() => setUnstakeMethod('instant')}
          >
            <View style={styles.methodHeader}>
              <LinearGradient colors={['#F59E0B', '#F97316']} style={styles.methodIcon}>
                <Zap size={18} color="#FFFFFF" />
              </LinearGradient>
              <Text style={styles.methodTitle}>Instant Unstake</Text>
            </View>
            <Text style={styles.methodDescription}>
              Swap stAPT for APT instantly via DEX. Small liquidity fee applies (~0.3%).
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.methodCard,
              unstakeMethod === 'delayed' && {
                ...styles.methodCardActive,
                borderColor: pageAccent.primary,
                shadowColor: pageAccent.primary,
              },
            ]}
            onPress={() => setUnstakeMethod('delayed')}
          >
            <View style={styles.methodHeader}>
              <LinearGradient colors={['#38BDF8', '#2563EB']} style={styles.methodIcon}>
                <Clock size={18} color="#FFFFFF" />
              </LinearGradient>
              <Text style={styles.methodTitle}>Delayed Unstake</Text>
            </View>
            <Text style={styles.methodDescription}>
              14-day unbonding period with zero fees. Claim APT once the waiting period ends.
            </Text>
          </Pressable>
        </View>
      )}

      <LinearGradient
        colors={['#050608', '#050608'] as const}
        style={styles.infoCard}
      >
        <Info size={18} color={pageAccent.primary} />
        <Text style={styles.infoText}>
          {mode === 'stake' &&
            'Stake APT to receive amAPT (1:1). amAPT stays liquid for DeFi composability while earning staking rewards.'}
          {mode === 'vault' &&
            'Deposit amAPT into the auto-compounding stAPT vault to maximise yield. Rewards accrue every epoch.'}
          {mode === 'unstake' && unstakeMethod === 'instant' &&
            'Instant unstake uses DEX liquidity for immediate exit. Great for speed, includes a small market fee.'}
          {mode === 'unstake' && unstakeMethod === 'delayed' &&
            'Delayed unstake avoids fees and redeems 1:1 after the 14-day unbonding period. Claim when it unlocks.'}
        </Text>
      </LinearGradient>

      <View style={styles.actionBlock}>
        <GradientPillButton
          title={
            loading
              ? 'Processing...'
              : mode === 'stake'
              ? 'Stake APT'
              : mode === 'vault'
              ? 'Enter Vault'
              : unstakeMethod === 'instant'
              ? 'Instant Unstake'
              : 'Request Unstake'
          }
          onPress={handleStake}
          disabled={loading || !validation.valid}
          style={styles.ctaButton}
          accent="blue"
        />
        {!validation.valid && validation.error && (
          <Text style={styles.errorText}>{validation.error}</Text>
        )}
        <Text style={styles.feeText}>Estimated fee ~{estimatedFee.toFixed(4)} APT</Text>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Powered by{' '}
          <Text style={{
            color: pageAccent.primary,
            fontFamily: 'Inter-SemiBold',
          }}>
            Amnis Finance
          </Text>
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050608',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  disconnectedContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  disconnectedCard: {
    width: '90%',
    maxWidth: 360,
    borderRadius: 28,
    paddingVertical: 32,
    paddingHorizontal: 28,
    alignItems: 'center',
    gap: 14,
  },
  disconnectedTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
  },
  disconnectedSubtitle: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  headerRow: {
    marginBottom: 20,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 13,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 18,
  },
  statCard: {
    flex: 1,
    borderRadius: 20,
    padding: 18,
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  statIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    marginBottom: 6,
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
  },
  glassCard: {
    backgroundColor: 'transparent',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  segmentedContainer: {
    backgroundColor: 'transparent',
  },
  balanceCard: {
    borderRadius: 22,
    padding: 18,
    marginBottom: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceLabel: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 12,
    marginBottom: 6,
  },
  balanceValue: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  refreshButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(124,92,255,0.18)',
  },
  refreshText: {
    fontSize: 12,
    fontWeight: '600',
  },
  inputCard: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  inputLabel: {
    color: 'rgba(255,255,255,0.68)',
    fontWeight: '600',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    backgroundColor: 'rgba(5,10,26,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(124,92,255,0.22)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 14,
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  inputSuffix: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 13,
    marginLeft: 12,
  },
  quickButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  quickButton: {
    flex: 1,
    backgroundColor: 'rgba(12,21,41,0.8)',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(64,82,128,0.4)',
  },
  quickButtonText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '600',
  },
  outputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(76, 194, 255, 0.1)',
  },
  outputText: {
    color: '#E0F2FF',
    fontSize: 12,
  },
  methodGroup: {
    marginBottom: 18,
    gap: 12,
  },
  methodCard: {
    borderRadius: 18,
    padding: 18,
    backgroundColor: 'rgba(15,21,40,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(61,86,140,0.25)',
  },
  methodCardActive: {
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 8,
  },
  methodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  methodIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  methodDescription: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 13,
    lineHeight: 18,
  },
  infoCard: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 22,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  infoText: {
    color: '#E4E9FF',
    fontSize: 13,
    lineHeight: 20,
    flex: 1,
  },
  actionBlock: {
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  ctaButton: {
    alignSelf: 'stretch',
  },
  errorText: {
    color: '#F87171',
    fontSize: 12,
  },
  feeText: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 8,
  },
  footerText: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 11,
    textAlign: 'center',
    fontFamily: 'Inter-Medium',
  },
});
