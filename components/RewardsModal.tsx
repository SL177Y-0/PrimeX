/**
 * Rewards Modal Component
 * 
 * Modal for displaying and claiming user rewards
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { X, Gift, TrendingUp, Clock, DollarSign } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeProvider';
import { useRewards, useRewardHistory } from '../hooks/useRewards';
import { formatUSD, formatPercent } from '../utils/usdHelpers';
import { Card } from './Card';

interface RewardsModalProps {
  visible: boolean;
  onClose: () => void;
  userAddress?: string;
}

export function RewardsModal({ visible, onClose, userAddress }: RewardsModalProps) {
  const { theme } = useTheme();
  const { rewards, summary, loading, claiming, claimReward, claimAllRewards } = useRewards();
  const { history } = useRewardHistory(userAddress, 7);
  const [activeTab, setActiveTab] = useState<'overview' | 'history'>('overview');

  const handleClaimReward = async (assetSymbol: string, rewardType: 'supply' | 'borrow') => {
    try {
      await claimReward(assetSymbol, rewardType);
      Alert.alert('Success', `${assetSymbol} ${rewardType} rewards claimed successfully!`);
    } catch (error: any) {
      Alert.alert('Error', `Failed to claim rewards: ${error.message}`);
    }
  };

  const handleClaimAll = async () => {
    try {
      await claimAllRewards();
      Alert.alert('Success', 'All rewards claimed successfully!');
    } catch (error: any) {
      Alert.alert('Error', `Failed to claim rewards: ${error.message}`);
    }
  };

  const pendingRewards = rewards.filter(r => !r.claimed);
  const totalPendingUSD = pendingRewards.reduce((sum, r) => sum + r.amountUSD, 0);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <View style={styles.headerLeft}>
            <Gift size={24} color={theme.colors.textPrimary} />
            <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
              Rewards
            </Text>
          </View>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <X size={24} color={theme.colors.textSecondary} />
          </Pressable>
        </View>

        {/* Tab Selector */}
        <View style={styles.tabContainer}>
          {[
            { key: 'overview', label: 'Overview' },
            { key: 'history', label: 'History' },
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
                    color: activeTab === tab.key ? '#fff' : theme.colors.textSecondary,
                  },
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {activeTab === 'overview' && (
            <>
              {/* Summary Cards */}
              {summary && (
                <View style={styles.summaryGrid}>
                  <Card style={[styles.summaryCard, { backgroundColor: theme.colors.card }]} elevated>
                    <DollarSign size={20} color="#10b981" />
                    <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>
                      Total Earned
                    </Text>
                    <Text style={[styles.summaryValue, { color: '#10b981' }]}>
                      {formatUSD(summary.totalEarned)}
                    </Text>
                  </Card>

                  <Card style={[styles.summaryCard, { backgroundColor: theme.colors.card }]} elevated>
                    <Clock size={20} color="#f59e0b" />
                    <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>
                      Pending
                    </Text>
                    <Text style={[styles.summaryValue, { color: '#f59e0b' }]}>
                      {formatUSD(summary.totalPending)}
                    </Text>
                  </Card>

                  <Card style={[styles.summaryCard, { backgroundColor: theme.colors.card }]} elevated>
                    <TrendingUp size={20} color="#8b5cf6" />
                    <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>
                      Daily Rate
                    </Text>
                    <Text style={[styles.summaryValue, { color: '#8b5cf6' }]}>
                      {formatUSD(summary.dailyRate)}
                    </Text>
                  </Card>
                </View>
              )}

              {/* Claim All Button */}
              {pendingRewards.length > 0 && (
                <Pressable
                  onPress={handleClaimAll}
                  disabled={!!claiming}
                  style={[
                    styles.claimAllButton,
                    { backgroundColor: '#8b5cf6' },
                    claiming && styles.claimAllButtonDisabled,
                  ]}
                >
                  {claiming ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Gift size={20} color="#fff" />
                      <Text style={styles.claimAllText}>
                        Claim All ({formatUSD(totalPendingUSD)})
                      </Text>
                    </>
                  )}
                </Pressable>
              )}

              {/* Rewards List */}
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#8b5cf6" />
                  <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
                    Loading rewards...
                  </Text>
                </View>
              ) : rewards.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Gift size={48} color={theme.colors.textSecondary} />
                  <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>
                    No Rewards Yet
                  </Text>
                  <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
                    Start supplying or borrowing to earn rewards
                  </Text>
                </View>
              ) : (
                <View style={styles.rewardsList}>
                  {rewards.map((reward) => (
                    <Card
                      key={reward.id}
                      style={[styles.rewardCard, { backgroundColor: theme.colors.card }]}
                      elevated
                    >
                      <View style={styles.rewardHeader}>
                        <View>
                          <Text style={[styles.rewardAsset, { color: theme.colors.textPrimary }]}>
                            {reward.assetSymbol}
                          </Text>
                          <Text style={[styles.rewardType, { color: theme.colors.textSecondary }]}>
                            {reward.rewardType === 'supply' ? 'Supply Rewards' : 'Borrow Rewards'}
                          </Text>
                        </View>
                        <View style={styles.rewardAmounts}>
                          <Text style={[styles.rewardAmount, { color: theme.colors.textPrimary }]}>
                            {formatUSD(reward.amountUSD)}
                          </Text>
                          <Text style={[styles.rewardAPR, { color: '#10b981' }]}>
                            {formatPercent(reward.apr)} APR
                          </Text>
                        </View>
                      </View>

                      {!reward.claimed && (
                        <Pressable
                          onPress={() => handleClaimReward(reward.assetSymbol, reward.rewardType)}
                          disabled={claiming === `${reward.assetSymbol}_${reward.rewardType}`}
                          style={[
                            styles.claimButton,
                            { backgroundColor: '#10b981' },
                            claiming === `${reward.assetSymbol}_${reward.rewardType}` && styles.claimButtonDisabled,
                          ]}
                        >
                          {claiming === `${reward.assetSymbol}_${reward.rewardType}` ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <Text style={styles.claimButtonText}>Claim</Text>
                          )}
                        </Pressable>
                      )}

                      {reward.claimed && (
                        <View style={[styles.claimedBadge, { backgroundColor: theme.colors.bg }]}>
                          <Text style={[styles.claimedText, { color: theme.colors.textSecondary }]}>
                            Claimed
                          </Text>
                        </View>
                      )}
                    </Card>
                  ))}
                </View>
              )}
            </>
          )}

          {activeTab === 'history' && (
            <View style={styles.historyContainer}>
              {history.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Clock size={48} color={theme.colors.textSecondary} />
                  <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>
                    No History Yet
                  </Text>
                  <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
                    Reward history will appear here
                  </Text>
                </View>
              ) : (
                history.map((entry, index) => (
                  <Card
                    key={index}
                    style={[styles.historyCard, { backgroundColor: theme.colors.card }]}
                    elevated
                  >
                    <View style={styles.historyHeader}>
                      <Text style={[styles.historyDate, { color: theme.colors.textPrimary }]}>
                        {new Date(entry.date).toLocaleDateString()}
                      </Text>
                      <Text style={[styles.historyAmount, { color: '#10b981' }]}>
                        {formatUSD(entry.amountUSD)}
                      </Text>
                    </View>
                  </Card>
                ))
              )}
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
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
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    minWidth: '30%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
  },
  summaryLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  claimAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 20,
  },
  claimAllButtonDisabled: {
    opacity: 0.6,
  },
  claimAllText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  rewardsList: {
    gap: 12,
  },
  rewardCard: {
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  rewardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rewardAsset: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  rewardType: {
    fontSize: 12,
    marginTop: 2,
  },
  rewardAmounts: {
    alignItems: 'flex-end',
  },
  rewardAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  rewardAPR: {
    fontSize: 12,
    marginTop: 2,
  },
  claimButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  claimButtonDisabled: {
    opacity: 0.6,
  },
  claimButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  claimedBadge: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  claimedText: {
    fontSize: 12,
    fontWeight: '600',
  },
  historyContainer: {
    gap: 12,
  },
  historyCard: {
    padding: 16,
    borderRadius: 12,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyDate: {
    fontSize: 14,
    fontWeight: '500',
  },
  historyAmount: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});
