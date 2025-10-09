import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { useAccent } from '../theme/useAccent';
import { Card } from './Card';
import { ClosePositionModal } from './ClosePositionModal';
import { SLTPEditorModal } from './SLTPEditorModal';
import { 
  TrendingUp, 
  TrendingDown, 
  X, 
  Settings, 
  Target, 
  Shield,
  MoreHorizontal 
} from 'lucide-react-native';
import { Position } from '../types/merkle';
import { formatCurrency } from '../utils/number';

interface PositionCardProps {
  position: Position;
  onClose: (params: {
    positionId: string;
    pair: string;
    sizeDelta: number;
    collateralDelta: number;
    isPartial: boolean;
  }) => Promise<void>;
  onUpdateSLTP: (params: {
    positionId: string;
    pair: string;
    stopLossPrice?: number;
    takeProfitPrice?: number;
  }) => Promise<void>;
  loading?: boolean;
}

export const PositionCard: React.FC<PositionCardProps> = ({
  position,
  onClose,
  onUpdateSLTP,
  loading = false,
}) => {
  const { theme } = useTheme();
  const accent = useAccent();
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showSLTPModal, setShowSLTPModal] = useState(false);

  const isProfit = (position?.pnlUSDC || 0) > 0;
  const isLong = position?.side === 'long';
  const hasStopLoss = position?.stopLossPrice && position.stopLossPrice > 0;
  const hasTakeProfit = position?.takeProfitPrice && position.takeProfitPrice > 0;

  // Calculate distance to liquidation
  const liquidationDistance = position?.liquidationPrice && position?.markPrice
    ? Math.abs((position.markPrice - position.liquidationPrice) / position.markPrice) * 100
    : 0;

  const getLiquidationColor = () => {
    if (liquidationDistance > 20) return theme.colors.positive;
    if (liquidationDistance > 10) return '#fbbf24'; // yellow
    return theme.colors.negative;
  };

  return (
    <>
      <Card style={[styles.card, { backgroundColor: theme.colors.chip }]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.pairInfo}>
            <Text style={[styles.pairText, { color: theme.colors.textPrimary }]}>
              {position.pair.replace('_', '/')}
            </Text>
            <View style={[styles.sideChip, { 
              backgroundColor: isLong ? theme.colors.positive : theme.colors.negative 
            }]}>
              {isLong ? 
                <TrendingUp size={12} color="#FFFFFF" /> : 
                <TrendingDown size={12} color="#FFFFFF" />
              }
              <Text style={styles.sideText}>
                {position.side.toUpperCase()} {position.leverage.toFixed(1)}x
              </Text>
            </View>
          </View>

          <View style={styles.pnlInfo}>
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

        {/* Position Details */}
        <View style={styles.details}>
          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
                Size
              </Text>
              <Text style={[styles.detailValue, { color: theme.colors.textPrimary }]}>
                {formatCurrency(position.sizeUSDC)} USDC
              </Text>
            </View>

            <View style={styles.detailItem}>
              <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
                Collateral
              </Text>
              <Text style={[styles.detailValue, { color: theme.colors.textPrimary }]}>
                {formatCurrency(position.collateralUSDC)} USDC
              </Text>
            </View>

            <View style={styles.detailItem}>
              <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
                Entry Price
              </Text>
              <Text style={[styles.detailValue, { color: theme.colors.textPrimary }]}>
                ${formatCurrency(position.entryPrice)}
              </Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
                Mark Price
              </Text>
              <Text style={[styles.detailValue, { color: theme.colors.textPrimary }]}>
                ${formatCurrency(position.markPrice)}
              </Text>
            </View>

            <View style={styles.detailItem}>
              <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
                Liq. Price
              </Text>
              <Text style={[styles.detailValue, { color: getLiquidationColor() }]}>
                ${formatCurrency(position.liquidationPrice || 0)}
              </Text>
            </View>

            <View style={styles.detailItem}>
              <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
                Liq. Distance
              </Text>
              <Text style={[styles.detailValue, { color: getLiquidationColor() }]}>
                {liquidationDistance.toFixed(1)}%
              </Text>
            </View>
          </View>
        </View>

        {/* SL/TP Indicators */}
        {(hasStopLoss || hasTakeProfit) && (
          <View style={styles.slTpRow}>
            {hasStopLoss && (
              <View style={styles.slTpItem}>
                <Shield size={14} color={theme.colors.negative} />
                <Text style={[styles.slTpLabel, { color: theme.colors.textSecondary }]}>
                  SL:
                </Text>
                <Text style={[styles.slTpValue, { color: theme.colors.negative }]}>
                  ${formatCurrency(position.stopLossPrice!)}
                </Text>
              </View>
            )}

            {hasTakeProfit && (
              <View style={styles.slTpItem}>
                <Target size={14} color={theme.colors.positive} />
                <Text style={[styles.slTpLabel, { color: theme.colors.textSecondary }]}>
                  TP:
                </Text>
                <Text style={[styles.slTpValue, { color: theme.colors.positive }]}>
                  ${formatCurrency(position.takeProfitPrice!)}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actions}>
          <Pressable
            onPress={() => setShowSLTPModal(true)}
            style={[styles.actionButton, { backgroundColor: theme.colors.bg }]}
            disabled={loading}
          >
            <Settings size={16} color={theme.colors.textPrimary} />
            <Text style={[styles.actionButtonText, { color: theme.colors.textPrimary }]}>
              SL/TP
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setShowCloseModal(true)}
            style={[styles.actionButton, styles.closeButton, { backgroundColor: theme.colors.negative }]}
            disabled={loading}
          >
            <X size={16} color="#FFFFFF" />
            <Text style={[styles.actionButtonText, { color: '#FFFFFF' }]}>
              Close
            </Text>
          </Pressable>
        </View>

        {/* Status Indicator */}
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: theme.colors.positive }]} />
          <Text style={[styles.statusText, { color: theme.colors.textSecondary }]}>
            {position.status} • Updated {new Date(position.timestamp).toLocaleTimeString()}
          </Text>
        </View>
      </Card>

      {/* Modals */}
      <ClosePositionModal
        visible={showCloseModal}
        position={position}
        onClose={() => setShowCloseModal(false)}
        onConfirm={onClose}
        loading={loading}
      />

      <SLTPEditorModal
        visible={showSLTPModal}
        position={position}
        onClose={() => setShowSLTPModal(false)}
        onConfirm={onUpdateSLTP}
        loading={loading}
      />
    </>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 16,
    marginBottom: 12,
  },
  header: {
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
  pnlValue: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 2,
  },
  pnlPercent: {
    fontSize: 14,
  },
  details: {
    gap: 12,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailItem: {
    alignItems: 'center',
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  slTpRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  slTpItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  slTpLabel: {
    fontSize: 12,
  },
  slTpValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  closeButton: {
    // backgroundColor applied inline
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
  },
});
