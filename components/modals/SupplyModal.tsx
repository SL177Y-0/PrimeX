/**
 * Supply Modal for Aries Lending
 * Handles asset deposits with validation and health factor preview
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
import { X, TrendingUp, AlertCircle, Info } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { useAriesLendingComplete, AriesReserve } from '../../hooks/useAriesLendingComplete';
import { formatHealthFactor, getHealthFactorColor } from '../../utils/ariesRiskCalculations';
import { Card } from '../Card';

interface SupplyModalProps {
  visible: boolean;
  reserve: AriesReserve | null;
  onClose: () => void;
}

export default function SupplyModal({ visible, reserve, onClose }: SupplyModalProps) {
  const { theme } = useTheme();
  const { supply, portfolio, txPending } = useAriesLendingComplete();
  
  const [amount, setAmount] = useState('');
  const [useAsCollateral, setUseAsCollateral] = useState(true);
  
  // Parse amount
  const numericAmount = useMemo(() => {
    const parsed = parseFloat(amount || '0');
    return isNaN(parsed) ? 0 : parsed;
  }, [amount]);
  
  // Calculate new health factor after supply
  const newHealthFactor = useMemo(() => {
    if (!portfolio || !reserve || numericAmount === 0) {
      return portfolio?.riskMetrics.healthFactor ?? Infinity;
    }
    
    // TODO: Implement simulateSupply in hook
    // For now, return current health factor
    return portfolio.riskMetrics.healthFactor;
  }, [portfolio, reserve, numericAmount]);
  
  // Validation
  const validation = useMemo(() => {
    if (!reserve) return { valid: false, message: 'No reserve selected' };
    if (numericAmount === 0) return { valid: false, message: 'Enter amount' };
    if (numericAmount < 0) return { valid: false, message: 'Invalid amount' };
    
    // TODO: Check user balance
    // TODO: Check deposit limit
    
    return { valid: true, message: '' };
  }, [reserve, numericAmount]);
  
  // Handle submit
  const handleSubmit = async () => {
    if (!reserve || !validation.valid) return;
    
    try {
      // Convert to base units (considering decimals)
      const baseAmount = Math.floor(numericAmount * Math.pow(10, reserve.decimals)).toString();
      
      await supply({
        coinType: reserve.coinType,
        profileName: 'default',
        amount: baseAmount,
        repayOnly: false,
      });
      
      // Success
      setAmount('');
      onClose();
    } catch (error: any) {
      console.error('[SupplyModal] Transaction failed:', error);
      // Error is handled in hook
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
              <TrendingUp size={24} color={theme.colors.green} />
              <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
                Supply {reserve.symbol}
              </Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <X size={24} color={theme.colors.textSecondary} />
            </Pressable>
          </View>
          
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
                    // TODO: Set to wallet balance
                    setAmount('0');
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
          
          {/* Supply APR Display */}
          <Card style={[styles.aprCard, { backgroundColor: `${theme.colors.green}10` }]}>
            <View style={styles.aprRow}>
              <Text style={[styles.aprLabel, { color: theme.colors.textSecondary }]}>
                Supply APR
              </Text>
              <Text style={[styles.aprValue, { color: theme.colors.green }]}>
                {reserve.supplyAPR.toFixed(2)}%
              </Text>
            </View>
            {reserve.rewardAPRs.length > 0 && (
              <View style={styles.rewardAprRow}>
                <Text style={[styles.rewardLabel, { color: theme.colors.textSecondary }]}>
                  + Reward APR
                </Text>
                <Text style={[styles.rewardValue, { color: theme.colors.purple }]}>
                  {reserve.rewardAPRs.reduce((a, b) => a + b, 0).toFixed(2)}%
                </Text>
              </View>
            )}
          </Card>
          
          {/* Collateral Toggle */}
          <Pressable
            style={styles.collateralToggle}
            onPress={() => setUseAsCollateral(!useAsCollateral)}
          >
            <View>
              <Text style={[styles.collateralTitle, { color: theme.colors.textPrimary }]}>
                Use as Collateral
              </Text>
              <Text style={[styles.collateralDescription, { color: theme.colors.textSecondary }]}>
                {useAsCollateral 
                  ? 'Can be used to borrow against' 
                  : 'Cannot be used for borrowing'}
              </Text>
            </View>
            <View
              style={[
                styles.toggle,
                {
                  backgroundColor: useAsCollateral ? theme.colors.green : theme.colors.chip,
                },
              ]}
            >
              <View
                style={[
                  styles.toggleIndicator,
                  {
                    transform: [{ translateX: useAsCollateral ? 18 : 0 }],
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
          {!useAsCollateral && (
            <View style={[styles.warningCard, { backgroundColor: `${theme.colors.orange}10` }]}>
              <AlertCircle size={16} color={theme.colors.orange} />
              <Text style={[styles.warningText, { color: theme.colors.orange }]}>
                This asset won't increase your borrowing power
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
              Supplied assets earn interest and can be used as collateral
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
                Supply {reserve.symbol}
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
  collateralToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    marginBottom: 16,
  },
  collateralTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  collateralDescription: {
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
