/**
 * Staking Hub - Complete Amnis Finance Integration
 * 
 * Master component with:
 * - Dashboard view (stats, charts, pool info)
 * - Staking operations (stake, vault, unstake)
 * - Beautiful tab navigation
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { StakingDashboard } from './StakingDashboard';
import { StakingInterface } from './StakingInterface';
import {
  BarChart3,
  Coins,
} from 'lucide-react-native';

type ViewMode = 'dashboard' | 'stake';

export function StakingHub() {
  const { theme } = useTheme();
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
      {/* Tab Selector */}
      <View style={[styles.tabBar, { backgroundColor: theme.colors.chip }]}>
        <Pressable
          style={[
            styles.tab,
            viewMode === 'dashboard' && {
              backgroundColor: theme.colors.blue,
            },
          ]}
          onPress={() => setViewMode('dashboard')}
        >
          <BarChart3
            size={20}
            color={viewMode === 'dashboard' ? '#FFFFFF' : theme.colors.textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              {
                color:
                  viewMode === 'dashboard'
                    ? '#FFFFFF'
                    : theme.colors.textSecondary,
                fontWeight: viewMode === 'dashboard' ? '600' : '400',
              },
            ]}
          >
            Dashboard
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.tab,
            viewMode === 'stake' && {
              backgroundColor: theme.colors.blue,
            },
          ]}
          onPress={() => setViewMode('stake')}
        >
          <Coins
            size={20}
            color={viewMode === 'stake' ? '#FFFFFF' : theme.colors.textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              {
                color:
                  viewMode === 'stake'
                    ? '#FFFFFF'
                    : theme.colors.textSecondary,
                fontWeight: viewMode === 'stake' ? '600' : '400',
              },
            ]}
          >
            Stake
          </Text>
        </Pressable>
      </View>

      {/* Content */}
      {viewMode === 'dashboard' ? <StakingDashboard /> : <StakingInterface />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    padding: 8,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 12,
    gap: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  tabText: {
    fontSize: 15,
  },
});
