import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, TextInput, Alert, Switch } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { useAccent } from '../theme/useAccent';
import { Card } from './Card';
import { GradientPillButton } from './GradientPillButton';
import { X, TrendingUp, TrendingDown, Target, Shield, AlertCircle } from 'lucide-react-native';
import { Position } from '../types/merkle';
import { formatCurrency } from '../utils/number';

interface SLTPEditorModalProps {
  visible: boolean;
  position: Position | null;
  onClose: () => void;
  onConfirm: (params: {
    positionId: string;
    pair: string;
    stopLossPrice?: number;
    takeProfitPrice?: number;
  }) => Promise<void>;
  loading?: boolean;
}

export const SLTPEditorModal: React.FC<SLTPEditorModalProps> = ({
  visible,
  position,
  onClose,
  onConfirm,
  loading = false,
}) => {
  const { theme } = useTheme();
  const accent = useAccent();
  
  const [slEnabled, setSLEnabled] = useState(false);
  const [tpEnabled, setTPEnabled] = useState(false);
  const [slPrice, setSLPrice] = useState('');
  const [tpPrice, setTPPrice] = useState('');
  const [slError, setSLError] = useState('');
  const [tpError, setTPError] = useState('');

  useEffect(() => {
    if (position) {
      // Initialize with existing SL/TP if any
      const hasExistingSL = position.stopLossPrice && position.stopLossPrice > 0;
      const hasExistingTP = position.takeProfitPrice && position.takeProfitPrice > 0;
      
      setSLEnabled(!!hasExistingSL);
      setTPEnabled(!!hasExistingTP);
      setSLPrice(hasExistingSL ? position.stopLossPrice!.toString() : '');
      setTPPrice(hasExistingTP ? position.takeProfitPrice!.toString() : '');
      setSLError('');
      setTPError('');
    }
  }, [position]);

  if (!position) return null;

  const isLong = position?.side === 'long';
  const entryPrice = position?.entryPrice || 0;
  const currentPrice = position?.markPrice || 0;

  // Validation functions
  const validateSL = (price: string): string => {
    if (!price || price === '') return '';
    
    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice <= 0) {
      return 'Invalid price';
    }

    if (isLong && numPrice >= entryPrice) {
      return 'Stop Loss must be below entry price for long positions';
    }
    
    if (!isLong && numPrice <= entryPrice) {
      return 'Stop Loss must be above entry price for short positions';
    }

    return '';
  };

  const validateTP = (price: string): string => {
    if (!price || price === '') return '';
    
    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice <= 0) {
      return 'Invalid price';
    }

    if (isLong && numPrice <= entryPrice) {
      return 'Take Profit must be above entry price for long positions';
    }
    
    if (!isLong && numPrice >= entryPrice) {
      return 'Take Profit must be below entry price for short positions';
    }

    // Check 900% profit cap
    const sizeUSDC = position?.sizeUSDC || 0;
    const collateralUSDC = position?.collateralUSDC || 0;
    
    const potentialPnL = isLong 
      ? ((numPrice - entryPrice) * sizeUSDC) / entryPrice
      : ((entryPrice - numPrice) * sizeUSDC) / entryPrice;
    
    const maxProfit = collateralUSDC * 9; // 900% cap
    if (potentialPnL > maxProfit) {
      return `Take Profit exceeds 900% profit cap (max: $${maxProfit.toFixed(2)})`;
    }

    return '';
  };

  const handleSLChange = (value: string) => {
    setSLPrice(value);
    setSLError(validateSL(value));
  };

  const handleTPChange = (value: string) => {
    setTPPrice(value);
    setTPError(validateTP(value));
  };

  const calculatePnL = (targetPrice: number): number => {
    const sizeUSDC = position?.sizeUSDC || 0;
    if (isLong) {
      return ((targetPrice - entryPrice) * sizeUSDC) / entryPrice;
    } else {
      return ((entryPrice - targetPrice) * sizeUSDC) / entryPrice;
    }
  };

  const handleConfirm = async () => {
    // Final validation
    const finalSLError = slEnabled ? validateSL(slPrice) : '';
    const finalTPError = tpEnabled ? validateTP(tpPrice) : '';

    if (finalSLError || finalTPError) {
      setSLError(finalSLError);
      setTPError(finalTPError);
      return;
    }

    try {
      await onConfirm({
        positionId: position.id,
        pair: position.pair,
        stopLossPrice: slEnabled && slPrice ? parseFloat(slPrice) : undefined,
        takeProfitPrice: tpEnabled && tpPrice ? parseFloat(tpPrice) : undefined,
      });
      onClose();
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to update SL/TP');
    }
  };

  const slPnL = slEnabled && slPrice ? calculatePnL(parseFloat(slPrice)) : 0;
  const tpPnL = tpEnabled && tpPrice ? calculatePnL(parseFloat(tpPrice)) : 0;

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
              Edit Stop Loss & Take Profit
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
            </View>

            <View style={styles.priceInfo}>
              <View style={styles.priceItem}>
                <Text style={[styles.priceLabel, { color: theme.colors.textSecondary }]}>
                  Entry Price
                </Text>
                <Text style={[styles.priceValue, { color: theme.colors.textPrimary }]}>
                  ${formatCurrency(entryPrice)}
                </Text>
              </View>
              <View style={styles.priceItem}>
                <Text style={[styles.priceLabel, { color: theme.colors.textSecondary }]}>
                  Current Price
                </Text>
                <Text style={[styles.priceValue, { color: theme.colors.textPrimary }]}>
                  ${formatCurrency(currentPrice)}
                </Text>
              </View>
              <View style={styles.priceItem}>
                <Text style={[styles.priceLabel, { color: theme.colors.textSecondary }]}>
                  Position Size
                </Text>
                <Text style={[styles.priceValue, { color: theme.colors.textPrimary }]}>
                  {formatCurrency(position.sizeUSDC)} USDC
                </Text>
              </View>
            </View>
          </Card>

          {/* Stop Loss Section */}
          <Card style={[styles.sectionCard, { backgroundColor: theme.colors.chip }]}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Shield size={20} color={theme.colors.negative} />
                <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
                  Stop Loss
                </Text>
              </View>
              <Switch
                value={slEnabled}
                onValueChange={setSLEnabled}
                trackColor={{ false: theme.colors.border, true: accent.from }}
                thumbColor="#FFFFFF"
              />
            </View>

            {slEnabled && (
              <View style={styles.inputSection}>
                <View style={styles.inputRow}>
                  <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                    Stop Loss Price
                  </Text>
                  <View style={styles.inputContainer}>
                    <Text style={[styles.currencySymbol, { color: theme.colors.textSecondary }]}>
                      $
                    </Text>
                    <TextInput
                      style={[styles.priceInput, { 
                        backgroundColor: theme.colors.bg,
                        color: theme.colors.textPrimary,
                        borderColor: slError ? theme.colors.negative : theme.colors.border
                      }]}
                      value={slPrice}
                      onChangeText={handleSLChange}
                      keyboardType="decimal-pad"
                      placeholder={`${isLong ? 'Below' : 'Above'} ${formatCurrency(entryPrice)}`}
                      placeholderTextColor={theme.colors.textSecondary}
                    />
                  </View>
                </View>

                {slError ? (
                  <View style={styles.errorRow}>
                    <AlertCircle size={14} color={theme.colors.negative} />
                    <Text style={[styles.errorText, { color: theme.colors.negative }]}>
                      {slError}
                    </Text>
                  </View>
                ) : slPrice && !isNaN(parseFloat(slPrice)) ? (
                  <View style={styles.pnlPreview}>
                    <Text style={[styles.pnlLabel, { color: theme.colors.textSecondary }]}>
                      Estimated Loss:
                    </Text>
                    <Text style={[styles.pnlValue, { color: theme.colors.negative }]}>
                      -{formatCurrency(Math.abs(slPnL))} USDC
                    </Text>
                  </View>
                ) : null}
              </View>
            )}
          </Card>

          {/* Take Profit Section */}
          <Card style={[styles.sectionCard, { backgroundColor: theme.colors.chip }]}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Target size={20} color={theme.colors.positive} />
                <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
                  Take Profit
                </Text>
              </View>
              <Switch
                value={tpEnabled}
                onValueChange={setTPEnabled}
                trackColor={{ false: theme.colors.border, true: accent.from }}
                thumbColor="#FFFFFF"
              />
            </View>

            {tpEnabled && (
              <View style={styles.inputSection}>
                <View style={styles.inputRow}>
                  <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                    Take Profit Price
                  </Text>
                  <View style={styles.inputContainer}>
                    <Text style={[styles.currencySymbol, { color: theme.colors.textSecondary }]}>
                      $
                    </Text>
                    <TextInput
                      style={[styles.priceInput, { 
                        backgroundColor: theme.colors.bg,
                        color: theme.colors.textPrimary,
                        borderColor: tpError ? theme.colors.negative : theme.colors.border
                      }]}
                      value={tpPrice}
                      onChangeText={handleTPChange}
                      keyboardType="decimal-pad"
                      placeholder={`${isLong ? 'Above' : 'Below'} ${formatCurrency(entryPrice)}`}
                      placeholderTextColor={theme.colors.textSecondary}
                    />
                  </View>
                </View>

                {tpError ? (
                  <View style={styles.errorRow}>
                    <AlertCircle size={14} color={theme.colors.negative} />
                    <Text style={[styles.errorText, { color: theme.colors.negative }]}>
                      {tpError}
                    </Text>
                  </View>
                ) : tpPrice && !isNaN(parseFloat(tpPrice)) ? (
                  <View style={styles.pnlPreview}>
                    <Text style={[styles.pnlLabel, { color: theme.colors.textSecondary }]}>
                      Estimated Profit:
                    </Text>
                    <Text style={[styles.pnlValue, { color: theme.colors.positive }]}>
                      +{formatCurrency(tpPnL)} USDC
                    </Text>
                  </View>
                ) : null}
              </View>
            )}
          </Card>

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
              onPress={handleConfirm}
              disabled={loading || (slEnabled && slError !== '') || (tpEnabled && tpError !== '')}
              style={styles.confirmButton}
              title={loading ? 'Updating...' : 'Update SL/TP'}
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
    padding: 16,
  },
  modal: {
    width: '100%',
    maxWidth: 480,
    borderRadius: 16,
    padding: 20,
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
    marginBottom: 16,
  },
  positionHeader: {
    marginBottom: 16,
  },
  pairInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pairText: {
    fontSize: 18,
    fontWeight: '600',
  },
  sideChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  sideText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  priceInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  priceItem: {
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  sectionCard: {
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  inputSection: {
    gap: 8,
  },
  inputRow: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: '500',
  },
  priceInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  errorText: {
    fontSize: 12,
    flex: 1,
  },
  pnlPreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
  },
  pnlLabel: {
    fontSize: 12,
  },
  pnlValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
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
