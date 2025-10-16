/**
 * PnL Dashboard Component
 * 
 * Comprehensive dashboard showing portfolio performance metrics
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { usePnLData, usePnLHistory } from '../hooks/usePnLData';
import { formatUSD, formatPercent, getValueColor } from '../utils/usdHelpers';
import { PnLPerformanceChart } from './PnLPerformanceChart';
import { formatPnLHistory, generateMockPnLHistory } from '../utils/chartHelpers';
import { Card } from './Card';

interface PnLDashboardProps {
  userId: string;
  useMockData?: boolean;
}

export function PnLDashboard({ userId, useMockData = false }: PnLDashboardProps) {
  const { theme } = useTheme();
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d'>('30d');
  
  const { metrics, loading: metricsLoading, error: metricsError, refresh } = usePnLData(userId);
  const { history, loading: historyLoading } = usePnLHistory(
    userId,
    timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90
  );

  const chartData = useMockData 
    ? generateMockPnLHistory(timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90)
    : formatPnLHistory(history);

  if (metricsLoading && !metrics) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8b5cf6" />
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
          Loading performance data...
        </Text>
      </View>
    );
  }

  if (metricsError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={[styles.errorText, { color: '#ef4444' }]}>
          Failed to load PnL data
        </Text>
        <Pressable onPress={refresh} style={styles.retryButton}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  const pnlColor = getValueColor(metrics?.netPnL || 0);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Summary Cards */}
      <View style={styles.summaryRow}>
        <Card style={[styles.summaryCard, { backgroundColor: theme.colors.card }]} elevated>
          <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>
            Net PnL
          </Text>
          <Text style={[styles.summaryValue, { color: pnlColor }]}>
            {formatUSD(metrics?.netPnL || 0, { showSign: true })}
          </Text>
          <Text style={[styles.summaryPercent, { color: pnlColor }]}>
            {formatPercent(metrics?.netPnLPercent || 0)}
          </Text>
        </Card>

        <Card style={[styles.summaryCard, { backgroundColor: theme.colors.card }]} elevated>
          <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>
            Total Value
          </Text>
          <Text style={[styles.summaryValue, { color: theme.colors.textPrimary }]}>
            {formatUSD(metrics?.totalValue || 0)}
          </Text>
          {metrics?.healthFactor && (
            <Text style={[styles.summarySubtext, { color: theme.colors.textSecondary }]}>
              HF: {metrics.healthFactor.toFixed(2)}
            </Text>
          )}
        </Card>
      </View>

      {/* Portfolio Breakdown */}
      <Card style={[styles.breakdownCard, { backgroundColor: theme.colors.card }]} elevated>
        <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
          Portfolio Breakdown
        </Text>
        
        <View style={styles.breakdownRow}>
          <View style={styles.breakdownItem}>
            <View style={styles.breakdownHeader}>
              <View style={[styles.indicator, { backgroundColor: '#10b981' }]} />
              <Text style={[styles.breakdownLabel, { color: theme.colors.textSecondary }]}>
                Supplied
              </Text>
            </View>
            <Text style={[styles.breakdownValue, { color: '#10b981' }]}>
              {formatUSD(metrics?.totalSupplied || 0)}
            </Text>
          </View>

          <View style={styles.breakdownItem}>
            <View style={styles.breakdownHeader}>
              <View style={[styles.indicator, { backgroundColor: '#ef4444' }]} />
              <Text style={[styles.breakdownLabel, { color: theme.colors.textSecondary }]}>
                Borrowed
              </Text>
            </View>
            <Text style={[styles.breakdownValue, { color: '#ef4444' }]}>
              {formatUSD(metrics?.totalBorrowed || 0)}
            </Text>
          </View>
        </View>

        {/* Utilization Bar */}
        <View style={styles.utilizationContainer}>
          <Text style={[styles.utilizationLabel, { color: theme.colors.textSecondary }]}>
            Utilization
          </Text>
          <View style={[styles.utilizationBar, { backgroundColor: theme.colors.bg }]}>
            <View
              style={[
                styles.utilizationFill,
                {
                  width: `${Math.min(
                    ((metrics?.totalBorrowed || 0) / (metrics?.totalSupplied || 1)) * 100,
                    100
                  )}%`,
                  backgroundColor: '#8b5cf6',
                },
              ]}
            />
          </View>
        </View>
      </Card>

      {/* Performance Chart */}
      <Card style={[styles.chartCard, { backgroundColor: theme.colors.card }]} elevated>
        <View style={styles.chartHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
            Performance
          </Text>
          
          {/* Timeframe Selector */}
          <View style={styles.timeframeSelector}>
            {(['7d', '30d', '90d'] as const).map((tf) => (
              <Pressable
                key={tf}
                onPress={() => setTimeframe(tf)}
                style={[
                  styles.timeframeButton,
                  timeframe === tf && [
                    styles.timeframeButtonActive,
                    { backgroundColor: '#8b5cf6' },
                  ],
                ]}
              >
                <Text
                  style={[
                    styles.timeframeText,
                    { color: timeframe === tf ? '#fff' : theme.colors.textSecondary },
                  ]}
                >
                  {tf}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {historyLoading ? (
          <View style={styles.chartLoading}>
            <ActivityIndicator size="small" color="#8b5cf6" />
          </View>
        ) : (
          <PnLPerformanceChart data={chartData} height={200} showCumulative />
        )}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    fontSize: 16,
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#8b5cf6',
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  summaryPercent: {
    fontSize: 14,
    fontWeight: '600',
  },
  summarySubtext: {
    fontSize: 12,
    marginTop: 4,
  },
  breakdownCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  breakdownRow: {
    flexDirection: 'row',
    gap: 16,
  },
  breakdownItem: {
    flex: 1,
  },
  breakdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  breakdownLabel: {
    fontSize: 12,
  },
  breakdownValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  utilizationContainer: {
    marginTop: 16,
  },
  utilizationLabel: {
    fontSize: 12,
    marginBottom: 8,
  },
  utilizationBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  utilizationFill: {
    height: '100%',
    borderRadius: 4,
  },
  chartCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  timeframeSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  timeframeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: 'transparent',
  },
  timeframeButtonActive: {
    backgroundColor: '#8b5cf6',
  },
  timeframeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  chartLoading: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
