import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Dimensions } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { useAccent } from '../../theme/useAccent';
import { Card } from '../../components/Card';
import { GradientPillButton } from '../../components/GradientPillButton';
import { CandleChart } from '../../components/CandleChart';
import { TradingChart } from '../../components/TradingChart';
import { Settings, Download, Save } from 'lucide-react-native';
import { CandleData } from '../../data/mock';

interface AdvancedChartsContentProps {
  onBack: () => void;
}

export default function AdvancedChartsContent({ onBack }: AdvancedChartsContentProps) {
  const { theme } = useTheme();
  const accent = useAccent();
  const [selectedChart, setSelectedChart] = useState('candlestick');
  const [selectedIndicator, setSelectedIndicator] = useState('rsi');
  const screenWidth = Dimensions.get('window').width;
  const isMobile = screenWidth < 768;

  // Different chart data for each chart type
  const candlestickData: CandleData[] = [
    { timestamp: Date.now() - 23 * 60 * 60 * 1000, open: 64500, high: 65200, low: 64200, close: 64800, volume: 800 },
    { timestamp: Date.now() - 22 * 60 * 60 * 1000, open: 64800, high: 65500, low: 64500, close: 65100, volume: 900 },
    { timestamp: Date.now() - 21 * 60 * 60 * 1000, open: 65100, high: 65800, low: 64800, close: 65400, volume: 950 },
    { timestamp: Date.now() - 20 * 60 * 60 * 1000, open: 65400, high: 66100, low: 65100, close: 65700, volume: 1000 },
    { timestamp: Date.now() - 19 * 60 * 60 * 1000, open: 65700, high: 66400, low: 65400, close: 66000, volume: 1050 },
    { timestamp: Date.now() - 18 * 60 * 60 * 1000, open: 66000, high: 66700, low: 65700, close: 66300, volume: 1100 },
    { timestamp: Date.now() - 17 * 60 * 60 * 1000, open: 66300, high: 67000, low: 66000, close: 66600, volume: 1150 },
    { timestamp: Date.now() - 16 * 60 * 60 * 1000, open: 66600, high: 67300, low: 66300, close: 66900, volume: 1200 },
    { timestamp: Date.now() - 15 * 60 * 60 * 1000, open: 66900, high: 67600, low: 66600, close: 67200, volume: 1250 },
    { timestamp: Date.now() - 14 * 60 * 60 * 1000, open: 67200, high: 67900, low: 66900, close: 67500, volume: 1300 },
    { timestamp: Date.now() - 13 * 60 * 60 * 1000, open: 67500, high: 68200, low: 67200, close: 67800, volume: 1350 },
    { timestamp: Date.now() - 12 * 60 * 60 * 1000, open: 67800, high: 68500, low: 67500, close: 68100, volume: 1400 },
    { timestamp: Date.now() - 11 * 60 * 60 * 1000, open: 68100, high: 68800, low: 67800, close: 68400, volume: 1450 },
    { timestamp: Date.now() - 10 * 60 * 60 * 1000, open: 68400, high: 69100, low: 68100, close: 68700, volume: 1500 },
    { timestamp: Date.now() - 9 * 60 * 60 * 1000, open: 68700, high: 69400, low: 68400, close: 69000, volume: 1550 },
    { timestamp: Date.now() - 8 * 60 * 60 * 1000, open: 69000, high: 69700, low: 68700, close: 69300, volume: 1600 },
    { timestamp: Date.now() - 7 * 60 * 60 * 1000, open: 69300, high: 70000, low: 69000, close: 69600, volume: 1650 },
    { timestamp: Date.now() - 6 * 60 * 60 * 1000, open: 69600, high: 70300, low: 69300, close: 69900, volume: 1700 },
    { timestamp: Date.now() - 5 * 60 * 60 * 1000, open: 69900, high: 70600, low: 69600, close: 70200, volume: 1750 },
    { timestamp: Date.now() - 4 * 60 * 60 * 1000, open: 70200, high: 70900, low: 69900, close: 70500, volume: 1800 },
    { timestamp: Date.now() - 3 * 60 * 60 * 1000, open: 70500, high: 71200, low: 70200, close: 70800, volume: 1850 },
    { timestamp: Date.now() - 2 * 60 * 60 * 1000, open: 70800, high: 71500, low: 70500, close: 71100, volume: 1900 },
    { timestamp: Date.now() - 1 * 60 * 60 * 1000, open: 71100, high: 71800, low: 70800, close: 71400, volume: 1950 },
    { timestamp: Date.now(), open: 71400, high: 72100, low: 71100, close: 71800, volume: 2000 },
  ];

  const lineData = [65800, 66100, 65900, 66400, 66200, 66800, 67200, 67000, 67500, 68000, 67800, 67890];
  const areaData = [65800, 66100, 65900, 66400, 66200, 66800, 67200, 67000, 67500, 68000, 67800, 67890];
  const volumeData = [1000, 1200, 1100, 1300, 1400, 1500, 1600, 1700, 1800, 1900, 2000, 2100];

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
            <View style={styles.priceHeader}>
              <Text style={[styles.priceValue, { color: theme.colors.textPrimary }]}>
                $67,890.42
              </Text>
              <Text style={[styles.priceChange, { color: theme.colors.positive }]}>
                +2.34% (+$1,550.20)
              </Text>
            </View>
            <View style={[styles.chartContainer, { height: isMobile ? 280 : 350 }]}>
              {selectedChart === 'candlestick' ? (
                <CandleChart
                  data={candlestickData}
                  width={Math.min(screenWidth - 16, isMobile ? screenWidth - 8 : 600)}
                  height={isMobile ? 280 : 350}
                  showGrid={true}
                  showVolume={false}
                  showXAxis={true}
                  showYAxis={true}
                  showAxisLabels={true}
                />
              ) : selectedChart === 'line' ? (
                <TradingChart
                  data={lineData}
                  width={Math.min(screenWidth - 16, isMobile ? screenWidth - 8 : 600)}
                  height={isMobile ? 280 : 350}
                  showGrid={true}
                  showLabels={true}
                  showXAxis={true}
                  showYAxis={true}
                  showAxisLabels={true}
                />
              ) : selectedChart === 'area' ? (
                <TradingChart
                  data={areaData}
                  width={Math.min(screenWidth - 16, isMobile ? screenWidth - 8 : 600)}
                  height={isMobile ? 280 : 350}
                  showGrid={true}
                  showLabels={true}
                  showXAxis={true}
                  showYAxis={true}
                  showAxisLabels={true}
                />
              ) : (
                <TradingChart
                  data={volumeData}
                  width={Math.min(screenWidth - 16, isMobile ? screenWidth - 8 : 600)}
                  height={isMobile ? 280 : 350}
                  showGrid={true}
                  showLabels={true}
                  showXAxis={true}
                  showYAxis={true}
                  showAxisLabels={true}
                />
              )}
            </View>
            <View style={styles.chartInfo}>
              <Text style={[styles.mockChartText, { color: theme.colors.textSecondary }]}>
                📈 {selectedChart.charAt(0).toUpperCase() + selectedChart.slice(1)} Chart
              </Text>
              <Text style={[styles.mockChartSubtext, { color: theme.colors.textSecondary }]}>
                Interactive chart with technical indicators
              </Text>
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
          title="Save Current Setup"
          onPress={() => {}}
          style={styles.saveButton}
        />
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
    // overflow: 'hidden', // Removed to prevent SVG clipping
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
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    marginBottom: 4,
  },
  priceChange: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  indicatorsGrid: {
    flexDirection: 'column',
    gap: 8,
  },
  indicatorsGridMobile: {
    flexDirection: 'column',
  },
  indicatorCard: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 0,
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
    justifyContent: 'space-between',
  },
  toolsGridMobile: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  toolButton: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    width: '48%',
    marginBottom: 12,
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
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 16,
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginLeft: 8,
  },
});