import React from 'react';
import { StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Tabs, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useTheme } from '../../theme/ThemeProvider';
import { useAccent } from '../../theme/useAccent';
import { Home, TrendingUp, Wallet, Settings, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react-native';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function CenterTradeButton({ focused }: { focused: boolean }) {
  const { theme } = useTheme();
  const accent = useAccent();
  const router = useRouter();
  const scale = useSharedValue(1);
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  
  const handlePress = () => {
    scale.value = withSpring(0.95, {}, () => {
      scale.value = withSpring(1);
    });
    router.push('/trade');
  };
  
  return (
    <AnimatedPressable onPress={handlePress} style={[styles.centerButtonContainer, animatedStyle]}>
      <LinearGradient
        colors={[accent.from, accent.to]}
        style={styles.centerTradeButton}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <ArrowUpDown size={24} color={theme.colors.textPrimary} />
      </LinearGradient>
    </AnimatedPressable>
  );
}

export default function TabLayout() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: 'transparent',
          borderTopWidth: 0,
          height: 61 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 6,
          paddingHorizontal: 19,
          paddingLeft: 1,
          paddingRight: 1,
          elevation: 0, // Remove shadow on Android
          shadowOpacity: 0, // Remove shadow on iOS
          shadowRadius: 0,
          shadowOffset: { width: 0, height: 0 },
          shadowColor: 'transparent',
          borderBottomWidth: 0,
          borderLeftWidth: 0,
          borderRightWidth: 0,
        },
        tabBarItemStyle: {
          elevation: 0,
          shadowOpacity: 0,
          shadowRadius: 0,
          shadowOffset: { width: 0, height: 0 },
          shadowColor: 'transparent',
        },
        tabBarButton: (props) => (
          <Pressable
            {...props}
            android_ripple={{ color: 'transparent' }}
            style={({ pressed }) => [
              props.style,
              {
                elevation: 0,
                shadowOpacity: 0,
                shadowRadius: 0,
                shadowOffset: { width: 0, height: 0 },
                shadowColor: 'transparent',
                opacity: pressed ? 0.7 : 1,
              }
            ]}
          />
        ),
        tabBarActiveTintColor: theme.colors.textPrimary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 12,
          fontFamily: 'Inter-Medium',
          fontWeight: '500',
          marginTop: 0,
        },
      }}
    >
      <Tabs.Screen 
        name="index" 
        options={{ 
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => <Home size={24} color={color} />
        }}
      />
      <Tabs.Screen 
        name="market" 
        options={{ 
          tabBarLabel: 'Market',
          tabBarIcon: ({ color, size }) => <TrendingUp size={24} color={color} />
        }}
      />
      <Tabs.Screen 
        name="trade" 
        options={{ 
          tabBarLabel: ' ',
          tabBarIcon: ({ color, size, focused }) => (
            <CenterTradeButton focused={focused} />
          )
        }}
      />
      <Tabs.Screen 
        name="wallet" 
        options={{ 
          tabBarLabel: 'Wallet',
          tabBarIcon: ({ color, size }) => <Wallet size={24} color={color} />
        }}
      />
      <Tabs.Screen 
        name="settings" 
        options={{ 
          tabBarLabel: 'Settings',
          tabBarIcon: ({ color, size }) => <Settings size={24} color={color} />
        }}
      />
      <Tabs.Screen 
        name="deposit" 
        options={{ 
          tabBarLabel: 'Deposit',
          tabBarIcon: ({ color, size }) => <ArrowUp size={24} color={color} />,
          href: null // Hide from tab bar but keep accessible
        }}
      />
      <Tabs.Screen 
        name="withdraw" 
        options={{ 
          tabBarLabel: 'Withdraw',
          tabBarIcon: ({ color, size }) => <ArrowDown size={24} color={color} />,
          href: null // Hide from tab bar but keep accessible
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  centerButtonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 15,
    flex: 1,
    marginHorizontal: 8,
    elevation: 0,
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    shadowColor: 'transparent',
  },
  centerTradeButton: {
    width: 56,
    height: 56,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    elevation: 0, // Remove shadow on Android
    shadowOpacity: 0, // Remove shadow on iOS
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    shadowColor: 'transparent',
    overflow: 'hidden', // Prevent any shadow bleeding
  },
});