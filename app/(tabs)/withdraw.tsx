import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Dimensions, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../theme/ThemeProvider';
import { useAccent } from '../../theme/useAccent';
import { Card } from '../../components/Card';
import { GradientPillButton } from '../../components/GradientPillButton';
import { ArrowLeft, AlertTriangle } from 'lucide-react-native';

export default function WithdrawPage() {
  const { theme } = useTheme();
  const accent = useAccent();
  const insets = useSafeAreaInsets();
  const router = useRouter();
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
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable 
          onPress={() => router.push('/(tabs)')}
          style={styles.backButton}
        >
          <ArrowLeft size={24} color={theme.colors.textPrimary} />
        </Pressable>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
          Withdraw
        </Text>
        <View style={styles.placeholder} />
      </View>

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
                <Text style={[styles.assetAvailable, { color: theme.colors.textSecondary }]}>
                  Available: {asset.available}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Withdraw Amount */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
            Withdraw Amount
          </Text>
          <Card style={[styles.amountCard, { backgroundColor: theme.colors.chip }]}>
            <View style={styles.amountHeader}>
              <Text style={[styles.amountLabel, { color: theme.colors.textPrimary }]}>
                Amount
              </Text>
              <Text style={[styles.availableText, { color: theme.colors.textSecondary }]}>
                Available: {currentAsset?.available} {selectedAsset}
              </Text>
            </View>
            <View style={styles.amountInputContainer}>
              <TextInput
                style={[styles.amountInput, { color: theme.colors.textPrimary }]}
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="numeric"
              />
              <Text style={[styles.currencyText, { color: theme.colors.textSecondary }]}>
                {selectedAsset}
              </Text>
            </View>
            <View style={styles.percentageButtons}>
              {['25%', '50%', '75%', '100%'].map((percentage) => (
                <Pressable
                  key={percentage}
                  onPress={() => {
                    const available = parseFloat(currentAsset?.available || '0');
                    const percent = parseFloat(percentage) / 100;
                    setAmount((available * percent).toString());
                  }}
                  style={[styles.percentageButton, { backgroundColor: theme.colors.bg }]}
                >
                  <Text style={[styles.percentageText, { color: theme.colors.textPrimary }]}>
                    {percentage}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Card>
        </View>

        {/* Destination */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
            Destination
          </Text>
          <Card style={[styles.destinationCard, { backgroundColor: theme.colors.chip }]}>
            <Text style={[styles.destinationLabel, { color: theme.colors.textPrimary }]}>
              Wallet Address
            </Text>
            <TextInput
              style={[styles.destinationInput, { color: theme.colors.textPrimary }]}
              value={destination}
              onChangeText={setDestination}
              placeholder="Enter wallet address"
              placeholderTextColor={theme.colors.textSecondary}
              multiline
            />
            <View style={styles.warningContainer}>
              <AlertTriangle size={16} color={theme.colors.negative} />
              <Text style={[styles.warningText, { color: theme.colors.negative }]}>
                Double-check the address. Wrong addresses may result in permanent loss.
              </Text>
            </View>
          </Card>
        </View>

        {/* Withdrawal Summary */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
            Withdrawal Summary
          </Text>
          <Card style={[styles.summaryCard, { backgroundColor: theme.colors.chip }]}>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>
                Amount
              </Text>
              <Text style={[styles.summaryValue, { color: theme.colors.textPrimary }]}>
                {amount || '0.00'} {selectedAsset}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>
                Network Fee
              </Text>
              <Text style={[styles.summaryValue, { color: theme.colors.textPrimary }]}>
                {calculateFee()} {selectedAsset}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: theme.colors.textPrimary }]}>
                You will receive
              </Text>
              <Text style={[styles.summaryValue, { color: theme.colors.textPrimary }]}>
                {calculateNet()} {selectedAsset}
              </Text>
            </View>
          </Card>
        </View>

        {/* Security Notice */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
            Security Notice
          </Text>
          <Card style={[styles.securityCard, { backgroundColor: theme.colors.chip }]}>
            <View style={styles.securityHeader}>
              <AlertTriangle size={20} color={theme.colors.negative} />
              <Text style={[styles.securityTitle, { color: theme.colors.textPrimary }]}>
                Security Notice
              </Text>
            </View>
            <Text style={[styles.securityText, { color: theme.colors.textSecondary }]}>
              • Verify the destination address is correct{'\n'}
              • Withdrawals may take 10-30 minutes to process{'\n'}
              • Large withdrawals may require additional verification{'\n'}
              • Never share your withdrawal confirmation details
            </Text>
          </Card>
        </View>

        {/* Confirm Withdraw Button */}
        <GradientPillButton
          title="Withdrawal Now"
          onPress={() => {}}
          style={styles.confirmButton}
        />
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
  },
  placeholder: {
    width: 40,
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
    marginBottom: 16,
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
    borderRadius: 8,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  assetScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  assetCard: {
    padding: 16,
    borderRadius: 12,
    marginRight: 12,
    minWidth: 120,
    alignItems: 'center',
  },
  assetSymbol: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    marginBottom: 4,
  },
  assetName: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    marginBottom: 2,
  },
  assetAvailable: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  amountCard: {
    padding: 16,
    borderRadius: 12,
  },
  amountHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  amountLabel: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  availableText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    paddingVertical: 8,
  },
  currencyText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    marginLeft: 8,
  },
  percentageButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  percentageButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  percentageText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
  },
  destinationCard: {
    padding: 16,
    borderRadius: 12,
  },
  destinationLabel: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 12,
  },
  destinationInput: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 12,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    lineHeight: 16,
  },
  summaryCard: {
    padding: 16,
    borderRadius: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  summaryValue: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  securityCard: {
    padding: 16,
    borderRadius: 12,
  },
  securityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  securityTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  securityText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    lineHeight: 20,
  },
  confirmButton: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  confirmButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
});
