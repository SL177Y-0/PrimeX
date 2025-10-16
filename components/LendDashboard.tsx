/**
 * Aries Lending Dashboard Component
 * 
 * Main overview for Aries lending & borrowing protocol
 * Follows StakingDashboard design patterns for consistency
 */

import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
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
  Plus,
  Minus,
  ArrowDownCircle,
  ArrowUpCircle,
} from 'lucide-react-native';
import { useTheme } from '../theme/ThemeProvider';
import { useResponsive } from '../hooks/useResponsive';
import { useWallet } from '../app/providers/WalletProvider';
import { useAriesDashboard } from '../hooks/useAriesLending';
import { formatAPR } from '../utils/ariesMath';
import { PAGE_ACCENTS } from '../theme/pageAccents';
import { SupplyModal } from './SupplyModal';
import { BorrowModal } from './BorrowModal';
import { RepayModal } from './RepayModal';
import { WithdrawModal } from './WithdrawModal';
import { HealthFactorWidget } from './HealthFactorWidget';
import { EModePanel } from './EModePanel';
import { RewardsPanel } from './RewardsPanel';
import { useEMode } from '../hooks/useEMode';
import { useRewards } from '../hooks/useRewards';
import type { AriesReserve } from '../types/aries';

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

  // Modal states
  const [supplyModalVisible, setSupplyModalVisible] = useState(false);
  const [borrowModalVisible, setBorrowModalVisible] = useState(false);
  const [repayModalVisible, setRepayModalVisible] = useState(false);
  const [withdrawModalVisible, setWithdrawModalVisible] = useState(false);
  const [selectedReserve, setSelectedReserve] = useState<AriesReserve | null>(null);

  // Scroll position ref to prevent jitter
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollPositionRef = useRef(0);
  const contentHeightRef = useRef(0);
  const [isScrolling, setIsScrolling] = useState(false);

  // Use page-specific purple accent
  const pageAccent = PAGE_ACCENTS.LEND;

  const { pools, stats, userPortfolio, loading, error, refetch } = useAriesDashboard(
    connected ? account?.address : undefined
  );

  // E-Mode and Rewards hooks
  const { categories, activeCategory, enableEMode, disableEMode } = useEMode();
  const { rewards, claimReward, claimAllRewards } = useRewards();

  // Use only real data - no mocks
  const pairedReserves = pools.paired[0]?.reserves || [];
  const displayStats = stats || {
    totalValueLockedUSD: 0,
    totalSuppliedUSD: 0,
    totalBorrowedUSD: 0,
    totalReserves: 0,
    totalUsers: 0,
    averageUtilization: 0,
    pairedPoolsCount: 0,
    isolatedPoolsCount: 0,
  };
  const hasRealData = pairedReserves.length > 0 || (stats?.totalValueLockedUSD || 0) > 0;

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
  const tvlUSD = displayStats.totalValueLockedUSD;
  const totalBorrowed = displayStats.totalBorrowedUSD;
  const avgUtilization = displayStats.averageUtilization / 100; // Convert from percentage to decimal

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
        value: formatLargeNumber(displayStats.totalUsers),
        caption: 'Active positions',
        captionColor: theme.colors.purple,
      },
    ],
    [gradients, displayStats, theme.colors, pageAccent, tvlUSD, totalBorrowed, avgUtilization]
  );

  // Track scroll position to prevent jump on data update
  // MUST be before early returns to maintain hook order
  const handleScroll = useCallback((event: any) => {
    if (!isScrolling) {
      scrollPositionRef.current = event.nativeEvent.contentOffset.y;
    }
  }, [isScrolling]);

  // Restore scroll position when content changes
  const handleContentSizeChange = useCallback((width: number, height: number) => {
    const savedPosition = scrollPositionRef.current;
    
    // Only restore if content height changed and we have a saved position
    if (contentHeightRef.current !== height && savedPosition > 0 && scrollViewRef.current) {
      setIsScrolling(true);
      
      // Small delay to ensure layout is complete
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: savedPosition, animated: false });
        setIsScrolling(false);
      }, 50);
    }
    
    contentHeightRef.current = height;
  }, []);

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
      ref={scrollViewRef}
      style={[styles.container, { backgroundColor: theme.colors.bg }]}
      contentContainerStyle={[styles.scrollContent, { paddingHorizontal: spacing.md }]}
      showsVerticalScrollIndicator={false}
      onScroll={handleScroll}
      scrollEventThrottle={16}
      onContentSizeChange={handleContentSizeChange}
    >
      {/* Loading/No Data Indicator */}
      {!loading && !hasRealData && (
        <View style={[styles.demoBanner, { backgroundColor: `${pageAccent.primary}20` }]}>
          <Text style={[styles.demoText, { color: pageAccent.primary }]}>
            ⏳ Loading protocol data... Most reserves are still being deployed on mainnet.
          </Text>
        </View>
      )}

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

                {/* Action Buttons */}
                <View style={styles.reserveActions}>
                  <Pressable
                    style={[styles.actionButton, { backgroundColor: pageAccent.light }]}
                    onPress={() => {
                      setSelectedReserve(reserve);
                      setSupplyModalVisible(true);
                    }}
                  >
                    <Plus size={14} color={pageAccent.primary} />
                    <Text style={[styles.actionButtonText, { color: pageAccent.primary }]}>
                      Supply
                    </Text>
                  </Pressable>

                  <Pressable
                    style={[styles.actionButton, { backgroundColor: withAlpha(theme.colors.orange, 0.15) }]}
                    onPress={() => {
                      setSelectedReserve(reserve);
                      setBorrowModalVisible(true);
                    }}
                  >
                    <Minus size={14} color={theme.colors.orange} />
                    <Text style={[styles.actionButtonText, { color: theme.colors.orange }]}>
                      Borrow
                    </Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        ))}
      </View>

      {/* Health Factor Widget */}
      {connected && userPortfolio && (
        <View style={styles.section}>
          <HealthFactorWidget portfolio={userPortfolio} />
        </View>
      )}

      {/* E-Mode Panel - Always show when connected */}
      {connected && userPortfolio && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: '#FFFFFF' }]}>
            Efficiency Mode
          </Text>
          <EModePanel
            categories={categories}
            userPortfolio={userPortfolio}
            activeCategory={activeCategory}
            onEnableEMode={enableEMode}
            onDisableEMode={disableEMode}
          />
        </View>
      )}

      {/* Rewards Panel - Always show when connected */}
      {connected && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: '#FFFFFF' }]}>
            Rewards
          </Text>
          <RewardsPanel
            rewards={rewards}
            loading={loading}
            onClaimReward={async (rewardId) => {
              const reward = rewards.find(r => r.id === rewardId);
              if (reward && (reward.rewardType === 'supply' || reward.rewardType === 'borrow')) {
                await claimReward(reward.assetSymbol, reward.rewardType);
                refetch();
              }
            }}
            onClaimAll={async () => {
              await claimAllRewards();
              refetch();
            }}
          />
        </View>
      )}

      {/* User Positions (if connected) */}
      {connected && userPortfolio && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: '#FFFFFF' }]}>
            Your Positions
          </Text>

          {/* Supplied Assets */}
          {userPortfolio.supplies.length > 0 && (
            <View style={styles.positionsSection}>
              <Text style={[styles.positionsSectionTitle, { color: withAlpha('#FFFFFF', 0.7) }]}>
                Supplied Assets
              </Text>
              {userPortfolio.supplies.map((supply) => {
                const reserveData = currentPools
                  .flatMap(p => p.reserves)
                  .find(r => r.coinType === supply.coinType);
                if (!reserveData) return null;

                return (
                  <View key={supply.coinType} style={[styles.positionCard, { backgroundColor: withAlpha('#FFFFFF', 0.03) }]}>
                    <View style={styles.positionHeader}>
                      <Text style={[styles.positionSymbol, { color: '#FFFFFF' }]}>
                        {supply.symbol}
                      </Text>
                      <Pressable
                        style={[styles.positionAction, { backgroundColor: pageAccent.light }]}
                        onPress={() => {
                          setSelectedReserve(reserveData);
                          setWithdrawModalVisible(true);
                        }}
                      >
                        <ArrowUpCircle size={14} color={pageAccent.primary} />
                        <Text style={[styles.positionActionText, { color: pageAccent.primary }]}>
                          Withdraw
                        </Text>
                      </Pressable>
                    </View>
                    <Text style={[styles.positionAmount, { color: theme.colors.green }]}>
                      {(parseFloat(supply.amountSupplied) / Math.pow(10, reserveData.decimals)).toFixed(6)} {supply.symbol}
                    </Text>
                    <Text style={[styles.positionValue, { color: withAlpha('#FFFFFF', 0.6) }]}>
                      ${supply.amountSuppliedUSD.toFixed(2)} • APR: {formatAPR(supply.currentAPR)}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}

          {/* Borrowed Assets */}
          {userPortfolio.borrows.length > 0 && (
            <View style={styles.positionsSection}>
              <Text style={[styles.positionsSectionTitle, { color: withAlpha('#FFFFFF', 0.7) }]}>
                Borrowed Assets
              </Text>
              {userPortfolio.borrows.map((borrow) => {
                const reserveData = currentPools
                  .flatMap(p => p.reserves)
                  .find(r => r.coinType === borrow.coinType);
                if (!reserveData) return null;

                return (
                  <View key={borrow.coinType} style={[styles.positionCard, { backgroundColor: withAlpha('#FFFFFF', 0.03) }]}>
                    <View style={styles.positionHeader}>
                      <Text style={[styles.positionSymbol, { color: '#FFFFFF' }]}>
                        {borrow.symbol}
                      </Text>
                      <Pressable
                        style={[styles.positionAction, { backgroundColor: withAlpha(theme.colors.orange, 0.15) }]}
                        onPress={() => {
                          setSelectedReserve(reserveData);
                          setRepayModalVisible(true);
                        }}
                      >
                        <ArrowDownCircle size={14} color={theme.colors.orange} />
                        <Text style={[styles.positionActionText, { color: theme.colors.orange }]}>
                          Repay
                        </Text>
                      </Pressable>
                    </View>
                    <Text style={[styles.positionAmount, { color: theme.colors.orange }]}>
                      {(parseFloat(borrow.amountBorrowed) / Math.pow(10, reserveData.decimals)).toFixed(6)} {borrow.symbol}
                    </Text>
                    <Text style={[styles.positionValue, { color: withAlpha('#FFFFFF', 0.6) }]}>
                      ${borrow.amountBorrowedUSD.toFixed(2)} • APR: {formatAPR(borrow.currentAPR)}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      )}

      {/* Modals */}
      <SupplyModal
        visible={supplyModalVisible}
        reserve={selectedReserve}
        userBalance={0} // TODO: Fetch real balance
        onClose={() => setSupplyModalVisible(false)}
        onSuccess={refetch}
      />

      <BorrowModal
        visible={borrowModalVisible}
        reserve={selectedReserve}
        userPortfolio={userPortfolio}
        onClose={() => setBorrowModalVisible(false)}
        onSuccess={refetch}
      />

      <RepayModal
        visible={repayModalVisible}
        reserve={selectedReserve}
        userBalance={0} // TODO: Fetch real balance
        borrowedAmount={
          userPortfolio?.borrows.find(b => b.coinType === selectedReserve?.coinType)
            ? parseFloat(userPortfolio.borrows.find(b => b.coinType === selectedReserve?.coinType)!.amountBorrowed) / Math.pow(10, selectedReserve?.decimals || 8)
            : 0
        }
        userPortfolio={userPortfolio}
        onClose={() => setRepayModalVisible(false)}
        onSuccess={refetch}
      />

      <WithdrawModal
        visible={withdrawModalVisible}
        reserve={selectedReserve}
        suppliedAmount={
          userPortfolio?.supplies.find(s => s.coinType === selectedReserve?.coinType)
            ? parseFloat(userPortfolio.supplies.find(s => s.coinType === selectedReserve?.coinType)!.amountSupplied) / Math.pow(10, selectedReserve?.decimals || 8)
            : 0
        }
        userPortfolio={userPortfolio}
        onClose={() => setWithdrawModalVisible(false)}
        onSuccess={refetch}
      />

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
    borderRadius: 20,
    padding: 20,
    marginBottom: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
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
    borderRadius: 18,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
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
  reserveActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  positionsSection: {
    marginTop: 16,
  },
  positionsSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  positionCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  positionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  positionSymbol: {
    fontSize: 16,
    fontWeight: '700',
  },
  positionAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  positionActionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  positionAmount: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  positionValue: {
    fontSize: 13,
  },
  demoBanner: {
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    alignItems: 'center',
  },
  demoText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 18,
  },
});
