import React, { ReactNode } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

interface CardProps {
  children: ReactNode;
  style?: any;
  elevated?: boolean;
}

export function Card({ children, style, elevated = false }: CardProps) {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();

  const isCompact = width < 768;
  const padding = isCompact ? theme.spacing.md : theme.spacing.lg;
  const borderRadius = isCompact ? theme.borderRadius.md : theme.borderRadius.lg;
  
  const cardStyles = [
    styles.card,
    {
      backgroundColor: elevated ? theme.colors.elevated : theme.colors.card,
      borderRadius,
      ...theme.shadows.soft,
      padding,
    },
    style,
  ];
  
  return <View style={cardStyles}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
  },
});