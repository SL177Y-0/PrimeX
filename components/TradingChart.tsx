import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Polyline, Circle } from 'react-native-svg';
import { useTheme } from '../theme/ThemeProvider';
import { useAccent } from '../theme/useAccent';

interface TradingChartProps {
  data: number[];
  height?: number;
  width?: number;
  showGrid?: boolean;
  showLabels?: boolean;
  showXAxis?: boolean;
  showYAxis?: boolean;
  showAxisLabels?: boolean;
}

export function TradingChart({ 
  data, 
  height = 120,
  width,
  showGrid = true, 
  showLabels = true,
  showXAxis = true,
  showYAxis = true,
  showAxisLabels = true
}: TradingChartProps) {
  const { theme } = useTheme();
  const accent = useAccent();
  const screenWidth = Dimensions.get('window').width;
  const isMobile = screenWidth < 768;
  const chartWidth = width || (screenWidth - (isMobile ? 32 : 40));
  
  // Normalize data to fit chart height
  const minValue = Math.min(...data);
  const maxValue = Math.max(...data);
  const range = maxValue - minValue;
  const normalizedData = data.map(value => 
    ((value - minValue) / range) * (height - 20) + 10
  );
  
  // Generate points for the line
  const points = normalizedData.map((value, index) => 
    `${(index / (data.length - 1)) * chartWidth},${height - value}`
  ).join(' ');
  
  // Generate grid lines
  const gridLines = showGrid ? Array.from({ length: 4 }, (_, i) => {
    const y = (height / 4) * (i + 1);
    return (
      <View
        key={i}
        style={[
          styles.gridLine,
          {
            top: y,
            backgroundColor: theme.colors.border,
            width: chartWidth,
          }
        ]}
      />
    );
  }) : null;
  
  // Generate labels
  const labels = showLabels ? Array.from({ length: 5 }, (_, i) => {
    const value = minValue + (range / 4) * (4 - i);
    const y = (height / 4) * i;
    return (
      <Text
        key={i}
        style={[
          styles.label,
          {
            top: y - 8,
            color: theme.colors.textSecondary,
          }
        ]}
      >
        {value.toFixed(1)}%
      </Text>
    );
  }) : null;

  return (
    <View style={[styles.container, { height }]}>
      {gridLines}
      {labels}
      
      {/* SVG Chart */}
      <Svg height={height} width={chartWidth} style={styles.svgChart}>
        {/* Chart Line */}
        <Polyline
          points={points}
          fill="none"
          stroke={accent.from}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* Data Points */}
        {normalizedData.map((value, index) => (
          <Circle
            key={index}
            cx={(index / (data.length - 1)) * chartWidth}
            cy={height - value}
            r="3"
            fill={accent.from}
            stroke={theme.colors.bg}
            strokeWidth="1"
          />
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    width: '100%',
    overflow: 'hidden',
  },
  svgChart: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  gridLine: {
    position: 'absolute',
    height: 1,
    opacity: 0.3,
  },
  label: {
    position: 'absolute',
    right: 0,
    fontSize: 10,
    fontFamily: 'Inter-Medium',
  },
});
