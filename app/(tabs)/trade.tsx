import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeProvider';
import { useAppStore } from '../../store/useAppStore';
import { Card } from '../../components/Card';
import { formatCurrency } from '../../utils/number';
import { 
  BarChart3, 
  Users, 
  Bell, 
  Copy,
  ChevronRight,
  ArrowUpDown,
  DollarSign,
  Target,
  Shield,
  ArrowLeft,
  RefreshCw,
  Wallet,
  TrendingUp
} from 'lucide-react-native';

// Import trading page components
import SpotTradingContent from '../trading/spotTrading';
import CopyTradingContent from '../trading/copyTrading';
import GroupTradingContent from '../trading/groupTrading';
import AdvancedChartsContent from '../trading/advancedCharts';
import PositionsOrdersContent from '../trading/positionsOrders';
import PriceAlertsContent from '../trading/priceAlerts';
import DepositContent from '../trading/deposit';
import WithdrawContent from '../trading/withdraw';
import TradingInterface from '../../components/TradingInterface';
import { SwapInterface } from '../../components/SwapInterface';
import { WalletConnection } from '../../components/WalletConnection';
import { StakingHub } from '../../components/StakingHub';

// Responsive breakpoints following 2025 best practices
const BREAKPOINTS = {
  xs: 0,
  sm: 576,
  md: 768,
  lg: 992,
  xl: 1200,
} as const;

// Responsive utilities
const getResponsiveValue = (values: { xs?: any; sm?: any; md?: any; lg?: any; xl?: any }, screenWidth: number) => {
  if (screenWidth >= BREAKPOINTS.xl && values.xl !== undefined) return values.xl;
  if (screenWidth >= BREAKPOINTS.lg && values.lg !== undefined) return values.lg;
  if (screenWidth >= BREAKPOINTS.md && values.md !== undefined) return values.md;
  if (screenWidth >= BREAKPOINTS.sm && values.sm !== undefined) return values.sm;
  return values.xs;
};

export default function TradeScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { portfolioValue, portfolioChange } = useAppStore();
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  
  const { width: screenWidth } = Dimensions.get('window');
  const isMobile = screenWidth < BREAKPOINTS.md;
  
  // Responsive spacing
  const spacing = {
    xs: getResponsiveValue({ xs: 8, sm: 12, md: 16, lg: 20, xl: 24 }, screenWidth),
    sm: getResponsiveValue({ xs: 12, sm: 16, md: 20, lg: 24, xl: 28 }, screenWidth),
    md: getResponsiveValue({ xs: 16, sm: 20, md: 24, lg: 28, xl: 32 }, screenWidth),
    lg: getResponsiveValue({ xs: 20, sm: 24, md: 28, lg: 32, xl: 36 }, screenWidth),
    xl: getResponsiveValue({ xs: 24, sm: 28, md: 32, lg: 36, xl: 40 }, screenWidth),
  };
  
  // Responsive font sizes
  const fontSize = {
    xs: getResponsiveValue({ xs: 10, sm: 11, md: 12, lg: 13, xl: 14 }, screenWidth),
    sm: getResponsiveValue({ xs: 12, sm: 13, md: 14, lg: 15, xl: 16 }, screenWidth),
    md: getResponsiveValue({ xs: 14, sm: 15, md: 16, lg: 17, xl: 18 }, screenWidth),
    lg: getResponsiveValue({ xs: 16, sm: 18, md: 20, lg: 22, xl: 24 }, screenWidth),
    xl: getResponsiveValue({ xs: 20, sm: 22, md: 24, lg: 26, xl: 28 }, screenWidth),
    xxl: getResponsiveValue({ xs: 24, sm: 26, md: 28, lg: 30, xl: 32 }, screenWidth),
  };
  
  const ACCENT_COLORS = [
    '#6366F1', // indigo
    '#F97316', // orange
    '#0EA5E9', // sky blue
    '#A855F7', // purple
    '#22D3EE', // cyan
    '#FACC15', // amber
    '#EF4444', // red
    '#14B8A6', // teal
    '#EC4899', // pink
    '#10B981', // emerald
    '#F59E0B', // golden
    '#38BDF8', // light sky
  ];

  const baseTradingOptions = [
    {
      id: 'wallet',
      title: 'Connect Wallet',
      subtitle: 'Connect Aptos Wallet',
      icon: Wallet,
    },
    {
      id: 'merkle-trading',
      title: 'Leverage Trading',
      subtitle: 'Merkle protocol Based Trading',
      icon: Target,
    },
    {
      id: 'staking',
      title: 'Liquid Staking',
      subtitle: 'Earn APR with Amnis Finance',
      icon: TrendingUp,
    },
    {
      id: 'swap',
      title: 'Swap Tokens',
      subtitle: 'Exchange Tokens',
      icon: RefreshCw,
    },
    {
      id: 'spot-trading',
      title: 'Spot Trading',
      subtitle: 'Buy & sell cryptocurrencies instantly',
      icon: ArrowUpDown,
    },
    {
      id: 'copy-trading',
      title: 'Copy Trading',
      subtitle: 'Follow successful traders',
      icon: Copy,
    },
    {
      id: 'group-trading',
      title: 'Group Trading',
      subtitle: 'Trade together with your squad',
      icon: Users,
    },
    {
      id: 'charts',
      title: 'Advanced Charts',
      subtitle: 'Professional trading charts & analysis',
      icon: BarChart3,
    },
    {
      id: 'positions',
      title: 'Positions & Orders',
      subtitle: 'Manage your active trades',
      icon: Target,
    },
    {
      id: 'alerts',
      title: 'Price Alerts',
      subtitle: 'Set price notifications',
      icon: Bell,
    },
  ];

  const tradingOptions = baseTradingOptions.map((option, index) => ({
    ...option,
    color: ACCENT_COLORS[index % ACCENT_COLORS.length],
  }));
  
  const baseQuickActions = [
    {
      id: 'deposit',
      title: 'Deposit',
      subtitle: 'Add Funds',
      icon: DollarSign,
    },
    {
      id: 'withdraw',
      title: 'Withdraw',
      subtitle: 'Withdraw Funds',
      icon: Shield,
    },
  ];

  const quickActions = baseQuickActions.map((action, index) => ({
    ...action,
    color: ACCENT_COLORS[(baseTradingOptions.length + index) % ACCENT_COLORS.length],
  }));

  const renderContent = () => {
    switch (selectedOption) {
      case 'merkle-trading':
        return <TradingInterface />;
      case 'staking':
        return <StakingHub />;
      case 'swap':
        return <SwapInterface />;
      case 'spot-trading':
        return <SpotTradingContent onBack={() => setSelectedOption(null)} />;
      case 'copy-trading':
        return <CopyTradingContent onBack={() => setSelectedOption(null)} />;
      case 'group-trading':
        return <GroupTradingContent onBack={() => setSelectedOption(null)} />;
      case 'charts':
        return <AdvancedChartsContent onBack={() => setSelectedOption(null)} />;
      case 'positions':
        return <PositionsOrdersContent onBack={() => setSelectedOption(null)} />;
      case 'alerts':
        return <PriceAlertsContent onBack={() => setSelectedOption(null)} />;
      case 'wallet':
        return <WalletConnection onBack={() => setSelectedOption(null)} />;
      case 'deposit':
        return <DepositContent onBack={() => setSelectedOption(null)} />;
      case 'withdraw':
        return <WithdrawContent onBack={() => setSelectedOption(null)} />;
      default:
        return (
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={[
              styles.scrollContent, 
              { 
                paddingHorizontal: spacing.md,
                paddingBottom: 0 + insets.bottom + spacing.lg
              }
            ]}
            showsVerticalScrollIndicator={false}
            accessibilityRole="scrollbar"
            accessibilityLabel="Trading options and market overview"
          >
            {/* Quick Actions */}
            <View style={[styles.section, { marginBottom: spacing.lg }]}>
              <Text style={[
                styles.sectionTitle, 
                { 
                  color: theme.colors.textPrimary,
                  fontSize: fontSize.lg,
                  marginBottom: spacing.md
                }
              ]}>
                Quick Actions
              </Text>
              <View style={[
                styles.quickActionsGrid, 
                isMobile && styles.quickActionsGridMobile,
                { gap: spacing.sm }
              ]}>
                {quickActions.map((action) => (
                  <Pressable 
                    key={action.id} 
                    style={[
                      styles.quickActionCard, 
                      isMobile && styles.quickActionCardMobile,
                      { 
                        minHeight: getResponsiveValue({ xs: 100, sm: 110, md: 120, lg: 130, xl: 140 }, screenWidth),
                        flex: isMobile ? 1 : 0.5
                      }
                    ]} 
                    onPress={() => setSelectedOption(action.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`${action.title}: ${action.subtitle}`}
                    accessibilityHint={`Tap to open ${action.title} page`}
                  >
                    <Card style={[
                      styles.quickActionItem, 
                      { 
                        backgroundColor: theme.colors.chip,
                        padding: spacing.md,
                        borderRadius: getResponsiveValue({ xs: 12, sm: 14, md: 16, lg: 18, xl: 20 }, screenWidth)
                      }
                    ]}>
                      <View style={[
                        styles.quickActionIcon, 
                        { 
                          backgroundColor: action.color,
                          width: getResponsiveValue({ xs: 40, sm: 44, md: 48, lg: 52, xl: 56 }, screenWidth),
                          height: getResponsiveValue({ xs: 40, sm: 44, md: 48, lg: 52, xl: 56 }, screenWidth),
                          borderRadius: getResponsiveValue({ xs: 20, sm: 22, md: 24, lg: 26, xl: 28 }, screenWidth),
                          marginBottom: spacing.sm
                        }
                      ]}>
                        <action.icon 
                          size={getResponsiveValue({ xs: 18, sm: 20, md: 22, lg: 24, xl: 26 }, screenWidth)} 
                          color="#FFFFFF" 
                        />
                      </View>
                      <Text style={[
                        styles.quickActionTitle, 
                        { 
                          color: theme.colors.textPrimary,
                          fontSize: fontSize.md,
                          marginBottom: spacing.xs,
                          textAlign: 'center'
                        }
                      ]}>
                        {action.title}
                      </Text>
                      <Text style={[
                        styles.quickActionSubtitle, 
                        { 
                          color: theme.colors.textSecondary,
                          fontSize: fontSize.sm,
                          textAlign: 'center'
                        }
                      ]}>
                        {action.subtitle}
                      </Text>
                    </Card>
                  </Pressable>
                ))}
              </View>
            </View>
            
            {/* Trading Options */}
            <View style={[styles.section, { marginBottom: spacing.lg }]}>
              <Text style={[
                styles.sectionTitle, 
                { 
                  color: theme.colors.textPrimary,
                  fontSize: fontSize.lg,
                  marginBottom: spacing.md
                }
              ]}>
                Trading Options
              </Text>
              <View style={[styles.optionsList, { gap: spacing.sm }]}>
                {tradingOptions.map((option) => (
                  <Pressable 
                    key={option.id} 
                    onPress={() => setSelectedOption(option.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`${option.title}: ${option.subtitle}`}
                    accessibilityHint={`Tap to open ${option.title} page`}
                  >
                    <Card style={[
                      styles.optionCard, 
                      { 
                        backgroundColor: theme.colors.chip,
                        padding: spacing.md,
                        borderRadius: getResponsiveValue({ xs: 12, sm: 14, md: 16, lg: 18, xl: 20 }, screenWidth),
                        minHeight: getResponsiveValue({ xs: 70, sm: 75, md: 80, lg: 85, xl: 90 }, screenWidth)
                      }
                    ]}>
                      <View style={styles.optionLeft}>
                        <View style={[
                          styles.optionIcon, 
                          { 
                            backgroundColor: option.color,
                            width: getResponsiveValue({ xs: 40, sm: 44, md: 48, lg: 52, xl: 56 }, screenWidth),
                            height: getResponsiveValue({ xs: 40, sm: 44, md: 48, lg: 52, xl: 56 }, screenWidth),
                            borderRadius: getResponsiveValue({ xs: 20, sm: 22, md: 24, lg: 26, xl: 28 }, screenWidth),
                            marginRight: spacing.md
                          }
                        ]}>
                          <option.icon 
                            size={getResponsiveValue({ xs: 18, sm: 20, md: 22, lg: 24, xl: 26 }, screenWidth)} 
                            color="#FFFFFF" 
                          />
                        </View>
                        <View style={styles.optionInfo}>
                          <Text style={[
                            styles.optionTitle, 
                            { 
                              color: theme.colors.textPrimary,
                              fontSize: fontSize.md,
                              marginBottom: spacing.xs
                            }
                          ]}>
                            {option.title}
                          </Text>
                          <Text style={[
                            styles.optionSubtitle, 
                            { 
                              color: theme.colors.textSecondary,
                              fontSize: fontSize.sm
                            }
                          ]}>
                            {option.subtitle}
                          </Text>
                        </View>
                      </View>
                      <ChevronRight 
                        size={getResponsiveValue({ xs: 16, sm: 18, md: 20, lg: 22, xl: 24 }, screenWidth)} 
                        color={theme.colors.textSecondary} 
                      />
                    </Card>
                  </Pressable>
                ))}
              </View>
            </View>
            
            {/* Market Overview */}
            <View style={[styles.section, { marginBottom: spacing.lg }]}>
              <Text style={[
                styles.sectionTitle, 
                { 
                  color: theme.colors.textPrimary,
                  fontSize: fontSize.lg,
                  marginBottom: spacing.md
                }
              ]}>
                Market Overview
              </Text>
              <Card style={[
                styles.marketCard, 
                { 
                  backgroundColor: theme.colors.chip,
                  padding: spacing.md,
                  borderRadius: getResponsiveValue({ xs: 12, sm: 14, md: 16, lg: 18, xl: 20 }, screenWidth)
                }
              ]}>
                <View style={[
                  styles.marketStats, 
                  isMobile && styles.marketStatsMobile,
                  { gap: spacing.md }
                ]}>
                  <View style={styles.marketStat}>
                    <Text style={[
                      styles.marketStatValue, 
                      { 
                        color: theme.colors.positive,
                        fontSize: fontSize.lg,
                        marginBottom: spacing.xs
                      }
                    ]}>
                      +2.4%
                    </Text>
                    <Text style={[
                      styles.marketStatLabel, 
                      { 
                        color: theme.colors.textSecondary,
                        fontSize: fontSize.sm
                      }
                    ]}>
                      BTC 24h
                    </Text>
                  </View>
                  <View style={styles.marketStat}>
                    <Text style={[
                      styles.marketStatValue, 
                      { 
                        color: theme.colors.positive,
                        fontSize: fontSize.lg,
                        marginBottom: spacing.xs
                      }
                    ]}>
                      +1.8%
                    </Text>
                    <Text style={[
                      styles.marketStatLabel, 
                      { 
                        color: theme.colors.textSecondary,
                        fontSize: fontSize.sm
                      }
                    ]}>
                      ETH 24h
                    </Text>
                  </View>
                  <View style={styles.marketStat}>
                    <Text style={[
                      styles.marketStatValue, 
                      { 
                        color: theme.colors.negative,
                        fontSize: fontSize.lg,
                        marginBottom: spacing.xs
                      }
                    ]}>
                      -0.5%
                    </Text>
                    <Text style={[
                      styles.marketStatLabel, 
                      { 
                        color: theme.colors.textSecondary,
                        fontSize: fontSize.sm
                      }
                    ]}>
                      SOL 24h
                    </Text>
                  </View>
                </View>
              </Card>
            </View>
          </ScrollView>
        );
    }
  };
  
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
      {/* Header */}
      <View style={[
        styles.header, 
        { 
          paddingTop: insets.top + spacing.sm,
          paddingHorizontal: spacing.md,
          paddingBottom: spacing.md
        }
      ]}>
        {selectedOption ? (
          <View style={styles.headerWithBack}>
            <Pressable 
              onPress={() => setSelectedOption(null)}
              style={[
                styles.backButton,
                {
                  padding: spacing.sm,
                  borderRadius: getResponsiveValue({ xs: 6, sm: 8, md: 10, lg: 12, xl: 14 }, screenWidth)
                }
              ]}
              accessibilityRole="button"
              accessibilityLabel="Go back to Trade Center"
              accessibilityHint="Tap to return to the main trading page"
            >
              <ArrowLeft 
                size={getResponsiveValue({ xs: 20, sm: 22, md: 24, lg: 26, xl: 28 }, screenWidth)} 
                color={theme.colors.textPrimary} 
              />
            </Pressable>
            <Text style={[
              styles.title, 
              { 
                color: theme.colors.textPrimary,
                fontSize: fontSize.xl,
                fontFamily: 'Inter-Bold'
              }
            ]}>
              {tradingOptions.find(opt => opt.id === selectedOption)?.title || 
               quickActions.find(act => act.id === selectedOption)?.title || 
               'Trade Center'}
            </Text>
            <View style={styles.placeholder} />
          </View>
        ) : (
          <>
            <Text style={[
              styles.title, 
              { 
                color: theme.colors.textPrimary,
                fontSize: fontSize.xxl,
                fontFamily: 'Inter-Bold',
                marginBottom: spacing.md,
                textAlign: 'center'
              }
            ]}>
              Trade Center
            </Text>
            <View style={styles.portfolioSummary}>
              <Text style={[
                styles.portfolioLabel, 
                { 
                  color: theme.colors.textSecondary,
                  fontSize: fontSize.sm,
                  marginBottom: spacing.xs
                }
              ]}>
                Portfolio
              </Text>
              <Text style={[
                styles.portfolioValue, 
                { 
                  color: theme.colors.textPrimary,
                  fontSize: fontSize.xxl,
                  fontFamily: 'Inter-Bold',
                  marginBottom: spacing.xs
                }
              ]}>
                {formatCurrency(portfolioValue)}
              </Text>
              <Text style={[
                styles.portfolioChange, 
                { 
                  color: portfolioChange >= 0 ? theme.colors.positive : theme.colors.negative,
                  fontSize: fontSize.lg,
                  fontFamily: 'Inter-SemiBold'
                }
              ]}>
                {portfolioChange >= 0 ? '+' : ''}{portfolioChange.toFixed(2)}%
              </Text>
            </View>
          </>
        )}
      </View>
      
      {/* Content */}
      <View style={styles.contentContainer}>
        {renderContent()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
  },
  headerWithBack: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  backButton: {
    // Dynamic padding applied inline
  },
  placeholder: {
    width: 40,
  },
  title: {
    // Dynamic styles applied inline
  },
  portfolioSummary: {
    alignItems: 'center',
  },
  portfolioLabel: {
    // Dynamic styles applied inline
  },
  portfolioValue: {
    // Dynamic styles applied inline
  },
  portfolioChange: {
    // Dynamic styles applied inline
  },
  contentContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    // Dynamic padding applied inline
  },
  section: {
    // Dynamic margin applied inline
  },
  sectionTitle: {
    // Dynamic styles applied inline
  },
  quickActionsGrid: {
    flexDirection: 'row',
    // Dynamic gap applied inline
  },
  quickActionsGridMobile: {
    flexDirection: 'column',
  },
  quickActionCard: {
    // Dynamic styles applied inline
  },
  quickActionCardMobile: {
    // Dynamic styles applied inline
  },
  quickActionItem: {
    alignItems: 'center',
    height: '100%',
    justifyContent: 'center',
    // Dynamic styles applied inline
  },
  quickActionIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    // Dynamic styles applied inline
  },
  quickActionTitle: {
    fontFamily: 'Inter-SemiBold',
    // Dynamic styles applied inline
  },
  quickActionSubtitle: {
    fontFamily: 'Inter-Medium',
    // Dynamic styles applied inline
  },
  optionsList: {
    // Dynamic gap applied inline
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    // Dynamic styles applied inline
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    // Dynamic styles applied inline
  },
  optionInfo: {
    flex: 1,
  },
  optionTitle: {
    fontFamily: 'Inter-SemiBold',
    // Dynamic styles applied inline
  },
  optionSubtitle: {
    fontFamily: 'Inter-Medium',
    // Dynamic styles applied inline
  },
  marketCard: {
    // Dynamic styles applied inline
  },
  marketStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    // Dynamic gap applied inline
  },
  marketStatsMobile: {
    flexDirection: 'column',
  },
  marketStat: {
    alignItems: 'center',
  },
  marketStatValue: {
    fontFamily: 'Inter-Bold',
    // Dynamic styles applied inline
  },
  marketStatLabel: {
    fontFamily: 'Inter-Medium',
    // Dynamic styles applied inline
  },
});