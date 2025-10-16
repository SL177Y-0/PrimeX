/**
 * Supply Modal Component
 * 
 * Allows users to supply assets to Aries Protocol
 * Features validation, APR display, and real-time balance checking
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
import { X, TrendingUp, Wallet, AlertCircle, CheckCircle } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeProvider';
import { useResponsive } from '../hooks/useResponsive';
import { ModalSheet } from './ModalSheet';
import { GradientPillButton } from './GradientPillButton';
import { useSupply } from '../hooks/useAriesActions';
import { validateSupply, formatAmount } from '../utils/ariesValidation';
import { PAGE_ACCENTS } from '../theme/pageAccents';
import type { AriesReserve } from '../types/aries';

interface SupplyModalProps {
  visible: boolean;
  reserve: AriesReserve | null;
  userBalance: number;
  onClose: () => void;
  onSuccess: () => void;
}

export function SupplyModal({
  visible,
  reserve,
  userBalance,
  onClose,
  onSuccess,
}: SupplyModalProps) {
  const { theme } = useTheme();
  const { spacing, fontSize } = useResponsive();
  const pageAccent = PAGE_ACCENTS.LEND;

  const [amount, setAmount] = useState('');
  const { supply, loading, error, reset } = useSupply(() => {
    setAmount('');
    onSuccess();
    onClose();
  });

  const validation = useMemo(() => {
    if (!reserve || !amount) return { isValid: false };
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return { isValid: false };
    return validateSupply(reserve, numAmount, userBalance);
  }, [reserve, amount, userBalance]);

  const estimatedAPR = useMemo(() => {
    if (!reserve) return 0;
    return reserve.supplyAPR;
  }, [reserve]);

  const estimatedYearlyEarnings = useMemo(() => {
    if (!reserve || !amount) return 0;
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) return 0;
    return (numAmount * estimatedAPR / 100) * (reserve.priceUSD || 0);
  }, [amount, estimatedAPR, reserve]);

  const handleMax = useCallback(() => {
    setAmount(userBalance.toString());
  }, [userBalance]);

  const handleSupply = useCallback(async () => {
    if (!reserve) return;

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount');
      return;
    }

    if (!validation.isValid) {
      Alert.alert('Validation Error', validation.error || 'Invalid supply amount');
      return;
    }

    if (validation.warning) {
      Alert.alert('Warning', validation.warning, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Continue', onPress: () => supply(reserve, numAmount) },
      ]);
      return;
    }

    await supply(reserve, numAmount);
  }, [reserve, amount, validation, supply]);

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
      title={`Supply ${reserve.symbol}`}
    >
      <View style={[styles.container, { gap: spacing.md }]}>
        {/* Balance Display */}
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
              Ready to supply
            </Text>
          </View>
        )}

        {/* APR Info */}
        <LinearGradient
          colors={[pageAccent.from, pageAccent.to] as any}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.aprCard}
        >
          <View style={styles.aprHeader}>
            <TrendingUp size={20} color="#FFFFFF" />
            <Text style={styles.aprTitle}>Supply APR</Text>
          </View>
          <Text style={styles.aprValue}>{estimatedAPR.toFixed(2)}%</Text>
          {amount && parseFloat(amount) > 0 && (
            <Text style={styles.aprSubtext}>
              Est. ${estimatedYearlyEarnings.toFixed(2)}/year
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
            title={loading ? 'Supplying...' : 'Supply'}
            onPress={handleSupply}
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
    color: '#FFFFFF',
    fontWeight: '500',
  },
  aprValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  aprSubtext: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
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
