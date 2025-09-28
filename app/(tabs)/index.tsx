import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  withTiming
} from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../theme/ThemeProvider';
import { useAppStore } from '../../store/useAppStore';
import { Card } from '../../components/Card';
import { GradientPillButton } from '../../components/GradientPillButton';
import { SoftButton } from '../../components/SoftButton';
import { Sparkline } from '../../components/Sparkline';
import { Eye, EyeOff, Bell, ArrowUp, ArrowDown } from 'lucide-react-native';
import { useRouter } from 'expo-router';

// Animated Action Button Component
function AnimatedActionButton({ 
  title, 
  onPress, 
  variant = 'secondary',
  style,
  icon
}: { 
  title: string; 
  onPress: () => void; 
  variant?: 'primary' | 'secondary';
  style?: any;
  icon?: React.ReactNode;
}) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));
  
  const handlePressIn = () => {
    scale.value = withSpring(0.96);
    opacity.value = withTiming(0.8, { duration: 100 });
  };
  
  const handlePressOut = () => {
    scale.value = withSpring(1);
    opacity.value = withTiming(1, { duration: 100 });
  };
  
  return (
    <Pressable 
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.animatedActionButton, style]}
    >
      <Animated.View style={animatedStyle}>
        {variant === 'primary' ? (
          <GradientPillButton
            title={title}
            variant="primary"
            size="medium"
            onPress={onPress}
            style={styles.depositButton}
          />
        ) : (
          <SoftButton
            title={title}
            size="medium"
            onPress={onPress}
            style={styles.withdrawButton}
          />
        )}
      </Animated.View>
    </Pressable>
  );
}


export default function TradeCenterScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { 
    hideBalances,
    setHideBalances
  } = useAppStore();
  
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
      <View style={{ flex: 1 }}>
        {/* Animated Header with Backdrop */}
        <Animated.View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <View style={[styles.headerBackdrop, { backgroundColor: theme.colors.bg }]} />
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
        
              <Text style={[styles.appName, { color: theme.colors.textPrimary }]}>
                PrimeX
              </Text>
            </View>
            <View style={styles.headerRight}>
              <Pressable style={[styles.headerButton, { backgroundColor: theme.colors.chip }]}>
                <Bell size={20} color={theme.colors.textSecondary} />
              </Pressable>
              <View style={[styles.profileButton, { backgroundColor: theme.colors.chip }]}>
                <Text style={styles.profileText}>👤</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        <Animated.ScrollView 
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { 
            paddingTop: 60 + insets.top + 20,
            paddingBottom: 0 + insets.bottom 
          }]}
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          bounces={true}
          alwaysBounceVertical={false}
        >

        {/* Portfolio Card */}
        <View style={styles.portfolioContainer}>
          <Card style={[styles.portfolioCard, { backgroundColor: theme.colors.portfolioCard }]} elevated>
            <View style={styles.portfolioHeader}>
              <Text style={[styles.portfolioLabel, { color: theme.colors.portfolioTextSecondary }]}>
                Portfolio Value
              </Text>
              <Pressable 
                onPress={() => setHideBalances(!hideBalances)}
                style={styles.eyeButton}
              >
                {hideBalances ? 
                  <EyeOff size={20} color={theme.colors.portfolioTextSecondary} /> :
                  <Eye size={20} color={theme.colors.portfolioTextSecondary} />
                }
              </Pressable>
            </View>
            
            <Text style={[styles.portfolioValue, { 
              color: theme.colors.portfolioTextPrimary,
              ...theme.typography.displayXL 
            }]}>
              {hideBalances ? '••••••' : '$20,988.00'}
            </Text>
            
            <View style={styles.changeRow}>
              <Text style={[styles.changeText, { 
                color: theme.colors.portfolioPositive 
              }]}>
                13.5% (+$545.90) Last month
              </Text>
            </View>
            
            {/* Quick Action Buttons */}
            <View style={styles.actionButtons}>
              <AnimatedActionButton
                title="Withdraw"
                variant="secondary"
                onPress={() => router.push('/(tabs)/withdraw')}
                icon={<ArrowDown size={16} color={theme.colors.orange} />}
              />
              <AnimatedActionButton
                title="Deposit"
                variant="primary"
                onPress={() => router.push('/(tabs)/deposit')}
                icon={<ArrowUp size={16} color="#FFFFFF" />}
              />
            </View>
          </Card>
        </View>
        
     
        
        {/* My Funds */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { 
            color: theme.colors.textPrimary,
            ...theme.typography.title 
          }]}>
            My Funds
          </Text>
 <View style={styles.sectionHeader}></View>
          <View style={styles.fundsRow}>
            {/* Bitcoin Fund */}
            <Card style={styles.fundCard}>
              <View style={styles.fundHeader}>
                <View style={[styles.fundIcon, { backgroundColor: '#F7931A' }]}>
                  <Text style={styles.fundIconText}>₿</Text>
                </View>
                <View style={styles.fundInfo}>
                  <Text style={[styles.fundName, { color: theme.colors.textPrimary }]}>
                    Bitcoin
                  </Text>
                  <Text style={[styles.fundSymbol, { color: theme.colors.textSecondary }]}>
                    (BTC)
                  </Text>
                </View>
              </View>
              <View style={styles.fundSparkline}>
                <Sparkline 
                  data={[1, 1.1, 1.05, 1.15, 1.08, 1.12, 1.18, 1.16]} 
                  width={80} 
                  height={30}
                  color={theme.colors.positive}
                />
              </View>
              <View style={styles.fundFooter}>
                <Text style={[styles.fundPercentage, { color: theme.colors.positive }]}>
                  23.70%
                </Text>
                <Text style={[styles.fundChange, { color: theme.colors.positive }]}>
                  2.5% • Last month
                </Text>
              </View>
            </Card>

            {/* Ethereum Fund */}
            <Card style={styles.fundCard}>
              <View style={styles.fundHeader}>
                <View style={[styles.fundIcon, { backgroundColor: '#627EEA' }]}>
                  <Text style={styles.fundIconText}>Ξ</Text>
                </View>
                <View style={styles.fundInfo}>
                  <Text style={[styles.fundName, { color: theme.colors.textPrimary }]}>
                    Ethereum
                  </Text>
                  <Text style={[styles.fundSymbol, { color: theme.colors.textSecondary }]}>
                    (ETH)
                  </Text>
                </View>
              </View>
              <View style={styles.fundSparkline}>
                <Sparkline 
                  data={[1, 1.1, 1.3, 1.2, 1.4, 1.6, 1.5, 1.7]} 
                  width={80} 
                  height={30}
                  color={theme.colors.positive}
                />
              </View>
              <View style={styles.fundFooter}>
                <Text style={[styles.fundPercentage, { color: theme.colors.positive }]}>
                  18.45%
                </Text>
                <Text style={[styles.fundChange, { color: theme.colors.positive }]}>
                  1.8% • Last month
                </Text>
              </View>
            </Card>
          </View>
        </View>
        </Animated.ScrollView>
        </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    // Dynamic padding applied via contentContainerStyle
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    paddingBottom: 12,
    elevation: 1000,
  },
  headerBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 1,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: 'Inter-Bold',
  },
  appName: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileText: {
    fontSize: 16,
  },
  portfolioContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
    marginTop: 8,
  },
  portfolioCard: {
    padding: 16,
    borderRadius: 16,
  },
  portfolioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  portfolioLabel: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
  },
  eyeButton: {
    padding: 4,
  },
  portfolioValue: {
    fontFamily: 'Inter-Bold',
    marginBottom: 8,
  },
  changeRow: {
    marginBottom: 24,
  },
  changeText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  withdrawButton: {
    flex: 1,
  },
  depositButton: {
    flex: 1,
  },
  section: {
    marginBottom: 16,
    paddingHorizontal: 16,
    marginTop: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
  },
  animatedActionButton: {
    flex: 1,
  },
  fundsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  fundCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
  },
  fundHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  fundIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  fundIconText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  },
  fundInfo: {
    flex: 1,
  },
  fundName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 2,
  },
  fundSymbol: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  fundSparkline: {
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  fundFooter: {
    alignItems: 'flex-start',
  },
  fundPercentage: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    marginBottom: 4,
  },
  fundChange: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
});