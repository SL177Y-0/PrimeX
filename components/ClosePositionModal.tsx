import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, TextInput, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Slider } from '@react-native-assets/slider';
import { useTheme } from '../theme/ThemeProvider';
import { useAccent } from '../theme/useAccent';
import { Card } from './Card';
import { GradientPillButton } from './GradientPillButton';
import { X, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react-native';
import { Position } from '../types/merkle';
import { formatCurrency } from '../utils/number';

interface ClosePositionModalProps {
  visible: boolean;
  position: Position | null;
  onClose: () => void;
  onConfirm: (params: {
    positionId: string;
    pair: string;
    sizeDelta: number;
    collateralDelta: number;
    isPartial: boolean;
  }) => Promise<void>;
  loading?: boolean;
}

export const ClosePositionModal: React.FC<ClosePositionModalProps> = ({
  visible,
  position,
  onClose,
  onConfirm,
  loading = false,
}) => {
  const { theme } = useTheme();
  const accent = useAccent();
  const [closePercentage, setClosePercentage] = useState(100);
  const [customPercentage, setCustomPercentage] = useState('100');

  if (!position) return null;

  const isProfit = (position?.pnlUSDC || 0) > 0;
  const closeSize = ((position?.sizeUSDC || 0) * closePercentage) / 100;
  const closeCollateral = ((position?.collateralUSDC || 0) * closePercentage) / 100;
  const estimatedPnL = ((position?.pnlUSDC || 0) * closePercentage) / 100;
  const estimatedReturn = closeCollateral + estimatedPnL;
  const isPartial = closePercentage < 100;

  const handlePercentageSelect = (percentage: number) => {
    setClosePercentage(percentage);
    setCustomPercentage(percentage.toString());
  };

  const handleCustomPercentageChange = (value: string) => {
    setCustomPercentage(value);
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 1 && numValue <= 100) {
      setClosePercentage(numValue);
    }
  };

  const handleConfirm = async () => {
    try {
      await onConfirm({
        positionId: position.id,
        pair: position.pair,
        sizeDelta: closeSize,
        collateralDelta: closeCollateral,
        isPartial,
      });
      onClose();
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to close position');
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor: theme.colors.bg }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
              Close Position
            </Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <X size={24} color={theme.colors.textSecondary} />
            </Pressable>
          </View>

          {/* Position Info */}
          <Card style={[styles.positionCard, { backgroundColor: theme.colors.chip }]}>
            <View style={styles.positionHeader}>
              <View style={styles.pairInfo}>
                <Text style={[styles.pairText, { color: theme.colors.textPrimary }]}>
                  {position.pair.replace('_', '/')}
                </Text>
                <View style={[styles.sideChip, { 
                  backgroundColor: position.side === 'long' ? theme.colors.positive : theme.colors.negative 
                }]}>
                  {position.side === 'long' ? 
                    <TrendingUp size={12} color="#FFFFFF" /> : 
                    <TrendingDown size={12} color="#FFFFFF" />
                  }
                  <Text style={styles.sideText}>
                    {position.side.toUpperCase()} {position.leverage.toFixed(1)}x
                  </Text>
                </View>
              </View>
              
              <View style={styles.pnlInfo}>
                <Text style={[styles.pnlLabel, { color: theme.colors.textSecondary }]}>
                  Current PnL
                </Text>
                <Text style={[styles.pnlValue, { 
                  color: isProfit ? theme.colors.positive : theme.colors.negative 
                }]}>
                  {isProfit ? '+' : ''}{formatCurrency(position.pnlUSDC)} USDC
                </Text>
                <Text style={[styles.pnlPercent, { 
                  color: isProfit ? theme.colors.positive : theme.colors.negative 
                }]}>
                  ({isProfit ? '+' : ''}{position.pnlPercent.toFixed(2)}%)
                </Text>
              </View>
            </View>

            <View style={styles.positionStats}>
              <View style={styles.statItem}>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                  Size
                </Text>
                <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>
                  {formatCurrency(position.sizeUSDC)} USDC
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                  Collateral
                </Text>
                <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>
                  {formatCurrency(position.collateralUSDC)} USDC
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                  Entry Price
                </Text>
                <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>
                  ${formatCurrency(position.entryPrice)}
                </Text>
              </View>
            </View>
          </Card>

          {/* Close Amount Selector */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
              Close Amount
            </Text>
            
            {/* Quick Percentage Buttons */}
            <View style={styles.percentageButtons}>
              {[25, 50, 75, 100].map((percentage) => (
                <Pressable
                  key={percentage}
                  onPress={() => handlePercentageSelect(percentage)}
                  style={[
                    styles.percentageButton,
                    { backgroundColor: theme.colors.chip },
                    closePercentage === percentage && { 
                      backgroundColor: accent.from,
                      borderColor: accent.from,
                      borderWidth: 1
                    }
                  ]}
                >
                  <Text style={[
                    styles.percentageButtonText,
                    { color: closePercentage === percentage ? '#FFFFFF' : theme.colors.textPrimary }
                  ]}>
                    {percentage}%
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Custom Percentage Input */}
            <View style={styles.customInput}>
              <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                Custom Percentage
              </Text>
              <TextInput
                style={[styles.textInput, { 
                  backgroundColor: theme.colors.chip,
                  color: theme.colors.textPrimary,
                  borderColor: theme.colors.border
                }]}
                value={customPercentage}
                onChangeText={handleCustomPercentageChange}
                keyboardType="decimal-pad"
                placeholder="1-100"
                placeholderTextColor={theme.colors.textSecondary}
              />
              <Text style={[styles.percentSymbol, { color: theme.colors.textSecondary }]}>
                %
              </Text>
            </View>

            {/* Slider */}
            <Slider
              style={styles.slider}
              minimumValue={1}
              maximumValue={100}
              value={closePercentage}
              onValueChange={setClosePercentage}
              minimumTrackTintColor={accent.from}
              maximumTrackTintColor={theme.colors.border}
              thumbStyle={{ backgroundColor: accent.from }}
              step={1}
            />
          </View>

          {/* Estimated Results */}
          <Card style={[styles.estimateCard, { backgroundColor: theme.colors.chip }]}>
            <Text style={[styles.estimateTitle, { color: theme.colors.textPrimary }]}>
              Estimated Results
            </Text>
            
            <View style={styles.estimateRow}>
              <Text style={[styles.estimateLabel, { color: theme.colors.textSecondary }]}>
                Close Size
              </Text>
              <Text style={[styles.estimateValue, { color: theme.colors.textPrimary }]}>
                {formatCurrency(closeSize)} USDC
              </Text>
            </View>

            <View style={styles.estimateRow}>
              <Text style={[styles.estimateLabel, { color: theme.colors.textSecondary }]}>
                Collateral Return
              </Text>
              <Text style={[styles.estimateValue, { color: theme.colors.textPrimary }]}>
                {formatCurrency(closeCollateral)} USDC
              </Text>
            </View>

            <View style={styles.estimateRow}>
              <Text style={[styles.estimateLabel, { color: theme.colors.textSecondary }]}>
                Estimated PnL
              </Text>
              <Text style={[styles.estimateValue, { 
                color: estimatedPnL >= 0 ? theme.colors.positive : theme.colors.negative 
              }]}>
                {estimatedPnL >= 0 ? '+' : ''}{formatCurrency(estimatedPnL)} USDC
              </Text>
            </View>

            <View style={[styles.estimateRow, styles.totalRow]}>
              <Text style={[styles.estimateLabel, styles.totalLabel, { color: theme.colors.textPrimary }]}>
                Total Return
              </Text>
              <Text style={[styles.estimateValue, styles.totalValue, { 
                color: estimatedReturn >= closeCollateral ? theme.colors.positive : theme.colors.negative 
              }]}>
                {formatCurrency(estimatedReturn)} USDC
              </Text>
            </View>
          </Card>

          {/* Warning for Partial Close */}
          {isPartial && (
            <View style={[styles.warningCard, { backgroundColor: 'rgba(251, 191, 36, 0.1)' }]}>
              <AlertTriangle size={16} color="#fbbf24" />
              <Text style={[styles.warningText, { color: '#fbbf24' }]}>
                Partial close will leave {(100 - closePercentage).toFixed(0)}% of your position open
              </Text>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actions}>
            <Pressable
              onPress={onClose}
              style={[styles.cancelButton, { backgroundColor: theme.colors.chip }]}
            >
              <Text style={[styles.cancelButtonText, { color: theme.colors.textPrimary }]}>
                Cancel
              </Text>
            </Pressable>

            <GradientPillButton
              title={loading ? 'Closing...' : `Close ${closePercentage.toFixed(0)}%`}
              onPress={handleConfirm}
              disabled={loading || closePercentage < 1}
              style={styles.confirmButton}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    width: '100%',
    maxWidth: 480,
    borderRadius: 16,
    padding: 24,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  positionCard: {
    padding: 16,
    marginBottom: 20,
  },
  positionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  pairInfo: {
    flex: 1,
  },
  pairText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  sideChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    gap: 4,
  },
  sideText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  pnlInfo: {
    alignItems: 'flex-end',
  },
  pnlLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  pnlValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  pnlPercent: {
    fontSize: 12,
  },
  positionStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  percentageButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  percentageButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  percentageButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  customInput: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    flex: 1,
  },
  textInput: {
    width: 80,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    textAlign: 'center',
    fontSize: 14,
  },
  percentSymbol: {
    fontSize: 14,
  },
  slider: {
    height: 40,
  },
  estimateCard: {
    padding: 16,
    marginBottom: 16,
  },
  estimateTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  estimateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  estimateLabel: {
    fontSize: 14,
  },
  estimateValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  totalLabel: {
    fontWeight: '600',
  },
  totalValue: {
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
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
