/**
 * Withdraw Modal for Aries Lending
 * Handles asset withdrawals with borrow capability and health factor preview
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { X, TrendingDown, AlertCircle, Info } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { useAriesLendingComplete, AriesReserve } from '../../hooks/useAriesLendingComplete';
import { formatHealthFactor, getHealthFactorColor } from '../../utils/ariesRiskCalculations';
import { Card } from '../Card';

interface WithdrawModalProps {
  visible: boolean;
  reserve: AriesReserve | null;
  onClose: () => void;
}

export default function WithdrawModal({ visible, reserve, onClose }: WithdrawModalProps) {
  const { theme } = useTheme();
  const { withdraw, portfolio, getMaxWithdraw, simulateWithdraw, txPending } = useAriesLendingComplete();
  
  const [amount, setAmount] = useState('');
  const [allowBorrow, setAllowBorrow] = useState(false);
  
  // Parse amount
  const numericAmount = useMemo(() => {
    const parsed = parseFloat(amount || '0');
    return isNaN(parsed) ? 0 : parsed;
  }, [amount]);
  
  // Get max withdrawable amount
  const maxWithdraw = useMemo(() => {
    if (!reserve) return 0;
    return getMaxWithdraw(reserve.coinType);
  }, [reserve, getMaxWithdraw]);
  
  // Calculate new health factor after withdrawal
  const newHealthFactor = useMemo(() => {
    if (!portfolio || !reserve || numericAmount === 0) {
      return portfolio?.riskMetrics.healthFactor ?? Infinity;
    }
    
    const simulated = simulateWithdraw(reserve.coinType, numericAmount);
    return simulated?.healthFactor ?? portfolio.riskMetrics.healthFactor;
  }, [portfolio, reserve, numericAmount, simulateWithdraw]);
  
  // User's current position in this asset
  const userPosition = useMemo(() => {
    if (!portfolio || !reserve) return null;
    return portfolio.deposits.find(d => d.coinType === reserve.coinType);
  }, [portfolio, reserve]);
  
  // Validation
  const validation = useMemo(() => {
    if (!reserve) return { valid: false, message: 'No reserve selected' };
    if (numericAmount === 0) return { valid: false, message: 'Enter amount' };
    if (numericAmount < 0) return { valid: false, message: 'Invalid amount' };
    
    if (userPosition && numericAmount > userPosition.amount) {
      if (!allowBorrow) {
        return { valid: false, message: 'Insufficient balance (enable borrow to continue)' };
      }
    }
    
    if (newHealthFactor < 1.0 && portfolio && portfolio.riskMetrics.totalBorrowedUSD > 0) {
      return { valid: false, message: 'This withdrawal would make your position liquidatable' };
    }
    
    return { valid: true, message: '' };
  }, [reserve, numericAmount, userPosition, allowBorrow, newHealthFactor, portfolio]);
  
  // Handle submit
  const handleSubmit = async () => {
    if (!reserve || !validation.valid) return;
    
    try {
      // Convert to base units
      const baseAmount = Math.floor(numericAmount * Math.pow(10, reserve.decimals)).toString();
      
      await withdraw({
        coinType: reserve.coinType,
        profileName: 'default',
        amount: baseAmount,
        allowBorrow,
        priceUpdatePayloads: [],
      });
      
      // Success
      setAmount('');
      onClose();
    } catch (error: any) {
      console.error('[WithdrawModal] Transaction failed:', error);
    }
  };
  
  const healthColor = getHealthFactorColor(newHealthFactor);
  const healthColorValue =
    healthColor === 'success'
      ? theme.colors.green
      : healthColor === 'warning'
      ? theme.colors.orange
      : theme.colors.red;
  
  if (!reserve) return null;
  
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <TrendingDown size={24} color={theme.colors.orange} />
              <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
                Withdraw {reserve.symbol}
              </Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <X size={24} color={theme.colors.textSecondary} />
            </Pressable>
          </View>
          
          {/* Available Balance */}
          {userPosition && (
            <View style={[styles.balanceCard, { backgroundColor: theme.colors.bg }]}>
              <Text style={[styles.balanceLabel, { color: theme.colors.textSecondary }]}>
                Available to Withdraw
              </Text>
              <Text style={[styles.balanceValue, { color: theme.colors.textPrimary }]}>
                {userPosition.amount.toFixed(4)} {reserve.symbol}
              </Text>
              <Text style={[styles.balanceUSD, { color: theme.colors.textSecondary }]}>
                ≈ ${(userPosition.amount * reserve.priceUSD).toLocaleString()}
              </Text>
            </View>
          )}
          
          {/* Amount Input */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
              Amount
            </Text>
            <View style={[styles.inputContainer, { backgroundColor: theme.colors.bg }]}>
              <TextInput
                style={[styles.input, { color: theme.colors.textPrimary }]}
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="decimal-pad"
                editable={!txPending}
              />
              <View style={styles.inputRight}>
                <Text style={[styles.inputSymbol, { color: theme.colors.textPrimary }]}>
                  {reserve.symbol}
                </Text>
                <Pressable
                  style={[styles.maxButton, { backgroundColor: theme.colors.purple }]}
                  onPress={() => {
                    if (maxWithdraw > 0) {
                      setAmount(maxWithdraw.toFixed(8));
                    }
                  }}
                >
                  <Text style={styles.maxButtonText}>MAX</Text>
                </Pressable>
              </View>
            </View>
            {numericAmount > 0 && (
              <Text style={[styles.usdValue, { color: theme.colors.textSecondary }]}>
                ≈ ${(numericAmount * reserve.priceUSD).toLocaleString()}
              </Text>
            )}
          </View>
          
          {/* Borrow Toggle */}
          <Pressable
            style={styles.borrowToggle}
            onPress={() => setAllowBorrow(!allowBorrow)}
          >
            <View>
              <Text style={[styles.borrowTitle, { color: theme.colors.textPrimary }]}>
                Enable Borrowing
              </Text>
              <Text style={[styles.borrowDescription, { color: theme.colors.textSecondary }]}>
                {allowBorrow 
                  ? 'Will borrow if withdrawal exceeds balance' 
                  : 'Can only withdraw up to available balance'}
              </Text>
            </View>
            <View
              style={[
                styles.toggle,
                {
                  backgroundColor: allowBorrow ? theme.colors.orange : theme.colors.chip,
                },
              ]}
            >
              <View
                style={[
                  styles.toggleIndicator,
                  {
                    transform: [{ translateX: allowBorrow ? 18 : 0 }],
                  },
                ]}
              />
            </View>
          </Pressable>
          
          {/* Health Factor Preview */}
          {portfolio && portfolio.riskMetrics.totalBorrowedUSD > 0 && (
            <Card style={styles.healthCard}>
              <View style={styles.healthRow}>
                <Text style={[styles.healthLabel, { color: theme.colors.textSecondary }]}>
                  Current Health Factor
                </Text>
                <Text style={[styles.healthValue, { color: theme.colors.textPrimary }]}>
                  {formatHealthFactor(portfolio.riskMetrics.healthFactor)}
                </Text>
              </View>
              <View style={styles.healthRow}>
                <Text style={[styles.healthLabel, { color: theme.colors.textSecondary }]}>
                  New Health Factor
                </Text>
                <Text style={[styles.healthValue, { color: healthColorValue }]}>
                  {formatHealthFactor(newHealthFactor)}
                </Text>
              </View>
            </Card>
          )}
          
          {/* Risk Warning */}
          {newHealthFactor < 1.2 && newHealthFactor !== Infinity && (
            <View style={[styles.warningCard, { backgroundColor: `${theme.colors.red}10` }]}>
              <AlertCircle size={16} color={theme.colors.red} />
              <Text style={[styles.warningText, { color: theme.colors.red }]}>
                WARNING: This withdrawal brings you close to liquidation!
              </Text>
            </View>
          )}
          
          {/* Validation Error */}
          {!validation.valid && amount.length > 0 && (
            <View style={[styles.errorCard, { backgroundColor: `${theme.colors.red}10` }]}>
              <AlertCircle size={16} color={theme.colors.red} />
              <Text style={[styles.errorText, { color: theme.colors.red }]}>
                {validation.message}
              </Text>
            </View>
          )}
          
          {/* Info */}
          <View style={[styles.infoCard, { backgroundColor: theme.colors.bg }]}>
            <Info size={14} color={theme.colors.textSecondary} />
            <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
              {allowBorrow 
                ? 'If withdrawal exceeds balance, the difference will be borrowed' 
                : 'You can only withdraw up to your available balance'}
            </Text>
          </View>
          
          {/* Submit Button */}
          <Pressable
            style={[
              styles.submitButton,
              {
                backgroundColor: validation.valid ? theme.colors.orange : theme.colors.chip,
              },
            ]}
            onPress={handleSubmit}
            disabled={!validation.valid || txPending}
          >
            {txPending ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>
                Withdraw {reserve.symbol}
              </Text>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  balanceCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  balanceLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  balanceValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  balanceUSD: {
    fontSize: 14,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
  },
  input: {
    flex: 1,
    fontSize: 24,
    fontWeight: '600',
  },
  inputRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  inputSymbol: {
    fontSize: 16,
    fontWeight: '600',
  },
  maxButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  maxButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  usdValue: {
    fontSize: 14,
    marginTop: 8,
  },
  borrowToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    marginBottom: 16,
  },
  borrowTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  borrowDescription: {
    fontSize: 12,
  },
  toggle: {
    width: 44,
    height: 26,
    borderRadius: 13,
    padding: 2,
  },
  toggleIndicator: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
  },
  healthCard: {
    padding: 16,
    marginBottom: 16,
  },
  healthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  healthLabel: {
    fontSize: 14,
  },
  healthValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  warningText: {
    fontSize: 12,
    flex: 1,
    fontWeight: '600',
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    fontSize: 12,
    flex: 1,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
    gap: 8,
  },
  infoText: {
    fontSize: 11,
    flex: 1,
  },
  submitButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
