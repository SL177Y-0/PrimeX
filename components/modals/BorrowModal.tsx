/**
 * Borrow Modal for Aries Lending
 * Handles borrowing with health factor preview and risk warnings
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
import { X, TrendingDown, AlertCircle, Info, AlertTriangle } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { useAriesLendingComplete, AriesReserve } from '../../hooks/useAriesLendingComplete';
import { formatHealthFactor, getHealthFactorColor } from '../../utils/ariesRiskCalculations';
import { Card } from '../Card';

interface BorrowModalProps {
  visible: boolean;
  reserve: AriesReserve | null;
  onClose: () => void;
}

export default function BorrowModal({ visible, reserve, onClose }: BorrowModalProps) {
  const { theme } = useTheme();
  const { withdraw, portfolio, getMaxBorrow, txPending } = useAriesLendingComplete();
  
  const [amount, setAmount] = useState('');
  
  // Parse amount
  const numericAmount = useMemo(() => {
    const parsed = parseFloat(amount || '0');
    return isNaN(parsed) ? 0 : parsed;
  }, [amount]);
  
  // Get max borrowable amount
  const maxBorrow = useMemo(() => {
    if (!reserve || !portfolio) return 0;
    
    return getMaxBorrow(reserve.coinType, {
      coinType: reserve.coinType,
      symbol: reserve.symbol,
      priceUSD: reserve.priceUSD,
      ltv: reserve.ltv,
      liquidationThreshold: reserve.liquidationThreshold,
      borrowFactor: reserve.borrowFactor,
      borrowShare: 0,
    });
  }, [reserve, portfolio, getMaxBorrow]);
  
  // Calculate new health factor after borrow
  const newHealthFactor = useMemo(() => {
    if (!portfolio || !reserve || numericAmount === 0) {
      return portfolio?.riskMetrics.healthFactor ?? Infinity;
    }
    
    // Simple estimation: existing borrowed + new borrow
    const newTotalBorrowed = portfolio.riskMetrics.totalBorrowedUSD + (numericAmount * reserve.priceUSD);
    const liquidationValue = portfolio.riskMetrics.liquidationValue;
    
    if (newTotalBorrowed === 0) return Infinity;
    return liquidationValue / newTotalBorrowed;
  }, [portfolio, reserve, numericAmount]);
  
  // Current borrow position
  const borrowPosition = useMemo(() => {
    if (!portfolio || !reserve) return null;
    return portfolio.borrows.find(b => b.coinType === reserve.coinType);
  }, [portfolio, reserve]);
  
  // Validation
  const validation = useMemo(() => {
    if (!reserve) return { valid: false, message: 'No reserve selected' };
    if (!portfolio) return { valid: false, message: 'No portfolio data' };
    if (numericAmount === 0) return { valid: false, message: 'Enter amount' };
    if (numericAmount < 0) return { valid: false, message: 'Invalid amount' };
    
    if (portfolio.riskMetrics.totalSuppliedUSD === 0) {
      return { valid: false, message: 'You must supply collateral first' };
    }
    
    if (numericAmount > maxBorrow) {
      return { valid: false, message: `Maximum borrow: ${maxBorrow.toFixed(4)} ${reserve.symbol}` };
    }
    
    if (newHealthFactor < 1.0) {
      return { valid: false, message: 'This borrow would make your position liquidatable' };
    }
    
    if (newHealthFactor < 1.2) {
      return { valid: false, message: 'Health factor too low (minimum 1.2 for safety)' };
    }
    
    return { valid: true, message: '' };
  }, [reserve, portfolio, numericAmount, maxBorrow, newHealthFactor]);
  
  // Handle submit
  const handleSubmit = async () => {
    if (!reserve || !validation.valid) return;
    
    try {
      // Convert to base units
      const baseAmount = Math.floor(numericAmount * Math.pow(10, reserve.decimals)).toString();
      
      // Borrow is done via withdraw with allowBorrow=true
      await withdraw({
        coinType: reserve.coinType,
        profileName: 'default',
        amount: baseAmount,
        allowBorrow: true,
        priceUpdatePayloads: [],
      });
      
      // Success
      setAmount('');
      onClose();
    } catch (error: any) {
      console.error('[BorrowModal] Transaction failed:', error);
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
              <TrendingDown size={24} color={theme.colors.red} />
              <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
                Borrow {reserve.symbol}
              </Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <X size={24} color={theme.colors.textSecondary} />
            </Pressable>
          </View>
          
          {/* Available to Borrow */}
          {portfolio && (
            <View style={[styles.borrowLimitCard, { backgroundColor: theme.colors.bg }]}>
              <View style={styles.borrowLimitRow}>
                <Text style={[styles.borrowLimitLabel, { color: theme.colors.textSecondary }]}>
                  Available to Borrow
                </Text>
                <Text style={[styles.borrowLimitValue, { color: theme.colors.textPrimary }]}>
                  {maxBorrow.toFixed(4)} {reserve.symbol}
                </Text>
              </View>
              <Text style={[styles.borrowLimitUSD, { color: theme.colors.textSecondary }]}>
                ≈ ${(maxBorrow * reserve.priceUSD).toLocaleString()}
              </Text>
              {borrowPosition && (
                <View style={styles.currentBorrowRow}>
                  <Text style={[styles.currentBorrowLabel, { color: theme.colors.textSecondary }]}>
                    Currently Borrowed:
                  </Text>
                  <Text style={[styles.currentBorrowValue, { color: theme.colors.orange }]}>
                    {borrowPosition.amount.toFixed(4)} {reserve.symbol}
                  </Text>
                </View>
              )}
            </View>
          )}
          
          {/* Amount Input */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
              Borrow Amount
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
                    if (maxBorrow > 0) {
                      // Use 80% of max for safety
                      setAmount((maxBorrow * 0.8).toFixed(8));
                    }
                  }}
                >
                  <Text style={styles.maxButtonText}>80%</Text>
                </Pressable>
              </View>
            </View>
            {numericAmount > 0 && (
              <Text style={[styles.usdValue, { color: theme.colors.textSecondary }]}>
                ≈ ${(numericAmount * reserve.priceUSD).toLocaleString()}
              </Text>
            )}
          </View>
          
          {/* Borrow APR Display */}
          <Card style={[styles.aprCard, { backgroundColor: `${theme.colors.red}10` }]}>
            <View style={styles.aprRow}>
              <Text style={[styles.aprLabel, { color: theme.colors.textSecondary }]}>
                Borrow APR
              </Text>
              <Text style={[styles.aprValue, { color: theme.colors.red }]}>
                {reserve.borrowAPR.toFixed(2)}%
              </Text>
            </View>
            {reserve.rewardAPRs.length > 0 && (
              <View style={styles.rewardAprRow}>
                <Text style={[styles.rewardLabel, { color: theme.colors.textSecondary }]}>
                  - Reward APR
                </Text>
                <Text style={[styles.rewardValue, { color: theme.colors.purple }]}>
                  {reserve.rewardAPRs.reduce((a, b) => a + b, 0).toFixed(2)}%
                </Text>
              </View>
            )}
          </Card>
          
          {/* Health Factor Preview */}
          {portfolio && (
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
              <View style={styles.healthRow}>
                <Text style={[styles.healthLabel, { color: theme.colors.textSecondary }]}>
                  Borrow Limit Used
                </Text>
                <Text style={[styles.healthValue, { color: theme.colors.textPrimary }]}>
                  {((portfolio.riskMetrics.totalBorrowedUSD + numericAmount * reserve.priceUSD) / 
                    portfolio.riskMetrics.borrowingPower * 100).toFixed(1)}%
                </Text>
              </View>
            </Card>
          )}
          
          {/* Risk Warning */}
          {newHealthFactor < 1.5 && newHealthFactor !== Infinity && (
            <View style={[styles.warningCard, { backgroundColor: `${theme.colors.orange}10` }]}>
              <AlertTriangle size={16} color={theme.colors.orange} />
              <Text style={[styles.warningText, { color: theme.colors.orange }]}>
                CAUTION: Borrowing this amount increases liquidation risk
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
              Borrowed assets accrue interest. Maintain health factor above 1.2 to avoid liquidation.
            </Text>
          </View>
          
          {/* Submit Button */}
          <Pressable
            style={[
              styles.submitButton,
              {
                backgroundColor: validation.valid ? theme.colors.red : theme.colors.chip,
              },
            ]}
            onPress={handleSubmit}
            disabled={!validation.valid || txPending}
          >
            {txPending ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>
                Borrow {reserve.symbol}
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
  borrowLimitCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  borrowLimitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  borrowLimitLabel: {
    fontSize: 12,
  },
  borrowLimitValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  borrowLimitUSD: {
    fontSize: 14,
    marginBottom: 12,
  },
  currentBorrowRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  currentBorrowLabel: {
    fontSize: 12,
  },
  currentBorrowValue: {
    fontSize: 14,
    fontWeight: '600',
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
  aprCard: {
    padding: 16,
    marginBottom: 16,
  },
  aprRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  aprLabel: {
    fontSize: 14,
  },
  aprValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  rewardAprRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  rewardLabel: {
    fontSize: 12,
  },
  rewardValue: {
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
