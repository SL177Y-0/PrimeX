/**
 * Aries Withdraw Modal - Production Component
 * 
 * Complete modal for withdrawing assets from Aries Markets
 * Real-time validation, health factor simulation, and collateral checks
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { CustomModal } from '../../CustomModal';
import { LinearGradient } from 'expo-linear-gradient';
import { useWallet } from '../../../app/providers/WalletProvider';
import { useAriesLending } from '../../../hooks/useAriesLendingProduction';
import { getAssetByCoinType, toBaseUnits, fromBaseUnits } from '../../../config/ariesAssetsComplete';
import { formatHealthFactor, getHealthFactorColor } from '../../../utils/ariesRiskCalculationsComplete';

interface AriesWithdrawModalProps {
  visible: boolean;
  coinType: string | null;
  onClose: () => void;
}

export default function AriesWithdrawModal({ visible, coinType, onClose }: AriesWithdrawModalProps) {
  const { account, signAndSubmitTransaction } = useWallet();
  const {
    portfolio,
    profileName,
    reserves,
    withdraw,
    simulateWithdraw,
    txPending,
  } = useAriesLending(account?.address);

  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const asset = useMemo(() => 
    coinType ? getAssetByCoinType(coinType) : null,
  [coinType]);

  const reserve = useMemo(() =>
    reserves.find(r => r.coinType === coinType),
  [reserves, coinType]);

  // Get deposited amount from portfolio
  const depositedAmount = useMemo(() => {
    if (!portfolio || !coinType) return 0;
    const deposit = portfolio.deposits.find(d => d.coinType === coinType);
    return deposit ? fromBaseUnits(deposit.underlyingAmount, asset?.decimals || 8) : 0;
  }, [portfolio, coinType, asset]);

  const validation = useMemo(() => {
    if (!amount || !asset) {
      return { valid: false, errors: [] };
    }

    const numAmount = parseFloat(amount);
    const errors: string[] = [];

    if (isNaN(numAmount) || numAmount <= 0) {
      errors.push('Amount must be greater than 0');
    }

    if (numAmount > depositedAmount) {
      errors.push('Insufficient deposited balance');
    }

    // Check if withdrawal would make health factor unsafe
    if (portfolio && portfolio.borrows.length > 0) {
      try {
        const simulation = simulateWithdraw({
          coinType: coinType!,
          profileName: 'default',
          amount: toBaseUnits(numAmount, asset.decimals),
        });

        if (simulation && simulation.projectedHealthFactor < 1.0) {
          errors.push('Withdrawal would make position liquidatable');
        }
      } catch (e) {
        // Simulation failed, skip this check
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }, [amount, asset, depositedAmount, portfolio, coinType, simulateWithdraw]);

  const simulation = useMemo(() => {
    if (!validation.valid || !amount || !asset || !coinType) {
      return null;
    }

    const baseUnits = toBaseUnits(parseFloat(amount), asset.decimals);
    
    return simulateWithdraw({
      coinType,
      profileName: 'default',
      amount: baseUnits,
    });
  }, [validation.valid, amount, asset, coinType, simulateWithdraw]);

  const handleMaxClick = () => {
    setAmount(depositedAmount.toString());
  };

  const handleWithdraw = async () => {
    if (!validation.valid || !asset || !coinType || !signAndSubmitTransaction) return;

    setError(null);
    setIsSubmitting(true);

    try {
      const baseUnits = toBaseUnits(parseFloat(amount), asset.decimals);
      
      await withdraw({
        coinType,
        profileName: profileName || 'Main Account',
        amount: baseUnits,
        signAndSubmitTx: signAndSubmitTransaction,
      });

      setAmount('');
      onClose();
    } catch (err) {
      console.error('Withdraw transaction failed:', err);
      setError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setAmount('');
    setError(null);
    onClose();
  };

  useEffect(() => {
    if (visible) {
      setAmount('');
      setError(null);
    }
  }, [visible, coinType]);

  if (!asset || !reserve) {
    return null;
  }

  return (
    <CustomModal visible={visible} onClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalContainer}
      >
          <View style={styles.header}>
            <Text style={styles.title}>Withdraw {asset.symbol}</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Available to Withdraw */}
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Available to Withdraw</Text>
              <Text style={styles.infoValue}>
                {depositedAmount.toFixed(asset.decimals)} {asset.symbol}
              </Text>
              {reserve.priceUSD && (
                <Text style={styles.infoValueUSD}>
                  ≈ ${(depositedAmount * reserve.priceUSD).toFixed(2)}
                </Text>
              )}
            </View>

            {/* Amount Input */}
            <View style={styles.inputSection}>
              <View style={styles.inputHeader}>
                <Text style={styles.inputLabel}>Amount to Withdraw</Text>
              </View>

              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="0.00"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="decimal-pad"
                />
              </View>

              <TouchableOpacity style={styles.maxButton} onPress={handleMaxClick}>
                <Text style={styles.maxButtonText}>MAX</Text>
              </TouchableOpacity>

              {validation.errors.length > 0 && (
                <View style={styles.errorContainer}>
                  {validation.errors.map((err, idx) => (
                    <Text key={idx} style={styles.errorText}>• {err}</Text>
                  ))}
                </View>
              )}
            </View>

            {/* Supply APR */}
            <View style={styles.aprContainer}>
              <Text style={styles.aprLabel}>Supply APR</Text>
              <Text style={styles.aprValue}>
                {(reserve.supplyAPR * 100).toFixed(2)}%
              </Text>
            </View>

            {/* Health Factor Simulation */}
            {simulation && portfolio && portfolio.borrows.length > 0 && (
              <View style={styles.simulationContainer}>
                <Text style={styles.simulationTitle}>Health Factor Impact</Text>
                
                <View style={styles.simulationRow}>
                  <Text style={styles.simulationLabel}>Current</Text>
                  <Text style={[
                    styles.simulationValue,
                    { color: getHealthFactorColor(simulation.currentHealthFactor) }
                  ]}>
                    {formatHealthFactor(simulation.currentHealthFactor)}
                  </Text>
                </View>

                <View style={styles.simulationArrow}>
                  <Text style={styles.simulationArrowText}>→</Text>
                </View>

                <View style={styles.simulationRow}>
                  <Text style={styles.simulationLabel}>Projected</Text>
                  <Text style={[
                    styles.simulationValue,
                    { color: getHealthFactorColor(simulation.projectedHealthFactor) }
                  ]}>
                    {formatHealthFactor(simulation.projectedHealthFactor)}
                  </Text>
                </View>

                {simulation.warning && (
                  <View style={styles.warningContainer}>
                    <Text style={styles.warningText}>⚠️ {simulation.warning}</Text>
                  </View>
                )}
              </View>
            )}

            {/* Transaction Summary */}
            {amount && validation.valid && (
              <View style={styles.summaryContainer}>
                <Text style={styles.summaryTitle}>Transaction Summary</Text>
                
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>You will withdraw</Text>
                  <Text style={styles.summaryValue}>
                    {parseFloat(amount).toFixed(asset.decimals)} {asset.symbol}
                  </Text>
                </View>

                {reserve.priceUSD && (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>USD Value</Text>
                    <Text style={styles.summaryValue}>
                      ${(parseFloat(amount) * reserve.priceUSD).toFixed(2)}
                    </Text>
                  </View>
                )}

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Remaining Deposited</Text>
                  <Text style={styles.summaryValue}>
                    {(depositedAmount - parseFloat(amount)).toFixed(asset.decimals)} {asset.symbol}
                  </Text>
                </View>
              </View>
            )}

            {error && (
              <View style={styles.txErrorContainer}>
                <Text style={styles.txErrorText}>{error}</Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                styles.submitButton,
                (!validation.valid || isSubmitting) && styles.submitButtonDisabled
              ]}
              onPress={handleWithdraw}
              disabled={!validation.valid || isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <LinearGradient
                  colors={['#f59e0b', '#d97706']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.submitButtonGradient}
                >
                  <Text style={styles.submitButtonText}>
                    Withdraw {asset.symbol}
                  </Text>
                </LinearGradient>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
    </CustomModal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  modalContainer: {
    backgroundColor: '#0f1729',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '92%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#E5E7EB',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1F2937',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: '#9CA3AF',
  },
  content: {
    padding: 20,
  },
  infoCard: {
    padding: 18,
    backgroundColor: '#1a2332',
    borderRadius: 12,
    marginBottom: 20,
    borderLeftWidth: 3,
    borderLeftColor: '#f59e0b',
  },
  infoLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#E5E7EB',
  },
  infoValueUSD: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
  inputSection: {
    marginBottom: 20,
  },
  inputHeader: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E5E7EB',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a2332',
    borderRadius: 12,
    paddingLeft: 20,
    paddingRight: 8,
    height: 56,
  },
  input: {
    flex: 1,
    fontSize: 28,
    fontWeight: '400',
    color: '#E5E7EB',
    paddingRight: 12,
    height: '100%',
    outlineWidth: 0,
    outlineColor: 'transparent',
  },
  maxButton: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    backgroundColor: '#00D4FF',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
  },
  maxButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0A0E27',
  },
  errorContainer: {
    marginTop: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
  },
  aprContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 18,
    backgroundColor: '#1a2332',
    borderRadius: 12,
    marginBottom: 20,
  },
  aprLabel: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  aprValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10b981',
  },
  simulationContainer: {
    padding: 18,
    backgroundColor: '#1a2332',
    borderRadius: 12,
    marginBottom: 20,
  },
  simulationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E5E7EB',
    marginBottom: 12,
  },
  simulationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  simulationLabel: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  simulationValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  simulationArrow: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  simulationArrowText: {
    fontSize: 20,
    color: '#9CA3AF',
  },
  warningContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f59e0b20',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#f59e0b',
  },
  warningText: {
    fontSize: 12,
    color: '#f59e0b',
  },
  summaryContainer: {
    padding: 18,
    backgroundColor: '#1a2332',
    borderRadius: 12,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E5E7EB',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#E5E7EB',
  },
  txErrorContainer: {
    padding: 12,
    backgroundColor: '#ef444420',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#ef4444',
    marginBottom: 20,
  },
  txErrorText: {
    fontSize: 12,
    color: '#ef4444',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#1F2937',
  },
  submitButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
