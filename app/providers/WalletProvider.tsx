import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';

import React, { createContext, useContext, useEffect, useState, ReactNode, useMemo } from 'react';
import { Linking, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { googleAuthService } from '../../services/googleAuthService';
import { walletAuthService } from '../../services/walletAuthService';

// Types for wallet integration
export type WalletName = 'Petra' | 'Martian' | 'Pontem' | 'Fewcha' | 'Google';
export type ConnectionMethod = 'extension' | 'deeplink' | 'google';

export interface WalletAccount {
  address: string;
  publicKey: string;
  ansName?: string;
}

export interface WalletInfo {
  name: WalletName;
  icon: string;
  url: string;
  connectionMethod: ConnectionMethod;
}

// Petra extension interface (injected into window)
declare global {
  interface Window {
    aptos?: {
      connect(): Promise<{ address: string; publicKey: string }>;
      disconnect(): Promise<void>;
      isConnected(): Promise<boolean>;
      signAndSubmitTransaction(transaction: any): Promise<{ hash: string }>;
      signMessage(message: { message: string }): Promise<{ signature: string }>;
      account(): Promise<{ address: string; publicKey: string }>;
      network(): Promise<{ name: string; chainId: string }>;
      onAccountChange(callback: (account: { address: string; publicKey: string } | null) => void): void;
      onNetworkChange(callback: (network: { name: string; chainId: string }) => void): void;
    };
  }
}

// Wallet Context interface
interface WalletContextType {
  // Connection state
  connected: boolean;
  connecting: boolean;
  account: WalletAccount | null;
  wallet: WalletInfo | null;
  
  // Connection methods
  connectExtension: (walletName: WalletName) => Promise<void>;
  connectDeepLink: (walletName: WalletName) => Promise<void>;
  connectGoogle: () => Promise<void>;
  disconnect: () => Promise<void>;
  
  // Transaction methods
  signAndSubmitTransaction: (transaction: any) => Promise<{ hash: string }>;
  signMessage: (message: { message: string }) => Promise<{ signature: string }>;
  
  // Utility
  handleDeepLink: (url: string) => void;
  lastConnectedWallet: string | null;
  isExtensionAvailable: boolean;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

// Custom hook to use wallet context
export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within WalletProvider');
  }
  return context;
};

interface WalletProviderProps {
  children: ReactNode;
}

// Main wallet provider component
export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [account, setAccount] = useState<WalletAccount | null>(null);
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [lastConnectedWallet, setLastConnectedWallet] = useState<string | null>(null);
  const [isExtensionAvailable, setIsExtensionAvailable] = useState(false);

  // Check for Petra extension availability
  useEffect(() => {
    const checkExtension = () => {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const hasAptos = !!window.aptos;
        setIsExtensionAvailable(hasAptos);
        
        // Listen for extension installation
        if (!hasAptos) {
          const checkInterval = setInterval(() => {
            if (window.aptos) {
              setIsExtensionAvailable(true);
              clearInterval(checkInterval);
            }
          }, 1000);
          
          // Clean up after 10 seconds
          setTimeout(() => clearInterval(checkInterval), 10000);
        }
      }
    };

    checkExtension();
  }, []);

  // Load last connected wallet on mount and auto-reconnect
  useEffect(() => {
    const loadLastWallet = async () => {
      try {
        const saved = await AsyncStorage.getItem('lastConnectedWallet');
        if (saved) {
          setLastConnectedWallet(saved);
          
          // Auto-reconnect if extension is available
          const [walletName, method] = saved.split('-');
          if (method === 'extension' && walletName === 'Petra') {
            // Check if extension is available and auto-connect
            if (Platform.OS === 'web' && typeof window !== 'undefined' && window.aptos) {
              try {
                const isConnected = await window.aptos.isConnected();
                if (isConnected) {
                  const account = await window.aptos.account();
                  const walletAccount: WalletAccount = {
                    address: account.address,
                    publicKey: account.publicKey,
                  };
                  
                  const walletInfo: WalletInfo = {
                    name: 'Petra',
                    icon: 'https://petra.app/favicon.ico',
                    url: 'https://petra.app',
                    connectionMethod: 'extension',
                  };
                  
                  setAccount(walletAccount);
                  setWallet(walletInfo);
                  setConnected(true);
                }
              } catch (error) {
                console.warn('Auto-reconnect failed:', error);
                // Clear invalid connection data
                await AsyncStorage.removeItem('lastConnectedWallet');
                setLastConnectedWallet(null);
              }
            }
          }
        }
      } catch (error) {
        console.warn('Failed to load last connected wallet:', error);
      }
    };
    
    // Delay auto-reconnect to ensure extension is loaded
    const timer = setTimeout(loadLastWallet, 1000);
    return () => clearTimeout(timer);
  }, []);

  // Handle deep links
  useEffect(() => {
    const handleUrl = ({ url }: { url: string }) => {
      handleDeepLink(url);
    };

    const subscription = Linking.addEventListener('url', handleUrl);
    return () => subscription?.remove();
  }, []);

  // Set up extension event listeners
  useEffect(() => {
    if (isExtensionAvailable && window.aptos) {
      // Listen for account changes
      window.aptos.onAccountChange((newAccount) => {
        if (newAccount && connected) {
          setAccount({
            address: newAccount.address,
            publicKey: newAccount.publicKey,
          });
        } else if (!newAccount && connected) {
          // Account disconnected from extension
          handleExtensionDisconnect();
        }
      });

      // Listen for network changes
      window.aptos.onNetworkChange((network) => {
        console.log('Network changed:', network);
      });
    }
  }, [isExtensionAvailable, connected]);

  const handleExtensionDisconnect = async () => {
    setAccount(null);
    setWallet(null);
    setConnected(false);
    setLastConnectedWallet(null);
    await AsyncStorage.removeItem('lastConnectedWallet');
  };

  // Helper function to create user in Supabase database
  const createSupabaseUser = async (address: string, walletName: WalletName) => {
    try {
      console.log(`[WalletProvider] Creating/updating Supabase user for ${address}`);
      
      // Use walletAuthService to create or update user profile
      await walletAuthService.connectWallet(
        address,
        undefined, // publicKey
        walletName
      );
      
      console.log(`[WalletProvider] Supabase user created/updated successfully`);
    } catch (error) {
      console.error('[WalletProvider] Failed to create Supabase user:', error);
      // Don't throw - wallet connection should succeed even if Supabase fails
    }
  };

  const connectExtension = async (walletName: WalletName) => {
    if (!isExtensionAvailable || !window.aptos) {
      throw new Error('Petra extension not available. Please install Petra wallet extension.');
    }

    try {
      setConnecting(true);
      
      if (walletName === 'Petra') {
        // Connect to Petra extension
        const response = await window.aptos.connect();
        
        const walletAccount: WalletAccount = {
          address: response.address,
          publicKey: response.publicKey,
        };
        
        const walletInfo: WalletInfo = {
          name: 'Petra',
          icon: 'https://petra.app/favicon.ico',
          url: 'https://petra.app',
          connectionMethod: 'extension',
        };
        
        setAccount(walletAccount);
        setWallet(walletInfo);
        setConnected(true);
        setLastConnectedWallet(`${walletName}-extension`);
        await AsyncStorage.setItem('lastConnectedWallet', `${walletName}-extension`);
        
        // Create user in Supabase
        await createSupabaseUser(walletAccount.address, walletName);
      }
    } catch (error) {
      throw error;
    } finally {
      setConnecting(false);
    }
  };

  const connectDeepLink = async (walletName: WalletName) => {
    try {
      setConnecting(true);
      
      // For now, simulate connection to Petra wallet
      if (walletName === 'Petra') {
        // Open Petra wallet for connection
        await openPetraWallet();
        
        // Simulate successful connection (in real implementation, this would come from deep link response)
        setTimeout(async () => {
          const mockAccount: WalletAccount = {
            address: '0x1234567890abcdef1234567890abcdef12345678',
            publicKey: '0xabcdef1234567890abcdef1234567890abcdef12',
          };
          
          const walletInfo: WalletInfo = {
            name: 'Petra',
            icon: 'https://petra.app/favicon.ico',
            url: 'https://petra.app',
            connectionMethod: 'deeplink',
          };
          
          setAccount(mockAccount);
          setWallet(walletInfo);
          setConnected(true);
          setLastConnectedWallet(`${walletName}-deeplink`);
          await AsyncStorage.setItem('lastConnectedWallet', `${walletName}-deeplink`);
          
          // Create user in Supabase
          await createSupabaseUser(mockAccount.address, walletInfo.name);
        }, 2000);
      }
    } catch (error) {
      throw error;
    } finally {
      setConnecting(false);
    }
  };

  const connectGoogle = async () => {
    try {
      setConnecting(true);
      
      // Get Google client ID from environment
      const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || 
        '1234567890-abcdefghijklmnopqrstuvwxyz123456.apps.googleusercontent.com';
      
      // Sign in with Google
      const googleAccount = await googleAuthService.signInWithGoogle(GOOGLE_CLIENT_ID);
      
      // Create wallet account from Google account
      const walletAccount: WalletAccount = {
        address: googleAccount.address,
        publicKey: googleAccount.publicKey,
        ansName: googleAccount.email,
      };
      
      const walletInfo: WalletInfo = {
        name: 'Google',
        icon: 'https://www.google.com/favicon.ico',
        url: 'https://accounts.google.com',
        connectionMethod: 'google',
      };
      
      setAccount(walletAccount);
      setWallet(walletInfo);
      setConnected(true);
      setLastConnectedWallet('Google-google');
      await AsyncStorage.setItem('lastConnectedWallet', 'Google-google');
      
      // Create user in Supabase
      await createSupabaseUser(walletAccount.address, 'Google');
      
      console.log('[WalletProvider] Google sign-in successful:', googleAccount.email);
    } catch (error) {
      console.error('[WalletProvider] Google sign-in failed:', error);
      throw error;
    } finally {
      setConnecting(false);
    }
  };

  const disconnect = async () => {
    // Immediately update UI state
    setConnected(false);
    setAccount(null);
    setWallet(null);
    setLastConnectedWallet(null);
    
    try {
      await AsyncStorage.removeItem('lastConnectedWallet');
      
      // Try to disconnect from extension if applicable
      if (wallet?.connectionMethod === 'extension' && typeof window !== 'undefined' && window.aptos) {
        try {
          await window.aptos.disconnect();
        } catch (extError) {
          // Silently handle extension disconnect errors
        }
      }
    } catch (error) {
      // Silently handle errors - state already cleared
    }
  };

  const signAndSubmitTransaction = async (transaction: any): Promise<{ hash: string }> => {
    if (!connected || !account) {
      throw new Error('Wallet not connected');
    }

    try {
      if (wallet?.connectionMethod === 'extension' && window.aptos) {
        // Use the modern Aptos SDK format for Petra wallet
        const payload = {
          type: "entry_function_payload",
          function: transaction.function,
          type_arguments: transaction.type_arguments || [],
          arguments: transaction.arguments || [],
        };
        
        // Sending transaction to Petra
        return await window.aptos.signAndSubmitTransaction(payload);
      } else {
        // Use deep link method (mock implementation)
        
        // Simulate transaction submission
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              hash: '0x' + Math.random().toString(16).substring(2, 66),
            });
          }, 1000);
        });
      }
    } catch (error) {
      throw error;
    }
  };

  const signMessage = async (message: { message: string }): Promise<{ signature: string }> => {
    if (!connected || !account) {
      throw new Error('Wallet not connected');
    }

    try {
      if (wallet?.connectionMethod === 'extension' && window.aptos) {
        // Use extension for message signing
        return await window.aptos.signMessage(message);
      } else {
        // Use deep link method (mock implementation)
        
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              signature: '0x' + Math.random().toString(16).substring(2, 130),
            });
          }, 1000);
        });
      }
    } catch (error) {
      throw error;
    }
  };

  const handleDeepLink = (url: string) => {
    
    if (url.startsWith('prismx://')) {
      try {
        const urlObj = new URL(url);
        const params = urlObj.searchParams;
        
        // Handle different types of responses
        if (params.get('type') === 'connect') {
          // Handle connection response
          const address = params.get('address');
          const publicKey = params.get('publicKey');
          
          if (address && publicKey) {
            const account: WalletAccount = { address, publicKey };
            const walletInfo: WalletInfo = {
              name: 'Petra',
              icon: 'https://petra.app/favicon.ico',
              url: 'https://petra.app',
              connectionMethod: 'deeplink',
            };
            
            setAccount(account);
            setWallet(walletInfo);
            setConnected(true);
          }
        } else if (params.get('type') === 'transaction') {
          // Handle transaction response
          // Wallet connected successfully
        }
      } catch (error) {
        // Error parsing deep link
      }
    }
  };

  // Memoize context value to prevent re-renders when state doesn't change
  const value: WalletContextType = useMemo(() => ({
    connected,
    connecting,
    account,
    wallet,
    connectExtension,
    connectDeepLink,
    connectGoogle,
    disconnect,
    signAndSubmitTransaction,
    signMessage,
    handleDeepLink,
    lastConnectedWallet,
    isExtensionAvailable,
  }), [connected, connecting, account, wallet, lastConnectedWallet, isExtensionAvailable]);

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};

// Utility function to open Petra wallet for connection
export const openPetraWallet = async () => {
  const petraUrl = `petra://connect?redirect=${encodeURIComponent('prismx://connect')}`;
  
  try {
    const supported = await Linking.canOpenURL(petraUrl);
    if (supported) {
      await Linking.openURL(petraUrl);
    } else {
      // Fallback to app store if Petra is not installed
      const storeUrl = 'https://petra.app/';
      await Linking.openURL(storeUrl);
    }
  } catch (err) {
    throw err;
  }
};

// Export as default
export default WalletProvider;
