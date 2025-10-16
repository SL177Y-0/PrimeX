/**
 * Borrow Modal Component
 * 
 * Allows users to borrow assets from Aries Protocol against their supplied collateral
 * Features health factor simulation, borrowing power display, and safety checks
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
import { TrendingDown, AlertCircle, CheckCircle, Shield, Activity } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeProvider';
import { useResponsive } from '../hooks/useResponsive';
import { ModalSheet } from './ModalSheet';
import { GradientPillButton } from './GradientPillButton';
import { useBorrow } from '../hooks/useAriesActions';
import { validateBorrow, formatAmount } from '../utils/ariesValidation';
import {
  simulateHealthFactorChange,
  calculateMaxSafeAmount,
  getHealthFactorColor,
  formatHealthFactor,
} from '../utils/healthFactorSimulation';
import { PAGE_ACCENTS } from '../theme/pageAccents';
import type { AriesReserve, UserPortfolio } from '../types/aries';

interface BorrowModalProps {
  visible: boolean;
  reserve: AriesReserve | null;
  userPortfolio: UserPortfolio | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function BorrowModal({
  visible,
  reserve,
  userPortfolio,
  onClose,
  onSuccess,
}: BorrowModalProps) {
  const { theme } = useTheme();
  const { spacing, fontSize } = useResponsive();
  const pageAccent = PAGE_ACCENTS.LEND;

  const [amount, setAmount] = useState('');
  const { borrow, loading, error, reset } = useBorrow(() => {
    setAmount('');
    onSuccess();
    onClose();
  });

  const validation = useMemo(() => {
    if (!reserve || !amount) return { isValid: false };
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return { isValid: false };
    return validateBorrow(reserve, numAmount, userPortfolio);
  }, [reserve, amount, userPortfolio]);

  const healthFactorSimulation = useMemo(() => {
    if (!reserve || !userPortfolio || !amount) return null;
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return null;
    return simulateHealthFactorChange(userPortfolio, 'borrow', reserve, numAmount);
  }, [reserve, userPortfolio, amount]);

  const maxSafeAmount = useMemo(() => {
    if (!reserve || !userPortfolio) return 0;
    return calculateMaxSafeAmount(userPortfolio, 'borrow', reserve, 1.5);
  }, [reserve, userPortfolio]);

  const availableLiquidity = useMemo(() => {
    if (!reserve) return 0;
    return parseFloat(reserve.totalCashAvailable) / Math.pow(10, reserve.decimals);
  }, [reserve]);

  const borrowAPR = useMemo(() => {
    if (!reserve) return 0;
    return reserve.borrowAPR;
  }, [reserve]);

  const estimatedYearlyCost = useMemo(() => {
    if (!reserve || !amount) return 0;
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) return 0;
    return (numAmount * borrowAPR / 100) * (reserve.priceUSD || 0);
  }, [amount, borrowAPR, reserve]);

  const handleMax = useCallback(() => {
    const max = Math.min(maxSafeAmount, availableLiquidity);
    setAmount(max.toFixed(6));
  }, [maxSafeAmount, availableLiquidity]);

  const handleBorrow = useCallback(async () => {
    if (!reserve) return;

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount');
      return;
    }

    if (!validation.isValid) {
      Alert.alert('Validation Error', validation.error || 'Invalid borrow amount');
      return;
    }

    if (validation.warning) {
      Alert.alert('Warning', validation.warning, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Continue', onPress: () => borrow(reserve, numAmount) },
      ]);
      return;
    }

    await borrow(reserve, numAmount);
  }, [reserve, amount, validation, borrow]);

  const handleClose = useCallback(() => {
    setAmount('');
    reset();
    onClose();
  }, [reset, onClose]);

  if (!reserve) return null;

  const hasCollateral = userPortfolio && userPortfolio.totalSuppliedUSD > 0;

  return (
    <ModalSheet
      isVisible={visible}
      onClose={handleClose}
      title={`Borrow ${reserve.symbol}`}
    >
      <View style={[styles.container, { gap: spacing.md }]}>
        {/* Collateral Check */}
        {!hasCollateral && (
          <View style={[styles.warningCard, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
            <AlertCircle size={20} color={theme.colors.negative} />
            <Text style={[styles.warningText, { color: theme.colors.negative }]}>
              You must supply collateral before borrowing
            </Text>
          </View>
        )}

        {/* Available Liquidity */}
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>
            Available Liquidity
          </Text>
          <Text style={[styles.infoValue, { color: theme.colors.textPrimary }]}>
            {formatAmount(availableLiquidity, 6)} {reserve.symbol}
          </Text>
        </View>

        {/* Max Safe Borrow */}
        {hasCollateral && (
          <View style={styles.infoRow}>
            <View style={styles.infoLeft}>
              <Shield size={16} color={pageAccent.primary} />
              <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>
                Max Safe Borrow (HF ≥ 1.5)
              </Text>
            </View>
            <Text style={[styles.infoValue, { color: pageAccent.primary }]}>
              {formatAmount(maxSafeAmount, 6)} {reserve.symbol}
            </Text>
          </View>
        )}

        {/* Amount Input */}
        <View style={styles.inputContainer}>
          <Text style={[styles.inputLabel, { color: theme.colors.textPrimary }]}>
            Amount
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
              editable={!loading && !!hasCollateral}
            />
            <View style={styles.inputRight}>
              <Pressable
                onPress={handleMax}
                style={[styles.maxButton, { backgroundColor: pageAccent.light }]}
                disabled={loading || !hasCollateral}
              >
                <Text style={[styles.maxButtonText, { color: pageAccent.primary }]}>
                  SAFE MAX
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

        {/* Health Factor Preview */}
        {healthFactorSimulation && userPortfolio && (
          <LinearGradient
            colors={['rgba(124, 58, 237, 0.1)', 'rgba(59, 130, 246, 0.1)'] as any}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hfCard}
          >
            <View style={styles.hfHeader}>
              <Activity size={18} color={pageAccent.primary} />
              <Text style={[styles.hfTitle, { color: theme.colors.textPrimary }]}>
                Health Factor
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
              <Text style={[styles.hfArrow, { color: theme.colors.textSecondary }]}>→</Text>
              <View style={styles.hfItem}>
                <Text style={[styles.hfLabel, { color: theme.colors.textSecondary }]}>
                  Projected
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
              {healthFactorSimulation.safetyLevel === 'safe' && '✓ Safe position'}
              {healthFactorSimulation.safetyLevel === 'warning' && '⚠️ Moderate risk'}
              {healthFactorSimulation.safetyLevel === 'danger' && '⛔ High risk - liquidation possible'}
            </Text>
          </LinearGradient>
        )}

        {/* APR Info */}
        <LinearGradient
          colors={['rgba(239, 68, 68, 0.2)', 'rgba(220, 38, 38, 0.1)'] as any}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.aprCard}
        >
          <View style={styles.aprHeader}>
            <TrendingDown size={20} color={theme.colors.negative} />
            <Text style={[styles.aprTitle, { color: theme.colors.textPrimary }]}>
              Borrow APR
            </Text>
          </View>
          <Text style={[styles.aprValue, { color: theme.colors.negative }]}>
            {borrowAPR.toFixed(2)}%
          </Text>
          {amount && parseFloat(amount) > 0 && (
            <Text style={[styles.aprSubtext, { color: theme.colors.textSecondary }]}>
              Est. ${estimatedYearlyCost.toFixed(2)}/year interest
            </Text>
          )}
        </LinearGradient>

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
            title={loading ? 'Borrowing...' : 'Borrow'}
            onPress={handleBorrow}
            disabled={!validation.isValid || loading || !hasCollateral}
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
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
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
  infoLabel: {
    fontSize: 13,
  },
  infoValue: {
    fontSize: 14,
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
  hfArrow: {
    fontSize: 24,
  },
  hfSubtext: {
    fontSize: 12,
    textAlign: 'center',
  },
  aprCard: {
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  aprHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  aprTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  aprValue: {
    fontSize: 28,
    fontWeight: '700',
  },
  aprSubtext: {
    fontSize: 13,
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
