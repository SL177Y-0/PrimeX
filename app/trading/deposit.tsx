import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Dimensions } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { useAccent } from '../../theme/useAccent';
import { Card } from '../../components/Card';
import { GradientPillButton } from '../../components/GradientPillButton';
import { Copy, QrCode, CreditCard, Building, Check } from 'lucide-react-native';

interface DepositContentProps {
  onBack: () => void;
}

export default function DepositContent({ onBack }: DepositContentProps) {
  const { theme } = useTheme();
  const accent = useAccent();
  const [depositType, setDepositType] = useState('crypto');
  const [selectedAsset, setSelectedAsset] = useState('BTC');
  const [copied, setCopied] = useState(false);
  const screenWidth = Dimensions.get('window').width;
  const isMobile = screenWidth < 768;

  const cryptoAssets = [
    { symbol: 'BTC', name: 'Bitcoin', balance: '0.00', address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa' },
    { symbol: 'ETH', name: 'Ethereum', balance: '0.00', address: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6' },
    { symbol: 'USDT', name: 'Tether', balance: '0.00', address: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6' },
  ];

  const fiatMethods = [
    { name: 'Bank Transfer', icon: Building, fee: 'Free', time: '1-3 days' },
    { name: 'Credit Card', icon: CreditCard, fee: '3.5%', time: 'Instant' },
  ];

  const handleCopyAddress = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Deposit Type Tabs */}
        <View style={styles.section}>
          <View style={[styles.tabContainer, isMobile && styles.tabContainerMobile]}>
            <Pressable
              onPress={() => setDepositType('crypto')}
              style={[
                styles.tabButton,
                { backgroundColor: theme.colors.chip },
                depositType === 'crypto' && { backgroundColor: accent.from }
              ]}
            >
              <Text style={[
                styles.tabText,
                { color: depositType === 'crypto' ? '#FFFFFF' : theme.colors.textPrimary }
              ]}>
                Crypto
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setDepositType('fiat')}
              style={[
                styles.tabButton,
                { backgroundColor: theme.colors.chip },
                depositType === 'fiat' && { backgroundColor: accent.from }
              ]}
            >
              <Text style={[
                styles.tabText,
                { color: depositType === 'fiat' ? '#FFFFFF' : theme.colors.textPrimary }
              ]}>
                Fiat
              </Text>
            </Pressable>
          </View>
        </View>

        {depositType === 'crypto' ? (
          <>
            {/* Asset Selection */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
                Select Asset
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.assetScroll}>
                {cryptoAssets.map((asset) => (
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
                      Balance: {asset.balance}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            {/* Wallet Address */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
                Deposit Address
              </Text>
              <Card style={[styles.addressCard, { backgroundColor: theme.colors.chip }]}>
                <View style={styles.addressHeader}>
                  <Text style={[styles.addressLabel, { color: theme.colors.textSecondary }]}>
                    Your {selectedAsset} Address
                  </Text>
                  <Pressable onPress={handleCopyAddress} style={styles.copyButton}>
                    {copied ? (
                      <Check size={16} color={theme.colors.positive} />
                    ) : (
                      <Copy size={16} color={theme.colors.textSecondary} />
                    )}
                    <Text style={[styles.copyText, { color: copied ? theme.colors.positive : theme.colors.textSecondary }]}>
                      {copied ? 'Copied!' : 'Copy'}
                    </Text>
                  </Pressable>
                </View>
                <Text style={[styles.addressValue, { color: theme.colors.textPrimary }]}>
                  {cryptoAssets.find(a => a.symbol === selectedAsset)?.address}
                </Text>
                <Text style={[styles.addressWarning, { color: theme.colors.textSecondary }]}>
                  ⚠️ Only send {selectedAsset} to this address. Sending other assets may result in permanent loss.
                </Text>
              </Card>
            </View>

            {/* QR Code */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
                QR Code
              </Text>
              <Card style={[styles.qrCard, { backgroundColor: theme.colors.chip }]}>
                <View style={[styles.qrContainer, isMobile && styles.qrContainerMobile]}>
                  <QrCode size={isMobile ? 120 : 160} color={theme.colors.textPrimary} />
                </View>
                <Text style={[styles.qrText, { color: theme.colors.textSecondary }]}>
                  Scan QR code to deposit {selectedAsset}
                </Text>
              </Card>
            </View>

            {/* Deposit Instructions */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
                How to Deposit
              </Text>
              <Card style={[styles.instructionsCard, { backgroundColor: theme.colors.chip }]}>
                <View style={[styles.instructionItem, isMobile && styles.instructionItemMobile]}>
                  <View style={[styles.instructionNumber, { backgroundColor: accent.from }]}>
                    <Text style={styles.instructionNumberText}>1</Text>
                  </View>
                  <Text style={[styles.instructionText, { color: theme.colors.textPrimary }]}>
                    Copy the {selectedAsset} address or scan the QR code
                  </Text>
                </View>
                <View style={[styles.instructionItem, isMobile && styles.instructionItemMobile]}>
                  <View style={[styles.instructionNumber, { backgroundColor: accent.from }]}>
                    <Text style={styles.instructionNumberText}>2</Text>
                  </View>
                  <Text style={[styles.instructionText, { color: theme.colors.textPrimary }]}>
                    Send {selectedAsset} from your external wallet to this address
                  </Text>
                </View>
                <View style={[styles.instructionItem, isMobile && styles.instructionItemMobile]}>
                  <View style={[styles.instructionNumber, { backgroundColor: accent.from }]}>
                    <Text style={styles.instructionNumberText}>3</Text>
                  </View>
                  <Text style={[styles.instructionText, { color: theme.colors.textPrimary }]}>
                    Wait for network confirmation (usually 10-30 minutes)
                  </Text>
                </View>
              </Card>
            </View>
          </>
        ) : (
          <>
            {/* Fiat Methods */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
                Deposit Methods
              </Text>
              {fiatMethods.map((method, index) => (
                <Card key={index} style={[styles.methodCard, { backgroundColor: theme.colors.chip }]}>
                  <View style={styles.methodHeader}>
                    <View style={styles.methodInfo}>
                      <method.icon size={24} color={theme.colors.textPrimary} />
                      <Text style={[styles.methodName, { color: theme.colors.textPrimary }]}>
                        {method.name}
                      </Text>
                    </View>
                    <View style={styles.methodDetails}>
                      <Text style={[styles.methodFee, { color: theme.colors.textSecondary }]}>
                        Fee: {method.fee}
                      </Text>
                      <Text style={[styles.methodTime, { color: theme.colors.textSecondary }]}>
                        Time: {method.time}
                      </Text>
                    </View>
                  </View>
                  <GradientPillButton
                    title="Select"
                    onPress={() => {}}
                    style={styles.methodButton}
                  />
                </Card>
              ))}
            </View>

            {/* Bank Account Details */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
                Bank Transfer Details
              </Text>
              <Card style={[styles.bankCard, { backgroundColor: theme.colors.chip }]}>
                <View style={[styles.bankDetails, isMobile && styles.bankDetailsMobile]}>
                  <View style={styles.bankDetail}>
                    <Text style={[styles.bankLabel, { color: theme.colors.textSecondary }]}>
                      Account Name
                    </Text>
                    <Text style={[styles.bankValue, { color: theme.colors.textPrimary }]}>
                      Trade Center Ltd
                    </Text>
                  </View>
                  <View style={styles.bankDetail}>
                    <Text style={[styles.bankLabel, { color: theme.colors.textSecondary }]}>
                      Account Number
                    </Text>
                    <Text style={[styles.bankValue, { color: theme.colors.textPrimary }]}>
                      1234567890
                    </Text>
                  </View>
                  <View style={styles.bankDetail}>
                    <Text style={[styles.bankLabel, { color: theme.colors.textSecondary }]}>
                      Bank Name
                    </Text>
                    <Text style={[styles.bankValue, { color: theme.colors.textPrimary }]}>
                      Chase Bank
                    </Text>
                  </View>
                  <View style={styles.bankDetail}>
                    <Text style={[styles.bankLabel, { color: theme.colors.textSecondary }]}>
                      Routing Number
                    </Text>
                    <Text style={[styles.bankValue, { color: theme.colors.textPrimary }]}>
                      021000021
                    </Text>
                  </View>
                </View>
                <Text style={[styles.bankNote, { color: theme.colors.textSecondary }]}>
                  Include your user ID in the transfer reference to ensure quick processing.
                </Text>
              </Card>
            </View>
          </>
        )}

        {/* Confirm Deposit Button */}
        <GradientPillButton
          title="Confirm Deposit"
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
  addressCard: {
    padding: 16,
    borderRadius: 16,
  },
  addressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addressLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  copyText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    marginLeft: 4,
  },
  addressValue: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    marginBottom: 12,
    lineHeight: 18,
  },
  addressWarning: {
    fontSize: 10,
    fontFamily: 'Inter-Medium',
    lineHeight: 14,
  },
  qrCard: {
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  qrContainer: {
    padding: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    marginBottom: 12,
  },
  qrContainerMobile: {
    padding: 16,
  },
  qrText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
  },
  instructionsCard: {
    padding: 16,
    borderRadius: 16,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  instructionItemMobile: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 8,
  },
  instructionNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  instructionNumberText: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  instructionText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    lineHeight: 20,
  },
  methodCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  methodHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  methodInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  methodName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    marginLeft: 12,
  },
  methodDetails: {
    alignItems: 'flex-end',
  },
  methodFee: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    marginBottom: 2,
  },
  methodTime: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  methodButton: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 8,
  },
  methodButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  bankCard: {
    padding: 16,
    borderRadius: 16,
  },
  bankDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 12,
  },
  bankDetailsMobile: {
    flexDirection: 'column',
    gap: 12,
  },
  bankDetail: {
    flex: 1,
    minWidth: 150,
  },
  bankLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    marginBottom: 4,
  },
  bankValue: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  bankNote: {
    fontSize: 10,
    fontFamily: 'Inter-Medium',
    lineHeight: 14,
  },
  confirmButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 20,
  },
  confirmButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
});