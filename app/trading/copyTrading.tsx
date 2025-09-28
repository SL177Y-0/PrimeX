import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../theme/ThemeProvider';
import { useAccent } from '../../theme/useAccent';
import { Card } from '../../components/Card';
import { GradientPillButton } from '../../components/GradientPillButton';
import { TradingChart } from '../../components/TradingChart';
import { ArrowLeft, Copy, TrendingUp, Users, Star, Shield, Home, Wallet, Settings, X, Eye } from 'lucide-react-native';

export default function CopyTradingPage() {
  const { theme } = useTheme();
  const accent = useAccent();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [selectedTrader, setSelectedTrader] = useState<string | null>(null);
  const [showTraderProfile, setShowTraderProfile] = useState<string | null>(null);
  const screenWidth = Dimensions.get('window').width;
  const isMobile = screenWidth < 768;
  const isTablet = screenWidth >= 768 && screenWidth < 1024;
  const isDesktop = screenWidth >= 1024;

  const traders = [
    {
      id: '1',
      name: 'CryptoMaster',
      avatar: '👨‍💼',
      roi: '+247.3%',
      successRate: '89%',
      riskLevel: 'Medium',
      followers: '12.5K',
      trades: '1,247',
      color: '#00D4AA',
      chartData: [12.5, 15.2, 18.7, 22.1, 19.8, 25.3, 28.9, 31.2, 29.5, 33.1, 36.7, 40.2],
      portfolio: [
        { symbol: 'BTC', percentage: 50, color: '#F7931A' },
        { symbol: 'ETH', percentage: 30, color: '#627EEA' },
        { symbol: 'Altcoins', percentage: 20, color: '#00D4AA' }
      ],
      recentTrades: [
        { pair: 'BTC/USDT', amount: '0.5 BTC', type: 'Buy', pnl: '+$1,250', time: '2h ago' },
        { pair: 'ETH/USDT', amount: '2.1 ETH', type: 'Sell', pnl: '+$420', time: '4h ago' },
        { pair: 'SOL/USDT', amount: '50 SOL', type: 'Buy', pnl: '+$150', time: '6h ago' }
      ]
    },
    {
      id: '2',
      name: 'BitcoinBull',
      avatar: '🐂',
      roi: '+189.7%',
      successRate: '92%',
      riskLevel: 'Low',
      followers: '8.9K',
      trades: '892',
      color: '#6366F1',
      chartData: [8.2, 10.5, 12.1, 14.8, 16.3, 18.9, 21.2, 19.7, 22.1, 24.5, 26.8, 28.3],
      portfolio: [
        { symbol: 'BTC', percentage: 70, color: '#F7931A' },
        { symbol: 'ETH', percentage: 20, color: '#627EEA' },
        { symbol: 'Stablecoins', percentage: 10, color: '#26A17B' }
      ],
      recentTrades: [
        { pair: 'BTC/USDT', amount: '1.2 BTC', type: 'Buy', pnl: '+$2,100', time: '1h ago' },
        { pair: 'BTC/USDT', amount: '0.8 BTC', type: 'Sell', pnl: '+$1,400', time: '3h ago' }
      ]
    },
    {
      id: '3',
      name: 'EthereumElite',
      avatar: '⚡',
      roi: '+156.2%',
      successRate: '85%',
      riskLevel: 'High',
      followers: '15.2K',
      trades: '2,103',
      color: '#8B5CF6',
      chartData: [15.8, 18.2, 21.5, 19.3, 24.7, 27.1, 25.8, 29.2, 31.5, 28.9, 32.1, 35.4],
      portfolio: [
        { symbol: 'ETH', percentage: 45, color: '#627EEA' },
        { symbol: 'DeFi', percentage: 35, color: '#8B5CF6' },
        { symbol: 'Altcoins', percentage: 20, color: '#00D4AA' }
      ],
      recentTrades: [
        { pair: 'ETH/USDT', amount: '5.2 ETH', type: 'Buy', pnl: '+$1,800', time: '30m ago' },
        { pair: 'UNI/USDT', amount: '200 UNI', type: 'Buy', pnl: '+$320', time: '1h ago' },
        { pair: 'AAVE/USDT', amount: '50 AAVE', type: 'Sell', pnl: '+$450', time: '2h ago' }
      ]
    },
  ];

  const handleCopyTrader = (traderId: string) => {
    setSelectedTrader(traderId);
  };

  const handleViewProfile = (traderId: string) => {
    setShowTraderProfile(traderId);
  };

  const renderTraderCard = (trader: any) => (
    <Card key={trader.id} style={[
      styles.traderCard, 
      { 
        backgroundColor: theme.colors.chip,
        marginBottom: isMobile ? 16 : 20,
        padding: isMobile ? 16 : 20
      }
    ]}>
      <View style={styles.traderHeader}>
        <View style={styles.traderInfo}>
          <Text style={[styles.traderAvatar, { fontSize: isMobile ? 24 : 28 }]}>
            {trader.avatar}
          </Text>
          <View style={styles.traderDetails}>
            <Text style={[
              styles.traderName, 
              { 
                color: theme.colors.textPrimary,
                fontSize: isMobile ? 16 : 18
              }
            ]}>
              {trader.name}
            </Text>
            <View style={styles.traderStats}>
              <Text style={[styles.traderStat, { color: theme.colors.textSecondary }]}>
                {trader.followers} followers
              </Text>
              <Text style={[styles.traderStat, { color: theme.colors.textSecondary }]}>
                • {trader.trades} trades
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.traderMetrics}>
          <Text style={[styles.traderROI, { color: theme.colors.positive }]}>
            {trader.roi}
          </Text>
          <Text style={[styles.traderSuccess, { color: theme.colors.textSecondary }]}>
            {trader.successRate} success
          </Text>
        </View>
      </View>
      
      {/* Performance Chart */}
      <View style={styles.chartSection}>
        <Text style={[styles.chartTitle, { color: theme.colors.textPrimary }]}>
          Performance (6 months)
        </Text>
        <View style={[styles.chartContainer, { height: isMobile ? 80 : 100 }]}>
          <TradingChart 
            data={trader.chartData} 
            height={isMobile ? 80 : 100}
            showGrid={true}
            showLabels={!isMobile}
          />
        </View>
      </View>
      
      <View style={styles.traderFooter}>
        <View style={styles.riskLevel}>
          <Shield size={16} color={theme.colors.textSecondary} />
          <Text style={[styles.riskText, { color: theme.colors.textSecondary }]}>
            {trader.riskLevel} Risk
          </Text>
        </View>
        <View style={styles.actionButtons}>
          <Pressable
            onPress={() => handleViewProfile(trader.id)}
            style={[styles.profileButton, { backgroundColor: theme.colors.bg }]}
          >
            <Eye size={16} color={theme.colors.textPrimary} />
            <Text style={[styles.profileButtonText, { color: theme.colors.textPrimary }]}>
              Profile
            </Text>
          </Pressable>
          <GradientPillButton
            onPress={() => handleCopyTrader(trader.id)}
            colors={[accent.from, accent.to]}
            style={styles.copyButton}
          >
            <Copy size={16} color="#FFFFFF" />
            <Text style={styles.copyButtonText}>Copy Trade</Text>
          </GradientPillButton>
        </View>
      </View>
    </Card>
  );

  const renderTraderProfile = (trader: any) => (
    <View style={[styles.profileContainer, { backgroundColor: theme.colors.bg }]}>
      {/* Header */}
      <View style={[styles.profileHeader, { paddingTop: insets.top + 12 }]}>
        <Pressable 
          onPress={() => setShowTraderProfile(null)}
          style={styles.backButton}
        >
          <ArrowLeft size={24} color={theme.colors.textPrimary} />
        </Pressable>
        <Text style={[styles.profileTitle, { color: theme.colors.textPrimary }]}>
          {trader.name} Profile
        </Text>
        <Pressable 
          onPress={() => setShowTraderProfile(null)}
          style={styles.closeButton}
        >
          <X size={24} color={theme.colors.textPrimary} />
        </Pressable>
      </View>

      <ScrollView style={styles.profileScroll}>
        {/* Trader Info */}
        <Card style={[styles.profileCard, { backgroundColor: theme.colors.chip }]}>
          <View style={styles.profileInfo}>
            <Text style={[styles.profileAvatar, { fontSize: 48 }]}>{trader.avatar}</Text>
            <View style={styles.profileDetails}>
              <Text style={[styles.profileName, { color: theme.colors.textPrimary }]}>
                {trader.name}
              </Text>
              <Text style={[styles.profileStats, { color: theme.colors.textSecondary }]}>
                {trader.followers} followers • {trader.trades} trades
              </Text>
              <View style={styles.profileMetrics}>
                <View style={styles.metricItem}>
                  <Text style={[styles.metricValue, { color: theme.colors.positive }]}>
                    {trader.roi}
                  </Text>
                  <Text style={[styles.metricLabel, { color: theme.colors.textSecondary }]}>
                    ROI
                  </Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={[styles.metricValue, { color: theme.colors.textPrimary }]}>
                    {trader.successRate}
                  </Text>
                  <Text style={[styles.metricLabel, { color: theme.colors.textSecondary }]}>
                    Success Rate
                  </Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={[styles.metricValue, { color: theme.colors.textSecondary }]}>
                    {trader.riskLevel}
                  </Text>
                  <Text style={[styles.metricLabel, { color: theme.colors.textSecondary }]}>
                    Risk Level
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </Card>

        {/* Portfolio Allocation */}
        <Card style={[styles.portfolioCard, { backgroundColor: theme.colors.chip }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
            Portfolio Allocation
          </Text>
          {trader.portfolio.map((item: any, index: number) => (
            <View key={index} style={styles.portfolioItem}>
              <View style={styles.portfolioInfo}>
                <View style={[styles.portfolioDot, { backgroundColor: item.color }]} />
                <Text style={[styles.portfolioSymbol, { color: theme.colors.textPrimary }]}>
                  {item.symbol}
                </Text>
              </View>
              <Text style={[styles.portfolioPercentage, { color: theme.colors.textPrimary }]}>
                {item.percentage}%
              </Text>
            </View>
          ))}
        </Card>

        {/* Recent Trades */}
        <Card style={[styles.tradesCard, { backgroundColor: theme.colors.chip }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
            Recent Trades
          </Text>
          {trader.recentTrades.map((trade: any, index: number) => (
            <View key={index} style={styles.tradeItem}>
              <View style={styles.tradeInfo}>
                <Text style={[styles.tradePair, { color: theme.colors.textPrimary }]}>
                  {trade.pair}
                </Text>
                <Text style={[styles.tradeAmount, { color: theme.colors.textSecondary }]}>
                  {trade.amount}
                </Text>
              </View>
              <View style={styles.tradeDetails}>
                <Text style={[
                  styles.tradeType, 
                  { color: trade.type === 'Buy' ? theme.colors.positive : theme.colors.negative }
                ]}>
                  {trade.type}
                </Text>
                <Text style={[styles.tradePnl, { color: theme.colors.positive }]}>
                  {trade.pnl}
                </Text>
                <Text style={[styles.tradeTime, { color: theme.colors.textSecondary }]}>
                  {trade.time}
                </Text>
              </View>
            </View>
          ))}
        </Card>

        {/* Copy Trade Button */}
        <GradientPillButton
          onPress={() => handleCopyTrader(trader.id)}
          colors={[accent.from, accent.to]}
          style={styles.copyTradeButton}
        >
          <Copy size={20} color="#FFFFFF" />
          <Text style={styles.copyTradeButtonText}>Start Copy Trading</Text>
        </GradientPillButton>
      </ScrollView>
    </View>
  );

  if (showTraderProfile) {
    const trader = traders.find(t => t.id === showTraderProfile);
    if (trader) {
      return renderTraderProfile(trader);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable 
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <ArrowLeft size={24} color={theme.colors.textPrimary} />
        </Pressable>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
          Copy Trading
        </Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Traders Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
            Top Traders
          </Text>
          <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>
            Follow successful traders and copy their strategies
          </Text>
          
          <View style={[
            styles.tradersGrid,
            isMobile ? styles.tradersGridMobile : 
            isTablet ? styles.tradersGridTablet : 
            styles.tradersGridDesktop
          ]}>
            {traders.map(renderTraderCard)}
          </View>
        </View>

        {/* How Copy Trading Works */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
            How Copy Trading Works
          </Text>
          
          <View style={[
            styles.stepsContainer,
            isMobile ? styles.stepsContainerMobile : styles.stepsContainerDesktop
          ]}>
            <Card style={[styles.stepCard, { backgroundColor: theme.colors.chip }]}>
              <View style={[styles.stepIcon, { backgroundColor: accent.from }]}>
                <Users size={24} color="#FFFFFF" />
              </View>
              <Text style={[styles.stepTitle, { color: theme.colors.textPrimary }]}>
                Choose a Trader
              </Text>
              <Text style={[styles.stepDescription, { color: theme.colors.textSecondary }]}>
                Select from verified traders with proven track records
              </Text>
            </Card>

            <Card style={[styles.stepCard, { backgroundColor: theme.colors.chip }]}>
              <View style={[styles.stepIcon, { backgroundColor: accent.from }]}>
                <Copy size={24} color="#FFFFFF" />
              </View>
              <Text style={[styles.stepTitle, { color: theme.colors.textPrimary }]}>
                Set Your Amount
              </Text>
              <Text style={[styles.stepDescription, { color: theme.colors.textSecondary }]}>
                Decide how much you want to copy their trades
              </Text>
            </Card>

            <Card style={[styles.stepCard, { backgroundColor: theme.colors.chip }]}>
              <View style={[styles.stepIcon, { backgroundColor: accent.from }]}>
                <TrendingUp size={24} color="#FFFFFF" />
              </View>
              <Text style={[styles.stepTitle, { color: theme.colors.textPrimary }]}>
                Auto Copy Trades
              </Text>
              <Text style={[styles.stepDescription, { color: theme.colors.textSecondary }]}>
                Your account automatically mirrors their trading activity
              </Text>
            </Card>
          </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    marginBottom: 24,
    lineHeight: 22,
  },
  tradersGrid: {
    gap: 16,
  },
  tradersGridMobile: {
    flexDirection: 'column',
  },
  tradersGridTablet: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tradersGridDesktop: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  traderCard: {
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  traderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  traderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  traderAvatar: {
    marginRight: 12,
  },
  traderDetails: {
    flex: 1,
  },
  traderName: {
    fontFamily: 'Inter-Bold',
    marginBottom: 4,
  },
  traderStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  traderStat: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  traderMetrics: {
    alignItems: 'flex-end',
  },
  traderROI: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    marginBottom: 2,
  },
  traderSuccess: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  chartSection: {
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 8,
  },
  chartContainer: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  traderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  riskLevel: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  riskText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    marginLeft: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  profileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  profileButtonText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  copyButtonText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  stepsContainer: {
    gap: 16,
  },
  stepsContainerMobile: {
    flexDirection: 'column',
  },
  stepsContainerDesktop: {
    flexDirection: 'row',
  },
  stepCard: {
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    textAlign: 'center',
  },
  stepIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  stepTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 8,
    textAlign: 'center',
  },
  stepDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
    lineHeight: 20,
  },
  // Profile styles
  profileContainer: {
    flex: 1,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  profileTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
  },
  closeButton: {
    padding: 8,
    borderRadius: 8,
  },
  profileScroll: {
    flex: 1,
    paddingHorizontal: 20,
  },
  profileCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
  },
  profileInfo: {
    alignItems: 'center',
  },
  profileAvatar: {
    marginBottom: 16,
  },
  profileName: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    marginBottom: 8,
  },
  profileStats: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    marginBottom: 20,
  },
  profileMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  metricItem: {
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  portfolioCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
  },
  portfolioItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  portfolioInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  portfolioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  portfolioSymbol: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  portfolioPercentage: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  },
  tradesCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
  },
  tradeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tradeInfo: {
    flex: 1,
  },
  tradePair: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 2,
  },
  tradeAmount: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  tradeDetails: {
    alignItems: 'flex-end',
  },
  tradeType: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 2,
  },
  tradePnl: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    marginBottom: 2,
  },
  tradeTime: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  copyTradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginBottom: 20,
  },
  copyTradeButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
}
)
