/**
 * System Health Badge
 * 
 * Displays system health status with color-coded indicator
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { useSystemHealth } from '../hooks/useSystemHealth';

interface SystemHealthBadgeProps {
  onPress?: () => void;
  showDetails?: boolean;
}

export function SystemHealthBadge({ onPress, showDetails = false }: SystemHealthBadgeProps) {
  const { theme } = useTheme();
  const { health, isHealthy, isDegraded, isUnhealthy, uptimeFormatted, loading } = useSystemHealth();

  const statusColor = isHealthy
    ? '#10b981'
    : isDegraded
    ? '#fbbf24'
    : isUnhealthy
    ? '#ef4444'
    : '#6b7280';

  const statusText = isHealthy
    ? 'Healthy'
    : isDegraded
    ? 'Degraded'
    : isUnhealthy
    ? 'Unhealthy'
    : 'Unknown';

  const content = (
    <View style={[styles.badge, { backgroundColor: theme.colors.chip }]}>
      <View style={[styles.dot, { backgroundColor: statusColor }]} />
      <Text style={[styles.statusText, { color: theme.colors.textPrimary }]}>
        {loading ? '...' : statusText}
      </Text>
      {showDetails && !loading && (
        <Text style={[styles.uptime, { color: theme.colors.textSecondary }]}>
          {uptimeFormatted}
        </Text>
      )}
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  uptime: {
    fontSize: 10,
    marginLeft: 4,
  },
});
