import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Dimensions, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeProvider';
import { useAccent } from '../../theme/useAccent';
import { Card } from '../../components/Card';
import { GradientPillButton } from '../../components/GradientPillButton';
import { ArrowLeft, Send, Shield, AlertTriangle } from 'lucide-react-native';

interface WithdrawContentProps {
  onBack: () => void;
}

export default function WithdrawContent({ onBack }: WithdrawContentProps) {
  const { theme } = useTheme();
  const accent = useAccent();
  const insets = useSafeAreaInsets();
  const [selectedAsset, setSelectedAsset] = useState('BTC');
  const [amount, setAmount] = useState('');
  const [destination, setDestination] = useState('');
  const [withdrawType, setWithdrawType] = useState('crypto');
  const screenWidth = Dimensions.get('window').width;
  const isMobile = screenWidth < 768;

  const cryptoAssets = [
    { symbol: 'BTC', name: 'Bitcoin', balance: '0.125', available: '0.120' },
    { symbol: 'ETH', name: 'Ethereum', balance: '2.5', available: '2.3' },
    { symbol: 'USDT', name: 'Tether', balance: '1000', available: '950' },
  ];

  const fiatAssets = [
    { symbol: 'USD', name: 'US Dollar', balance: '5000.00', available: '4800.00' },
    { symbol: 'EUR', name: 'Euro', balance: '2500.00', available: '2400.00' },
  ];

  const currentAsset = withdrawType === 'crypto' 
    ? cryptoAssets.find(a => a.symbol === selectedAsset)
    : fiatAssets.find(a => a.symbol === selectedAsset);

  const calculateFee = () => {
    if (!amount) return '0.00';
    const feeRate = withdrawType === 'crypto' ? 0.001 : 0.01; // 0.1% for crypto, 1% for fiat
    return (parseFloat(amount) * feeRate).toFixed(2);
  };

  const calculateNet = () => {
    if (!amount) return '0.00';
    const fee = parseFloat(calculateFee());
    return (parseFloat(amount) - fee).toFixed(2);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Withdraw Type Tabs */}
        <View style={styles.section}>
          <View style={[styles.tabContainer, isMobile && styles.tabContainerMobile]}>
            <Pressable
              onPress={() => setWithdrawType('crypto')}
              style={[
                styles.tabButton,
                { backgroundColor: theme.colors.chip },
                withdrawType === 'crypto' && { backgroundColor: accent.from }
              ]}
            >
              <Text style={[
                styles.tabText,
                { color: withdrawType === 'crypto' ? '#FFFFFF' : theme.colors.textPrimary }
              ]}>
                Crypto
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setWithdrawType('fiat')}
              style={[
                styles.tabButton,
                { backgroundColor: theme.colors.chip },
                withdrawType === 'fiat' && { backgroundColor: accent.from }
              ]}
            >
              <Text style={[
                styles.tabText,
                { color: withdrawType === 'fiat' ? '#FFFFFF' : theme.colors.textPrimary }
              ]}>
                Fiat
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Asset Selection */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
            Select Asset
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.assetScroll}>
            {(withdrawType === 'crypto' ? cryptoAssets : fiatAssets).map((asset) => (
              <Pressable
                key={asset.symbol}
                onPress={() => setSelectedAsset(asset.symbol)}
                style={[
                  styles.assetCard,
                  { backgroundColor: theme.colors.chip },
                  selectedAsset === asset.symbol && { borderColor: accent.from, borderWidth: 1 }
                ]}
              >
                <Text style={[styles.assetSymbol, { color: theme.colors.textPrimary }]}>
                  {asset.symbol}
                </Text>
                <Text style={[styles.assetName, { color: theme.colors.textSecondary }]}>
                  {asset.name}
                </Text>
                <Text style={[styles.assetBalance, { color: theme.colors.textSecondary }]}>
                  Available: {asset.available}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Amount Input */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
            Withdraw Amount
          </Text>
          <Card style={[styles.inputCard, { backgroundColor: theme.colors.chip }]}>
            <View style={styles.inputHeader}>
              <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                Amount
              </Text>
              <Text style={[styles.inputBalance, { color: theme.colors.textSecondary }]}>
                Available: {currentAsset?.available} {selectedAsset}
              </Text>
            </View>
            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.amountInput, { 
                  color: theme.colors.textPrimary,
                  borderColor: theme.colors.border
                }]}
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="numeric"
              />
              <Text style={[styles.assetSymbol, { color: theme.colors.textSecondary }]}>
                {selectedAsset}
              </Text>
            </View>
            <View style={styles.quickAmounts}>
              {['25%', '50%', '75%', '100%'].map((percent) => (
                <Pressable
                  key={percent}
                  onPress={() => {
                    if (currentAsset) {
                      const value = (parseFloat(currentAsset.available) * parseFloat(percent) / 100).toFixed(2);
                      setAmount(value);
                    }
                  }}
                  style={[styles.quickAmount, { backgroundColor: theme.colors.surface }]}
                >
                  <Text style={[styles.quickAmountText, { color: theme.colors.textPrimary }]}>
                    {percent}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Card>
        </View>

        {/* Destination Input */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
            Destination
          </Text>
          <Card style={[styles.destinationCard, { backgroundColor: theme.colors.chip }]}>
            <Text style={[styles.destinationLabel, { color: theme.colors.textSecondary }]}>
              {withdrawType === 'crypto' ? 'Wallet Address' : 'Bank Account'}
            </Text>
            <TextInput
              style={[styles.destinationInput, { 
                color: theme.colors.textPrimary,
                borderColor: theme.colors.border
              }]}
              value={destination}
              onChangeText={setDestination}
              placeholder={withdrawType === 'crypto' ? 'Enter wallet address' : 'Enter bank account details'}
              placeholderTextColor={theme.colors.textSecondary}
              multiline={withdrawType === 'crypto'}
            />
            {withdrawType === 'crypto' && (
              <Text style={[styles.destinationNote, { color: theme.colors.textSecondary }]}>
                ⚠️ Double-check the address. Wrong addresses may result in permanent loss.
              </Text>
            )}
          </Card>
        </View>

        {/* Fee and Net Amount */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
            Withdrawal Summary
          </Text>
          <Card style={[styles.summaryCard, { backgroundColor: theme.colors.chip }]}>
            <View style={[styles.summaryRow, isMobile && styles.summaryRowMobile]}>
              <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>
                Amount
              </Text>
              <Text style={[styles.summaryValue, { color: theme.colors.textPrimary }]}>
                {amount || '0.00'} {selectedAsset}
              </Text>
            </View>
            <View style={[styles.summaryRow, isMobile && styles.summaryRowMobile]}>
              <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>
                Network Fee
              </Text>
              <Text style={[styles.summaryValue, { color: theme.colors.textSecondary }]}>
                {calculateFee()} {selectedAsset}
              </Text>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: theme.colors.border }]} />
            <View style={[styles.summaryRow, isMobile && styles.summaryRowMobile]}>
              <Text style={[styles.summaryLabel, { color: theme.colors.textPrimary }]}>
                You will receive
              </Text>
              <Text style={[styles.summaryValue, { color: theme.colors.textPrimary }]}>
                {calculateNet()} {selectedAsset}
              </Text>
            </View>
          </Card>
        </View>

        {/* Security Warning */}
        <View style={styles.section}>
          <Card style={[styles.warningCard, { backgroundColor: theme.colors.chip }]}>
            <View style={styles.warningHeader}>
              <AlertTriangle size={20} color={theme.colors.negative} />
              <Text style={[styles.warningTitle, { color: theme.colors.textPrimary }]}>
                Security Notice
              </Text>
            </View>
            <Text style={[styles.warningText, { color: theme.colors.textSecondary }]}>
              • Verify the destination address is correct{'\n'}
              • Withdrawals may take 10-30 minutes to process{'\n'}
              • Large withdrawals may require additional verification{'\n'}
              • Never share your withdrawal confirmation details
            </Text>
          </Card>
        </View>

        {/* Confirm Withdraw Button */}
        <GradientPillButton
          onPress={() => {}}
          colors={[accent.from, accent.to]}
          style={styles.confirmButton}
        >
          <Send size={20} color="#FFFFFF" />
          <Text style={styles.confirmButtonText}>Confirm Withdrawal</Text>
        </GradientPillButton>
      </ScrollView>
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
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 12,
  },
  tabContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  tabContainerMobile: {
    flexDirection: 'column',
    gap: 8,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  assetScroll: {
    marginBottom: 8,
  },
  assetCard: {
    padding: 16,
    borderRadius: 12,
    marginRight: 12,
    minWidth: 120,
    alignItems: 'center',
  },
  assetSymbol: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    marginBottom: 4,
  },
  assetName: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    marginBottom: 2,
  },
  assetBalance: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
  },
  inputCard: {
    padding: 16,
    borderRadius: 16,
  },
  inputHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  inputBalance: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  amountInput: {
    flex: 1,
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 8,
    marginRight: 12,
  },
  quickAmounts: {
    flexDirection: 'row',
    gap: 8,
  },
  quickAmount: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  quickAmountText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  destinationCard: {
    padding: 16,
    borderRadius: 16,
  },
  destinationLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    marginBottom: 8,
  },
  destinationInput: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 8,
    minHeight: 50,
  },
  destinationNote: {
    fontSize: 10,
    fontFamily: 'Inter-Medium',
    lineHeight: 14,
  },
  summaryCard: {
    padding: 16,
    borderRadius: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryRowMobile: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 4,
  },
  summaryLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  summaryValue: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  summaryDivider: {
    height: 1,
    marginVertical: 8,
  },
  warningCard: {
    padding: 16,
    borderRadius: 16,
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  warningTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    marginLeft: 8,
  },
  warningText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    lineHeight: 16,
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 20,
  },
  confirmButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginLeft: 8,
  },
});