import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Pressable } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { useAccent } from '../theme/useAccent';
import { Card } from './Card';
import { PositionCard } from './PositionCard';
import { useMerklePositions } from '../hooks/useMerklePositions';
import { useWallet } from '../app/providers/WalletProvider';
import { 
  TrendingUp, 
  TrendingDown, 
  RefreshCw, 
  Activity,
  Wallet,
  AlertCircle 
} from 'lucide-react-native';
import { formatCurrency } from '../utils/number';

interface PositionsListProps {
  showHeader?: boolean;
  maxHeight?: number;
}

export const PositionsList: React.FC<PositionsListProps> = ({
  showHeader = true,
  maxHeight,
}) => {
  const { theme } = useTheme();
  const accent = useAccent();
  const { account } = useWallet();
  const {
    positions,
    portfolio,
    totalPnL,
    loading,
    error,
    refreshPositions,
    closePosition,
    updateTPSL,
  } = useMerklePositions();

  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshPositions();
    } finally {
      setRefreshing(false);
    }
  };

  const handleClosePosition = async (params: {
    positionId: string;
    pair: string;
    sizeDelta: number;
    collateralDelta: number;
    isPartial: boolean;
  }) => {
    if (!account) {
      throw new Error('Wallet not connected');
    }

    try {
      // Create close transaction
      const transaction = await closePosition(params);
      
      // For now, we'll simulate the transaction being handled
      // In a real implementation, this would be handled by the parent component
      console.log('Close position transaction created:', transaction);
      
      // Simulate success
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      throw error;
    }
  };

  const handleUpdateSLTP = async (params: {
    positionId: string;
    pair: string;
    stopLossPrice?: number;
    takeProfitPrice?: number;
  }) => {
    if (!account) {
      throw new Error('Wallet not connected');
    }

    try {
      // Create SL/TP update transaction
      const transaction = await updateTPSL(params);
      
      // For now, we'll simulate the transaction being handled
      // In a real implementation, this would be handled by the parent component
      console.log('SL/TP update transaction created:', transaction);
      
      // Simulate success
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      throw error;
    }
  };

  const openPositions = positions.filter(p => p.status === 'OPEN');
  const profitablePositions = openPositions.filter(p => p.pnlUSDC > 0);
  const losingPositions = openPositions.filter(p => p.pnlUSDC < 0);

  if (!account) {
    return (
      <Card style={[styles.emptyCard, { backgroundColor: theme.colors.chip }]}>
        <Wallet size={48} color={theme.colors.textSecondary} />
        <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>
          Connect Wallet
        </Text>
        <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
          Connect your wallet to view your positions
        </Text>
      </Card>
    );
  }

  return (
    <View style={[styles.container, maxHeight ? { maxHeight } : undefined]}>
      {showHeader && (
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
            Active Positions
          </Text>
          <Pressable
            onPress={handleRefresh}
            style={[styles.refreshButton, { backgroundColor: theme.colors.chip }]}
            disabled={loading || refreshing}
          >
            <RefreshCw 
              size={16} 
              color={theme.colors.textPrimary}
              style={[refreshing && styles.spinning]}
            />
          </Pressable>
        </View>
      )}

      {/* Portfolio Summary */}
      {openPositions.length > 0 && (
        <Card style={[styles.summaryCard, { backgroundColor: theme.colors.chip }]}>
          <View style={styles.summaryHeader}>
            <Text style={[styles.summaryTitle, { color: theme.colors.textPrimary }]}>
              Portfolio Summary
            </Text>
            <View style={[styles.totalPnlChip, { 
              backgroundColor: totalPnL >= 0 ? theme.colors.positive : theme.colors.negative 
            }]}>
              <Text style={styles.totalPnlText}>
                {totalPnL >= 0 ? '+' : ''}{formatCurrency(totalPnL)} USDC
              </Text>
            </View>
          </View>

          <View style={styles.summaryStats}>
            <View style={styles.summaryStatItem}>
              <View style={styles.summaryStatHeader}>
                <TrendingUp size={14} color={theme.colors.positive} />
                <Text style={[styles.summaryStatLabel, { color: theme.colors.textSecondary }]}>
                  Profitable
                </Text>
              </View>
              <Text style={[styles.summaryStatValue, { color: theme.colors.textPrimary }]}>
                {profitablePositions.length}
              </Text>
            </View>

            <View style={styles.summaryStatItem}>
              <View style={styles.summaryStatHeader}>
                <TrendingDown size={14} color={theme.colors.negative} />
                <Text style={[styles.summaryStatLabel, { color: theme.colors.textSecondary }]}>
                  Losing
                </Text>
              </View>
              <Text style={[styles.summaryStatValue, { color: theme.colors.textPrimary }]}>
                {losingPositions.length}
              </Text>
            </View>

            <View style={styles.summaryStatItem}>
              <View style={styles.summaryStatHeader}>
                <Activity size={14} color={theme.colors.textSecondary} />
                <Text style={[styles.summaryStatLabel, { color: theme.colors.textSecondary }]}>
                  Total Collateral
                </Text>
              </View>
              <Text style={[styles.summaryStatValue, { color: theme.colors.textPrimary }]}>
                {formatCurrency(portfolio.totalCollateral)} USDC
              </Text>
            </View>
          </View>
        </Card>
      )}

      {/* Error State */}
      {error && (
        <Card style={[styles.errorCard, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
          <AlertCircle size={20} color={theme.colors.negative} />
          <Text style={[styles.errorText, { color: theme.colors.negative }]}>
            {error}
          </Text>
          <Pressable onPress={handleRefresh} style={styles.retryButton}>
            <Text style={[styles.retryText, { color: theme.colors.negative }]}>
              Retry
            </Text>
          </Pressable>
        </Card>
      )}

      {/* Positions List */}
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={accent.from}
            colors={[accent.from]}
          />
        }
      >
        {openPositions.length === 0 ? (
          <Card style={[styles.emptyCard, { backgroundColor: theme.colors.chip }]}>
            <Activity size={48} color={theme.colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>
              No Active Positions
            </Text>
            <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
              Open your first position to start trading
            </Text>
          </Card>
        ) : (
          <View style={styles.positionsList}>
            {openPositions.map((position) => (
              <PositionCard
                key={position.id}
                position={position}
                onClose={handleClosePosition}
                onUpdateSLTP={handleUpdateSLTP}
                loading={loading}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  refreshButton: {
    padding: 8,
    borderRadius: 8,
  },
  spinning: {
    // Add rotation animation if needed
  },
  summaryCard: {
    padding: 16,
    marginBottom: 16,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  totalPnlChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  totalPnlText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryStatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  summaryStatLabel: {
    fontSize: 12,
  },
  summaryStatValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 16,
    borderRadius: 8,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
  },
  retryButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  retryText: {
    fontSize: 12,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  emptyCard: {
    alignItems: 'center',
    padding: 32,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  positionsList: {
    paddingBottom: 20,
  },
});
