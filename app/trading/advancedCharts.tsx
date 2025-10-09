import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Dimensions } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { useAccent } from '../../theme/useAccent';
import { Card } from '../../components/Card';
import { GradientPillButton } from '../../components/GradientPillButton';
import { CandleChart, CandleData } from '../../components/CandleChart';
import { TradingChart } from '../../components/TradingChart';
import { Settings, Download, Save } from 'lucide-react-native';

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

  // Helper function to create proper CandleData
  const createCandle = (hoursAgo: number, open: number, high: number, low: number, close: number, volume: number): CandleData => {
    const timestamp = Date.now() - hoursAgo * 60 * 60 * 1000;
    return {
      timestamp,
      open,
      high,
      low,
      close,
      volume,
      time: timestamp,
      value: close,
      color: close > open ? '#10b981' : '#ef4444'
    };
  };

  // Different chart data for each chart type
  const candlestickData: CandleData[] = [
    createCandle(23, 64500, 65200, 64200, 64800, 800),
    createCandle(22, 64800, 65500, 64500, 65100, 900),
    createCandle(21, 65100, 65800, 64800, 65400, 950),
    createCandle(20, 65400, 66100, 65100, 65700, 1000),
    createCandle(19, 65700, 66400, 65400, 66000, 1050),
    createCandle(18, 66000, 66700, 65700, 66300, 1100),
    createCandle(17, 66300, 67000, 66000, 66600, 1150),
    createCandle(16, 66600, 67300, 66300, 66900, 1200),
    createCandle(15, 66900, 67600, 66600, 67200, 1250),
    createCandle(14, 67200, 67900, 66900, 67500, 1300),
    createCandle(13, 67500, 68200, 67200, 67800, 1350),
    createCandle(12, 67800, 68500, 67500, 68100, 1400),
    createCandle(11, 68100, 68800, 67800, 68400, 1450),
    createCandle(10, 68400, 69100, 68100, 68700, 1500),
    createCandle(9, 68700, 69400, 68400, 69000, 1550),
    createCandle(8, 69000, 69700, 68700, 69300, 1600),
    createCandle(7, 69300, 70000, 69000, 69600, 1650),
    createCandle(6, 69600, 70300, 69300, 69900, 1700),
    createCandle(5, 69900, 70600, 69600, 70200, 1750),
    createCandle(4, 70200, 70900, 69900, 70500, 1800),
    createCandle(3, 70500, 71200, 70200, 70800, 1850),
    createCandle(2, 70800, 71500, 70500, 71100, 1900),
    createCandle(1, 71100, 71800, 70800, 71400, 1950),
    createCandle(0, 71400, 72100, 71100, 71800, 2000),
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