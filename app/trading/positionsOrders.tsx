import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeProvider';
import { useAccent } from '../../theme/useAccent';
import { Card } from '../../components/Card';
import { GradientPillButton } from '../../components/GradientPillButton';
import { ArrowLeft, TrendingUp, TrendingDown, Clock, X, Eye } from 'lucide-react-native';

interface PositionsOrdersContentProps {
  onBack: () => void;
}

export default function PositionsOrdersContent({ onBack }: PositionsOrdersContentProps) {
  const { theme } = useTheme();
  const accent = useAccent();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState('positions');
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null);
  const screenWidth = Dimensions.get('window').width;
  const isMobile = screenWidth < 768;

  const positions = [
    {
      id: '1',
      pair: 'BTC/USDT',
      side: 'long',
      size: '0.5 BTC',
      entryPrice: '$65,420',
      currentPrice: '$67,890',
      pnl: '+$1,235.00',
      pnlPercent: '+3.78%',
      time: '2h ago',
    },
    {
      id: '2',
      pair: 'ETH/USDT',
      side: 'short',
      size: '2.1 ETH',
      entryPrice: '$2,450',
      currentPrice: '$2,380',
      pnl: '+$147.00',
      pnlPercent: '+2.86%',
      time: '4h ago',
    },
  ];

  const orders = [
    {
      id: '1',
      pair: 'SOL/USDT',
      side: 'buy',
      type: 'Limit',
      amount: '50 SOL',
      price: '$180.50',
      status: 'Open',
      time: '1h ago',
    },
    {
      id: '2',
      pair: 'ADA/USDT',
      side: 'sell',
      type: 'Stop',
      amount: '1000 ADA',
      price: '$0.45',
      status: 'Open',
      time: '3h ago',
    },
  ];

  const tabs = [
    { id: 'positions', name: 'Open Positions', count: positions.length },
    { id: 'orders', name: 'Open Orders', count: orders.length },
    { id: 'history', name: 'History', count: 0 },
  ];

  const renderPositionCard = (position: any) => (
    <Card key={position.id} style={[styles.positionCard, { backgroundColor: theme.colors.chip }]}>
      <View style={styles.positionHeader}>
        <View style={styles.positionInfo}>
          <Text style={[styles.positionPair, { color: theme.colors.textPrimary }]}>
            {position.pair}
          </Text>
          <View style={[styles.positionSide, { 
            backgroundColor: position.side === 'long' ? theme.colors.positive : theme.colors.negative 
          }]}>
            <Text style={styles.positionSideText}>
              {position.side.toUpperCase()}
            </Text>
          </View>
        </View>
        <Pressable onPress={() => setSelectedPosition(position.id)}>
          <Eye size={16} color={theme.colors.textSecondary} />
        </Pressable>
      </View>
      
      <View style={[styles.positionDetails, isMobile && styles.positionDetailsMobile]}>
        <View style={styles.positionDetail}>
          <Text style={[styles.positionLabel, { color: theme.colors.textSecondary }]}>
            Size
          </Text>
          <Text style={[styles.positionValue, { color: theme.colors.textPrimary }]}>
            {position.size}
          </Text>
        </View>
        <View style={styles.positionDetail}>
          <Text style={[styles.positionLabel, { color: theme.colors.textSecondary }]}>
            Entry
          </Text>
          <Text style={[styles.positionValue, { color: theme.colors.textPrimary }]}>
            {position.entryPrice}
          </Text>
        </View>
        <View style={styles.positionDetail}>
          <Text style={[styles.positionLabel, { color: theme.colors.textSecondary }]}>
            Current
          </Text>
          <Text style={[styles.positionValue, { color: theme.colors.textPrimary }]}>
            {position.currentPrice}
          </Text>
        </View>
      </View>

      <View style={styles.positionFooter}>
        <View style={styles.positionPnL}>
          <Text style={[styles.positionPnLValue, { color: theme.colors.positive }]}>
            {position.pnl}
          </Text>
          <Text style={[styles.positionPnLPercent, { color: theme.colors.positive }]}>
            {position.pnlPercent}
          </Text>
        </View>
        <View style={styles.positionActions}>
          <Pressable style={[styles.actionButton, { backgroundColor: theme.colors.negative }]}>
            <X size={16} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Card>
  );

  const renderOrderCard = (order: any) => (
    <Card key={order.id} style={[styles.orderCard, { backgroundColor: theme.colors.chip }]}>
      <View style={styles.orderHeader}>
        <View style={styles.orderInfo}>
          <Text style={[styles.orderPair, { color: theme.colors.textPrimary }]}>
            {order.pair}
          </Text>
          <View style={[styles.orderSide, { 
            backgroundColor: order.side === 'buy' ? theme.colors.positive : theme.colors.negative 
          }]}>
            <Text style={styles.orderSideText}>
              {order.side.toUpperCase()}
            </Text>
          </View>
        </View>
        <View style={[styles.orderStatus, { backgroundColor: theme.colors.blue }]}>
          <Text style={styles.orderStatusText}>
            {order.status}
          </Text>
        </View>
      </View>
      
      <View style={[styles.orderDetails, isMobile && styles.orderDetailsMobile]}>
        <View style={styles.orderDetail}>
          <Text style={[styles.orderLabel, { color: theme.colors.textSecondary }]}>
            Type
          </Text>
          <Text style={[styles.orderValue, { color: theme.colors.textPrimary }]}>
            {order.type}
          </Text>
        </View>
        <View style={styles.orderDetail}>
          <Text style={[styles.orderLabel, { color: theme.colors.textSecondary }]}>
            Amount
          </Text>
          <Text style={[styles.orderValue, { color: theme.colors.textPrimary }]}>
            {order.amount}
          </Text>
        </View>
        <View style={styles.orderDetail}>
          <Text style={[styles.orderLabel, { color: theme.colors.textSecondary }]}>
            Price
          </Text>
          <Text style={[styles.orderValue, { color: theme.colors.textPrimary }]}>
            {order.price}
          </Text>
        </View>
      </View>

      <View style={styles.orderFooter}>
        <Text style={[styles.orderTime, { color: theme.colors.textSecondary }]}>
          {order.time}
        </Text>
        <Pressable style={[styles.cancelButton, { backgroundColor: theme.colors.negative }]}>
          <X size={16} color="#FFFFFF" />
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </Pressable>
      </View>
    </Card>
  );

  if (selectedPosition) {
    const position = positions.find(p => p.id === selectedPosition);
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 20 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Position Detail Header */}
          <View style={styles.detailHeader}>
            <View style={styles.detailInfo}>
              <Text style={[styles.detailPair, { color: theme.colors.textPrimary }]}>
                {position?.pair}
              </Text>
              <View style={[styles.detailSide, { 
                backgroundColor: position?.side === 'long' ? theme.colors.positive : theme.colors.negative 
              }]}>
                <Text style={styles.detailSideText}>
                  {position?.side?.toUpperCase()}
                </Text>
              </View>
            </View>
            <Pressable onPress={() => setSelectedPosition(null)} style={styles.closeButton}>
              <X size={20} color={theme.colors.textSecondary} />
            </Pressable>
          </View>

          {/* Position Chart */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
              Position Chart
            </Text>
            <Card style={[styles.chartCard, { backgroundColor: theme.colors.chip }]}>
              <View style={[styles.mockChart, isMobile && styles.mockChartMobile]}>
                <Text style={[styles.mockChartText, { color: theme.colors.textSecondary }]}>
                  📈 Position Analysis
                </Text>
                <Text style={[styles.mockChartSubtext, { color: theme.colors.textSecondary }]}>
                  Entry: {position?.entryPrice} • Current: {position?.currentPrice}
                </Text>
              </View>
            </Card>
          </View>

          {/* Position Summary */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
              Position Summary
            </Text>
            <Card style={[styles.summaryCard, { backgroundColor: theme.colors.chip }]}>
              <View style={[styles.summaryRow, isMobile && styles.summaryRowMobile]}>
                <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>
                  Size
                </Text>
                <Text style={[styles.summaryValue, { color: theme.colors.textPrimary }]}>
                  {position?.size}
                </Text>
              </View>
              <View style={[styles.summaryRow, isMobile && styles.summaryRowMobile]}>
                <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>
                  Entry Price
                </Text>
                <Text style={[styles.summaryValue, { color: theme.colors.textPrimary }]}>
                  {position?.entryPrice}
                </Text>
              </View>
              <View style={[styles.summaryRow, isMobile && styles.summaryRowMobile]}>
                <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>
                  Current Price
                </Text>
                <Text style={[styles.summaryValue, { color: theme.colors.textPrimary }]}>
                  {position?.currentPrice}
                </Text>
              </View>
              <View style={[styles.summaryRow, isMobile && styles.summaryRowMobile]}>
                <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>
                  P&L
                </Text>
                <Text style={[styles.summaryValue, { color: theme.colors.positive }]}>
                  {position?.pnl} ({position?.pnlPercent})
                </Text>
              </View>
            </Card>
          </View>

          {/* Close Position Button */}
          <GradientPillButton
            onPress={() => setSelectedPosition(null)}
            colors={[theme.colors.negative, theme.colors.negative]}
            style={styles.closePositionButton}
          >
            <X size={20} color="#FFFFFF" />
            <Text style={styles.closePositionButtonText}>Close Position</Text>
          </GradientPillButton>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll}>
          {tabs.map((tab) => (
            <Pressable
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              style={[
                styles.tabButton,
                { backgroundColor: theme.colors.chip },
                activeTab === tab.id && { backgroundColor: accent.from }
              ]}
            >
              <Text style={[
                styles.tabText,
                { color: activeTab === tab.id ? '#FFFFFF' : theme.colors.textPrimary }
              ]}>
                {tab.name}
              </Text>
              {tab.count > 0 && (
                <View style={[styles.tabBadge, { backgroundColor: activeTab === tab.id ? 'rgba(255,255,255,0.2)' : theme.colors.textSecondary }]}>
                  <Text style={[styles.tabBadgeText, { color: activeTab === tab.id ? '#FFFFFF' : theme.colors.bg }]}>
                    {tab.count}
                  </Text>
                </View>
              )}
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'positions' && (
          <View style={styles.section}>
            {positions.length > 0 ? (
              positions.map(renderPositionCard)
            ) : (
              <Card style={[styles.emptyCard, { backgroundColor: theme.colors.chip }]}>
                <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                  No open positions
                </Text>
              </Card>
            )}
          </View>
        )}

        {activeTab === 'orders' && (
          <View style={styles.section}>
            {orders.length > 0 ? (
              orders.map(renderOrderCard)
            ) : (
              <Card style={[styles.emptyCard, { backgroundColor: theme.colors.chip }]}>
                <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                  No open orders
                </Text>
              </Card>
            )}
          </View>
        )}

        {activeTab === 'history' && (
          <View style={styles.section}>
            <Card style={[styles.emptyCard, { backgroundColor: theme.colors.chip }]}>
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                No trade history
              </Text>
            </Card>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  tabScroll: {
    marginBottom: 8,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  tabText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  tabBadge: {
    marginLeft: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  tabBadgeText: {
    fontSize: 10,
    fontFamily: 'Inter-Bold',
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
    marginBottom: 12,
  },
  positionCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  positionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  positionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  positionPair: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    marginRight: 8,
  },
  positionSide: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  positionSideText: {
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  positionDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  positionDetailsMobile: {
    flexDirection: 'column',
    gap: 8,
  },
  positionDetail: {
    alignItems: 'center',
  },
  positionLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    marginBottom: 2,
  },
  positionValue: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  positionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  positionPnL: {
    alignItems: 'flex-start',
  },
  positionPnLValue: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    marginBottom: 2,
  },
  positionPnLPercent: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
  },
  positionActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  actionButtonText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginLeft: 4,
  },
  orderCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderPair: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    marginRight: 8,
  },
  orderSide: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  orderSideText: {
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  orderStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  orderStatusText: {
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  orderDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  orderDetailsMobile: {
    flexDirection: 'column',
    gap: 8,
  },
  orderDetail: {
    alignItems: 'center',
  },
  orderLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    marginBottom: 2,
  },
  orderValue: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderTime: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  cancelButtonText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginLeft: 4,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    marginBottom: 20,
  },
  detailInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailPair: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    marginRight: 12,
  },
  detailSide: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  detailSideText: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  closeButton: {
    padding: 8,
  },
  chartCard: {
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
  summaryCard: {
    padding: 16,
    borderRadius: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  summaryRowMobile: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 4,
  },
  summaryLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  summaryValue: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  closePositionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 20,
  },
  closePositionButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  emptyCard: {
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
  },
});