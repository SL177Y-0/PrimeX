/**
 * Action Modal Component
 * 
 * Universal modal for supply, withdraw, borrow, and repay actions
 * Includes health factor simulation and risk warnings
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { X, TrendingUp, TrendingDown, AlertTriangle, Info } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeProvider';
import { useWallet } from '../app/providers/WalletProvider';
import { formatUSD, formatPercent } from '../utils/usdHelpers';
import { Card } from './Card';
import { HealthFactorSimulator } from './HealthFactorSimulator';

interface ActionModalProps {
  visible: boolean;
  onClose: () => void;
  action: 'supply' | 'withdraw' | 'borrow' | 'repay';
  asset: {
    symbol: string;
    name: string;
    balance: number;
    balanceUSD: number;
    supplyAPR: number;
    borrowAPR: number;
    liquidationThreshold: number;
  };
  userPosition?: {
    supplied: number;
    borrowed: number;
    healthFactor: number;
    totalCollateral: number;
    totalBorrowed: number;
  };
  onConfirm: (amount: number) => Promise<void>;
}

export function ActionModal({
  visible,
  onClose,
  action,
  asset,
  userPosition,
  onConfirm,
}: ActionModalProps) {
  const { theme } = useTheme();
  const { account } = useWallet();
  const [amount, setAmount] = useState('');
  const [amountUSD, setAmountUSD] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showSimulator, setShowSimulator] = useState(false);

  const numAmount = parseFloat(amount) || 0;
  const priceUSD = asset.balanceUSD / asset.balance || 0;

  useEffect(() => {
    setAmountUSD(numAmount * priceUSD);
  }, [numAmount, priceUSD]);

  const getMaxAmount = () => {
    switch (action) {
      case 'supply':
        return asset.balance;
      case 'withdraw':
        return asset.balance; // This should be the supplied amount
      case 'borrow':
        // Calculate max borrowable based on health factor
        if (!userPosition) return 0;
        const maxBorrowable = (userPosition.totalCollateral * asset.liquidationThreshold * 0.8) - userPosition.totalBorrowed;
        return Math.max(0, maxBorrowable / priceUSD);
      case 'repay':
        return Math.min(asset.balance, asset.balance); // Min of wallet balance and borrowed amount
      default:
        return 0;
    }
  };

  const setMaxAmount = () => {
    const max = getMaxAmount();
    setAmount(max.toString());
  };

  const getActionColor = () => {
    switch (action) {
      case 'supply': return '#10b981';
      case 'withdraw': return '#ef4444';
      case 'borrow': return '#f59e0b';
      case 'repay': return '#8b5cf6';
      default: return theme.colors.textPrimary;
    }
  };

  const getActionIcon = () => {
    switch (action) {
      case 'supply': return <TrendingUp size={24} color={getActionColor()} />;
      case 'withdraw': return <TrendingDown size={24} color={getActionColor()} />;
      case 'borrow': return <TrendingDown size={24} color={getActionColor()} />;
      case 'repay': return <TrendingUp size={24} color={getActionColor()} />;
      default: return null;
    }
  };

  const getAPR = () => {
    switch (action) {
      case 'supply':
      case 'withdraw':
        return asset.supplyAPR;
      case 'borrow':
      case 'repay':
        return asset.borrowAPR;
      default:
        return 0;
    }
  };

  const calculateYearlyEarnings = () => {
    const apr = getAPR() / 100;
    const isEarning = action === 'supply';
    const isCost = action === 'borrow';
    
    if (isEarning) {
      return amountUSD * apr;
    } else if (isCost) {
      return -(amountUSD * apr);
    }
    return 0;
  };

  const handleConfirm = async () => {
    if (!account?.address) {
      Alert.alert('Error', 'Please connect your wallet first');
      return;
    }

    if (numAmount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (numAmount > getMaxAmount()) {
      Alert.alert('Error', 'Amount exceeds maximum available');
      return;
    }

    try {
      setLoading(true);
      await onConfirm(numAmount);
      onClose();
      setAmount('');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Transaction failed');
    } finally {
      setLoading(false);
    }
  };

  const yearlyEarnings = calculateYearlyEarnings();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <View style={styles.headerLeft}>
            {getActionIcon()}
            <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
              {action.charAt(0).toUpperCase() + action.slice(1)} {asset.symbol}
            </Text>
          </View>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <X size={24} color={theme.colors.textSecondary} />
          </Pressable>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Asset Info */}
          <Card style={[styles.assetCard, { backgroundColor: theme.colors.card }]} elevated>
            <View style={styles.assetHeader}>
              <Text style={[styles.assetName, { color: theme.colors.textPrimary }]}>
                {asset.name}
              </Text>
              <Text style={[styles.assetAPR, { color: getActionColor() }]}>
                {formatPercent(getAPR())} APR
              </Text>
            </View>
            <View style={styles.assetStats}>
              <View style={styles.assetStat}>
                <Text style={[styles.assetStatLabel, { color: theme.colors.textSecondary }]}>
                  Wallet Balance
                </Text>
                <Text style={[styles.assetStatValue, { color: theme.colors.textPrimary }]}>
                  {asset.balance.toFixed(4)} {asset.symbol}
                </Text>
                <Text style={[styles.assetStatValueUSD, { color: theme.colors.textSecondary }]}>
                  {formatUSD(asset.balanceUSD)}
                </Text>
              </View>
            </View>
          </Card>

          {/* Amount Input */}
          <Card style={[styles.inputCard, { backgroundColor: theme.colors.card }]} elevated>
            <View style={styles.inputHeader}>
              <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                Amount
              </Text>
              <Pressable onPress={setMaxAmount} style={styles.maxButton}>
                <Text style={[styles.maxButtonText, { color: getActionColor() }]}>
                  Max: {getMaxAmount().toFixed(4)}
                </Text>
              </Pressable>
            </View>

            <View style={[styles.inputContainer, { borderColor: theme.colors.border }]}>
              <TextInput
                style={[styles.amountInput, { color: theme.colors.textPrimary }]}
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="numeric"
              />
              <Text style={[styles.assetSymbol, { color: theme.colors.textSecondary }]}>
                {asset.symbol}
              </Text>
            </View>

            {amountUSD > 0 && (
              <Text style={[styles.amountUSD, { color: theme.colors.textSecondary }]}>
                ≈ {formatUSD(amountUSD)}
              </Text>
            )}
          </Card>

          {/* Transaction Summary */}
          {numAmount > 0 && (
            <Card style={[styles.summaryCard, { backgroundColor: theme.colors.card }]} elevated>
              <Text style={[styles.summaryTitle, { color: theme.colors.textPrimary }]}>
                Transaction Summary
              </Text>

              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>
                  Amount
                </Text>
                <Text style={[styles.summaryValue, { color: theme.colors.textPrimary }]}>
                  {numAmount.toFixed(4)} {asset.symbol}
                </Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>
                  USD Value
                </Text>
                <Text style={[styles.summaryValue, { color: theme.colors.textPrimary }]}>
                  {formatUSD(amountUSD)}
                </Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>
                  APR
                </Text>
                <Text style={[styles.summaryValue, { color: getActionColor() }]}>
                  {formatPercent(getAPR())}
                </Text>
              </View>

              {yearlyEarnings !== 0 && (
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>
                    Yearly {yearlyEarnings > 0 ? 'Earnings' : 'Cost'}
                  </Text>
                  <Text style={[
                    styles.summaryValue,
                    { color: yearlyEarnings > 0 ? '#10b981' : '#ef4444' }
                  ]}>
                    {yearlyEarnings > 0 ? '+' : ''}{formatUSD(Math.abs(yearlyEarnings))}
                  </Text>
                </View>
              )}
            </Card>
          )}

          {/* Health Factor Simulator */}
          {userPosition && (action === 'withdraw' || action === 'borrow') && numAmount > 0 && (
            <View style={styles.simulatorSection}>
              <Pressable
                onPress={() => setShowSimulator(!showSimulator)}
                style={styles.simulatorToggle}
              >
                <AlertTriangle size={20} color="#f59e0b" />
                <Text style={[styles.simulatorToggleText, { color: theme.colors.textPrimary }]}>
                  Health Factor Impact
                </Text>
                <Text style={[styles.simulatorToggleArrow, { color: theme.colors.textSecondary }]}>
                  {showSimulator ? '▼' : '▶'}
                </Text>
              </Pressable>

              {showSimulator && (
                <HealthFactorSimulator
                  currentCollateral={userPosition.totalCollateral}
                  currentBorrowed={userPosition.totalBorrowed}
                  liquidationThreshold={asset.liquidationThreshold}
                  currentHealthFactor={userPosition.healthFactor}
                />
              )}
            </View>
          )}

          {/* Risk Warnings */}
          {action === 'borrow' && (
            <Card style={[styles.warningCard, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
              <View style={styles.warningHeader}>
                <AlertTriangle size={20} color="#f59e0b" />
                <Text style={[styles.warningTitle, { color: '#f59e0b' }]}>
                  Borrowing Risks
                </Text>
              </View>
              <Text style={[styles.warningText, { color: theme.colors.textSecondary }]}>
                • You'll pay {formatPercent(asset.borrowAPR)} APR on borrowed amount{'\n'}
                • Your collateral may be liquidated if health factor drops below 1.0{'\n'}
                • Interest accrues continuously and compounds
              </Text>
            </Card>
          )}

          {action === 'withdraw' && userPosition && userPosition.borrowed > 0 && (
            <Card style={[styles.warningCard, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
              <View style={styles.warningHeader}>
                <AlertTriangle size={20} color="#ef4444" />
                <Text style={[styles.warningTitle, { color: '#ef4444' }]}>
                  Withdrawal Warning
                </Text>
              </View>
              <Text style={[styles.warningText, { color: theme.colors.textSecondary }]}>
                Withdrawing collateral will reduce your health factor. Ensure it stays above 1.2 to avoid liquidation risk.
              </Text>
            </Card>
          )}

          {/* Info Card */}
          <Card style={[styles.infoCard, { backgroundColor: 'rgba(139, 92, 246, 0.1)' }]}>
            <View style={styles.infoHeader}>
              <Info size={20} color="#8b5cf6" />
              <Text style={[styles.infoTitle, { color: '#8b5cf6' }]}>
                How it works
              </Text>
            </View>
            <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
              {action === 'supply' && 'Supply assets to earn interest. Your supplied assets can be used as collateral for borrowing.'}
              {action === 'withdraw' && 'Withdraw your supplied assets. Ensure sufficient collateral remains if you have active borrows.'}
              {action === 'borrow' && 'Borrow against your collateral. Maintain a healthy collateralization ratio to avoid liquidation.'}
              {action === 'repay' && 'Repay your borrowed amount to reduce debt and improve your health factor.'}
            </Text>
          </Card>
        </ScrollView>

        {/* Action Button */}
        <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
          <Pressable
            onPress={handleConfirm}
            disabled={loading || numAmount <= 0}
            style={[
              styles.confirmButton,
              { backgroundColor: getActionColor() },
              (loading || numAmount <= 0) && styles.confirmButtonDisabled,
            ]}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.confirmButtonText}>
                {action.charAt(0).toUpperCase() + action.slice(1)} {asset.symbol}
              </Text>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
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
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  assetCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  assetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  assetName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  assetAPR: {
    fontSize: 16,
    fontWeight: '600',
  },
  assetStats: {
    gap: 8,
  },
  assetStat: {
    alignItems: 'center',
  },
  assetStatLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  assetStatValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  assetStatValueUSD: {
    fontSize: 12,
    marginTop: 2,
  },
  inputCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  inputHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  maxButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  maxButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  amountInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
  },
  assetSymbol: {
    fontSize: 14,
    fontWeight: '500',
  },
  amountUSD: {
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  summaryCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  simulatorSection: {
    marginBottom: 16,
  },
  simulatorToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  simulatorToggleText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  simulatorToggleArrow: {
    fontSize: 12,
  },
  warningCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  warningText: {
    fontSize: 12,
    lineHeight: 18,
  },
  infoCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  infoText: {
    fontSize: 12,
    lineHeight: 18,
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  confirmButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
