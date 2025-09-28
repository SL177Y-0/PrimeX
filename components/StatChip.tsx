import React from 'react';
import { View, Text, StyleSheet, StyleProp, TextStyle } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { formatPercent } from '../utils/number';

interface StatChipProps {
  value: number;
  showCaret?: boolean;
  size?: 'small' | 'medium';
}

export function StatChip({ value, showCaret = true, size = 'medium' }: StatChipProps) {
  const { theme } = useTheme();
  const isPositive = value >= 0;
  
  const chipStyle = [
    styles.chip,
    {
      backgroundColor: isPositive ? `${theme.colors.positive}20` : `${theme.colors.negative}20`,
      borderRadius: theme.borderRadius.xs,
      paddingHorizontal: size === 'small' ? 8 : 12,
      paddingVertical: size === 'small' ? 4 : 6,
    },
  ];
  
  const textStyle: StyleProp<TextStyle> = [
    styles.text,
    {
      color: isPositive ? theme.colors.positive : theme.colors.negative,
      fontSize: size === 'small' ? 12 : 14,
      fontWeight: '600',
    },
  ];
  
  return (
    <View style={chipStyle}>
      <Text style={textStyle}>
        {showCaret && (isPositive ? '↗' : '↘')} {formatPercent(Math.abs(value))}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  text: {
    fontFamily: 'Inter-SemiBold',
    letterSpacing: -0.1,
  },
});
