import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import {
  Wallet,
  Smartphone,
  Monitor,
  CheckCircle,
  ArrowLeft,
} from 'lucide-react-native';
import { Image } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import { useWallet } from '../app/providers/WalletProvider';
import { Card } from './Card';
import { GradientPillButton } from './GradientPillButton';

interface WalletConnectionProps {
  onBack?: () => void;
}

export function WalletConnection({ onBack }: WalletConnectionProps) {
  const { theme } = useTheme();
  const { 
    connected, 
    connecting, 
    account, 
    wallet,
    connectExtension, 
    connectDeepLink,
    connectGoogle,
    disconnect,
    isExtensionAvailable 
  } = useWallet();
  
  const [selectedMethod, setSelectedMethod] = useState<'extension' | 'deeplink' | 'google' | null>(null);

  const handleConnect = async (method: 'extension' | 'deeplink' | 'google') => {
    try {
      if (method === 'extension') {
        await connectExtension('Petra');
      } else if (method === 'deeplink') {
        await connectDeepLink('Petra');
      } else if (method === 'google') {
        await connectGoogle();
      }
    } catch (error) {
      Alert.alert('Connection Failed', error instanceof Error ? error.message : 'Failed to connect wallet');
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
    } catch (error) {
      // Silently handle errors
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (connected && account) {
    return (
      <ScrollView 
        style={[styles.container, { backgroundColor: theme.colors.bg }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        

        <View style={styles.header}>
          <View style={[styles.successIcon, { backgroundColor: theme.colors.positive }]}>
            <CheckCircle size={32} color="#FFFFFF" />
          </View>
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
            Wallet Connected
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            You&apos;re ready to start trading
          </Text>
        </View>

        <Card style={[styles.connectedCard, { backgroundColor: theme.colors.card }]}>
          <View style={styles.walletInfo}>
            <View style={[styles.walletIcon, { backgroundColor: '#6366F1' }]}>
              <Monitor size={20} color="#FFFFFF" />
            </View>
            <View style={styles.walletDetails}>
              <Text style={[styles.walletName, { color: theme.colors.textPrimary }]}>
                {wallet?.name || 'Petra Wallet'}
              </Text>
              <Text style={[styles.connectionMethod, { color: theme.colors.textSecondary }]}>
                Connected via {wallet?.connectionMethod || 'extension'}
              </Text>
            </View>
          </View>

          <View style={[styles.addressContainer, { backgroundColor: theme.colors.chip }]}>
            <Text style={[styles.addressLabel, { color: theme.colors.textSecondary }]}>
              Wallet Address
            </Text>
            <Text style={[styles.address, { color: theme.colors.textPrimary }]}>
              {formatAddress(account.address)}
            </Text>
          </View>

          <GradientPillButton
            title="Disconnect Wallet"
            onPress={handleDisconnect}
            variant="secondary"
            style={styles.disconnectButton}
          />
        </Card>
      </ScrollView>
    );
  }

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.colors.bg }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
    
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          Choose your preferred connection method to start trading
        </Text>
      </View>

      <View style={styles.methodsContainer}>
        {/* Google Sign-In Method */}
        <Pressable
          style={[
            styles.methodCard,
            { 
              backgroundColor: theme.colors.card,
              borderColor: selectedMethod === 'google' ? theme.colors.accentFrom : theme.colors.border,
              borderWidth: 2,
            }
          ]}
          onPress={() => setSelectedMethod('google')}
        >
          <View style={styles.methodContent}>
            <View style={[styles.methodIcon, { backgroundColor: '#FFFFFF' }]}>
              <Image 
                source={{ uri: 'https://www.google.com/favicon.ico' }}
                style={{ width: 28, height: 28 }}
              />
            </View>
            <View style={styles.methodTextContainer}>
              <Text style={[styles.methodTitle, { color: theme.colors.textPrimary }]}>
                Sign in with Google
              </Text>
              <Text style={[styles.methodDescription, { color: theme.colors.textSecondary }]}>
                Connect using your Google account (Aptos Keyless)
              </Text>
            </View>
          </View>
        </Pressable>

        {/* Extension Method */}
        <Pressable
          style={[
            styles.methodCard,
            { 
              backgroundColor: theme.colors.card,
              borderColor: selectedMethod === 'extension' ? theme.colors.accentFrom : theme.colors.border,
              borderWidth: 2,
            }
          ]}
          onPress={() => setSelectedMethod('extension')}
          disabled={!isExtensionAvailable}
        >
          <View style={styles.methodContent}>
            <View style={[styles.methodIcon, { backgroundColor: '#6366F1' }]}>
              <Monitor size={28} color="#FFFFFF" />
            </View>
            <View style={styles.methodTextContainer}>
              <Text style={[styles.methodTitle, { color: theme.colors.textPrimary }]}>
                Browser Extension
              </Text>
              <Text style={[styles.methodDescription, { color: theme.colors.textSecondary }]}>
                Connect using Petra wallet browser extension
              </Text>
              {!isExtensionAvailable && (
                <Text style={[styles.unavailableText, { color: '#EF4444' }]}>
                  Extension not detected
                </Text>
              )}
            </View>
          </View>
        </Pressable>

        {/* Deep Link Method */}
        <Pressable
          style={[
            styles.methodCard,
            { 
              backgroundColor: theme.colors.card,
              borderColor: selectedMethod === 'deeplink' ? theme.colors.accentFrom : theme.colors.border,
              borderWidth: 2,
            }
          ]}
          onPress={() => setSelectedMethod('deeplink')}
        >
          <View style={styles.methodContent}>
            <View style={[styles.methodIcon, { backgroundColor: '#10B981' }]}>
              <Smartphone size={28} color="#FFFFFF" />
            </View>
            <View style={styles.methodTextContainer}>
              <Text style={[styles.methodTitle, { color: theme.colors.textPrimary }]}>
                Mobile App
              </Text>
              <Text style={[styles.methodDescription, { color: theme.colors.textSecondary }]}>
                Connect using Petra mobile app via deep link
              </Text>
            </View>
          </View>
        </Pressable>
      </View>

      {selectedMethod && (
        <GradientPillButton
          title={connecting ? 'Connecting...' : selectedMethod === 'google' ? 'Continue with Google' : 'Connect Wallet'}
          onPress={() => handleConnect(selectedMethod)}
          disabled={connecting || (selectedMethod === 'extension' && !isExtensionAvailable)}
          style={styles.connectButton}
          icon={connecting ? undefined : <Wallet size={20} color="#FFFFFF" />}
        />
      )}

      <View style={[styles.infoContainer, { backgroundColor: theme.colors.chip }]}>
        <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
          Your wallet will remain connected across all trading features until you manually disconnect or clear your browser data.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 32,
  },
  backButton: {
    alignSelf: 'flex-start',
    padding: 8,
    marginBottom: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    opacity: 0.8,
  },
  methodsContainer: {
    gap: 16,
    marginBottom: 32,
  },
  methodCard: {
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  methodContent: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  methodIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 20,
  },
  methodTextContainer: {
    flex: 1,
  },
  methodTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 6,
  },
  methodDescription: {
    fontSize: 15,
    lineHeight: 20,
    opacity: 0.8,
  },
  unavailableText: {
    fontSize: 13,
    marginTop: 6,
    fontWeight: '600',
  },
  connectButton: {
    marginBottom: 24,
  },
  infoContainer: {
    padding: 16,
    borderRadius: 16,
    marginTop: 8,
  },
  infoText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    opacity: 0.8,
  },
  connectedCard: {
    padding: 16,
    borderRadius: 18,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  walletInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  walletIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  walletDetails: {
    flex: 1,
  },
  walletName: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  connectionMethod: {
    fontSize: 14,
    textTransform: 'capitalize',
    opacity: 0.8,
  },
  addressContainer: {
    padding: 16,
    borderRadius: 14,
    marginBottom: 20,
  },
  addressLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    opacity: 0.8,
  },
  address: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  disconnectButton: {
    marginTop: 0,
  },
});
