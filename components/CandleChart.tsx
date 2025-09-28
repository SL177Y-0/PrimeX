import React, { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import Svg, { Rect, Line, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../theme/ThemeProvider';
import { CandleData } from '../data/mock';
import { formatCurrency } from '../utils/number';

interface CandleChartProps {
  data: CandleData[];
  width?: number;
  height?: number;
  accent?: string;
}

export function CandleChart({ 
  data, 
  width = 350, 
  height = 200,
  accent 
}: CandleChartProps) {
  const { theme } = useTheme();
  const [tooltip, setTooltip] = useState<{ x: number; y: number; candle: CandleData } | null>(null);
  
  if (!data || data.length === 0) {
    return <View style={{ width, height, backgroundColor: theme.colors.surface }} />;
  }
  
  const padding = 20;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  
  const prices = data.flatMap(d => [d.high, d.low]);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice;
  
  const candleWidth = Math.max(2, chartWidth / data.length - 1);
  
  const getY = (price: number) => {
    return padding + (1 - (price - minPrice) / priceRange) * chartHeight;
  };
  
  const handlePress = (event: any, candle: CandleData, index: number) => {
    const x = padding + (index * (chartWidth / data.length)) + candleWidth / 2;
    const y = getY(candle.high) - 20;
    setTooltip({ x, y, candle });
    
    // Hide tooltip after 3 seconds
    setTimeout(() => setTooltip(null), 3000);
  };
  
  return (
    <View style={styles.container}>
      <Svg width={width} height={height}>
        {data.map((candle, index) => {
          const x = padding + (index * (chartWidth / data.length));
          const isGreen = candle.close > candle.open;
          const color = isGreen ? theme.colors.positive : theme.colors.negative;
          
          const bodyTop = Math.min(candle.open, candle.close);
          const bodyBottom = Math.max(candle.open, candle.close);
          const bodyHeight = Math.abs(getY(candle.close) - getY(candle.open));
          
          return (
            <Pressable
              key={index}
              onPress={(event) => handlePress(event, candle, index)}
            >
              {/* Wick */}
              <Line
                x1={x + candleWidth / 2}
                y1={getY(candle.high)}
                x2={x + candleWidth / 2}
                y2={getY(candle.low)}
                stroke={color}
                strokeWidth={1}
              />
              
              {/* Body */}
              <Rect
                x={x}
                y={getY(bodyBottom)}
                width={candleWidth}
                height={Math.max(1, bodyHeight)}
                fill={isGreen ? 'transparent' : color}
                stroke={color}
                strokeWidth={1}
              />
            </Pressable>
          );
        })}
        
        {/* Price labels */}
        <SvgText
          x={width - 10}
          y={getY(maxPrice) + 5}
          fontSize="12"
          fill={theme.colors.textSecondary}
          textAnchor="end"
        >
          {formatCurrency(maxPrice)}
        </SvgText>
        <SvgText
          x={width - 10}
          y={getY(minPrice) - 5}
          fontSize="12"
          fill={theme.colors.textSecondary}
          textAnchor="end"
        >
          {formatCurrency(minPrice)}
        </SvgText>
      </Svg>
      
      {/* Tooltip */}
      {tooltip && (
        <View
          style={[
            styles.tooltip,
            {
              left: Math.min(tooltip.x, width - 120),
              top: Math.max(10, tooltip.y),
              backgroundColor: theme.colors.elevated,
              borderColor: theme.colors.border,
              ...theme.shadows.soft,
            },
          ]}
        >
          <SvgText fontSize="12" fill={theme.colors.textPrimary}>
            O: {formatCurrency(tooltip.candle.open)}
          </SvgText>
          <SvgText fontSize="12" fill={theme.colors.textPrimary}>
            H: {formatCurrency(tooltip.candle.high)}
          </SvgText>
          <SvgText fontSize="12" fill={theme.colors.textPrimary}>
            L: {formatCurrency(tooltip.candle.low)}
          </SvgText>
          <SvgText fontSize="12" fill={theme.colors.textPrimary}>
            C: {formatCurrency(tooltip.candle.close)}
          </SvgText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  tooltip: {
    position: 'absolute',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 100,
    zIndex: 1000,
  },
});