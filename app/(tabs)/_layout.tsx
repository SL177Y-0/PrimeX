import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, TrendingUp, Wallet, Settings, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react-native';

import { useTheme } from '../../theme/ThemeProvider';
import { useAccent } from '../../theme/useAccent';

const TabLayout = React.memo(function TabLayout() {
  const { theme } = useTheme();
  const accent = useAccent();
  const insets = useSafeAreaInsets();

  const screenOptions = useMemo(() => ({
    headerShown: false,
    lazy: false,
    freezeOnBlur: true,
    detachInactiveScreens: false,
    tabBarStyle: {
      backgroundColor: theme.colors.surface,
      borderTopColor: 'transparent',
      borderTopWidth: 0,
      height: 61 + insets.bottom,
      paddingBottom: insets.bottom,
      paddingTop: 6,
      paddingHorizontal: 18,
    },
    tabBarItemStyle: {
      paddingVertical: 2,
    },
    tabBarActiveTintColor: theme.colors.textPrimary,
    tabBarInactiveTintColor: theme.colors.textSecondary,
    tabBarLabelStyle: {
      fontSize: 12,
      fontFamily: 'Inter-Medium',
      fontWeight: '500' as const,
      marginTop: 0,
    },
  }), [theme.colors.surface, theme.colors.textPrimary, theme.colors.textSecondary, insets.bottom]);

  const renderTradeIcon = ({ focused }: { focused: boolean }) => (
    <LinearGradient
      colors={[accent.from, accent.to]}
      style={[styles.centerTradeButton, focused && styles.centerTradeButtonFocused]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <ArrowUpDown size={24} color={theme.colors.textPrimary} />
    </LinearGradient>
  );

  return (
    <Tabs initialRouteName="index" screenOptions={screenOptions}>
      <Tabs.Screen
        name="index"
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color }) => <Home size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="market"
        options={{
          tabBarLabel: 'Market',
          tabBarIcon: ({ color }) => <TrendingUp size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="trade"
        options={{
          tabBarLabel: '',
          tabBarIcon: renderTradeIcon,
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          tabBarLabel: 'Wallet',
          tabBarIcon: ({ color }) => <Wallet size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          tabBarLabel: 'Settings',
          tabBarIcon: ({ color }) => <Settings size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="deposit"
        options={{
          tabBarLabel: 'Deposit',
          tabBarIcon: ({ color }) => <ArrowUp size={24} color={color} />,
          href: null,
        }}
      />
      <Tabs.Screen
        name="withdraw"
        options={{
          tabBarLabel: 'Withdraw',
          tabBarIcon: ({ color }) => <ArrowDown size={24} color={color} />,
          href: null,
        }}
      />
    </Tabs>
  );
});

export default TabLayout;

const styles = StyleSheet.create({
  centerTradeButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  centerTradeButtonFocused: {
    borderColor: 'rgba(255, 255, 255, 0.32)',
  },
});
