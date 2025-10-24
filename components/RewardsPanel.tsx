/**
 * Rewards Panel Component
 * 
 * Displays user's claimable rewards from Aries Markets with real data integration
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Gift, CheckCircle, DollarSign, TrendingUp, Clock, Zap } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeProvider';
// TODO: Rewards integration to be implemented
// import { ariesRewardsIntegration, UserRewards } from '../services/ariesRewardsIntegration';
type UserRewards = any; // Placeholder
import { formatUSD, formatCryptoAmount, formatPercentage } from '../utils/ariesFormatters';
import { useResponsive } from '../hooks/useResponsive';
import { PAGE_ACCENTS } from '../theme/pageAccents';
import type { UserReward } from '../services/rewardsService';

interface RewardsPanelProps {
  rewards: UserReward[];
  loading: boolean;
  onClaimReward: (rewardId: string) => Promise<void>;
  onClaimAll: () => Promise<void>;
}

interface RewardSummary {
  totalEarned: number;
  totalClaimed: number;
  totalPending: number;
  dailyRate: number;
  estimatedMonthly: number;
}

export function RewardsPanel({
  rewards,
  loading,
  onClaimReward,
  onClaimAll,
}: RewardsPanelProps) {
  const { theme } = useTheme();
  const { spacing, fontSize } = useResponsive();
  const pageAccent = PAGE_ACCENTS.LEND;

  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [claimingAll, setClaimingAll] = useState(false);

  // Calculate reward summary
  const summary: RewardSummary = useMemo(() => {
    const totalEarned = rewards.reduce((sum, r) => sum + r.amountUSD, 0);
    const totalClaimed = rewards
      .filter(r => r.claimed)
      .reduce((sum, r) => sum + r.amountUSD, 0);
    const totalPending = totalEarned - totalClaimed;

    // Estimate daily rate based on APR
    const dailyRate = rewards
      .filter(r => !r.claimed)
      .reduce((sum, r) => {
        const dailyAPR = r.apr / 365;
        return sum + (r.amountUSD * dailyAPR / 100);
      }, 0);

    const estimatedMonthly = dailyRate * 30;

    return {
      totalEarned,
      totalClaimed,
      totalPending,
      dailyRate,
      estimatedMonthly,
    };
  }, [rewards]);

  // Group rewards by type
  const groupedRewards = useMemo(() => {
    const supply = rewards.filter(r => r.rewardType === 'supply');
    const borrow = rewards.filter(r => r.rewardType === 'borrow');
    const liquidityMining = rewards.filter(r => r.rewardType === 'liquidity_mining');

    return { supply, borrow, liquidityMining };
  }, [rewards]);

  const handleClaim = useCallback(async (rewardId: string) => {
    setClaimingId(rewardId);
    try {
      await onClaimReward(rewardId);
    } catch (error) {
      console.error('[RewardsPanel] Error claiming reward:', error);
    } finally {
      setClaimingId(null);
    }
  }, [onClaimReward]);

  const handleClaimAll = useCallback(async () => {
    setClaimingAll(true);
    try {
      await onClaimAll();
    } catch (error) {
      console.error('[RewardsPanel] Error claiming all rewards:', error);
    } finally {
      setClaimingAll(false);
    }
  }, [onClaimAll]);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(2)}K`;
    return `$${value.toFixed(2)}`;
  };

  const formatAPR = (apr: number) => {
    return `${apr.toFixed(2)}%`;
  };

  const pendingRewards = rewards.filter(r => !r.claimed);
  const hasPendingRewards = pendingRewards.length > 0;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={pageAccent.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
          Loading rewards...
        </Text>
      </View>
    );
  }

  if (rewards.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Gift size={48} color={theme.colors.textSecondary} />
        <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>
          No Rewards Yet
        </Text>
        <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
          Start supplying or borrowing to earn rewards
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Gift size={22} color={pageAccent.primary} />
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
            Your Rewards
          </Text>
        </View>
        {hasPendingRewards && (
          <Pressable
            style={[styles.claimAllButton, { backgroundColor: pageAccent.primary }]}
            onPress={handleClaimAll}
            disabled={claimingAll}
          >
            {claimingAll ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <CheckCircle size={16} color="#FFFFFF" />
                <Text style={styles.claimAllText}>Claim All</Text>
              </>
            )}
          </Pressable>
        )}
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryGrid}>
        {/* Total Pending */}
        <LinearGradient
          colors={[pageAccent.primary, pageAccent.secondary] as any}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.summaryCard}
        >
          <View style={styles.summaryIcon}>
            <DollarSign size={20} color="#FFFFFF" />
          </View>
          <Text style={styles.summaryLabel}>Pending Rewards</Text>
          <Text style={styles.summaryValue}>{formatCurrency(summary.totalPending)}</Text>
        </LinearGradient>

        {/* Total Earned */}
        <View style={[styles.summaryCard, { backgroundColor: theme.colors.surface }]}>
          <View style={[styles.summaryIcon, { backgroundColor: `${theme.colors.positive}20` }]}>
            <TrendingUp size={20} color={theme.colors.positive} />
          </View>
          <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>
            Total Earned
          </Text>
          <Text style={[styles.summaryValue, { color: theme.colors.textPrimary }]}>
            {formatCurrency(summary.totalEarned)}
          </Text>
        </View>

        {/* Daily Rate */}
        <View style={[styles.summaryCard, { backgroundColor: theme.colors.surface }]}>
          <View style={[styles.summaryIcon, { backgroundColor: `${pageAccent.primary}20` }]}>
            <Clock size={20} color={pageAccent.primary} />
          </View>
          <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>
            Daily Rate
          </Text>
          <Text style={[styles.summaryValue, { color: theme.colors.textPrimary }]}>
            {formatCurrency(summary.dailyRate)}
          </Text>
        </View>

        {/* Monthly Estimate */}
        <View style={[styles.summaryCard, { backgroundColor: theme.colors.surface }]}>
          <View style={[styles.summaryIcon, { backgroundColor: `${theme.colors.orange}20` }]}>
            <Zap size={20} color={theme.colors.orange} />
          </View>
          <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>
            Est. Monthly
          </Text>
          <Text style={[styles.summaryValue, { color: theme.colors.textPrimary }]}>
            {formatCurrency(summary.estimatedMonthly)}
          </Text>
        </View>
      </View>

      {/* Pending Rewards Section */}
      {pendingRewards.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
            Claimable Rewards
          </Text>
          <View style={styles.rewardsList}>
            {pendingRewards.map((reward) => (
              <View
                key={reward.id}
                style={[styles.rewardCard, { backgroundColor: theme.colors.surface }]}
              >
                <View style={styles.rewardHeader}>
                  <View style={styles.rewardInfo}>
                    <Text style={[styles.rewardAsset, { color: theme.colors.textPrimary }]}>
                      {reward.assetSymbol}
                    </Text>
                    <View style={styles.rewardBadge}>
                      <Text style={[styles.rewardType, { color: theme.colors.textSecondary }]}>
                        {reward.rewardType === 'supply' ? 'Supply Rewards' : 
                         reward.rewardType === 'borrow' ? 'Borrow Rewards' : 
                         'Liquidity Mining'}
                      </Text>
                    </View>
                  </View>

                  <Pressable
                    style={[
                      styles.claimButton,
                      { backgroundColor: pageAccent.light },
                    ]}
                    onPress={() => handleClaim(reward.id)}
                    disabled={claimingId === reward.id}
                  >
                    {claimingId === reward.id ? (
                      <ActivityIndicator size="small" color={pageAccent.primary} />
                    ) : (
                      <Text style={[styles.claimButtonText, { color: pageAccent.primary }]}>
                        Claim
                      </Text>
                    )}
                  </Pressable>
                </View>

                <View style={styles.rewardDetails}>
                  <View style={styles.rewardStat}>
                    <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                      Amount
                    </Text>
                    <Text style={[styles.statValue, { color: theme.colors.positive }]}>
                      {formatCurrency(reward.amountUSD)}
                    </Text>
                  </View>

                  <View style={styles.rewardStat}>
                    <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                      APR
                    </Text>
                    <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>
                      {formatAPR(reward.apr)}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Claimed Rewards Section */}
      {groupedRewards.supply.filter(r => r.claimed).length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
            Claimed Rewards
          </Text>
          <View style={styles.claimedList}>
            {rewards
              .filter(r => r.claimed)
              .slice(0, 5)
              .map((reward) => (
                <View
                  key={reward.id}
                  style={[styles.claimedCard, { backgroundColor: theme.colors.elevated }]}
                >
                  <View style={styles.claimedInfo}>
                    <CheckCircle size={16} color={theme.colors.positive} />
                    <Text style={[styles.claimedAsset, { color: theme.colors.textPrimary }]}>
                      {reward.assetSymbol}
                    </Text>
                    <Text style={[styles.claimedType, { color: theme.colors.textSecondary }]}>
                      •
                    </Text>
                    <Text style={[styles.claimedType, { color: theme.colors.textSecondary }]}>
                      {reward.rewardType}
                    </Text>
                  </View>
                  <Text style={[styles.claimedAmount, { color: theme.colors.positive }]}>
                    {formatCurrency(reward.amountUSD)}
                  </Text>
                </View>
              ))}
          </View>
        </View>
      )}

      {/* Info Footer */}
      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: theme.colors.textSecondary }]}>
          Rewards are automatically calculated based on your supply and borrow positions.
          Claim anytime without affecting your positions.
        </Text>
      </View>
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
    gap: 12,
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  claimAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  claimAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  summaryCard: {
    width: '48%',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  summaryIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  summaryLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  rewardsList: {
    gap: 12,
  },
  rewardCard: {
    padding: 16,
    borderRadius: 12,
    gap: 14,
  },
  rewardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rewardInfo: {
    flex: 1,
    gap: 6,
  },
  rewardAsset: {
    fontSize: 16,
    fontWeight: '700',
  },
  rewardBadge: {
    alignSelf: 'flex-start',
  },
  rewardType: {
    fontSize: 12,
  },
  claimButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 70,
    alignItems: 'center',
  },
  claimButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  rewardDetails: {
    flexDirection: 'row',
    gap: 24,
  },
  rewardStat: {
    gap: 4,
  },
  statLabel: {
    fontSize: 11,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  claimedList: {
    gap: 8,
  },
  claimedCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
  },
  claimedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  claimedAsset: {
    fontSize: 14,
    fontWeight: '600',
  },
  claimedType: {
    fontSize: 13,
  },
  claimedAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  footer: {
    padding: 16,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    marginTop: 8,
    marginBottom: 20,
  },
  footerText: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
});
