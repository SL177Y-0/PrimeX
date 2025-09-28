import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeProvider';
import { useAccent } from '../../theme/useAccent';
import { Card } from '../../components/Card';
import { GradientPillButton } from '../../components/GradientPillButton';
import { ArrowLeft, BarChart3, TrendingUp, Settings, Download, Save } from 'lucide-react-native';

interface AdvancedChartsContentProps {
  onBack: () => void;
}

export default function AdvancedChartsContent({ onBack }: AdvancedChartsContentProps) {
  const { theme } = useTheme();
  const accent = useAccent();
  const insets = useSafeAreaInsets();
  const [selectedChart, setSelectedChart] = useState('candlestick');
  const [selectedIndicator, setSelectedIndicator] = useState('rsi');
  const screenWidth = Dimensions.get('window').width;
  const isMobile = screenWidth < 768;

  const chartTypes = [
    { id: 'candlestick', name: 'Candlestick', icon: '📊' },
    { id: 'line', name: 'Line', icon: '📈' },
    { id: 'area', name: 'Area', icon: '📉' },
    { id: 'volume', name: 'Volume', icon: '📊' },
  ];

  const indicators = [
    { id: 'rsi', name: 'RSI', description: 'Relative Strength Index' },
    { id: 'macd', name: 'MACD', description: 'Moving Average Convergence Divergence' },
    { id: 'bollinger', name: 'Bollinger Bands', description: 'Price volatility indicator' },
    { id: 'sma', name: 'SMA', description: 'Simple Moving Average' },
    { id: 'ema', name: 'EMA', description: 'Exponential Moving Average' },
  ];

  const timeframes = ['1m', '5m', '15m', '1h', '4h', '1d', '1w', '1M'];

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Chart Type Selector */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
            Chart Type
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chartTypeScroll}>
            {chartTypes.map((chart) => (
              <Pressable
                key={chart.id}
                onPress={() => setSelectedChart(chart.id)}
                style={[
                  styles.chartTypeButton,
                  { backgroundColor: theme.colors.chip },
                  selectedChart === chart.id && { backgroundColor: accent.from }
                ]}
              >
                <Text style={styles.chartTypeIcon}>{chart.icon}</Text>
                <Text style={[
                  styles.chartTypeText,
                  { color: selectedChart === chart.id ? '#FFFFFF' : theme.colors.textPrimary }
                ]}>
                  {chart.name}
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
                style={[
                  styles.timeframeButton,
                  { backgroundColor: theme.colors.chip }
                ]}
              >
                <Text style={[styles.timeframeText, { color: theme.colors.textPrimary }]}>
                  {timeframe}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Main Chart */}
        <View style={styles.section}>
          <Card style={[styles.chartCard, { backgroundColor: theme.colors.chip }]}>
            <View style={styles.chartHeader}>
              <Text style={[styles.chartTitle, { color: theme.colors.textPrimary }]}>
                BTC/USDT - {selectedChart.charAt(0).toUpperCase() + selectedChart.slice(1)} Chart
              </Text>
              <View style={styles.chartControls}>
                <Pressable style={styles.chartControl}>
                  <Settings size={16} color={theme.colors.textSecondary} />
                </Pressable>
                <Pressable style={styles.chartControl}>
                  <Download size={16} color={theme.colors.textSecondary} />
                </Pressable>
              </View>
            </View>
            <View style={[styles.chartContainer, isMobile && styles.chartContainerMobile]}>
              <View style={styles.mockChart}>
                <View style={styles.chartPrice}>
                  <Text style={[styles.priceValue, { color: theme.colors.textPrimary }]}>
                    $67,890.42
                  </Text>
                  <Text style={[styles.priceChange, { color: theme.colors.positive }]}>
                    +2.34% (+$1,550.20)
                  </Text>
                </View>
                <View style={styles.chartGrid}>
                  <View style={[styles.chartLine, { backgroundColor: theme.colors.positive, height: 2 }]} />
                  <View style={[styles.chartLine, { backgroundColor: theme.colors.positive, height: 4, width: '60%' }]} />
                  <View style={[styles.chartLine, { backgroundColor: theme.colors.negative, height: 3, width: '40%' }]} />
                  <View style={[styles.chartLine, { backgroundColor: theme.colors.positive, height: 5, width: '80%' }]} />
                  <View style={[styles.chartLine, { backgroundColor: theme.colors.positive, height: 3, width: '70%' }]} />
                </View>
                <Text style={[styles.mockChartText, { color: theme.colors.textSecondary }]}>
                  📈 {selectedChart.charAt(0).toUpperCase() + selectedChart.slice(1)} Chart
                </Text>
                <Text style={[styles.mockChartSubtext, { color: theme.colors.textSecondary }]}>
                  Interactive chart with technical indicators
                </Text>
              </View>
            </View>
          </Card>
        </View>

        {/* Technical Indicators */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
            Technical Indicators
          </Text>
          <View style={[styles.indicatorsGrid, isMobile && styles.indicatorsGridMobile]}>
            {indicators.map((indicator) => (
              <Pressable
                key={indicator.id}
                onPress={() => setSelectedIndicator(indicator.id)}
                style={[
                  styles.indicatorCard,
                  { backgroundColor: theme.colors.chip },
                  selectedIndicator === indicator.id && { borderColor: accent.from, borderWidth: 1 }
                ]}
              >
                <Text style={[styles.indicatorName, { color: theme.colors.textPrimary }]}>
                  {indicator.name}
                </Text>
                <Text style={[styles.indicatorDescription, { color: theme.colors.textSecondary }]}>
                  {indicator.description}
                </Text>
                <View style={styles.indicatorValue}>
                  <Text style={[styles.indicatorValueText, { color: theme.colors.positive }]}>
                    {indicator.id === 'rsi' ? '65.4' : 
                     indicator.id === 'macd' ? '0.0023' :
                     indicator.id === 'bollinger' ? 'Upper: 68.2k' :
                     indicator.id === 'sma' ? '66.1k' : '65.8k'}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Drawing Tools */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
            Drawing Tools
          </Text>
          <Card style={[styles.toolsCard, { backgroundColor: theme.colors.chip }]}>
            <View style={[styles.toolsGrid, isMobile && styles.toolsGridMobile]}>
              {[
                { name: 'Trend Line', icon: '📏' },
                { name: 'Horizontal Line', icon: '➖' },
                { name: 'Fibonacci', icon: '🌀' },
                { name: 'Rectangle', icon: '⬜' },
                { name: 'Text', icon: '📝' },
                { name: 'Arrow', icon: '➡️' },
              ].map((tool, index) => (
                <Pressable key={index} style={styles.toolButton}>
                  <Text style={styles.toolIcon}>{tool.icon}</Text>
                  <Text style={[styles.toolName, { color: theme.colors.textPrimary }]}>
                    {tool.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Card>
        </View>

        {/* Chart Templates */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
            Chart Templates
          </Text>
          <Card style={[styles.templatesCard, { backgroundColor: theme.colors.chip }]}>
            <View style={styles.templateItem}>
              <View style={styles.templateInfo}>
                <Text style={[styles.templateName, { color: theme.colors.textPrimary }]}>
                  Scalping Setup
                </Text>
                <Text style={[styles.templateDescription, { color: theme.colors.textSecondary }]}>
                  RSI + MACD + Bollinger Bands
                </Text>
              </View>
              <Pressable style={styles.templateButton}>
                <Save size={16} color={theme.colors.textSecondary} />
              </Pressable>
            </View>
            <View style={styles.templateItem}>
              <View style={styles.templateInfo}>
                <Text style={[styles.templateName, { color: theme.colors.textPrimary }]}>
                  Swing Trading
                </Text>
                <Text style={[styles.templateDescription, { color: theme.colors.textSecondary }]}>
                  SMA + EMA + Volume
                </Text>
              </View>
              <Pressable style={styles.templateButton}>
                <Save size={16} color={theme.colors.textSecondary} />
              </Pressable>
            </View>
            <View style={styles.templateItem}>
              <View style={styles.templateInfo}>
                <Text style={[styles.templateName, { color: theme.colors.textPrimary }]}>
                  Long-term Analysis
                </Text>
                <Text style={[styles.templateDescription, { color: theme.colors.textSecondary }]}>
                  All indicators + Fibonacci
                </Text>
              </View>
              <Pressable style={styles.templateButton}>
                <Save size={16} color={theme.colors.textSecondary} />
              </Pressable>
            </View>
          </Card>
        </View>

        {/* Save Template Button */}
        <GradientPillButton
          onPress={() => {}}
          colors={[accent.from, accent.to]}
          style={styles.saveButton}
        >
          <Save size={20} color="#FFFFFF" />
          <Text style={styles.saveButtonText}>Save Current Setup</Text>
        </GradientPillButton>
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
  chartTypeScroll: {
    marginBottom: 8,
  },
  chartTypeButton: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginRight: 12,
    minWidth: 80,
  },
  chartTypeIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  chartTypeText: {
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
    height: 300,
    borderRadius: 12,
    overflow: 'hidden',
  },
  chartContainerMobile: {
    height: 200,
  },
  mockChart: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    position: 'relative',
  },
  mockChartText: {
    fontSize: 18,
    fontFamily: 'Inter-Medium',
    marginBottom: 8,
  },
  mockChartSubtext: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginBottom: 16,
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
  chartPrice: {
    position: 'absolute',
    top: 16,
    left: 16,
  },
  priceValue: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    marginBottom: 4,
  },
  priceChange: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  indicatorsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  indicatorsGridMobile: {
    flexDirection: 'column',
  },
  indicatorCard: {
    flex: 1,
    minWidth: 150,
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  indicatorName: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 4,
  },
  indicatorDescription: {
    fontSize: 10,
    fontFamily: 'Inter-Medium',
    marginBottom: 8,
  },
  indicatorValue: {
    alignItems: 'flex-end',
  },
  indicatorValueText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  },
  toolsCard: {
    padding: 16,
    borderRadius: 16,
  },
  toolsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  toolsGridMobile: {
    flexDirection: 'column',
  },
  toolButton: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    minWidth: 80,
  },
  toolIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  toolName: {
    fontSize: 10,
    fontFamily: 'Inter-Medium',
  },
  templatesCard: {
    padding: 16,
    borderRadius: 16,
  },
  templateItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  templateInfo: {
    flex: 1,
  },
  templateName: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 2,
  },
  templateDescription: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  templateButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 20,
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginLeft: 8,
  },
});