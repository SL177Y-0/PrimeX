/**
 * Aries Lending Dashboard Component
 * 
 * Main overview for Aries lending & borrowing protocol
 * Follows StakingDashboard design patterns for consistency
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  TrendingUp,
  TrendingDown,
  Percent,
  DollarSign,
  BarChart3,
  Users,
  Layers,
} from 'lucide-react-native';
import { useTheme } from '../theme/ThemeProvider';
import { useResponsive } from '../hooks/useResponsive';
import { useWallet } from '../app/providers/WalletProvider';
import { useAriesDashboard } from '../hooks/useAriesLending';
import { formatAPR } from '../utils/ariesMath';
import { PAGE_ACCENTS } from '../theme/pageAccents';

function formatLargeNumber(num: number): string {
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(2)}B`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(2)}K`;
  return num.toFixed(2);
}

export function LendDashboard() {
  const { theme } = useTheme();
  const { spacing } = useResponsive();
  const { connected, account } = useWallet();
  const [selectedPoolType, setSelectedPoolType] = useState<'paired' | 'isolated'>('paired');

  // Use page-specific purple accent
  const pageAccent = PAGE_ACCENTS.LEND;

  const { pools, stats, userPortfolio, loading, error, refetch } = useAriesDashboard(
    connected ? account?.address : undefined
  );

  const withAlpha = useCallback((hex: string, alpha: number) => {
    const normalized = hex.replace('#', '');
    const bigint = parseInt(normalized, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }, []);

  const gradients = useMemo(() => {
    const surface = theme.colors.surface;
    const elevated = theme.colors.elevated;
    return {
      card: [elevated, surface] as const,
      highlight: pageAccent.gradient as readonly [string, string],
      footer: [elevated, theme.colors.bg] as const,
    };
  }, [theme.colors, pageAccent]);

  const currentPools = selectedPoolType === 'paired' ? pools.paired : pools.isolated;
  const tvlUSD = stats?.totalValueLockedUSD ?? 75_000_000;
  const totalBorrowed = stats?.totalBorrowedUSD ?? 36_000_000;
  const avgUtilization = stats?.averageUtilization ?? 0.48;

  // Protocol KPIs
  const heroCards = useMemo(
    () => [
      {
        key: 'tvl',
        gradient: gradients.card,
        icon: <DollarSign size={22} color={pageAccent.primary} />,
        label: 'Total Value Locked',
        value: `$${formatLargeNumber(tvlUSD)}`,
        caption: 'Across all pools',
        captionColor: pageAccent.primary,
      },
      {
        key: 'borrowed',
        gradient: gradients.card,
        icon: <TrendingDown size={22} color={theme.colors.orange} />,
        label: 'Total Borrowed',
        value: `$${formatLargeNumber(totalBorrowed)}`,
        caption: `${((totalBorrowed / tvlUSD) * 100).toFixed(1)}% of TVL`,
        captionColor: theme.colors.orange,
      },
      {
        key: 'utilization',
        gradient: gradients.card,
        icon: <Percent size={22} color={pageAccent.secondary} />,
        label: 'Avg Utilization',
        value: `${(avgUtilization * 100).toFixed(1)}%`,
        caption: 'Protocol-wide',
        captionColor: pageAccent.secondary,
      },
      {
        key: 'users',
        gradient: gradients.card,
        icon: <Users size={22} color={theme.colors.purple} />,
        label: 'Total Users',
        value: formatLargeNumber(stats?.totalUsers ?? 12000),
        caption: 'Active positions',
        captionColor: theme.colors.purple,
      },
    ],
    [gradients, stats, theme.colors, pageAccent, tvlUSD, totalBorrowed, avgUtilization]
  );

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.bg }]}>
        <ActivityIndicator size="large" color={pageAccent.primary} />
        <Text style={[styles.loadingText, { color: withAlpha('#FFFFFF', 0.6) }]}>
          Loading…
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.bg }]}>
        <Text style={[styles.errorText, { color: theme.colors.orange }]}>
          {error}
        </Text>
        <Pressable onPress={refetch} style={styles.retryButton}>
          <Text style={{ color: pageAccent.primary }}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.bg }]}
      contentContainerStyle={[styles.scrollContent, { paddingHorizontal: spacing.md }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Protocol Overview */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: '#FFFFFF' }]}>Protocol Overview</Text>
        <View style={styles.heroGrid}>
          {heroCards.map((card) => (
            <LinearGradient
              key={card.key}
              colors={card.gradient as any}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroCard}
            >
              <View
                style={[
                  styles.heroIcon,
                  { backgroundColor: pageAccent.light },
                ]}
              >
                {card.icon}
              </View>
              <Text style={[styles.heroLabel, { color: withAlpha('#FFFFFF', 0.78) }]}>
                {card.label}
              </Text>
              <Text style={[styles.heroValue, { color: '#FFFFFF' }]}>{card.value}</Text>
              <Text style={[styles.heroCaption, { color: card.captionColor }]}>
                {card.caption}
              </Text>
            </LinearGradient>
          ))}
        </View>
      </View>

      {/* Pool Type Selector */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: '#FFFFFF' }]}>Lending Pools</Text>
          <View style={styles.poolTypeSelector}>
            <Pressable
              onPress={() => setSelectedPoolType('paired')}
              style={[
                styles.poolTypeButton,
                selectedPoolType === 'paired' && {
                  backgroundColor: pageAccent.primary,
                },
              ]}
            >
              <Text
                style={[
                  styles.poolTypeText,
                  {
                    color:
                      selectedPoolType === 'paired'
                        ? '#052338'
                        : withAlpha('#FFFFFF', 0.6),
                  },
                ]}
              >
                Paired
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setSelectedPoolType('isolated')}
              style={[
                styles.poolTypeButton,
                selectedPoolType === 'isolated' && {
                  backgroundColor: pageAccent.primary,
                },
              ]}
            >
              <Text
                style={[
                  styles.poolTypeText,
                  {
                    color:
                      selectedPoolType === 'isolated'
                        ? '#052338'
                        : withAlpha('#FFFFFF', 0.6),
                  },
                ]}
              >
                Isolated
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Pool Cards */}
        {currentPools.map((pool) => (
          <View
            key={pool.poolId}
            style={[
              styles.poolCard,
              { backgroundColor: withAlpha('#FFFFFF', 0.03) },
            ]}
          >
            <View style={styles.poolHeader}>
              <View style={styles.poolHeaderLeft}>
                <Layers size={20} color={pageAccent.primary} />
                <Text style={[styles.poolName, { color: '#FFFFFF' }]}>
                  {pool.name}
                </Text>
              </View>
              <View
                style={[
                  styles.poolTypeBadge,
                  {
                    backgroundColor:
                      pool.type === 'paired'
                        ? pageAccent.light
                        : withAlpha(theme.colors.purple, 0.2),
                  },
                ]}
              >
                <Text
                  style={[
                    styles.poolTypeBadgeText,
                    {
                      color:
                        pool.type === 'paired'
                          ? pageAccent.primary
                          : theme.colors.purple,
                    },
                  ]}
                >
                  {pool.type === 'paired' ? 'Cross-Margin' : 'Isolated'}
                </Text>
              </View>
            </View>

            {/* Pool Reserves */}
            {pool.reserves.map((reserve) => (
              <View key={reserve.coinType} style={styles.reserveRow}>
                <View style={styles.reserveInfo}>
                  <Text style={[styles.reserveSymbol, { color: '#FFFFFF' }]}>
                    {reserve.symbol}
                  </Text>
                  <Text
                    style={[styles.reserveName, { color: withAlpha('#FFFFFF', 0.6) }]}
                  >
                    {reserve.name}
                  </Text>
                </View>

                <View style={styles.reserveMetrics}>
                  <View style={styles.metricItem}>
                    <Text
                      style={[styles.metricLabel, { color: withAlpha('#FFFFFF', 0.6) }]}
                    >
                      Supply APR
                    </Text>
                    <Text style={[styles.metricValue, { color: theme.colors.green }]}>
                      {formatAPR(reserve.supplyAPR)}
                    </Text>
                  </View>

                  <View style={styles.metricItem}>
                    <Text
                      style={[styles.metricLabel, { color: withAlpha('#FFFFFF', 0.6) }]}
                    >
                      Borrow APR
                    </Text>
                    <Text style={[styles.metricValue, { color: theme.colors.orange }]}>
                      {formatAPR(reserve.borrowAPR)}
                    </Text>
                  </View>

                  <View style={styles.metricItem}>
                    <Text
                      style={[styles.metricLabel, { color: withAlpha('#FFFFFF', 0.6) }]}
                    >
                      Utilization
                    </Text>
                    <Text style={[styles.metricValue, { color: '#FFFFFF' }]}>
                      {(reserve.utilization * 100).toFixed(1)}%
                    </Text>
                  </View>
                </View>

                {/* Utilization Bar */}
                <View
                  style={[
                    styles.utilizationBar,
                    { backgroundColor: withAlpha('#FFFFFF', 0.1) },
                  ]}
                >
                  <LinearGradient
                    colors={[theme.colors.green, pageAccent.primary] as any}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[
                      styles.utilizationFill,
                      { width: `${Math.min(100, reserve.utilization * 100)}%` },
                    ]}
                  />
                </View>
              </View>
            ))}
          </View>
        ))}
      </View>

      {/* User Positions (if connected) */}
      {connected && userPortfolio && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: '#FFFFFF' }]}>
            Your Positions
          </Text>

          <LinearGradient
            colors={gradients.highlight as any}
            style={styles.positionsCard}
          >
            <View style={styles.positionsHeader}>
              <BarChart3 size={22} color="#FFFFFF" />
              <Text style={[styles.positionsTitle, { color: '#FFFFFF' }]}>
                Health Factor: {userPortfolio.healthFactor.toFixed(2)}
              </Text>
            </View>

            <View style={styles.positionsStats}>
              <View style={styles.positionStat}>
                <Text
                  style={[styles.positionStatLabel, { color: withAlpha('#FFFFFF', 0.7) }]}
                >
                  Supplied
                </Text>
                <Text style={[styles.positionStatValue, { color: theme.colors.green }]}>
                  ${userPortfolio.totalSuppliedUSD.toFixed(2)}
                </Text>
              </View>

              <View style={styles.positionStat}>
                <Text
                  style={[styles.positionStatLabel, { color: withAlpha('#FFFFFF', 0.7) }]}
                >
                  Borrowed
                </Text>
                <Text style={[styles.positionStatValue, { color: theme.colors.orange }]}>
                  ${userPortfolio.totalBorrowedUSD.toFixed(2)}
                </Text>
              </View>

              <View style={styles.positionStat}>
                <Text
                  style={[styles.positionStatLabel, { color: withAlpha('#FFFFFF', 0.7) }]}
                >
                  Net APR
                </Text>
                <Text style={[styles.positionStatValue, { color: '#FFFFFF' }]}>
                  {formatAPR(userPortfolio.netAPR)}
                </Text>
              </View>
            </View>
          </LinearGradient>
        </View>
      )}

      {/* Footer */}
      <View style={{
        alignItems: 'center',
        paddingVertical: spacing.md,
        marginTop: spacing.md,
      }}>
        <Text style={{
          color: 'rgba(255,255,255,0.35)',
          fontSize: 11,
          textAlign: 'center',
          fontFamily: 'Inter-Medium',
        }}>
          Powered by{' '}
          <Text style={{
            color: pageAccent.primary,
            fontFamily: 'Inter-SemiBold',
          }}>
            Aries Markets
          </Text>
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 8,
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
  },
  errorText: {
    fontSize: 15,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(77, 213, 255, 0.1)',
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  heroCard: {
    width: '48%',
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 8,
  },
  heroIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  heroLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
  },
  heroValue: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  heroCaption: {
    fontSize: 12,
    fontWeight: '600',
  },
  poolTypeSelector: {
    flexDirection: 'row',
    gap: 10,
  },
  poolTypeButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  poolTypeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  poolCard: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
  },
  poolHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  poolHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  poolName: {
    fontSize: 18,
    fontWeight: '700',
  },
  poolTypeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  poolTypeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  reserveRow: {
    marginBottom: 20,
  },
  reserveInfo: {
    marginBottom: 12,
  },
  reserveSymbol: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
  },
  reserveName: {
    fontSize: 13,
  },
  reserveMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  metricItem: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 11,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  utilizationBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  utilizationFill: {
    height: '100%',
    borderRadius: 3,
  },
  positionsCard: {
    borderRadius: 22,
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 10,
  },
  positionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  positionsTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  positionsStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  positionStat: {
    flex: 1,
  },
  positionStatLabel: {
    fontSize: 12,
    marginBottom: 6,
  },
  positionStatValue: {
    fontSize: 17,
    fontWeight: '700',
  },
  footer: {
    marginTop: 32,
    borderRadius: 22,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  footerIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerTextWrapper: {
    flex: 1,
  },
  footerTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  footerSubtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
});
