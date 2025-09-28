import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeProvider';
import { useAppStore } from '../../store/useAppStore';
import { Card } from '../../components/Card';
import { StatChip } from '../../components/StatChip';
import { TickerBadge } from '../../components/TickerBadge';
import { Sparkline } from '../../components/Sparkline';
import { formatCurrency } from '../../utils/number';
import { Search, Bell } from 'lucide-react-native';

export default function MarketScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { tickers } = useAppStore();
  const [activeChip, setActiveChip] = useState('Crypto');
  
  const chips = ['Crypto', 'DeFi', 'Layer2'];
  
  // Grid layout - show more tickers with scrolling
  const displayTickers = tickers.slice(0, 12);
  
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[styles.title, { 
            color: theme.colors.textPrimary,
            ...theme.typography.title 
          }]}>
            Market
          </Text>
        </View>
        <View style={styles.headerRight}>
          <Pressable style={[styles.headerButton, { backgroundColor: theme.colors.chip }]}>
            <Search size={20} color={theme.colors.textSecondary} />
          </Pressable>
          <Pressable style={[styles.headerButton, { backgroundColor: theme.colors.chip }]}>
            <Bell size={20} color={theme.colors.textSecondary} />
          </Pressable>
        </View>
      </View>
      
      {/* Category Chips */}
      <View style={styles.chipContainer}>
        {chips.map((chip) => (
          <Pressable
            key={chip}
            style={[
              styles.chip,
              {
                backgroundColor: activeChip === chip ? theme.colors.accentFrom : theme.colors.chip,
                borderRadius: theme.borderRadius.xs,
              },
            ]}
            onPress={() => setActiveChip(chip)}
          >
            <Text style={[styles.chipText, {
              color: activeChip === chip ? '#FFFFFF' : theme.colors.textPrimary,
              fontFamily: 'Inter-SemiBold',
            }]}>
              {chip}
            </Text>
          </Pressable>
        ))}
      </View>
      
      {/* Tickers Grid with Hidden Scroll */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 0 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
      >
        <View style={styles.grid}>
          {/* Bitcoin */}
          <Card style={[styles.tickerCard, { marginRight: 12, marginBottom: 12 }]}>
            <View style={styles.tickerHeader}>
              <View style={[styles.tickerIcon, { backgroundColor: '#F7931A' }]}>
                <Text style={styles.tickerIconText}>₿</Text>
              </View>
              <View style={styles.tickerInfo}>
                <Text style={[styles.tickerSymbol, { color: theme.colors.textPrimary }]}>
                  BTC
                </Text>
                <Text style={[styles.tickerName, { color: theme.colors.textSecondary }]}>
                  Bitcoin
                </Text>
              </View>
            </View>
            <View style={styles.tickerPrice}>
              <Text style={[styles.price, { color: theme.colors.textPrimary }]}>
                $67,875.23
              </Text>
              <StatChip value={2.75} size="small" />
            </View>
            <View style={styles.sparklineContainer}>
              <Sparkline 
                data={[1, 1.1, 1.05, 1.15, 1.08, 1.12, 1.18, 1.16]} 
                width={120} 
                height={30}
                color={theme.colors.positive}
              />
            </View>
          </Card>

          {/* Ethereum */}
          <Card style={[styles.tickerCard, { marginBottom: 12 }]}>
            <View style={styles.tickerHeader}>
              <View style={[styles.tickerIcon, { backgroundColor: '#627EEA' }]}>
                <Text style={styles.tickerIconText}>Ξ</Text>
              </View>
              <View style={styles.tickerInfo}>
                <Text style={[styles.tickerSymbol, { color: theme.colors.textPrimary }]}>
                  ETH
                </Text>
                <Text style={[styles.tickerName, { color: theme.colors.textSecondary }]}>
                  Ethereum
                </Text>
              </View>
            </View>
            <View style={styles.tickerPrice}>
              <Text style={[styles.price, { color: theme.colors.textPrimary }]}>
                $3,408.07
              </Text>
              <StatChip value={1.72} size="small" />
            </View>
            <View style={styles.sparklineContainer}>
              <Sparkline 
                data={[1, 1.1, 1.3, 1.2, 1.4, 1.6, 1.5, 1.7]} 
                width={120} 
                height={30}
                color={theme.colors.positive}
              />
            </View>
          </Card>

          {/* Aptos */}
          <Card style={[styles.tickerCard, { marginRight: 12, marginBottom: 12 }]}>
            <View style={styles.tickerHeader}>
              <View style={[styles.tickerIcon, { backgroundColor: '#00D1A0' }]}>
                <Text style={styles.tickerIconText}>⬟</Text>
              </View>
              <View style={styles.tickerInfo}>
                <Text style={[styles.tickerSymbol, { color: theme.colors.textPrimary }]}>
                  APT
                </Text>
                <Text style={[styles.tickerName, { color: theme.colors.textSecondary }]}>
                  Aptos
                </Text>
              </View>
            </View>
            <View style={styles.tickerPrice}>
              <Text style={[styles.price, { color: theme.colors.textPrimary }]}>
                $12.45
              </Text>
              <StatChip value={8.06} size="small" />
            </View>
            <View style={styles.sparklineContainer}>
              <Sparkline 
                data={[1, 1.2, 1.1, 1.4, 1.3, 1.6, 1.5, 1.8]} 
                width={120} 
                height={30}
                color={theme.colors.positive}
              />
            </View>
          </Card>

          {/* Solana */}
          <Card style={[styles.tickerCard, { marginBottom: 12 }]}>
            <View style={styles.tickerHeader}>
              <View style={[styles.tickerIcon, { backgroundColor: '#14F195' }]}>
                <Text style={styles.tickerIconText}>◎</Text>
              </View>
              <View style={styles.tickerInfo}>
                <Text style={[styles.tickerSymbol, { color: theme.colors.textPrimary }]}>
                  SOL
                </Text>
                <Text style={[styles.tickerName, { color: theme.colors.textSecondary }]}>
                  Solana
                </Text>
              </View>
            </View>
            <View style={styles.tickerPrice}>
              <Text style={[styles.price, { color: theme.colors.textPrimary }]}>
                $184.73
              </Text>
              <StatChip value={0.96} size="small" />
            </View>
            <View style={styles.sparklineContainer}>
              <Sparkline 
                data={[1, 0.9, 0.8, 0.85, 0.82, 0.88, 0.86, 0.84]} 
                width={120} 
                height={30}
                color={theme.colors.negative}
              />
            </View>
          </Card>

          {/* Cardano */}
          <Card style={[styles.tickerCard, { marginRight: 12, marginBottom: 12 }]}>
            <View style={styles.tickerHeader}>
              <View style={[styles.tickerIcon, { backgroundColor: '#0033AD' }]}>
                <Text style={styles.tickerIconText}>₳</Text>
              </View>
              <View style={styles.tickerInfo}>
                <Text style={[styles.tickerSymbol, { color: theme.colors.textPrimary }]}>
                  ADA
                </Text>
                <Text style={[styles.tickerName, { color: theme.colors.textSecondary }]}>
                  Cardano
                </Text>
              </View>
            </View>
            <View style={styles.tickerPrice}>
              <Text style={[styles.price, { color: theme.colors.textPrimary }]}>
                $0.4900
              </Text>
              <StatChip value={3.46} size="small" />
            </View>
            <View style={styles.sparklineContainer}>
              <Sparkline 
                data={[1, 1.1, 1.05, 1.15, 1.08, 1.12, 1.18, 1.16]} 
                width={120} 
                height={30}
                color={theme.colors.positive}
              />
            </View>
          </Card>

          {/* XRP */}
          <Card style={[styles.tickerCard, { marginBottom: 12 }]}>
            <View style={styles.tickerHeader}>
              <View style={[styles.tickerIcon, { backgroundColor: '#25A768' }]}>
                <Text style={styles.tickerIconText}>X</Text>
              </View>
              <View style={styles.tickerInfo}>
                <Text style={[styles.tickerSymbol, { color: theme.colors.textPrimary }]}>
                  XRP
                </Text>
                <Text style={[styles.tickerName, { color: theme.colors.textSecondary }]}>
                  XRP
                </Text>
              </View>
            </View>
            <View style={styles.tickerPrice}>
              <Text style={[styles.price, { color: theme.colors.textPrimary }]}>
                $0.6241
              </Text>
              <StatChip value={-2.08} size="small" />
            </View>
            <View style={styles.sparklineContainer}>
              <Sparkline 
                data={[1, 0.95, 0.9, 0.88, 0.85, 0.82, 0.8, 0.78]} 
                width={120} 
                height={30}
                color={theme.colors.negative}
              />
            </View>
          </Card>

          {/* Polkadot */}
          <Card style={[styles.tickerCard, { marginRight: 12, marginBottom: 12 }]}>
            <View style={styles.tickerHeader}>
              <View style={[styles.tickerIcon, { backgroundColor: '#E6007A' }]}>
                <Text style={styles.tickerIconText}>●</Text>
              </View>
              <View style={styles.tickerInfo}>
                <Text style={[styles.tickerSymbol, { color: theme.colors.textPrimary }]}>
                  DOT
                </Text>
                <Text style={[styles.tickerName, { color: theme.colors.textSecondary }]}>
                  Polkadot
                </Text>
              </View>
            </View>
            <View style={styles.tickerPrice}>
              <Text style={[styles.price, { color: theme.colors.textPrimary }]}>
                $7.23
              </Text>
              <StatChip value={1.25} size="small" />
            </View>
            <View style={styles.sparklineContainer}>
              <Sparkline 
                data={[1, 1.05, 1.02, 1.08, 1.06, 1.1, 1.08, 1.12]} 
                width={120} 
                height={30}
                color={theme.colors.positive}
              />
            </View>
          </Card>

          {/* Polygon */}
          <Card style={[styles.tickerCard, { marginBottom: 12 }]}>
            <View style={styles.tickerHeader}>
              <View style={[styles.tickerIcon, { backgroundColor: '#8247E5' }]}>
                <Text style={styles.tickerIconText}>⬟</Text>
              </View>
              <View style={styles.tickerInfo}>
                <Text style={[styles.tickerSymbol, { color: theme.colors.textPrimary }]}>
                  MATIC
                </Text>
                <Text style={[styles.tickerName, { color: theme.colors.textSecondary }]}>
                  Polygon
                </Text>
              </View>
            </View>
            <View style={styles.tickerPrice}>
              <Text style={[styles.price, { color: theme.colors.textPrimary }]}>
                $0.89
              </Text>
              <StatChip value={2.15} size="small" />
            </View>
            <View style={styles.sparklineContainer}>
              <Sparkline 
                data={[1, 1.02, 1.05, 1.08, 1.1, 1.12, 1.15, 1.18]} 
                width={120} 
                height={30}
                color={theme.colors.positive}
              />
            </View>
          </Card>
        </View>
        
        {/* Market Stats */}
        <Card style={styles.statsCard}>
          <Text style={[styles.statsTitle, { 
            color: theme.colors.textPrimary,
            fontFamily: 'Inter-SemiBold' 
          }]}>
            Market Overview
          </Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                Total Market Cap
              </Text>
              <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>
                $2.48T
              </Text>
              <StatChip value={2.8} size="small" />
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                24h Volume
              </Text>
              <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>
                $89.2B
              </Text>
              <StatChip value={-5.2} size="small" />
            </View>
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: 24,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 24,
    gap: 12,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  chipText: {
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scrollContent: {
    // Dynamic padding applied via contentContainerStyle
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 24,
  },
  tickerCard: {
    width: '48%',
    padding: 16,
    borderRadius: 12,
  },
  tickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tickerIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  tickerIconText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  },
  tickerInfo: {
    flex: 1,
  },
  tickerSymbol: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 2,
  },
  tickerName: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  tickerPrice: {
    marginBottom: 12,
  },
  price: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    marginBottom: 4,
  },
  sparklineContainer: {
    alignItems: 'flex-start',
  },
  statsCard: {
    padding: 20,
    borderRadius: 16,
  },
  statsTitle: {
    fontSize: 18,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flex: 1,
  },
  statLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    marginBottom: 8,
  },
});