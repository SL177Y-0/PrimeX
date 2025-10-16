/**
 * Analytics Screen
 * 
 * Comprehensive analytics dashboard with charts and metrics
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeProvider';
import { Card } from '../../components/Card';
import { PnLDashboard } from '../../components/PnLDashboard';
import { UtilizationChart } from '../../components/UtilizationChart';
import { APRHistoryChart } from '../../components/APRHistoryChart';
import { PortfolioAllocationChart } from '../../components/PortfolioAllocationChart';
import { SystemHealthBadge } from '../../components/SystemHealthBadge';
import { generateMockAPRHistory, calculatePortfolioAllocation } from '../../utils/chartHelpers';

export default function AnalyticsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'pnl' | 'apr' | 'allocation' | 'utilization'>('pnl');

  // Mock data for demonstration
  const mockAPRHistory = generateMockAPRHistory(30, 5, 8);
  
  const mockAllocation = calculatePortfolioAllocation([
    { asset: 'APT', valueUSD: 8500 },
    { asset: 'USDC', valueUSD: 6200 },
    { asset: 'BTC', valueUSD: 4300 },
    { asset: 'ETH', valueUSD: 1988 },
  ]);

  const mockInterestRateConfig = {
    minBorrowRate: 2,
    optimalBorrowRate: 8,
    maxBorrowRate: 30,
    optimalUtilization: 80,
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerContent}>
          <View>
            <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
              Analytics
            </Text>
            <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
              Portfolio insights & metrics
            </Text>
          </View>
          <SystemHealthBadge showDetails />
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, {
          paddingTop: 60 + insets.top + 20,
          paddingBottom: 20 + insets.bottom,
        }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Tab Selector */}
        <View style={styles.tabContainer}>
          {[
            { key: 'pnl', label: 'PnL' },
            { key: 'apr', label: 'APR History' },
            { key: 'allocation', label: 'Allocation' },
            { key: 'utilization', label: 'Utilization' },
          ].map((tab) => (
            <Pressable
              key={tab.key}
              onPress={() => setActiveTab(tab.key as any)}
              style={[
                styles.tab,
                activeTab === tab.key && [
                  styles.tabActive,
                  { backgroundColor: '#8b5cf6' },
                ],
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  {
                    color:
                      activeTab === tab.key
                        ? '#fff'
                        : theme.colors.textSecondary,
                  },
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Content */}
        <View style={styles.content}>
          {activeTab === 'pnl' && (
            <PnLDashboard userId="demo-user" useMockData />
          )}

          {activeTab === 'apr' && (
            <Card style={[styles.chartCard, { backgroundColor: theme.colors.card }]} elevated>
              <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>
                APR History (30 Days)
              </Text>
              <Text style={[styles.cardSubtitle, { color: theme.colors.textSecondary }]}>
                Historical supply and borrow rates
              </Text>
              <View style={styles.chartContainer}>
                <APRHistoryChart data={mockAPRHistory} height={250} />
              </View>
            </Card>
          )}

          {activeTab === 'allocation' && (
            <Card style={[styles.chartCard, { backgroundColor: theme.colors.card }]} elevated>
              <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>
                Portfolio Allocation
              </Text>
              <Text style={[styles.cardSubtitle, { color: theme.colors.textSecondary }]}>
                Asset distribution by value
              </Text>
              <View style={styles.chartContainer}>
                <PortfolioAllocationChart data={mockAllocation} height={350} showLegend />
              </View>
            </Card>
          )}

          {activeTab === 'utilization' && (
            <Card style={[styles.chartCard, { backgroundColor: theme.colors.card }]} elevated>
              <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>
                Utilization Curve
              </Text>
              <Text style={[styles.cardSubtitle, { color: theme.colors.textSecondary }]}>
                Interest rate model visualization
              </Text>
              <View style={styles.chartContainer}>
                <UtilizationChart
                  interestRateConfig={mockInterestRateConfig}
                  currentUtilization={65}
                  height={300}
                  showLegend
                />
              </View>
              <View style={styles.chartNote}>
                <Text style={[styles.noteText, { color: theme.colors.textSecondary }]}>
                  The curve shows how APR changes with pool utilization. Current utilization is marked at 65%.
                </Text>
              </View>
            </Card>
          )}
        </View>

        {/* Quick Stats */}
        <View style={styles.statsGrid}>
          <Card style={[styles.statCard, { backgroundColor: theme.colors.card }]} elevated>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              Avg Supply APR
            </Text>
            <Text style={[styles.statValue, { color: '#10b981' }]}>
              5.2%
            </Text>
          </Card>

          <Card style={[styles.statCard, { backgroundColor: theme.colors.card }]} elevated>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              Avg Borrow APR
            </Text>
            <Text style={[styles.statValue, { color: '#ef4444' }]}>
              8.4%
            </Text>
          </Card>

          <Card style={[styles.statCard, { backgroundColor: theme.colors.card }]} elevated>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              Total Positions
            </Text>
            <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>
              4
            </Text>
          </Card>

          <Card style={[styles.statCard, { backgroundColor: theme.colors.card }]} elevated>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              Avg Utilization
            </Text>
            <Text style={[styles.statValue, { color: '#8b5cf6' }]}>
              65%
            </Text>
          </Card>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    paddingBottom: 12,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 12,
  },
  tabContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#8b5cf6',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    marginBottom: 16,
  },
  chartCard: {
    padding: 16,
    borderRadius: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 12,
    marginBottom: 16,
  },
  chartContainer: {
    marginVertical: 8,
  },
  chartNote: {
    marginTop: 12,
    padding: 12,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: 8,
  },
  noteText: {
    fontSize: 12,
    lineHeight: 18,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    marginBottom: 6,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
});
