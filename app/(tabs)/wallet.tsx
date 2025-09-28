import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeProvider';
import { useAppStore } from '../../store/useAppStore';
import { Card } from '../../components/Card';
import { GradientPillButton } from '../../components/GradientPillButton';
import { SoftButton } from '../../components/SoftButton';
import { formatCurrency, formatNumber } from '../../utils/number';
import { ArrowUpRight, ArrowDownLeft, MoreHorizontal, Bell } from 'lucide-react-native';
import { useRouter } from 'expo-router';

export default function WalletScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { portfolioValue, transactions, hideBalances } = useAppStore();
  
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={[styles.title, { 
          color: theme.colors.textPrimary,
          ...theme.typography.title 
        }]}>
          Wallet
        </Text>
        <Pressable style={[styles.headerButton, { backgroundColor: theme.colors.chip }]}>
          <Bell size={20} color={theme.colors.textSecondary} />
        </Pressable>
      </View>
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: 0 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Balance Card */}
        <Card style={styles.balanceCard} elevated>
          <View style={styles.balanceHeader}>
            <Text style={[styles.balanceLabel, { color: theme.colors.textSecondary }]}>
              Total Balance
            </Text>
            <Text style={[styles.balanceValue, { 
              color: theme.colors.textPrimary,
              ...theme.typography.displayXL 
            }]}>
              {hideBalances ? '****' : formatCurrency(portfolioValue)}
            </Text>
          </View>
          
          {/* Quick Actions */}
          <View style={styles.quickActions}>
            <SoftButton
              title="Withdraw"
              size="medium"
              onPress={() => router.push('/withdraw')}
              style={{ flex: 1, marginRight: 8 }}
            />
            <GradientPillButton
              title="Deposit"
              variant="primary"
              size="medium"
              onPress={() => router.push('/deposit')}
              style={{ flex: 1, marginLeft: 8 }}
            />
          </View>
        </Card>
        
        {/* Assets Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { 
              color: theme.colors.textPrimary,
              fontFamily: 'Inter-SemiBold' 
            }]}>
              My Assets
            </Text>
            <Pressable>
              <Text style={[styles.viewAllText, { color: theme.colors.textSecondary }]}>
                View all
              </Text>
            </Pressable>
          </View>
          
          <Card style={styles.assetsCard}>
            {/* BTC Holdings */}
            <View style={styles.assetRow}>
              <View style={[styles.assetIcon, { backgroundColor: '#F7931A' }]}>
                <Text style={styles.assetSymbol}>₿</Text>
              </View>
              <View style={styles.assetInfo}>
                <Text style={[styles.assetName, { color: theme.colors.textPrimary }]}>
                  Bitcoin
                </Text>
                <Text style={[styles.assetAmount, { color: theme.colors.textSecondary }]}>
                  {hideBalances ? '****' : '0.31 BTC'}
                </Text>
              </View>
              <View style={styles.assetValue}>
                <Text style={[styles.assetPrice, { color: theme.colors.textPrimary }]}>
                  {hideBalances ? '****' : formatCurrency(21030.98)}
                </Text>
                <Text style={[styles.assetChange, { color: theme.colors.positive }]}>
                  +2.45%
                </Text>
              </View>
            </View>
            
            {/* ETH Holdings */}
            <View style={styles.assetRow}>
              <View style={[styles.assetIcon, { backgroundColor: '#627EEA' }]}>
                <Text style={styles.assetSymbol}>Ξ</Text>
              </View>
              <View style={styles.assetInfo}>
                <Text style={[styles.assetName, { color: theme.colors.textPrimary }]}>
                  Ethereum
                </Text>
                <Text style={[styles.assetAmount, { color: theme.colors.textSecondary }]}>
                  {hideBalances ? '****' : '2.15 ETH'}
                </Text>
              </View>
              <View style={styles.assetValue}>
                <Text style={[styles.assetPrice, { color: theme.colors.textPrimary }]}>
                  {hideBalances ? '****' : formatCurrency(7356.87)}
                </Text>
                <Text style={[styles.assetChange, { color: theme.colors.positive }]}>
                  +1.89%
                </Text>
              </View>
            </View>

            {/* APT Holdings */}
            <View style={styles.assetRow}>
              <View style={[styles.assetIcon, { backgroundColor: '#00D1A0' }]}>
                <Text style={styles.assetSymbol}>⬟</Text>
              </View>
              <View style={styles.assetInfo}>
                <Text style={[styles.assetName, { color: theme.colors.textPrimary }]}>
                  Aptos
                </Text>
                <Text style={[styles.assetAmount, { color: theme.colors.textSecondary }]}>
                  {hideBalances ? '****' : '150 APT'}
                </Text>
              </View>
              <View style={styles.assetValue}>
                <Text style={[styles.assetPrice, { color: theme.colors.textPrimary }]}>
                  {hideBalances ? '****' : formatCurrency(1867.50)}
                </Text>
                <Text style={[styles.assetChange, { color: theme.colors.positive }]}>
                  +8.23%
                </Text>
              </View>
            </View>
          </Card>
        </View>
        
        {/* Recent Transactions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { 
              color: theme.colors.textPrimary,
              fontFamily: 'Inter-SemiBold' 
            }]}>
              Recent Transactions
            </Text>
            <Pressable>
              <Text style={[styles.viewAllText, { color: theme.colors.textSecondary }]}>
                View all
              </Text>
            </Pressable>
          </View>
          
          <Card style={styles.transactionsCard}>
            {/* Buy BTC Transaction */}
            <View style={styles.transactionRow}>
              <View style={[styles.transactionIcon, { backgroundColor: theme.colors.chip }]}>
                <ArrowDownLeft size={20} color={theme.colors.positive} />
              </View>
              <View style={styles.transactionInfo}>
                <Text style={[styles.transactionType, { color: theme.colors.textPrimary }]}>
                  Buy BTC
                </Text>
                <Text style={[styles.transactionTime, { color: theme.colors.textSecondary }]}>
                  2:39:13 pm
                </Text>
              </View>
              <View style={styles.transactionAmount}>
                <Text style={[styles.transactionValue, { color: theme.colors.positive }]}>
                  0.025 BTC
                </Text>
                <Text style={[styles.transactionStatus, { color: theme.colors.textSecondary }]}>
                  completed
                </Text>
              </View>
            </View>

            {/* Sell ETH Transaction */}
            <View style={styles.transactionRow}>
              <View style={[styles.transactionIcon, { backgroundColor: theme.colors.chip }]}>
                <ArrowUpRight size={20} color={theme.colors.negative} />
              </View>
              <View style={styles.transactionInfo}>
                <Text style={[styles.transactionType, { color: theme.colors.textPrimary }]}>
                  Sell ETH
                </Text>
                <Text style={[styles.transactionTime, { color: theme.colors.textSecondary }]}>
                  1:39:13 pm
                </Text>
              </View>
              <View style={styles.transactionAmount}>
                <Text style={[styles.transactionValue, { color: theme.colors.negative }]}>
                  1.5 ETH
                </Text>
                <Text style={[styles.transactionStatus, { color: theme.colors.textSecondary }]}>
                  completed
                </Text>
              </View>
            </View>
          </Card>
        </View>
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
  scrollView: {
    flex: 1,
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: 24,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 20,
  },
  balanceCard: {
    marginBottom: 32,
    padding: 24,
    borderRadius: 20,
  },
  balanceHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  balanceLabel: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    marginBottom: 8,
  },
  balanceValue: {
    fontFamily: 'Inter-Bold',
  },
  quickActions: {
    flexDirection: 'row',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
  },
  viewAllText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  assetsCard: {
    padding: 20,
    borderRadius: 16,
  },
  assetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  assetIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  assetSymbol: {
    fontSize: 18,
    color: '#FFFFFF',
    fontFamily: 'Inter-Bold',
  },
  assetInfo: {
    flex: 1,
  },
  assetName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 2,
  },
  assetAmount: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  assetValue: {
    alignItems: 'flex-end',
  },
  assetPrice: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    marginBottom: 2,
  },
  assetChange: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
  },
  transactionsCard: {
    padding: 20,
    borderRadius: 16,
  },
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionType: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 2,
  },
  transactionTime: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  transactionAmount: {
    alignItems: 'flex-end',
  },
  transactionValue: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    marginBottom: 2,
  },
  transactionStatus: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
});
