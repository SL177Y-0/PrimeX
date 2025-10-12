import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  Users,
  Globe,
  Shield,
  Zap,
  BarChart3,
  Award,
} from 'lucide-react-native';
import { AMNIS_CONFIG } from '../config/constants';
import { useTheme } from '../theme/ThemeProvider';
import { useResponsive } from '../hooks/useResponsive';
import { useWallet } from '../app/providers/WalletProvider';
import {
  fetchHistoricalAPR,
  formatAPR,
  formatLargeNumber,
  getEnhancedStakingStats,
  getUserRewardSummary,
  type APRDataPoint,
  type EnhancedStakingStats,
  type UserRewardSummary,
} from '../services/amnisEnhancedService';

export function StakingDashboard() {
  const { theme } = useTheme();
  const { spacing } = useResponsive();
  const { connected, account } = useWallet();

  const [stats, setStats] = useState<EnhancedStakingStats | null>(null);
  const [aprHistory, setAprHistory] = useState<APRDataPoint[]>([]);
  const [userRewards, setUserRewards] = useState<UserRewardSummary | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState<30 | 60 | 90>(30);
  const [loading, setLoading] = useState(true);

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
    const blue = theme.colors.blue;
    return {
      tvl: [elevated, surface] as const,
      stakers: [elevated, surface] as const,
      market: [elevated, surface] as const,
      validators: [elevated, surface] as const,
      aprLiquid: [elevated, surface] as const,
      aprVault: [elevated, surface] as const,
      highlight: [withAlpha(blue, 0.7), withAlpha(blue, 0.2)] as const,
      footer: [elevated, theme.colors.bg] as const,
    };
  }, [theme.colors, withAlpha]);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const [fetchedStats, fetchedAprHistory] = await Promise.all([
        getEnhancedStakingStats(),
        fetchHistoricalAPR(selectedTimeframe),
      ]);

      setStats(fetchedStats);
      setAprHistory(fetchedAprHistory.length ? fetchedAprHistory : fetchedStats.historicalAPR ?? []);

      if (connected && account?.address) {
        try {
          const rewards = await getUserRewardSummary(account.address);
          setUserRewards(rewards);
        } catch {
          setUserRewards(null);
        }
      } else {
        setUserRewards(null);
      }
    } catch {
      // Silent fail - use defaults from AMNIS_CONFIG
    } finally {
      setLoading(false);
    }
  }, [account?.address, connected, selectedTimeframe]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const tvlUSD = stats?.tvlUSD ?? null;
  const totalStakers = stats?.totalStakers ?? null;
  const marketShare = stats?.marketShare ?? null;
  const totalValidators = stats?.totalValidators ?? null;
  const amAptAPR = stats?.currentAmAptAPR ?? null;
  const stAptAPR = stats?.currentStAptAPR ?? null;

  const heroCards = useMemo(
    () => [
      {
        key: 'tvl',
        gradient: gradients.tvl,
        icon: <TrendingUp size={22} color={theme.colors.blue} />,
        label: 'Total Value Locked',
        value: tvlUSD != null ? `$${formatLargeNumber(tvlUSD)}` : '—',
        caption: '+12.5% this month',
        captionColor: '#22C55E',
      },
      {
        key: 'stakers',
        gradient: gradients.stakers,
        icon: <Users size={22} color={theme.colors.purple} />,
        label: 'Total Stakers',
        value: totalStakers != null ? formatLargeNumber(totalStakers) : '—',
        caption: '#1 on Aptos',
        captionColor: theme.colors.blue,
      },
      {
        key: 'market',
        gradient: gradients.market,
        icon: <Globe size={22} color={theme.colors.green} />,
        label: 'Market Dominance',
        value: marketShare != null ? `${marketShare.toFixed(0)}%` : '—',
        caption: 'Liquid Staking Leader',
        captionColor: theme.colors.blue,
      },
      {
        key: 'validators',
        gradient: gradients.validators,
        icon: <Shield size={22} color={theme.colors.orange} />,
        label: 'Validators',
        value: totalValidators != null ? `${totalValidators}` : '—',
        caption: 'Whitelisted Pools',
        captionColor: '#F59E0B',
      },
    ],
    [gradients, marketShare, theme.colors, totalStakers, totalValidators, tvlUSD],
  );

  const aprCards = useMemo(
    () => [
      {
        key: 'amapt',
        gradient: gradients.aprLiquid,
        icon: <TrendingUp size={18} color={theme.colors.blue} />,
        badge: 'Liquid',
        label: 'amAPT APR',
        value: amAptAPR != null ? formatAPR(amAptAPR) : '—',
        description: '1:1 liquid staking token',
      },
      {
        key: 'stapt',
        gradient: gradients.aprVault,
        icon: <Zap size={18} color={theme.colors.purple} />,
        badge: 'Auto-Compound',
        label: 'stAPT APR',
        value: stAptAPR != null ? formatAPR(stAptAPR) : '—',
        description: 'Compounding vault rewards',
      },
    ],
    [amAptAPR, gradients.aprLiquid, gradients.aprVault, stAptAPR, theme.colors.blue, theme.colors.purple],
  );

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.bg }]}>
        <ActivityIndicator size="large" color={theme.colors.blue} />
        <Text style={styles.loadingText}>Loading Amnis Finance data…</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.bg }]}
      contentContainerStyle={[styles.scrollContent, { paddingHorizontal: spacing.md }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Protocol Overview</Text>
        <View style={styles.heroGrid}>
          {heroCards.map((card) => (
            <LinearGradient key={card.key} colors={card.gradient as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroCard}>
              <View style={[styles.heroIcon, { backgroundColor: `${theme.colors.blue}1A` }]}>{card.icon}</View>
              <Text style={styles.heroLabel}>{card.label}</Text>
              <Text style={styles.heroValue}>{card.value}</Text>
              <Text style={[styles.heroCaption, { color: card.captionColor }]}>{card.caption}</Text>
            </LinearGradient>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Annual Percentage Rate</Text>
            <Text style={styles.sectionSubtitle}>Historical performance over {selectedTimeframe} days</Text>
          </View>
          <View style={styles.timeframeBar}>
            {[30, 60].map((days) => {
              const active = selectedTimeframe === days;
              return (
                <Pressable
                  key={days}
                  onPress={() => setSelectedTimeframe(days as 30 | 60 | 90)}
                  style={[styles.timeframeButton, active && styles.timeframeButtonActive]}
                >
                  <Text style={[styles.timeframeText, active && styles.timeframeTextActive]}>{days}D</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.aprRow}>
          {aprCards.map((card) => (
            <LinearGradient key={card.key} colors={card.gradient as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.aprCard}>
              <View style={styles.aprBadge}>
                {card.icon}
                <Text style={styles.aprBadgeText}>{card.badge}</Text>
              </View>
              <Text style={styles.aprLabel}>{card.label}</Text>
              <Text style={styles.aprValue}>{card.value}</Text>
              <Text style={styles.aprDescription}>{card.description}</Text>
            </LinearGradient>
          ))}
        </View>

        {aprHistory.length > 0 && (
          <View style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <BarChart3 size={18} color={theme.colors.blue} />
              <Text style={styles.chartTitle}>APR Trend</Text>
            </View>
            <View style={styles.chartBars}>
              {aprHistory.slice(-7).map((point, index) => {
                const height = Math.max(10, Math.min(100, (point.aprStAPT / 15) * 100));
                return (
                  <LinearGradient key={index} colors={gradients.highlight as any} style={[styles.chartBar, { height: `${height}%`, opacity: 0.4 + index * 0.08 }]} />
                );
              })}
            </View>
            <Text style={styles.chartNote}>
              Last 7 days · Average {formatAPR(aprHistory.reduce((sum, point) => sum + point.aprStAPT, 0) / aprHistory.length)}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Protocol Details</Text>
        <View style={styles.detailsCard}>
          <View style={styles.detailsRow}>
            <View style={styles.detailsCol}>
              <Text style={styles.detailsLabel}>Protocol Contract</Text>
              <Text style={styles.detailsValue} numberOfLines={1}>
                {AMNIS_CONFIG.contractAddress.substring(0, 24)}…
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailsRow}>
            <View style={styles.detailsCol}>
              <Text style={styles.detailsLabel}>Performance Fee</Text>
              <Text style={styles.detailsValue}>{((stats?.performanceFee ?? 0.07) * 100).toFixed(2)}%</Text>
            </View>
            <View style={styles.detailsCol}>
              <Text style={styles.detailsLabel}>Deposit Fee</Text>
              <Text style={[styles.detailsValue, { color: '#22C55E' }]}>≤ 0.001%</Text>
            </View>
          </View>

          <View style={styles.detailsRow}>
            <View style={styles.detailsCol}>
              <Text style={styles.detailsLabel}>Unbonding Period</Text>
              <Text style={styles.detailsValue}>30 Days</Text>
            </View>
            <View style={styles.detailsCol}>
              <Text style={styles.detailsLabel}>Network Share</Text>
              <Text style={[styles.detailsValue, { color: theme.colors.blue }]}>
                {marketShare != null ? `${marketShare.toFixed(1)}%` : '—'}
              </Text>
            </View>
          </View>

          <View style={styles.detailsRow}>
            <View style={styles.detailsColFull}>
              <Text style={styles.detailsLabel}>Total APT Staked</Text>
              <Text style={styles.detailsValue}>
                {stats?.totalAptStaked ? `${formatLargeNumber(Number(stats.totalAptStaked) / 1e8)} APT` : '—'}
              </Text>
            </View>
          </View>

          {stats?.totalRewardsDistributed != null && stats.totalRewardsDistributed > 0 && (
            <>
              <View style={styles.divider} />
              <View style={styles.detailsRow}>
                <View style={styles.detailsColFull}>
                  <Text style={styles.detailsLabel}>Total Rewards Distributed</Text>
                  <Text style={[styles.detailsValue, { color: '#22C55E' }]}>
                    {formatLargeNumber(stats.totalRewardsDistributed)} APT
                  </Text>
                </View>
              </View>
            </>
          )}
        </View>
      </View>

      {connected && account && userRewards && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Rewards</Text>

          <LinearGradient colors={gradients.footer as any} style={styles.rewardsHighlight}>
            <View style={styles.rewardsHighlightHeader}>
              <Award size={22} color="#FFFFFF" />
              <Text style={styles.rewardsHighlightLabel}>Total Rewards Earned</Text>
            </View>
            <Text style={styles.rewardsHighlightValue}>{userRewards.totalRewardsEarned.toFixed(4)} APT</Text>
            <Text style={styles.rewardsHighlightSub}>≈ ${(userRewards.totalRewardsEarned * 5.0).toFixed(2)} USD</Text>
          </LinearGradient>

          <View style={styles.rewardsGrid}>
            <View style={styles.rewardCard}>
              <Text style={styles.rewardLabel}>Total Deposited</Text>
              <Text style={styles.rewardValue}>{userRewards.totalDeposited.toFixed(2)} APT</Text>
            </View>
            <View style={styles.rewardCard}>
              <Text style={styles.rewardLabel}>Current Balance</Text>
              <Text style={[styles.rewardValue, { color: '#22C55E' }]}>{userRewards.currentBalance.toFixed(2)} APT</Text>
            </View>
            <View style={styles.rewardCard}>
              <Text style={styles.rewardLabel}>Daily Average</Text>
              <Text style={[styles.rewardValue, { color: theme.colors.blue }]}>
                {userRewards.estimatedDailyReward.toFixed(4)} APT
              </Text>
            </View>
            <View style={styles.rewardCard}>
              <Text style={styles.rewardLabel}>Days Staked</Text>
              <Text style={styles.rewardValue}>{Math.floor(userRewards.daysStaked)} days</Text>
            </View>
          </View>
        </View>
      )}

      <LinearGradient colors={gradients.footer as any} style={styles.footer}>
        <View style={styles.footerIconContainer}>
          <Shield size={18} color="#FFFFFF" />
        </View>
        <View style={styles.footerTextWrapper}>
          <Text style={styles.footerTitle}>Powered by Amnis Finance</Text>
          <Text style={styles.footerSubtitle}>#1 Liquid Staking on Aptos · 82% Market Share · 417K+ Stakers</Text>
        </View>
      </LinearGradient>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0E1A',
  },
  scrollContent: {
    paddingTop: 8,
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0A0E1A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'rgba(255,255,255,0.6)',
    marginTop: 16,
    fontSize: 15,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
  sectionSubtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
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
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  heroLabel: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
  },
  heroValue: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  heroCaption: {
    fontSize: 12,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  timeframeBar: {
    flexDirection: 'row',
    gap: 10,
  },
  timeframeButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  timeframeButtonActive: {
    backgroundColor: '#4DD5FF',
  },
  timeframeText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '600',
  },
  timeframeTextActive: {
    color: '#052338',
  },
  aprRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  aprCard: {
    flex: 1,
    borderRadius: 20,
    padding: 18,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 8,
  },
  aprBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    gap: 6,
    marginBottom: 16,
  },
  aprBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  aprLabel: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 13,
    marginBottom: 10,
  },
  aprValue: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 6,
  },
  aprDescription: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 12,
  },
  chartCard: {
    marginTop: 18,
    borderRadius: 20,
    padding: 18,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 18,
  },
  chartTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  chartBars: {
    height: 120,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 10,
  },
  chartBar: {
    width: 18,
    borderRadius: 10,
  },
  chartNote: {
    marginTop: 12,
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    textAlign: 'center',
  },
  detailsCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 20,
    padding: 20,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  detailsCol: {
    flex: 1,
  },
  detailsColFull: {
    flex: 1,
  },
  detailsLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    marginBottom: 6,
  },
  detailsValue: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginVertical: 12,
  },
  rewardsHighlight: {
    borderRadius: 22,
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 10,
  },
  rewardsHighlightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  rewardsHighlightLabel: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 14,
    fontWeight: '600',
  },
  rewardsHighlightValue: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '700',
    marginBottom: 6,
  },
  rewardsHighlightSub: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
  },
  rewardsGrid: {
    marginTop: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    justifyContent: 'space-between',
  },
  rewardCard: {
    width: '48%',
    borderRadius: 18,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  rewardLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    marginBottom: 6,
  },
  rewardValue: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
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
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  footerSubtitle: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 12,
    lineHeight: 16,
  },
});
