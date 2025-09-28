import React from 'react';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '../theme/ThemeProvider';

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  strokeWidth?: number;
}

export function Sparkline({ 
  data, 
  width = 60, 
  height = 20, 
  color, 
  strokeWidth = 2 
}: SparklineProps) {
  const { theme } = useTheme();
  
  if (!data || data.length < 2) {
    return <View style={{ width, height }} />;
  }
  
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min;
  
  if (range === 0) {
    return <View style={{ width, height }} />;
  }
  
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');
  
  const isPositive = data[data.length - 1] > data[0];
  const strokeColor = color || (isPositive ? theme.colors.positive : theme.colors.negative);
  
  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        <Path
          d={points}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}