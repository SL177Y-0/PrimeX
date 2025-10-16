/**
 * Repay Modal for Aries Lending
 * Handles debt repayment with full/partial options
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
import { X, TrendingUp, AlertCircle, Info, CheckCircle } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { useAriesLendingComplete, AriesReserve } from '../../hooks/useAriesLendingComplete';
import { formatHealthFactor, getHealthFactorColor } from '../../utils/ariesRiskCalculations';
import { Card } from '../Card';

interface RepayModalProps {
  visible: boolean;
  reserve: AriesReserve | null;
  onClose: () => void;
}

export default function RepayModal({ visible, reserve, onClose }: RepayModalProps) {
  const { theme } = useTheme();
  const { supply, portfolio, txPending } = useAriesLendingComplete();
  
  const [amount, setAmount] = useState('');
  
  // Parse amount
  const numericAmount = useMemo(() => {
    const parsed = parseFloat(amount || '0');
    return isNaN(parsed) ? 0 : parsed;
  }, [amount]);
  
  // User's current borrow position
  const borrowPosition = useMemo(() => {
    if (!portfolio || !reserve) return null;
    return portfolio.borrows.find(b => b.coinType === reserve.coinType);
  }, [portfolio, reserve]);
  
  // Calculate new health factor after repay
  const newHealthFactor = useMemo(() => {
    if (!portfolio || !reserve || numericAmount === 0) {
      return portfolio?.riskMetrics.healthFactor ?? Infinity;
    }
    
    if (!borrowPosition) return portfolio.riskMetrics.healthFactor;
    
    // Estimate new health factor
    const repayValueUSD = numericAmount * reserve.priceUSD;
    const newTotalBorrowed = Math.max(0, portfolio.riskMetrics.totalBorrowedUSD - repayValueUSD);
    const liquidationValue = portfolio.riskMetrics.liquidationValue;
    
    if (newTotalBorrowed === 0) return Infinity;
    return liquidationValue / newTotalBorrowed;
  }, [portfolio, reserve, numericAmount, borrowPosition]);
  
  // Validation
  const validation = useMemo(() => {
    if (!reserve) return { valid: false, message: 'No reserve selected' };
    if (!borrowPosition) return { valid: false, message: 'No debt to repay' };
    if (numericAmount === 0) return { valid: false, message: 'Enter amount' };
    if (numericAmount < 0) return { valid: false, message: 'Invalid amount' };
    
    if (numericAmount > borrowPosition.amount) {
      return { valid: false, message: `Maximum repay: ${borrowPosition.amount.toFixed(4)} ${reserve.symbol}` };
    }
    
    // TODO: Check wallet balance
    
    return { valid: true, message: '' };
  }, [reserve, borrowPosition, numericAmount]);
  
  // Handle submit
  const handleSubmit = async () => {
    if (!reserve || !validation.valid) return;
    
    try {
      // Convert to base units
      const baseAmount = Math.floor(numericAmount * Math.pow(10, reserve.decimals)).toString();
      
      // Repay via deposit with repayOnly=true
      await supply({
        coinType: reserve.coinType,
        profileName: 'default',
        amount: baseAmount,
        repayOnly: true,
      });
      
      // Success
      setAmount('');
      onClose();
    } catch (error: any) {
      console.error('[RepayModal] Transaction failed:', error);
    }
  };
  
  const healthColor = getHealthFactorColor(newHealthFactor);
  const healthColorValue =
    healthColor === 'success'
      ? theme.colors.green
      : healthColor === 'warning'
      ? theme.colors.orange
      : theme.colors.red;
  
  // Check if this is a full repay
  const isFullRepay = borrowPosition && numericAmount >= borrowPosition.amount * 0.999;
  
  if (!reserve) return null;
  
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <TrendingUp size={24} color={theme.colors.green} />
              <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
                Repay {reserve.symbol}
              </Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <X size={24} color={theme.colors.textSecondary} />
            </Pressable>
          </View>
          
          {/* Current Debt */}
          {borrowPosition ? (
            <View style={[styles.debtCard, { backgroundColor: `${theme.colors.red}10` }]}>
              <Text style={[styles.debtLabel, { color: theme.colors.textSecondary }]}>
                Current Debt
              </Text>
              <Text style={[styles.debtValue, { color: theme.colors.red }]}>
                {borrowPosition.amount.toFixed(4)} {reserve.symbol}
              </Text>
              <Text style={[styles.debtUSD, { color: theme.colors.textSecondary }]}>
                ≈ ${(borrowPosition.amount * reserve.priceUSD).toLocaleString()}
              </Text>
            </View>
          ) : (
            <View style={[styles.noDebtCard, { backgroundColor: `${theme.colors.green}10` }]}>
              <CheckCircle size={24} color={theme.colors.green} />
              <Text style={[styles.noDebtText, { color: theme.colors.green }]}>
                No outstanding debt for this asset
              </Text>
            </View>
          )}
          
          {borrowPosition && (
            <>
              {/* Amount Input */}
              <View style={styles.section}>
                <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
                  Repay Amount
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
                        if (borrowPosition) {
                          setAmount(borrowPosition.amount.toFixed(8));
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
              
              {/* Quick Amounts */}
              <View style={styles.quickAmounts}>
                {[25, 50, 75, 100].map(percentage => (
                  <Pressable
                    key={percentage}
                    style={[styles.quickButton, { backgroundColor: theme.colors.chip }]}
                    onPress={() => {
                      const amount = (borrowPosition.amount * percentage) / 100;
                      setAmount(amount.toFixed(8));
                    }}
                  >
                    <Text style={[styles.quickButtonText, { color: theme.colors.textPrimary }]}>
                      {percentage}%
                    </Text>
                  </Pressable>
                ))}
              </View>
              
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
                  {numericAmount > 0 && (
                    <View style={styles.healthRow}>
                      <Text style={[styles.healthLabel, { color: theme.colors.textSecondary }]}>
                        Remaining Debt
                      </Text>
                      <Text style={[styles.healthValue, { color: theme.colors.textPrimary }]}>
                        {(borrowPosition.amount - numericAmount).toFixed(4)} {reserve.symbol}
                      </Text>
                    </View>
                  )}
                </Card>
              )}
              
              {/* Full Repay Success Message */}
              {isFullRepay && (
                <View style={[styles.successCard, { backgroundColor: `${theme.colors.green}10` }]}>
                  <CheckCircle size={16} color={theme.colors.green} />
                  <Text style={[styles.successText, { color: theme.colors.green }]}>
                    This will fully repay your debt and improve your health factor significantly!
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
                  Repaying debt reduces your borrow APR and improves your health factor
                </Text>
              </View>
              
              {/* Submit Button */}
              <Pressable
                style={[
                  styles.submitButton,
                  {
                    backgroundColor: validation.valid ? theme.colors.green : theme.colors.chip,
                  },
                ]}
                onPress={handleSubmit}
                disabled={!validation.valid || txPending}
              >
                {txPending ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitButtonText}>
                    Repay {reserve.symbol}
                  </Text>
                )}
              </Pressable>
            </>
          )}
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
  debtCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  debtLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  debtValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  debtUSD: {
    fontSize: 14,
  },
  noDebtCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    gap: 12,
  },
  noDebtText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  section: {
    marginBottom: 16,
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
  quickAmounts: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  quickButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  quickButtonText: {
    fontSize: 14,
    fontWeight: '600',
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
  successCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  successText: {
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
