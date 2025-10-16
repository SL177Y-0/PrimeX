/**
 * Withdraw Modal Component
 * 
 * Allows users to withdraw supplied assets from Aries Protocol
 * Features health factor protection and safe withdrawal limits
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
import { CheckCircle, AlertCircle, Activity, Shield, ArrowDownCircle } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeProvider';
import { useResponsive } from '../hooks/useResponsive';
import { ModalSheet } from './ModalSheet';
import { GradientPillButton } from './GradientPillButton';
import { useWithdraw } from '../hooks/useAriesActions';
import { validateWithdraw, formatAmount } from '../utils/ariesValidation';
import {
  simulateHealthFactorChange,
  calculateMaxSafeAmount,
  getHealthFactorColor,
  formatHealthFactor,
} from '../utils/healthFactorSimulation';
import { PAGE_ACCENTS } from '../theme/pageAccents';
import type { AriesReserve, UserPortfolio } from '../types/aries';

interface WithdrawModalProps {
  visible: boolean;
  reserve: AriesReserve | null;
  suppliedAmount: number;
  userPortfolio: UserPortfolio | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function WithdrawModal({
  visible,
  reserve,
  suppliedAmount,
  userPortfolio,
  onClose,
  onSuccess,
}: WithdrawModalProps) {
  const { theme } = useTheme();
  const { spacing, fontSize } = useResponsive();
  const pageAccent = PAGE_ACCENTS.LEND;

  const [amount, setAmount] = useState('');
  const { withdraw, loading, error, reset } = useWithdraw(() => {
    setAmount('');
    onSuccess();
    onClose();
  });

  const validation = useMemo(() => {
    if (!reserve || !amount) return { isValid: false };
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return { isValid: false };
    return validateWithdraw(reserve, numAmount, suppliedAmount, userPortfolio);
  }, [reserve, amount, suppliedAmount, userPortfolio]);

  const healthFactorSimulation = useMemo(() => {
    if (!reserve || !userPortfolio || !amount || userPortfolio.totalBorrowedUSD === 0) return null;
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return null;
    return simulateHealthFactorChange(userPortfolio, 'withdraw', reserve, numAmount);
  }, [reserve, userPortfolio, amount]);

  const maxSafeAmount = useMemo(() => {
    if (!reserve || !userPortfolio || userPortfolio.totalBorrowedUSD === 0) {
      return suppliedAmount; // Can withdraw everything if no borrows
    }
    return calculateMaxSafeAmount(userPortfolio, 'withdraw', reserve, 1.5);
  }, [reserve, userPortfolio, suppliedAmount]);

  const hasBorrows = userPortfolio && userPortfolio.totalBorrowedUSD > 0;

  const handleMax = useCallback(() => {
    if (hasBorrows) {
      const safe = Math.min(maxSafeAmount, suppliedAmount);
      setAmount(safe.toFixed(6));
    } else {
      setAmount(suppliedAmount.toString());
    }
  }, [hasBorrows, maxSafeAmount, suppliedAmount]);

  const handleWithdraw = useCallback(async () => {
    if (!reserve) return;

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount');
      return;
    }

    if (!validation.isValid) {
      Alert.alert('Validation Error', validation.error || 'Invalid withdraw amount');
      return;
    }

    if (validation.warning) {
      Alert.alert('Warning', validation.warning, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Continue', onPress: () => withdraw(reserve, numAmount) },
      ]);
      return;
    }

    await withdraw(reserve, numAmount);
  }, [reserve, amount, validation, withdraw]);

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
      title={`Withdraw ${reserve.symbol}`}
    >
      <View style={[styles.container, { gap: spacing.md }]}>
        {/* Supplied Amount Display */}
        <View style={styles.infoCard}>
          <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>
            Your Supplied Amount
          </Text>
          <Text style={[styles.infoValue, { color: pageAccent.primary }]}>
            {formatAmount(suppliedAmount, 6)} {reserve.symbol}
          </Text>
          <Text style={[styles.infoSubtext, { color: theme.colors.textSecondary }]}>
            ${(suppliedAmount * (reserve.priceUSD || 0)).toFixed(2)} USD
          </Text>
        </View>

        {/* Max Safe Withdraw (if has borrows) */}
        {hasBorrows && (
          <View style={styles.infoRow}>
            <View style={styles.infoLeft}>
              <Shield size={16} color={theme.colors.positive} />
              <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>
                Max Safe Withdraw (HF ≥ 1.5)
              </Text>
            </View>
            <Text style={[styles.infoValue, { color: theme.colors.positive }]}>
              {formatAmount(maxSafeAmount, 6)} {reserve.symbol}
            </Text>
          </View>
        )}

        {/* Amount Input */}
        <View style={styles.inputContainer}>
          <Text style={[styles.inputLabel, { color: theme.colors.textPrimary }]}>
            Amount to Withdraw
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
                  {hasBorrows ? 'SAFE MAX' : 'MAX'}
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
              Ready to withdraw
            </Text>
          </View>
        )}

        {/* Health Factor Preview (if has borrows) */}
        {healthFactorSimulation && userPortfolio && hasBorrows && (
          <LinearGradient
            colors={['rgba(124, 58, 237, 0.1)', 'rgba(59, 130, 246, 0.1)'] as any}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hfCard}
          >
            <View style={styles.hfHeader}>
              <Activity size={18} color={pageAccent.primary} />
              <Text style={[styles.hfTitle, { color: theme.colors.textPrimary }]}>
                Health Factor Impact
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
              <ArrowDownCircle size={24} color={theme.colors.textSecondary} />
              <View style={styles.hfItem}>
                <Text style={[styles.hfLabel, { color: theme.colors.textSecondary }]}>
                  After Withdraw
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
            <Text style={[styles.hfSubtext, { color: theme.colors.textSecondary }]}>
              {healthFactorSimulation.safetyLevel === 'safe' && '✓ Safe withdrawal'}
              {healthFactorSimulation.safetyLevel === 'warning' && '⚠️ Moderate risk'}
              {healthFactorSimulation.safetyLevel === 'danger' && '⛔ High risk - consider withdrawing less'}
            </Text>
          </LinearGradient>
        )}

        {/* No Borrows - Safe to Withdraw All */}
        {!hasBorrows && amount && validation.isValid && (
          <View style={[styles.safeCard, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
            <CheckCircle size={20} color={theme.colors.positive} />
            <Text style={[styles.safeText, { color: theme.colors.positive }]}>
              No active borrows - safe to withdraw any amount
            </Text>
          </View>
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
            title={loading ? 'Withdrawing...' : 'Withdraw'}
            onPress={handleWithdraw}
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
    backgroundColor: 'rgba(124, 58, 237, 0.05)',
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
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
    fontSize: 11,
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
  safeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
  },
  safeText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
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
