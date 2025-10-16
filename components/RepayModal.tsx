/**
 * Repay Modal Component
 * 
 * Allows users to repay borrowed assets
 * Features health factor improvement preview and balance checking
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CheckCircle, Wallet, AlertCircle, Activity, TrendingUp } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeProvider';
import { useResponsive } from '../hooks/useResponsive';
import { ModalSheet } from './ModalSheet';
import { GradientPillButton } from './GradientPillButton';
import { useRepay } from '../hooks/useAriesActions';
import { validateRepay, formatAmount } from '../utils/ariesValidation';
import {
  simulateHealthFactorChange,
  getHealthFactorColor,
  formatHealthFactor,
} from '../utils/healthFactorSimulation';
import { PAGE_ACCENTS } from '../theme/pageAccents';
import type { AriesReserve, UserPortfolio } from '../types/aries';

interface RepayModalProps {
  visible: boolean;
  reserve: AriesReserve | null;
  userBalance: number;
  borrowedAmount: number;
  userPortfolio: UserPortfolio | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function RepayModal({
  visible,
  reserve,
  userBalance,
  borrowedAmount,
  userPortfolio,
  onClose,
  onSuccess,
}: RepayModalProps) {
  const { theme } = useTheme();
  const { spacing, fontSize } = useResponsive();
  const pageAccent = PAGE_ACCENTS.LEND;

  const [amount, setAmount] = useState('');
  const { repay, loading, error, reset } = useRepay(() => {
    setAmount('');
    onSuccess();
    onClose();
  });

  const validation = useMemo(() => {
    if (!reserve || !amount) return { isValid: false };
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return { isValid: false };
    return validateRepay(reserve, numAmount, userBalance, borrowedAmount);
  }, [reserve, amount, userBalance, borrowedAmount]);

  const healthFactorSimulation = useMemo(() => {
    if (!reserve || !userPortfolio || !amount) return null;
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return null;
    return simulateHealthFactorChange(userPortfolio, 'repay', reserve, numAmount);
  }, [reserve, userPortfolio, amount]);

  const handleMax = useCallback(() => {
    const max = Math.min(userBalance, borrowedAmount);
    setAmount(max.toString());
  }, [userBalance, borrowedAmount]);

  const handleRepay = useCallback(async () => {
    if (!reserve) return;

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount');
      return;
    }

    if (!validation.isValid) {
      Alert.alert('Validation Error', validation.error || 'Invalid repay amount');
      return;
    }

    if (validation.warning) {
      Alert.alert('Notice', validation.warning, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Continue', onPress: () => repay(reserve, numAmount) },
      ]);
      return;
    }

    await repay(reserve, numAmount);
  }, [reserve, amount, validation, repay]);

  const handleClose = useCallback(() => {
    setAmount('');
    reset();
    onClose();
  }, [reset, onClose]);

  if (!reserve) return null;

  return (
    <ModalSheet
      isVisible={visible}
      onClose={handleClose}
      title={`Repay ${reserve.symbol}`}
    >
      <View style={[styles.container, { gap: spacing.md }]}>
        {/* Borrowed Amount Display */}
        <View style={styles.infoCard}>
          <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>
            Your Borrowed Amount
          </Text>
          <Text style={[styles.infoValue, { color: theme.colors.negative }]}>
            {formatAmount(borrowedAmount, 6)} {reserve.symbol}
          </Text>
          <Text style={[styles.infoSubtext, { color: theme.colors.textSecondary }]}>
            ${(borrowedAmount * (reserve.priceUSD || 0)).toFixed(2)} USD
          </Text>
        </View>

        {/* Wallet Balance */}
        <View style={styles.balanceRow}>
          <View style={styles.balanceLeft}>
            <Wallet size={18} color={theme.colors.textSecondary} />
            <Text style={[styles.balanceLabel, { color: theme.colors.textSecondary }]}>
              Wallet Balance
            </Text>
          </View>
          <Text style={[styles.balanceValue, { color: theme.colors.textPrimary }]}>
            {formatAmount(userBalance, 6)} {reserve.symbol}
          </Text>
        </View>

        {/* Amount Input */}
        <View style={styles.inputContainer}>
          <Text style={[styles.inputLabel, { color: theme.colors.textPrimary }]}>
            Amount to Repay
          </Text>
          <View style={[styles.inputRow, { backgroundColor: theme.colors.surface }]}>
            <TextInput
              style={[
                styles.input,
                {
                  color: theme.colors.textPrimary,
                  fontSize: fontSize.lg,
                },
              ]}
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              placeholderTextColor={theme.colors.textSecondary}
              keyboardType="decimal-pad"
              editable={!loading}
            />
            <View style={styles.inputRight}>
              <Pressable
                onPress={handleMax}
                style={[styles.maxButton, { backgroundColor: pageAccent.light }]}
                disabled={loading}
              >
                <Text style={[styles.maxButtonText, { color: pageAccent.primary }]}>
                  MAX
                </Text>
              </Pressable>
              <Text style={[styles.assetSymbol, { color: theme.colors.textPrimary }]}>
                {reserve.symbol}
              </Text>
            </View>
          </View>
        </View>

        {/* Validation Feedback */}
        {amount && validation.error && (
          <View style={[styles.feedbackRow, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
            <AlertCircle size={16} color={theme.colors.negative} />
            <Text style={[styles.feedbackText, { color: theme.colors.negative }]}>
              {validation.error}
            </Text>
          </View>
        )}

        {amount && validation.warning && validation.isValid && (
          <View style={[styles.feedbackRow, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
            <AlertCircle size={16} color={theme.colors.orange} />
            <Text style={[styles.feedbackText, { color: theme.colors.orange }]}>
              {validation.warning}
            </Text>
          </View>
        )}

        {amount && validation.isValid && !validation.warning && (
          <View style={[styles.feedbackRow, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
            <CheckCircle size={16} color={theme.colors.positive} />
            <Text style={[styles.feedbackText, { color: theme.colors.positive }]}>
              Ready to repay
            </Text>
          </View>
        )}

        {/* Health Factor Improvement */}
        {healthFactorSimulation && userPortfolio && userPortfolio.totalBorrowedUSD > 0 && (
          <LinearGradient
            colors={['rgba(16, 185, 129, 0.15)', 'rgba(5, 150, 105, 0.1)'] as any}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hfCard}
          >
            <View style={styles.hfHeader}>
              <Activity size={18} color={theme.colors.positive} />
              <Text style={[styles.hfTitle, { color: theme.colors.textPrimary }]}>
                Health Factor Improvement
              </Text>
            </View>
            <View style={styles.hfRow}>
              <View style={styles.hfItem}>
                <Text style={[styles.hfLabel, { color: theme.colors.textSecondary }]}>
                  Current
                </Text>
                <Text
                  style={[
                    styles.hfValue,
                    { color: getHealthFactorColor(userPortfolio.healthFactor) },
                  ]}
                >
                  {formatHealthFactor(userPortfolio.healthFactor)}
                </Text>
              </View>
              <TrendingUp size={24} color={theme.colors.positive} />
              <View style={styles.hfItem}>
                <Text style={[styles.hfLabel, { color: theme.colors.textSecondary }]}>
                  After Repay
                </Text>
                <Text
                  style={[
                    styles.hfValue,
                    { color: getHealthFactorColor(healthFactorSimulation.projectedHealthFactor) },
                  ]}
                >
                  {formatHealthFactor(healthFactorSimulation.projectedHealthFactor)}
                </Text>
              </View>
            </View>
            <Text style={[styles.hfSubtext, { color: theme.colors.positive }]}>
              ✓ Reducing liquidation risk
            </Text>
          </LinearGradient>
        )}

        {/* Transaction Error */}
        {error && (
          <View style={[styles.errorContainer, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
            <AlertCircle size={18} color={theme.colors.negative} />
            <Text style={[styles.errorText, { color: theme.colors.negative }]}>
              {error}
            </Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.buttonRow}>
          <Pressable
            onPress={handleClose}
            style={[styles.cancelButton, { backgroundColor: theme.colors.surface }]}
            disabled={loading}
          >
            <Text style={[styles.cancelButtonText, { color: theme.colors.textPrimary }]}>
              Cancel
            </Text>
          </Pressable>

          <GradientPillButton
            title={loading ? 'Repaying...' : 'Repay'}
            onPress={handleRepay}
            disabled={!validation.isValid || loading}
            style={styles.confirmButton}
          />
        </View>

        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={pageAccent.primary} />
            <Text style={[styles.loadingText, { color: theme.colors.textPrimary }]}>
              Processing transaction...
            </Text>
          </View>
        )}
      </View>
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  infoCard: {
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 4,
  },
  infoLabel: {
    fontSize: 13,
  },
  infoValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  infoSubtext: {
    fontSize: 13,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  balanceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  balanceLabel: {
    fontSize: 14,
  },
  balanceValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  inputContainer: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
  },
  inputRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  maxButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  maxButtonText: {
    fontSize: 12,
    fontWeight: '700',
  },
  assetSymbol: {
    fontSize: 16,
    fontWeight: '600',
  },
  feedbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
  },
  feedbackText: {
    fontSize: 13,
    flex: 1,
  },
  hfCard: {
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  hfHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hfTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  hfRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  hfItem: {
    alignItems: 'center',
    gap: 4,
  },
  hfLabel: {
    fontSize: 12,
  },
  hfValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  hfSubtext: {
    fontSize: 12,
    textAlign: 'center',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
  },
  errorText: {
    fontSize: 13,
    flex: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderRadius: 12,
  },
  loadingText: {
    fontSize: 14,
  },
});
