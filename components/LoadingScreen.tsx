/**
 * Loading Screen Component
 * Consistent theme-based loading screen for Lend & Borrow
 */

import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeProvider';

interface LoadingScreenProps {
  message?: string;

}

export function LoadingScreen({ 
  message = "..."
}: LoadingScreenProps) {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
      <LinearGradient
        colors={[
          theme.colors.purple + '10',
          theme.colors.blue + '05',
          'transparent'
        ]}
        style={styles.gradient}
      />
      
      <View style={styles.content}>
        <View style={styles.loadingIndicator}>
          <ActivityIndicator 
            size="large" 
            color={theme.colors.purple} 
            style={styles.spinner}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 32,
    zIndex: 1,
  },
  loadingIndicator: {
    marginBottom: 24,
  },
  spinner: {
    transform: [{ scale: 1.5 }],
  },
  message: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  subMessage: {
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.8,
  },
});
