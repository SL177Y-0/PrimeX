import React, { ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

interface CardProps {
  children: ReactNode;
  style?: any;
  elevated?: boolean;
}

export function Card({ children, style, elevated = false }: CardProps) {
  const { theme } = useTheme();
  
  const cardStyles = [
    styles.card,
    {
      backgroundColor: elevated ? theme.colors.elevated : theme.colors.card,
      borderRadius: theme.borderRadius.lg,
      ...theme.shadows.soft,
    },
    style,
  ];
  
  return <View style={cardStyles}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    padding: 20,
  },
});