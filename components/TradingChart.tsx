import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { useAccent } from '../theme/useAccent';

interface TradingChartProps {
  data: number[];
  height?: number;
  showGrid?: boolean;
  showLabels?: boolean;
}

export function TradingChart({ 
  data, 
  height = 120, 
  showGrid = true, 
  showLabels = true 
}: TradingChartProps) {
  const { theme } = useTheme();
  const accent = useAccent();
  const screenWidth = Dimensions.get('window').width;
  const chartWidth = screenWidth - 40; // Account for padding
  
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
      
      {/* Chart Line */}
      <View style={styles.chartContainer}>
        <View style={[styles.chartLine, { 
          backgroundColor: accent.from,
          height: 2,
          width: chartWidth,
          top: height - normalizedData[normalizedData.length - 1] - 1,
          left: 0,
        }]} />
        
        {/* Data Points */}
        {normalizedData.map((value, index) => (
          <View
            key={index}
            style={[
              styles.dataPoint,
              {
                backgroundColor: accent.from,
                left: (index / (data.length - 1)) * chartWidth - 3,
                top: height - value - 3,
              }
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    width: '100%',
    overflow: 'hidden',
  },
  chartContainer: {
    position: 'relative',
    width: '100%',
    height: '100%',
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
  chartLine: {
    position: 'absolute',
    borderRadius: 1,
  },
  dataPoint: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
