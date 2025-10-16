/**
 * Supabase Client for React Native Expo
 * 
 * Configured for mobile with:
 * - Async storage for session persistence
 * - Auto token refresh
 * - Type-safe queries
 */

import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

// Type-safe environment variables
const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check .env file.');
}

/**
 * Supabase client instance
 * Uses AsyncStorage for session persistence on mobile
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Disable for React Native
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'x-application-name': 'primex-mobile',
      'x-client-info': 'expo-app',
    },
  },
});

/**
 * Helper: Check if Supabase is configured correctly
 */
export async function checkSupabaseConnection(): Promise<boolean> {
  try {
    const { error } = await supabase.from('users').select('count').limit(1);
    if (error) {
      console.error('[Supabase] Connection check failed:', error.message);
      return false;
    }
    console.log('[Supabase] ✅ Connected successfully');
    return true;
  } catch (error) {
    console.error('[Supabase] Connection error:', error);
    return false;
  }
}

/**
 * Helper: Get current user session
 */
export async function getCurrentSession() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) {
    console.error('[Supabase] Session error:', error.message);
    return null;
  }
  return session;
}

/**
 * Helper: Sign out current user
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('[Supabase] Sign out error:', error.message);
    throw error;
  }
  console.log('[Supabase] User signed out');
}
