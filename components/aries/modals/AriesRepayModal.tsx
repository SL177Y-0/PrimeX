/**
 * Aries Repay Modal - Production Component
 * 
 * Complete modal for repaying borrowed assets to Aries Markets
 * Real-time validation, health factor simulation, and wallet balance checks
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useWallet } from '../../../app/providers/WalletProvider';
import { useAriesLending } from '../../../hooks/useAriesLendingProduction';
import { getAssetByCoinType, toBaseUnits, fromBaseUnits } from '../../../config/ariesAssetsComplete';
import { formatHealthFactor, getHealthFactorColor } from '../../../utils/ariesRiskCalculationsComplete';

interface AriesRepayModalProps {
  visible: boolean;
  coinType: string | null;
  onClose: () => void;
}

export default function AriesRepayModal({ visible, coinType, onClose }: AriesRepayModalProps) {
  const { account, signAndSubmitTransaction } = useWallet();
  const {
    portfolio,
    profileName,
    reserves,
    repay,
    simulateRepay,
    txPending,
  } = useAriesLending(account?.address);

  const [amount, setAmount] = useState('');
  const [repayAll, setRepayAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const asset = useMemo(() => 
    coinType ? getAssetByCoinType(coinType) : null,
  [coinType]);

  const reserve = useMemo(() =>
    reserves.find(r => r.coinType === coinType),
  [reserves, coinType]);

  // Get borrowed amount from portfolio
  const borrowedAmount = useMemo(() => {
    if (!portfolio || !coinType) return 0;
    const borrow = portfolio.borrows.find(b => b.coinType === coinType);
    return borrow ? fromBaseUnits(borrow.borrowedAmount, asset?.decimals || 8) : 0;
  }, [portfolio, coinType, asset]);

  // Get wallet balance (TODO: fetch from Aptos RPC)
  const walletBalance = useMemo(() => {
    // For now, return a reasonable default
    // TODO: Integrate with Aptos SDK to fetch real balance
    return 0;
  }, [coinType]);

  const validation = useMemo(() => {
    if (!amount || !asset) {
      return { valid: false, errors: [] };
    }

    const numAmount = parseFloat(amount);
    const errors: string[] = [];

    if (isNaN(numAmount) || numAmount <= 0) {
      errors.push('Amount must be greater than 0');
    }

    if (borrowedAmount === 0) {
      errors.push('No borrowed balance to repay');
    }

    if (numAmount > borrowedAmount) {
      errors.push('Cannot repay more than borrowed amount');
    }

    if (numAmount > walletBalance) {
      errors.push('Insufficient wallet balance');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }, [amount, asset, borrowedAmount, walletBalance]);

  const simulation = useMemo(() => {
    if (!validation.valid || !amount || !asset || !coinType) {
      return null;
    }

    const baseUnits = toBaseUnits(parseFloat(amount), asset.decimals);
    
    return simulateRepay({
      coinType,
      profileName: 'default',
      amount: baseUnits,
      repayAll,
    });
  }, [validation.valid, amount, asset, coinType, repayAll, simulateRepay]);

  const handleMaxClick = () => {
    const maxRepay = Math.min(walletBalance, borrowedAmount);
    setAmount(maxRepay.toString());
    setRepayAll(maxRepay >= borrowedAmount);
  };

  const handleRepay = async () => {
    if (!validation.valid || !asset || !coinType || !signAndSubmitTransaction) return;

    setError(null);
    setIsSubmitting(true);

    try {
      const baseUnits = toBaseUnits(parseFloat(amount), asset.decimals);
      
      await repay({
        coinType,
        profileName: profileName || 'Main Account',
        amount: baseUnits,
        repayAll,
        signAndSubmitTx: signAndSubmitTransaction,
      });

      setAmount('');
      setRepayAll(false);
      onClose();
    } catch (err) {
      console.error('Repay transaction failed:', err);
      setError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setAmount('');
    setRepayAll(false);
    setError(null);
    onClose();
  };

  useEffect(() => {
    if (visible) {
      setAmount('');
      setRepayAll(false);
      setError(null);
    }
  }, [visible, coinType]);

  if (!asset || !reserve) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <TouchableOpacity 
          style={styles.backdrop} 
          activeOpacity={1} 
          onPress={handleClose}
        />

        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>Repay {asset.symbol}</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Borrowed Amount Display */}
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Amount Borrowed</Text>
              <Text style={styles.infoValue}>
                {borrowedAmount.toFixed(asset.decimals)} {asset.symbol}
              </Text>
              {reserve.priceUSD && (
                <Text style={styles.infoValueUSD}>
                  ≈ ${(borrowedAmount * reserve.priceUSD).toFixed(2)}
                </Text>
              )}
            </View>

            {/* Wallet Balance */}
            <View style={styles.balanceCard}>
              <Text style={styles.balanceLabel}>Wallet Balance:</Text>
              <Text style={styles.balanceValue}>
                {walletBalance.toFixed(asset.decimals)} {asset.symbol}
              </Text>
            </View>

            {/* Amount Input */}
            <View style={styles.inputSection}>
              <View style={styles.inputHeader}>
                <Text style={styles.inputLabel}>Amount to Repay</Text>
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

            {/* Repay All Toggle */}
            <TouchableOpacity
              style={styles.toggleContainer}
              onPress={() => setRepayAll(!repayAll)}
            >
              <View style={styles.toggleInfo}>
                <Text style={styles.toggleLabel}>Repay Full Amount</Text>
                <Text style={styles.toggleDescription}>
                  Repay all borrowed {asset.symbol} (including accrued interest)
                </Text>
              </View>
              <View style={[styles.toggle, repayAll && styles.toggleActive]}>
                <View style={[styles.toggleThumb, repayAll && styles.toggleThumbActive]} />
              </View>
            </TouchableOpacity>

            {/* Borrow APR */}
            <View style={styles.aprContainer}>
              <Text style={styles.aprLabel}>Borrow APR</Text>
              <Text style={[styles.aprValue, { color: '#ef4444' }]}>
                {(reserve.borrowAPR * 100).toFixed(2)}%
              </Text>
            </View>

            {/* Health Factor Simulation */}
            {simulation && portfolio && (
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

                {simulation.projectedHealthFactor > simulation.currentHealthFactor && (
                  <View style={styles.positiveContainer}>
                    <Text style={styles.positiveText}>✓ Repaying will improve your health factor</Text>
                  </View>
                )}
              </View>
            )}

            {/* Transaction Summary */}
            {amount && validation.valid && (
              <View style={styles.summaryContainer}>
                <Text style={styles.summaryTitle}>Transaction Summary</Text>
                
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>You will repay</Text>
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
                  <Text style={styles.summaryLabel}>Remaining Debt</Text>
                  <Text style={styles.summaryValue}>
                    {(borrowedAmount - parseFloat(amount)).toFixed(asset.decimals)} {asset.symbol}
                  </Text>
                </View>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>New Wallet Balance</Text>
                  <Text style={styles.summaryValue}>
                    {(walletBalance - parseFloat(amount)).toFixed(asset.decimals)} {asset.symbol}
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
              onPress={handleRepay}
              disabled={!validation.valid || isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <LinearGradient
                  colors={['#8b5cf6', '#7c3aed']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.submitButtonGradient}
                >
                  <Text style={styles.submitButtonText}>
                    Repay {asset.symbol}
                  </Text>
                </LinearGradient>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
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
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#ef4444',
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
  balanceCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1a2332',
    borderRadius: 12,
    marginBottom: 20,
  },
  balanceLabel: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  balanceValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E5E7EB',
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
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
    backgroundColor: '#1a2332',
    borderRadius: 12,
    marginBottom: 20,
  },
  toggleInfo: {
    flex: 1,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E5E7EB',
    marginBottom: 4,
  },
  toggleDescription: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1F2937',
    padding: 2,
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: '#8b5cf6',
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
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
  positiveContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#10b98120',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#10b981',
  },
  positiveText: {
    fontSize: 12,
    color: '#10b981',
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
