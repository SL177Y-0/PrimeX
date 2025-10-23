/**
 * Loading Screen Component
 * Consistent theme-based loading screen for Lend & Borrow
 */

import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeProvider';
import { Percent, TrendingUp, Shield } from 'lucide-react-native';

interface LoadingScreenProps {
  message?: string;
  subMessage?: string;
  showLogo?: boolean;
}

export function LoadingScreen({ 
  message = "Loading Lend & Borrow", 
  subMessage = "Fetching market data...",
  showLogo = true 
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
        {showLogo && (
          <View style={styles.logoContainer}>
            <View style={[styles.iconCircle, { backgroundColor: theme.colors.purple + '20' }]}>
              <Percent size={32} color={theme.colors.purple} />
            </View>
            <View style={[styles.iconCircle, { backgroundColor: theme.colors.blue + '20', marginLeft: -8 }]}>
              <TrendingUp size={28} color={theme.colors.blue} />
            </View>
            <View style={[styles.iconCircle, { backgroundColor: theme.colors.green + '20', marginLeft: -8 }]}>
              <Shield size={30} color={theme.colors.green} />
            </View>
          </View>
        )}

        <View style={styles.loadingIndicator}>
          <ActivityIndicator 
            size="large" 
            color={theme.colors.purple} 
            style={styles.spinner}
          />
        </View>

        <Text style={[styles.message, { color: theme.colors.textPrimary }]}>
          {message}
        </Text>
        
        {subMessage && (
          <Text style={[styles.subMessage, { color: theme.colors.textSecondary }]}>
            {subMessage}
          </Text>
        )}

        <View style={styles.progressContainer}>
          <View style={[styles.progressTrack, { backgroundColor: theme.colors.border }]}>
            <LinearGradient
              colors={[theme.colors.purple, theme.colors.blue]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.progressBar}
            />
          </View>
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
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingIndicator: {
    marginBottom: 24,
  },
  spinner: {
    transform: [{ scale: 1.2 }],
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
    marginBottom: 32,
    opacity: 0.8,
  },
  progressContainer: {
    width: 200,
    alignItems: 'center',
  },
  progressTrack: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    width: '60%',
    borderRadius: 2,
  },
});
