import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

interface TickerBadgeProps {
  symbol: string;
  logo: string;
  size?: 'small' | 'medium' | 'large';
}

export function TickerBadge({ symbol, logo, size = 'medium' }: TickerBadgeProps) {
  const { theme } = useTheme();
  
  const containerSize = size === 'small' ? 32 : size === 'large' ? 48 : 40;
  const fontSize = size === 'small' ? 16 : size === 'large' ? 24 : 20;
  
  const containerStyle = [
    styles.container,
    {
      width: containerSize,
      height: containerSize,
      backgroundColor: theme.colors.chip,
      borderRadius: theme.borderRadius.xs,
    },
  ];
  
  const logoStyle = [
    styles.logo,
    {
      fontSize,
      color: theme.colors.textPrimary,
    },
  ];
  
  return (
    <View style={containerStyle}>
      <Text style={logoStyle}>{logo}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    fontFamily: 'Inter-Bold',
  },
});