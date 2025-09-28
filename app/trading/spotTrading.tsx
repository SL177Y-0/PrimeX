import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, Alert, Dimensions } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { useAccent } from '../../theme/useAccent';
import { Card } from '../../components/Card';
import { GradientPillButton } from '../../components/GradientPillButton';
import { CandleChart } from '../../components/CandleChart';
import { TrendingUp, TrendingDown, BarChart3 } from 'lucide-react-native';
import { CandleData } from '../../data/mock';

interface SpotTradingContentProps {
  onBack: () => void;
}

export default function SpotTradingContent({ onBack }: SpotTradingContentProps) {
  const { theme } = useTheme();
  const accent = useAccent();
  const [selectedPair, setSelectedPair] = useState('BTC/ETH');
  const [selectedTimeframe, setSelectedTimeframe] = useState('1h');
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState('');
  const [price, setPrice] = useState('');
  const screenWidth = Dimensions.get('window').width;
  const isMobile = screenWidth < 768;

  // Mock candlestick data for BTC/ETH trading
  const btcEthCandleData: CandleData[] = [
    { timestamp: Date.now() - 11 * 60 * 60 * 1000, open: 14.8, high: 15.2, low: 14.6, close: 15.1, volume: 500 },
    { timestamp: Date.now() - 10 * 60 * 60 * 1000, open: 15.1, high: 15.4, low: 14.9, close: 14.9, volume: 600 },
    { timestamp: Date.now() - 9 * 60 * 60 * 1000, open: 14.9, high: 15.3, low: 14.7, close: 15.3, volume: 550 },
    { timestamp: Date.now() - 8 * 60 * 60 * 1000, open: 15.3, high: 15.5, low: 15.0, close: 15.0, volume: 650 },
    { timestamp: Date.now() - 7 * 60 * 60 * 1000, open: 15.0, high: 15.4, low: 14.8, close: 15.4, volume: 700 },
    { timestamp: Date.now() - 6 * 60 * 60 * 1000, open: 15.4, high: 15.6, low: 15.2, close: 15.2, volume: 750 },
    { timestamp: Date.now() - 5 * 60 * 60 * 1000, open: 15.2, high: 15.5, low: 15.1, close: 15.5, volume: 800 },
    { timestamp: Date.now() - 4 * 60 * 60 * 1000, open: 15.5, high: 15.7, low: 15.3, close: 15.3, volume: 850 },
    { timestamp: Date.now() - 3 * 60 * 60 * 1000, open: 15.3, high: 15.6, low: 15.2, close: 15.6, volume: 900 },
    { timestamp: Date.now() - 2 * 60 * 60 * 1000, open: 15.6, high: 15.8, low: 15.4, close: 15.4, volume: 950 },
    { timestamp: Date.now() - 1 * 60 * 60 * 1000, open: 15.4, high: 15.7, low: 15.3, close: 15.6, volume: 1000 },
    { timestamp: Date.now(), open: 15.6, high: 15.8, low: 15.4, close: 15.42, volume: 1050 },
  ];

  const tradingPairs = [
    { pair: 'BTC/ETH', price: '15.42', change: '+2.34%', changeValue: '+0.35' },
    { pair: 'ETH/USDT', price: '2,450.00', change: '-1.25%', changeValue: '-31.00' },
    { pair: 'BTC/USDT', price: '67,890.00', change: '+0.85%', changeValue: '+575.00' },
  ];

  const timeframes = ['1m', '5m', '15m', '1h', '4h', '1d', '1w'];

  const handleTrade = () => {
    Alert.alert(
      'Trade Confirmed',
      `${tradeType === 'buy' ? 'Buy' : 'Sell'} order placed for ${amount} ${selectedPair.split('/')[0]} at ${price} ${selectedPair.split('/')[1]}`,
      [{ text: 'OK' }]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Trading Pairs */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
            Trading Pairs
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pairsScroll}>
            {tradingPairs.map((pair, index) => (
              <Pressable
                key={index}
                onPress={() => setSelectedPair(pair.pair)}
                style={[
                  styles.pairCard,
                  { backgroundColor: theme.colors.chip },
                  selectedPair === pair.pair && { borderColor: accent.from, borderWidth: 1 }
                ]}
              >
                <Text style={[styles.pairName, { color: theme.colors.textPrimary }]}>
                  {pair.pair}
                </Text>
                <Text style={[styles.pairPrice, { color: theme.colors.textPrimary }]}>
                  {pair.price}
                </Text>
                <Text style={[
                  styles.pairChange,
                  { color: pair.change.startsWith('+') ? theme.colors.positive : theme.colors.negative }
                ]}>
                  {pair.change}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Timeframe Selector */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
            Timeframe
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.timeframeScroll}>
            {timeframes.map((timeframe) => (
              <Pressable
                key={timeframe}
                onPress={() => setSelectedTimeframe(timeframe)}
                style={[
                  styles.timeframeButton,
                  { backgroundColor: theme.colors.chip },
                  selectedTimeframe === timeframe && { backgroundColor: accent.from }
                ]}
              >
                <Text style={[
                  styles.timeframeText,
                  { color: selectedTimeframe === timeframe ? '#FFFFFF' : theme.colors.textPrimary }
                ]}>
                  {timeframe}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Chart */}
        <View style={styles.section}>
          <Card style={[styles.chartCard, { backgroundColor: theme.colors.chip }]}>
            <View style={styles.chartHeader}>
              <Text style={[styles.chartTitle, { color: theme.colors.textPrimary }]}>
                {selectedPair} Chart
              </Text>
              <View style={styles.chartControls}>
                <Pressable style={styles.chartControl}>
                  <BarChart3 size={16} color={theme.colors.textSecondary} />
                </Pressable>
              </View>
            </View>
            <View style={styles.priceHeader}>
              <Text style={[styles.priceValue, { color: theme.colors.textPrimary }]}>
                $15.42
              </Text>
              <Text style={[styles.priceChange, { color: theme.colors.positive }]}>
                +2.34% (+$0.35)
              </Text>
            </View>
            <View style={[styles.chartContainer, { height: isMobile ? 240 : 280 }]}>
              <CandleChart
                data={btcEthCandleData}
                width={Math.min(screenWidth - 32, isMobile ? screenWidth - 16 : 500)}
                height={isMobile ? 240 : 280}
                showGrid={true}
                showVolume={false}
                showXAxis={true}
                showYAxis={true}
                showAxisLabels={true}
              />
            </View>
            <View style={styles.chartInfo}>
              <Text style={[styles.mockChartText, { color: theme.colors.textSecondary }]}>
                📈 {selectedPair} Chart
              </Text>
              <Text style={[styles.mockChartSubtext, { color: theme.colors.textSecondary }]}>
                {selectedTimeframe} timeframe
              </Text>
            </View>
          </Card>
        </View>

        {/* Quick Trade */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
            Quick Trade
          </Text>
          <Card style={[styles.tradeCard, { backgroundColor: theme.colors.chip }]}>
            <View style={[styles.tradeTypeSelector, isMobile && styles.tradeTypeSelectorMobile]}>
              <Pressable
                onPress={() => setTradeType('buy')}
                style={[
                  styles.tradeTypeButton,
                  { backgroundColor: tradeType === 'buy' ? theme.colors.positive : 'transparent' },
                  tradeType === 'buy' && styles.tradeTypeButtonActive
                ]}
              >
                <TrendingUp size={20} color={tradeType === 'buy' ? '#FFFFFF' : theme.colors.positive} />
                <Text style={[
                  styles.tradeTypeText,
                  { color: tradeType === 'buy' ? '#FFFFFF' : theme.colors.positive }
                ]}>
                  Buy
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setTradeType('sell')}
                style={[
                  styles.tradeTypeButton,
                  { backgroundColor: tradeType === 'sell' ? theme.colors.negative : 'transparent' },
                  tradeType === 'sell' && styles.tradeTypeButtonActive
                ]}
              >
                <TrendingDown size={20} color={tradeType === 'sell' ? '#FFFFFF' : theme.colors.negative} />
                <Text style={[
                  styles.tradeTypeText,
                  { color: tradeType === 'sell' ? '#FFFFFF' : theme.colors.negative }
                ]}>
                  Sell
                </Text>
              </Pressable>
            </View>

            <View style={[styles.tradeInputs, isMobile && styles.tradeInputsMobile]}>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                  Amount
                </Text>
                <TextInput
                  style={[styles.input, { 
                    backgroundColor: theme.colors.surface,
                    color: theme.colors.textPrimary,
                    borderColor: theme.colors.border
                  }]}
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="0.00"
                  placeholderTextColor={theme.colors.textSecondary}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                  Price
                </Text>
                <TextInput
                  style={[styles.input, { 
                    backgroundColor: theme.colors.surface,
                    color: theme.colors.textPrimary,
                    borderColor: theme.colors.border
                  }]}
                  value={price}
                  onChangeText={setPrice}
                  placeholder="0.00"
                  placeholderTextColor={theme.colors.textSecondary}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.tradeSummary}>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>
                  Total
                </Text>
                <Text style={[styles.summaryValue, { color: theme.colors.textPrimary }]}>
                  $0.00
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>
                  Fee
                </Text>
                <Text style={[styles.summaryValue, { color: theme.colors.textSecondary }]}>
                  0.1%
                </Text>
              </View>
            </View>

            <GradientPillButton
              title={`${tradeType === 'buy' ? 'Buy' : 'Sell'} ${selectedPair.split('/')[0]}`}
              onPress={handleTrade}
              style={styles.tradeButton}
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
    marginBottom: 12,
  },
  pairsScroll: {
    marginBottom: 8,
  },
  pairCard: {
    padding: 16,
    borderRadius: 12,
    marginRight: 12,
    minWidth: 120,
    alignItems: 'center',
  },
  pairName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 4,
  },
  pairPrice: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    marginBottom: 2,
  },
  pairChange: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  timeframeScroll: {
    marginBottom: 8,
  },
  timeframeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  timeframeText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  chartCard: {
    padding: 16,
    borderRadius: 16,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  chartControls: {
    flexDirection: 'row',
    gap: 8,
  },
  chartControl: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  chartContainer: {
    height: 200,
    borderRadius: 12,
    // overflow: 'hidden', // Removed to prevent SVG clipping
  },
  chartContainerMobile: {
    height: 150,
  },
  mockChart: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
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
  priceHeader: {
    marginBottom: 16,
  },
  chartInfo: {
    marginTop: 16,
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
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
  tradeCard: {
    padding: 16,
    borderRadius: 16,
  },
  tradeTypeSelector: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  tradeTypeSelectorMobile: {
    flexDirection: 'column',
    gap: 8,
  },
  tradeTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  tradeTypeButtonActive: {
    borderColor: 'transparent',
  },
  tradeTypeText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    marginLeft: 8,
  },
  tradeInputs: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  tradeInputsMobile: {
    flexDirection: 'column',
    gap: 12,
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    marginBottom: 8,
  },
  input: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
    fontFamily: 'Inter-Medium',
  },
  tradeSummary: {
    marginBottom: 20,
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  summaryValue: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  tradeButton: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 12,
  },
  tradeButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
});