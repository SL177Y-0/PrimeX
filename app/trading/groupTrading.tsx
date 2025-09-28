import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Dimensions, TextInput } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Card } from '../../components/Card';
import { GradientPillButton } from '../../components/GradientPillButton';
import { CandleChart } from '../../components/CandleChart';
import { MessageCircle, UserPlus } from 'lucide-react-native';
import { CandleData } from '../../data/mock';

interface GroupTradingContentProps {
  onBack: () => void;
}

export default function GroupTradingContent({ onBack }: GroupTradingContentProps) {
  const { theme } = useTheme();
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [chatMessage, setChatMessage] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { user: 'Alice', text: 'BTC looking bullish, thinking of adding more at 65k', time: '2m ago' },
    { user: 'Bob', text: 'Agreed! I\'m setting a buy order at 64.5k', time: '1m ago' },
  ]);
  const screenWidth = Dimensions.get('window').width;
  const isMobile = screenWidth < 768;

  // Mock candlestick data for group portfolio
  const portfolioCandleData: CandleData[] = [
    { timestamp: Date.now() - 11 * 24 * 60 * 60 * 1000, open: 45, high: 48, low: 43, close: 47, volume: 1000 },
    { timestamp: Date.now() - 10 * 24 * 60 * 60 * 1000, open: 47, high: 52, low: 46, close: 51, volume: 1200 },
    { timestamp: Date.now() - 9 * 24 * 60 * 60 * 1000, open: 51, high: 53, low: 49, close: 48, volume: 900 },
    { timestamp: Date.now() - 8 * 24 * 60 * 60 * 1000, open: 48, high: 55, low: 47, close: 54, volume: 1100 },
    { timestamp: Date.now() - 7 * 24 * 60 * 60 * 1000, open: 54, high: 57, low: 52, close: 55, volume: 1300 },
    { timestamp: Date.now() - 6 * 24 * 60 * 60 * 1000, open: 55, high: 62, low: 54, close: 61, volume: 1500 },
    { timestamp: Date.now() - 5 * 24 * 60 * 60 * 1000, open: 61, high: 65, low: 59, close: 63, volume: 1400 },
    { timestamp: Date.now() - 4 * 24 * 60 * 60 * 1000, open: 63, high: 68, low: 61, close: 67, volume: 1600 },
    { timestamp: Date.now() - 3 * 24 * 60 * 60 * 1000, open: 67, high: 71, low: 65, close: 69, volume: 1700 },
    { timestamp: Date.now() - 2 * 24 * 60 * 60 * 1000, open: 69, high: 73, low: 67, close: 72, volume: 1800 },
    { timestamp: Date.now() - 1 * 24 * 60 * 60 * 1000, open: 72, high: 76, low: 70, close: 74, volume: 1900 },
    { timestamp: Date.now(), open: 74, high: 78, low: 72, close: 76, volume: 2000 },
  ];

  const handleSendMessage = () => {
    if (chatMessage.trim()) {
      const newMessage = {
        user: 'You',
        text: chatMessage.trim(),
        time: 'now'
      };
      setChatMessages(prev => [...prev, newMessage]);
      setChatMessage('');
    }
  };

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
          title="Join"
          onPress={() => setSelectedGroup(group.id)}
          style={styles.joinButton}
        />
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
                {chatMessages.map((message, index) => (
                  <View key={index} style={styles.chatMessage}>
                    <Text style={[styles.chatUser, { color: theme.colors.textPrimary }]}>
                      {message.user}
                    </Text>
                    <Text style={[styles.chatText, { color: theme.colors.textSecondary }]}>
                      {message.text}
                    </Text>
                    <Text style={[styles.chatTime, { color: theme.colors.textSecondary }]}>
                      {message.time}
                    </Text>
                  </View>
                ))}
              </View>
              <View style={styles.chatInput}>
                <TextInput
                  style={[styles.chatInputField, { 
                    color: theme.colors.textPrimary,
                    backgroundColor: theme.colors.bg 
                  }]}
                  placeholder="Type a message..."
                  placeholderTextColor={theme.colors.textSecondary}
                  value={chatMessage}
                  onChangeText={setChatMessage}
                  multiline={false}
                />
                <Pressable onPress={handleSendMessage} style={styles.sendButton}>
                  <MessageCircle size={20} color={theme.colors.accentFrom} />
                </Pressable>
              </View>
            </Card>
          </View>

          {/* Shared Portfolio */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
              Shared Portfolio
            </Text>
            <Card style={[styles.portfolioCard, { backgroundColor: theme.colors.chip }]}>
              <View style={styles.portfolioHeader}>
                <Text style={[styles.priceValue, { color: theme.colors.textPrimary }]}>
                  {group?.roi}
                </Text>
                <Text style={[styles.priceChange, { color: theme.colors.positive }]}>
                  Group performance
                </Text>
              </View>
              <View style={[styles.chartContainer, { height: isMobile ? 200 : 240 }]}>
                <CandleChart
                  data={portfolioCandleData}
                  width={Math.min(screenWidth - 32, isMobile ? screenWidth - 16 : 500)}
                  height={isMobile ? 200 : 240}
                  showGrid={true}
                  showVolume={false}
                  showXAxis={true}
                  showYAxis={true}
                  showAxisLabels={true}
                />
              </View>
              <View style={styles.portfolioInfo}>
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


          {/* Propose Trade Button */}
          <GradientPillButton
            title="Propose Trade"
            onPress={() => {}}
            style={styles.proposeButton}
          />
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
                  Start a group and invite friends
                </Text>
              </View>
            </View>
            <GradientPillButton
              title="Create"
              onPress={() => {}}
              style={styles.createButton}
            />
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
    maxHeight: 200,
    marginBottom: 16,
  },
  chatContainerMobile: {
    maxHeight: 150,
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
    alignItems: 'center',
    gap: 12,
  },
  chatInputField: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  sendButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  portfolioHeader: {
    marginBottom: 16,
  },
  chartContainer: {
    marginBottom: 16,
  },
  portfolioInfo: {
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
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  memberItemMobile: {
    paddingVertical: 6,
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
  proposeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 16,
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