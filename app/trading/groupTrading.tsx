import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeProvider';
import { useAccent } from '../../theme/useAccent';
import { Card } from '../../components/Card';
import { GradientPillButton } from '../../components/GradientPillButton';
import { ArrowLeft, Users, MessageCircle, TrendingUp, Plus, UserPlus } from 'lucide-react-native';

interface GroupTradingContentProps {
  onBack: () => void;
}

export default function GroupTradingContent({ onBack }: GroupTradingContentProps) {
  const { theme } = useTheme();
  const accent = useAccent();
  const insets = useSafeAreaInsets();
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const screenWidth = Dimensions.get('window').width;
  const isMobile = screenWidth < 768;

  const groups = [
    {
      id: '1',
      name: 'Crypto Bulls',
      members: 24,
      roi: '+156.3%',
      description: 'Aggressive trading strategies',
      color: '#00D4AA',
      membersList: ['Alice', 'Bob', 'Charlie', 'Diana'],
    },
    {
      id: '2',
      name: 'DeFi Masters',
      members: 18,
      roi: '+89.7%',
      description: 'DeFi yield farming experts',
      color: '#6366F1',
      membersList: ['Eve', 'Frank', 'Grace', 'Henry'],
    },
    {
      id: '3',
      name: 'NFT Traders',
      members: 31,
      roi: '+203.1%',
      description: 'NFT marketplace specialists',
      color: '#8B5CF6',
      membersList: ['Ivy', 'Jack', 'Kate', 'Liam'],
    },
  ];

  const renderGroupCard = (group: any) => (
    <Card key={group.id} style={[styles.groupCard, { backgroundColor: theme.colors.chip }]}>
      <View style={styles.groupHeader}>
        <View style={styles.groupInfo}>
          <Text style={[styles.groupName, { color: theme.colors.textPrimary }]}>
            {group.name}
          </Text>
          <Text style={[styles.groupDescription, { color: theme.colors.textSecondary }]}>
            {group.description}
          </Text>
        </View>
        <View style={styles.groupMetrics}>
          <Text style={[styles.groupROI, { color: theme.colors.positive }]}>
            {group.roi}
          </Text>
          <Text style={[styles.groupMembers, { color: theme.colors.textSecondary }]}>
            {group.members} members
          </Text>
        </View>
      </View>
      
      <View style={styles.groupFooter}>
        <View style={styles.memberAvatars}>
          {group.membersList.slice(0, 3).map((member: string, index: number) => (
            <View key={index} style={[styles.memberAvatar, { backgroundColor: group.color }]}>
              <Text style={styles.memberInitial}>{member[0]}</Text>
            </View>
          ))}
          {group.members > 3 && (
            <View style={[styles.memberAvatar, { backgroundColor: theme.colors.textSecondary }]}>
              <Text style={styles.memberInitial}>+{group.members - 3}</Text>
            </View>
          )}
        </View>
        <GradientPillButton
          onPress={() => setSelectedGroup(group.id)}
          colors={[group.color, group.color]}
          style={styles.joinButton}
        >
          <Users size={16} color="#FFFFFF" />
          <Text style={styles.joinButtonText}>Join</Text>
        </GradientPillButton>
      </View>
    </Card>
  );

  if (selectedGroup) {
    const group = groups.find(g => g.id === selectedGroup);
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 20 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Group Header */}
          <View style={styles.groupDetailHeader}>
            <View style={styles.groupDetailInfo}>
              <Text style={[styles.groupDetailName, { color: theme.colors.textPrimary }]}>
                {group?.name}
              </Text>
              <Text style={[styles.groupDetailDescription, { color: theme.colors.textSecondary }]}>
                {group?.description}
              </Text>
              <View style={styles.groupDetailStats}>
                <Text style={[styles.groupDetailStat, { color: theme.colors.positive }]}>
                  {group?.roi} ROI
                </Text>
                <Text style={[styles.groupDetailStat, { color: theme.colors.textSecondary }]}>
                  • {group?.members} members
                </Text>
              </View>
            </View>
            <Pressable onPress={() => setSelectedGroup(null)} style={styles.closeButton}>
              <Text style={[styles.closeButtonText, { color: theme.colors.textSecondary }]}>✕</Text>
            </Pressable>
          </View>

          {/* Chat Panel */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
              Group Chat
            </Text>
            <Card style={[styles.chatCard, { backgroundColor: theme.colors.chip }]}>
              <View style={[styles.chatContainer, isMobile && styles.chatContainerMobile]}>
                <View style={styles.chatMessage}>
                  <Text style={[styles.chatUser, { color: theme.colors.textPrimary }]}>
                    Alice
                  </Text>
                  <Text style={[styles.chatText, { color: theme.colors.textSecondary }]}>
                    BTC looking bullish, thinking of adding more at 65k
                  </Text>
                  <Text style={[styles.chatTime, { color: theme.colors.textSecondary }]}>
                    2m ago
                  </Text>
                </View>
                <View style={styles.chatMessage}>
                  <Text style={[styles.chatUser, { color: theme.colors.textPrimary }]}>
                    Bob
                  </Text>
                  <Text style={[styles.chatText, { color: theme.colors.textSecondary }]}>
                    Agreed! I'm setting a buy order at 64.5k
                  </Text>
                  <Text style={[styles.chatTime, { color: theme.colors.textSecondary }]}>
                    1m ago
                  </Text>
                </View>
              </View>
              <View style={styles.chatInput}>
                <Text style={[styles.chatInputPlaceholder, { color: theme.colors.textSecondary }]}>
                  Type a message...
                </Text>
                <MessageCircle size={20} color={theme.colors.textSecondary} />
              </View>
            </Card>
          </View>

          {/* Shared Portfolio */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
              Shared Portfolio
            </Text>
            <Card style={[styles.portfolioCard, { backgroundColor: theme.colors.chip }]}>
              <View style={[styles.mockChart, isMobile && styles.mockChartMobile]}>
                <View style={styles.chartPrice}>
                  <Text style={[styles.priceValue, { color: theme.colors.textPrimary }]}>
                    {group?.roi}
                  </Text>
                  <Text style={[styles.priceChange, { color: theme.colors.positive }]}>
                    Group performance
                  </Text>
                </View>
                <View style={styles.chartGrid}>
                  <View style={[styles.chartLine, { backgroundColor: theme.colors.positive, height: 3 }]} />
                  <View style={[styles.chartLine, { backgroundColor: theme.colors.positive, height: 5, width: '60%' }]} />
                  <View style={[styles.chartLine, { backgroundColor: theme.colors.positive, height: 7, width: '80%' }]} />
                  <View style={[styles.chartLine, { backgroundColor: theme.colors.positive, height: 9, width: '95%' }]} />
                  <View style={[styles.chartLine, { backgroundColor: theme.colors.positive, height: 11, width: '100%' }]} />
                </View>
                <Text style={[styles.mockChartText, { color: theme.colors.textSecondary }]}>
                  📊 Portfolio Performance
                </Text>
                <Text style={[styles.mockChartSubtext, { color: theme.colors.textSecondary }]}>
                  {group?.roi} group performance
                </Text>
              </View>
            </Card>
          </View>

          {/* Member Performance */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
              Member Performance
            </Text>
            <Card style={[styles.membersCard, { backgroundColor: theme.colors.chip }]}>
              {group?.membersList.map((member: string, index: number) => (
                <View key={index} style={[styles.memberItem, isMobile && styles.memberItemMobile]}>
                  <View style={styles.memberInfo}>
                    <View style={[styles.memberAvatar, { backgroundColor: group.color }]}>
                      <Text style={styles.memberInitial}>{member[0]}</Text>
                    </View>
                    <Text style={[styles.memberName, { color: theme.colors.textPrimary }]}>
                      {member}
                    </Text>
                  </View>
                  <Text style={[styles.memberROI, { color: theme.colors.positive }]}>
                    +{(Math.random() * 200 + 50).toFixed(1)}%
                  </Text>
                </View>
              ))}
            </Card>
          </View>

          {/* Group Trades */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
              Recent Group Trades
            </Text>
            <Card style={[styles.tradesCard, { backgroundColor: theme.colors.chip }]}>
              {[
                { pair: 'BTC/USDT', trader: 'Alice', action: 'Buy', amount: '0.5 BTC', time: '1h ago' },
                { pair: 'ETH/USDT', trader: 'Bob', action: 'Sell', amount: '2.1 ETH', time: '2h ago' },
                { pair: 'SOL/USDT', trader: 'Charlie', action: 'Buy', amount: '50 SOL', time: '3h ago' },
              ].map((trade, index) => (
                <View key={index} style={[styles.tradeItem, isMobile && styles.tradeItemMobile]}>
                  <View style={styles.tradeInfo}>
                    <Text style={[styles.tradePair, { color: theme.colors.textPrimary }]}>
                      {trade.pair}
                    </Text>
                    <Text style={[styles.tradeTrader, { color: theme.colors.textSecondary }]}>
                      by {trade.trader}
                    </Text>
                  </View>
                  <View style={styles.tradeResult}>
                    <Text style={[styles.tradeAction, { 
                      color: trade.action === 'Buy' ? theme.colors.positive : theme.colors.negative 
                    }]}>
                      {trade.action}
                    </Text>
                    <Text style={[styles.tradeAmount, { color: theme.colors.textPrimary }]}>
                      {trade.amount}
                    </Text>
                    <Text style={[styles.tradeTime, { color: theme.colors.textSecondary }]}>
                      {trade.time}
                    </Text>
                  </View>
                </View>
              ))}
            </Card>
          </View>

          {/* Propose Trade Button */}
          <GradientPillButton
            onPress={() => {}}
            colors={[accent.from, accent.to]}
            style={styles.proposeButton}
          >
            <Plus size={20} color="#FFFFFF" />
            <Text style={styles.proposeButtonText}>Propose Trade</Text>
          </GradientPillButton>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
            Trading Groups
          </Text>
          <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>
            Join groups and trade together with like-minded investors
          </Text>
        </View>

        {/* Groups List */}
        <View style={styles.section}>
          {groups.map(renderGroupCard)}
        </View>

        {/* Create Group */}
        <View style={styles.section}>
          <Card style={[styles.createGroupCard, { backgroundColor: theme.colors.chip }]}>
            <View style={styles.createGroupContent}>
              <View style={[styles.createGroupIcon, { backgroundColor: theme.colors.purple }]}>
                <UserPlus size={24} color="#FFFFFF" />
              </View>
              <View style={styles.createGroupInfo}>
                <Text style={[styles.createGroupTitle, { color: theme.colors.textPrimary }]}>
                  Create Your Own Group
                </Text>
                <Text style={[styles.createGroupDescription, { color: theme.colors.textSecondary }]}>
                  Start a trading group and invite friends to join
                </Text>
              </View>
            </View>
            <GradientPillButton
              onPress={() => {}}
              colors={[theme.colors.purple, theme.colors.purple]}
              style={styles.createButton}
            >
              <Plus size={16} color="#FFFFFF" />
              <Text style={styles.createButtonText}>Create Group</Text>
            </GradientPillButton>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    lineHeight: 20,
  },
  groupCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 8,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 4,
  },
  groupDescription: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  groupMetrics: {
    alignItems: 'flex-end',
  },
  groupROI: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    marginBottom: 2,
  },
  groupMembers: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  groupFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  memberAvatars: {
    flexDirection: 'row',
  },
  memberAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -8,
    borderWidth: 2,
    borderColor: '#0D0D0D',
  },
  memberInitial: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  joinButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginLeft: 4,
  },
  groupDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    marginBottom: 20,
  },
  groupDetailInfo: {
    flex: 1,
  },
  groupDetailName: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    marginBottom: 4,
  },
  groupDetailDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    marginBottom: 8,
  },
  groupDetailStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupDetailStat: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
  },
  chatCard: {
    padding: 16,
    borderRadius: 16,
  },
  chatContainer: {
    height: 200,
    marginBottom: 16,
  },
  chatContainerMobile: {
    height: 150,
  },
  chatMessage: {
    marginBottom: 12,
  },
  chatUser: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 2,
  },
  chatText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    lineHeight: 18,
    marginBottom: 2,
  },
  chatTime: {
    fontSize: 10,
    fontFamily: 'Inter-Medium',
  },
  chatInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
  },
  chatInputPlaceholder: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  portfolioCard: {
    padding: 16,
    borderRadius: 16,
  },
  mockChart: {
    height: 150,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  mockChartMobile: {
    height: 120,
  },
  mockChartText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    marginBottom: 4,
  },
  mockChartSubtext: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  chartPrice: {
    position: 'absolute',
    top: 16,
    left: 16,
  },
  priceValue: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    marginBottom: 4,
  },
  priceChange: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
  },
  chartGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 40,
    marginVertical: 16,
    paddingHorizontal: 8,
  },
  chartLine: {
    borderRadius: 2,
    marginHorizontal: 2,
  },
  membersCard: {
    padding: 16,
    borderRadius: 16,
  },
  memberItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  memberItemMobile: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 4,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  memberName: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    marginLeft: 12,
  },
  memberROI: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
  },
  tradesCard: {
    padding: 16,
    borderRadius: 16,
  },
  tradeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  tradeItemMobile: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 4,
  },
  tradeInfo: {
    flex: 1,
  },
  tradePair: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 2,
  },
  tradeTrader: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  tradeResult: {
    alignItems: 'flex-end',
  },
  tradeAction: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 2,
  },
  tradeAmount: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    marginBottom: 2,
  },
  tradeTime: {
    fontSize: 10,
    fontFamily: 'Inter-Medium',
  },
  proposeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 20,
  },
  proposeButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  createGroupCard: {
    padding: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  createGroupContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  createGroupIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  createGroupInfo: {
    flex: 1,
  },
  createGroupTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 4,
  },
  createGroupDescription: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  createButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginLeft: 4,
  },
});