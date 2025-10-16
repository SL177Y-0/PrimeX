/**
 * Health Factor Widget Component
 * 
 * Displays user's health factor with visual indicators
 * Shows borrowing power, liquidation distance, and risk status
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Activity, AlertTriangle, Shield, TrendingUp } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeProvider';
import { useResponsive } from '../hooks/useResponsive';
import {
  getHealthFactorColor,
  getHealthFactorLabel,
  formatHealthFactor,
  calculateBorrowingPower,
  calculateLiquidationDistance,
} from '../utils/healthFactorSimulation';
import { PAGE_ACCENTS } from '../theme/pageAccents';
import type { UserPortfolio } from '../types/aries';

interface HealthFactorWidgetProps {
  portfolio: UserPortfolio | null;
  loanToValue?: number; // in bips (default 7500 = 75%)
  liquidationThreshold?: number; // in bips (default 8000 = 80%)
}

export function HealthFactorWidget({
  portfolio,
  loanToValue = 7500,
  liquidationThreshold = 8000,
}: HealthFactorWidgetProps) {
  const { theme } = useTheme();
  const { spacing } = useResponsive();
  const pageAccent = PAGE_ACCENTS.LEND;

  const borrowingPower = useMemo(() => {
    if (!portfolio) return null;
    return calculateBorrowingPower(portfolio, loanToValue);
  }, [portfolio, loanToValue]);

  const liquidationDistance = useMemo(() => {
    if (!portfolio) return null;
    return calculateLiquidationDistance(portfolio, liquidationThreshold);
  }, [portfolio, liquidationThreshold]);

  if (!portfolio) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.noDataText, { color: theme.colors.textSecondary }]}>
          Connect wallet to view health factor
        </Text>
      </View>
    );
  }

  const healthFactor = portfolio.healthFactor;
  const hfColor = getHealthFactorColor(healthFactor);
  const hfLabel = getHealthFactorLabel(healthFactor);
  const hasBorrows = portfolio.totalBorrowedUSD > 0;

  return (
    <View style={[styles.container, { gap: spacing.md }]}>
      {/* Health Factor Display */}
      <LinearGradient
        colors={[theme.colors.elevated, theme.colors.surface] as any}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hfCard}
      >
        <View style={styles.hfHeader}>
          <Activity size={20} color={hfColor} />
          <Text style={[styles.hfTitle, { color: theme.colors.textPrimary }]}>
            Health Factor
          </Text>
          {!hasBorrows && (
            <View style={[styles.badge, { backgroundColor: 'rgba(16, 185, 129, 0.2)' }]}>
              <Text style={[styles.badgeText, { color: theme.colors.positive }]}>
                No Borrows
              </Text>
            </View>
          )}
        </View>

        <View style={styles.hfContent}>
          <Text style={[styles.hfValue, { color: hfColor }]}>
            {formatHealthFactor(healthFactor)}
          </Text>
          <View style={[styles.hfStatus, { backgroundColor: `${hfColor}20` }]}>
            <Text style={[styles.hfStatusText, { color: hfColor }]}>
              {hfLabel}
            </Text>
          </View>
        </View>

        {hasBorrows && (
          <Text style={[styles.hfDescription, { color: theme.colors.textSecondary }]}>
            {healthFactor >= 2.0 && 'Your position is very safe. Low liquidation risk.'}
            {healthFactor >= 1.5 && healthFactor < 2.0 && 'Your position is safe with moderate buffer.'}
            {healthFactor >= 1.2 && healthFactor < 1.5 && 'Caution: Consider increasing collateral or repaying.'}
            {healthFactor < 1.2 && '⚠️ High Risk: Your position may be liquidated soon!'}
          </Text>
        )}
      </LinearGradient>

      {/* Borrowing Power */}
      {borrowingPower && hasBorrows && (
        <View style={[styles.powerCard, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.powerHeader}>
            <TrendingUp size={18} color={pageAccent.primary} />
            <Text style={[styles.powerTitle, { color: theme.colors.textPrimary }]}>
              Borrowing Power
            </Text>
          </View>

          <View style={styles.powerStats}>
            <View style={styles.powerStat}>
              <Text style={[styles.powerLabel, { color: theme.colors.textSecondary }]}>
                Used
              </Text>
              <Text style={[styles.powerValue, { color: theme.colors.orange }]}>
                ${borrowingPower.usedBorrowingPower.toFixed(2)}
              </Text>
            </View>
            <View style={styles.powerStat}>
              <Text style={[styles.powerLabel, { color: theme.colors.textSecondary }]}>
                Available
              </Text>
              <Text style={[styles.powerValue, { color: theme.colors.positive }]}>
                ${borrowingPower.availableBorrowingPower.toFixed(2)}
              </Text>
            </View>
            <View style={styles.powerStat}>
              <Text style={[styles.powerLabel, { color: theme.colors.textSecondary }]}>
                Total
              </Text>
              <Text style={[styles.powerValue, { color: theme.colors.textPrimary }]}>
                ${borrowingPower.totalBorrowingPower.toFixed(2)}
              </Text>
            </View>
          </View>

          {/* Utilization Bar */}
          <View style={styles.utilizationContainer}>
            <View style={[styles.utilizationBar, { backgroundColor: theme.colors.bg }]}>
              <LinearGradient
                colors={[pageAccent.primary, theme.colors.orange] as any}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[
                  styles.utilizationFill,
                  { width: `${Math.min(100, borrowingPower.utilizationPercent)}%` },
                ]}
              />
            </View>
            <Text style={[styles.utilizationText, { color: theme.colors.textSecondary }]}>
              {borrowingPower.utilizationPercent.toFixed(1)}% utilized
            </Text>
          </View>
        </View>
      )}

      {/* Liquidation Distance */}
      {liquidationDistance && hasBorrows && liquidationDistance.isAtRisk && (
        <View style={[styles.warningCard, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
          <AlertTriangle size={18} color={theme.colors.orange} />
          <View style={styles.warningContent}>
            <Text style={[styles.warningTitle, { color: theme.colors.orange }]}>
              Liquidation Warning
            </Text>
            <Text style={[styles.warningText, { color: theme.colors.textSecondary }]}>
              ${Math.abs(liquidationDistance.distanceToLiquidation).toFixed(2)} from liquidation
            </Text>
          </View>
        </View>
      )}

      {/* Safe Status */}
      {!hasBorrows && (
        <View style={[styles.safeCard, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
          <Shield size={18} color={theme.colors.positive} />
          <View style={styles.safeContent}>
            <Text style={[styles.safeTitle, { color: theme.colors.positive }]}>
              No Active Borrows
            </Text>
            <Text style={[styles.safeText, { color: theme.colors.textSecondary }]}>
              You can borrow up to ${(portfolio.totalSuppliedUSD * (loanToValue / 10000)).toFixed(2)}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  noDataText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
  hfCard: {
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  hfHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hfTitle: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  hfContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  hfValue: {
    fontSize: 36,
    fontWeight: '700',
  },
  hfStatus: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  hfStatusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  hfDescription: {
    fontSize: 12,
    lineHeight: 18,
  },
  powerCard: {
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  powerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  powerTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  powerStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  powerStat: {
    flex: 1,
    gap: 4,
  },
  powerLabel: {
    fontSize: 11,
  },
  powerValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  utilizationContainer: {
    gap: 6,
  },
  utilizationBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  utilizationFill: {
    height: '100%',
  },
  utilizationText: {
    fontSize: 11,
    textAlign: 'right',
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    borderRadius: 12,
  },
  warningContent: {
    flex: 1,
    gap: 4,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  warningText: {
    fontSize: 12,
  },
  safeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    borderRadius: 12,
  },
  safeContent: {
    flex: 1,
    gap: 4,
  },
  safeTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  safeText: {
    fontSize: 12,
  },
});
