import React, { useState, useMemo } from 'react';
import { View, StyleSheet, Text, Dimensions } from 'react-native';
import Svg, { Rect, Line, Text as SvgText, G, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useTheme } from '../theme/ThemeProvider';
import { CandleData as MockCandleData } from '../data/mock';

export interface CandleData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  time: number;
  value: number;
  color: string;
}
import { formatCurrency } from '../utils/number';

interface CandleChartProps {
  data: CandleData[];
  width?: number;
  height?: number;
  accent?: string;
  showGrid?: boolean;
  showVolume?: boolean;
  showXAxis?: boolean;
  showYAxis?: boolean;
  showAxisLabels?: boolean;
}

const { width: screenWidth } = Dimensions.get('window');
const isMobile = screenWidth < 768;

export function CandleChart({ 
  data, 
  width = isMobile ? screenWidth - 32 : 400, 
  height = isMobile ? 220 : 280,
  accent,
  showGrid = true,
  showVolume = false,
  showXAxis = true,
  showYAxis = true,
  showAxisLabels = true
}: CandleChartProps) {
  const { theme } = useTheme();
  const [tooltip, setTooltip] = useState<{ x: number; y: number; candle: CandleData } | null>(null);
  
  // Memoize calculations for performance
  const chartData = useMemo(() => {
    if (!data || data.length === 0) {
      return null;
    }
    
    // Professional padding for proper alignment
    const leftPadding = showYAxis ? (isMobile ? 50 : 60) : (isMobile ? 12 : 16);
    const rightPadding = isMobile ? 12 : 16;
    const topPadding = isMobile ? 16 : 20;
    const bottomPadding = showXAxis ? (isMobile ? 28 : 35) : (isMobile ? 12 : 16);
    
    const chartWidth = width - leftPadding - rightPadding;
    const chartHeight = height - topPadding - bottomPadding;
    
    const prices = data.flatMap(d => [d.high, d.low]);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice || 1;
    
    // Professional candlestick spacing
    const availableWidth = chartWidth * 0.95;
    const candleWidth = Math.max(3, Math.min(12, availableWidth / data.length));
    const candleGap = Math.max(0.5, Math.min(2, (availableWidth - (data.length * candleWidth)) / Math.max(1, data.length - 1)));
    
    // Generate Y-axis price levels with 5% padding
    const paddedMin = minPrice - (priceRange * 0.05);
    const paddedMax = maxPrice + (priceRange * 0.05);
    const paddedRange = paddedMax - paddedMin;
    const numYLevels = isMobile ? 5 : 7;
    const priceStep = paddedRange / (numYLevels - 1);
    const yAxisLevels = Array.from({ length: numYLevels }, (_, i) => 
      paddedMin + (i * priceStep)
    );

    // Generate X-axis time labels
    const numXLabels = Math.min(5, data.length);
    const xAxisStep = Math.max(1, Math.floor(data.length / numXLabels));
    const xAxisLabels = Array.from({ length: numXLabels }, (_, i) => {
      const index = i * xAxisStep;
      const date = new Date(data[index]?.timestamp || 0);
      return {
        index,
        label: isMobile ? 
          `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}` :
          `${date.getMonth() + 1}/${date.getDate()}`
      };
    });

    return {
      leftPadding,
      rightPadding,
      topPadding,
      bottomPadding,
      chartWidth,
      chartHeight,
      minPrice: paddedMin,
      maxPrice: paddedMax,
      priceRange: paddedRange,
      candleWidth,
      candleGap,
      yAxisLevels,
      xAxisLabels
    };
  }, [data, width, height, showXAxis, showYAxis]);
  
  if (!chartData) {
    return <View style={{ width, height, backgroundColor: theme.colors.surface, borderRadius: 12 }} />;
  }
  
  const { 
    leftPadding, 
    topPadding, 
    bottomPadding,
    chartWidth, 
    chartHeight, 
    minPrice, 
    priceRange, 
    candleWidth, 
    candleGap,
    yAxisLevels,
    xAxisLabels
  } = chartData;
  
  const getY = (price: number) => {
    return topPadding + (1 - (price - minPrice) / priceRange) * chartHeight;
  };

  const getX = (index: number) => {
    return leftPadding + (index * (candleWidth + candleGap));
  };
  
  const handlePress = (event: any, candle: CandleData, index: number) => {
    const x = getX(index) + candleWidth / 2;
    const y = getY(candle.high) - 40;
    setTooltip({ x, y, candle });
    
    // Hide tooltip after 4 seconds
    setTimeout(() => setTooltip(null), 4000);
  };
  
  // Modern color scheme based on 2024 trends
  const bullishColor = theme.colors.positive || '#10B981'; // Modern green
  const bearishColor = theme.colors.negative || '#EF4444'; // Modern red
  const bullishFill = `${bullishColor}20`; // 20% opacity
  const bearishFill = `${bearishColor}20`; // 20% opacity
  
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface, borderRadius: 12 }]}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          {/* Modern gradient definitions */}
          <LinearGradient id="bullishGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={bullishColor} stopOpacity="0.3" />
            <Stop offset="100%" stopColor={bullishColor} stopOpacity="0.1" />
          </LinearGradient>
          <LinearGradient id="bearishGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={bearishColor} stopOpacity="0.3" />
            <Stop offset="100%" stopColor={bearishColor} stopOpacity="0.1" />
          </LinearGradient>
        </Defs>
        
        {/* Professional grid lines */}
        {showGrid && (
          <>
            {/* Horizontal grid lines */}
            {yAxisLevels.map((price, i) => (
              <Line
                key={`h-grid-${i}`}
                x1={leftPadding}
                y1={getY(price)}
                x2={leftPadding + chartWidth}
                y2={getY(price)}
                stroke={theme.colors.border || 'rgba(255,255,255,0.1)'}
                strokeWidth={0.8}
              />
            ))}
            {/* Vertical grid lines for X-axis */}
            {xAxisLabels.map((label, i) => (
              <Line
                key={`v-grid-${i}`}
                x1={getX(label.index)}
                y1={topPadding}
                x2={getX(label.index)}
                y2={topPadding + chartHeight}
                stroke={theme.colors.border || 'rgba(255,255,255,0.05)'}
                strokeWidth={0.5}
              />
            ))}
          </>
        )}

        {/* Y-Axis */}
        {showYAxis && showAxisLabels && (
          <>
            {yAxisLevels.map((price, i) => (
              <SvgText
                key={`y-label-${i}`}
                x={leftPadding - 10}
                y={getY(price) + 3}
                fontSize={isMobile ? 10 : 11}
                fill={theme.colors.textSecondary || 'rgba(255,255,255,0.7)'}
                textAnchor="end"
                fontFamily="monospace"
                fontWeight="500"
              >
                ${price.toFixed(2)}
              </SvgText>
            ))}
          </>
        )}

        {/* X-Axis */}
        {showXAxis && showAxisLabels && (
          <>
            {xAxisLabels.map((label, i) => (
              <SvgText
                key={`x-label-${i}`}
                x={getX(label.index) + candleWidth / 2}
                y={height - bottomPadding + 18}
                fontSize={isMobile ? 10 : 11}
                fill={theme.colors.textSecondary || 'rgba(255,255,255,0.7)'}
                textAnchor="middle"
                fontFamily="monospace"
                fontWeight="500"
              >
                {label.label}
              </SvgText>
            ))}
          </>
        )}
        
        {data.map((candle, index) => {
          const x = getX(index);
          const isBullish = candle.close > candle.open;
          const color = isBullish ? bullishColor : bearishColor;
          
          const openY = getY(candle.open);
          const closeY = getY(candle.close);
          const highY = getY(candle.high);
          const lowY = getY(candle.low);
          
          const bodyTop = Math.min(openY, closeY);
          const bodyBottom = Math.max(openY, closeY);
          const bodyHeight = Math.max(1, bodyBottom - bodyTop);
          const centerX = x + candleWidth / 2;
          
          return (
            <G key={index} onPress={() => handlePress(null, candle, index)}>
              {/* Professional wick with rounded caps */}
              <Line
                x1={centerX}
                y1={highY}
                x2={centerX}
                y2={lowY}
                stroke={color}
                strokeWidth={isMobile ? 1.2 : 1.5}
                strokeLinecap="round"
              />
              
              {/* Professional candlestick body */}
              <Rect
                x={x}
                y={bodyTop}
                width={candleWidth}
                height={bodyHeight}
                fill={isBullish ? bullishFill : bearishFill}
                stroke={color}
                strokeWidth={isMobile ? 0.8 : 1.2}
                rx={candleWidth / 8} // Slightly less rounded for tighter look
                ry={candleWidth / 8}
              />
              
              {/* Subtle shadow effect for depth */}
              <Rect
                x={x + 0.3}
                y={bodyTop + 0.3}
                width={candleWidth}
                height={bodyHeight}
                fill="none"
                stroke="rgba(0,0,0,0.08)"
                strokeWidth={0.4}
                rx={candleWidth / 8}
                ry={candleWidth / 8}
              />
            </G>
          );
        })}
        
      </Svg>
      
      {/* Modern tooltip with improved design */}
      {tooltip && (
        <View
          style={[
            styles.tooltip,
            {
              left: Math.min(tooltip.x, width - 140),
              top: Math.max(10, tooltip.y),
              backgroundColor: theme.colors.elevated || theme.colors.surface,
              borderColor: theme.colors.border || 'rgba(255,255,255,0.2)',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 8,
            },
          ]}
        >
          <Text style={[styles.tooltipHeader, { color: theme.colors.textPrimary }]}>
            OHLC Data
          </Text>
          <View style={styles.tooltipContent}>
            <Text style={[styles.tooltipText, { color: theme.colors.textSecondary }]}>
              Open: <Text style={[styles.tooltipValue, { color: theme.colors.textPrimary }]}>
                {formatCurrency(tooltip.candle.open)}
              </Text>
            </Text>
            <Text style={[styles.tooltipText, { color: bullishColor }]}>
              High: <Text style={[styles.tooltipValue, { color: theme.colors.textPrimary }]}>
                {formatCurrency(tooltip.candle.high)}
              </Text>
            </Text>
            <Text style={[styles.tooltipText, { color: bearishColor }]}>
              Low: <Text style={[styles.tooltipValue, { color: theme.colors.textPrimary }]}>
                {formatCurrency(tooltip.candle.low)}
              </Text>
            </Text>
            <Text style={[styles.tooltipText, { color: theme.colors.textSecondary }]}>
              Close: <Text style={[styles.tooltipValue, { color: theme.colors.textPrimary }]}>
                {formatCurrency(tooltip.candle.close)}
              </Text>
            </Text>
            <Text style={[styles.tooltipText, { color: theme.colors.textSecondary }]}>
              Vol: <Text style={[styles.tooltipValue, { color: theme.colors.textPrimary }]}>
                {tooltip.candle.volume.toLocaleString()}
              </Text>
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
  },
  tooltip: {
    position: 'absolute',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 120,
    maxWidth: 140,
    zIndex: 1000,
  },
  tooltipHeader: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    textAlign: 'center',
  },
  tooltipContent: {
    gap: 2,
  },
  tooltipText: {
    fontSize: 11,
    marginBottom: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tooltipValue: {
    fontWeight: '500',
  },
});