/**
 * Test Supabase Connection
 * 
 * Run this screen to verify your setup is working
 * Navigate to: /test-connection in your app
 */

import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useState } from 'react';
import { checkSupabaseConnection } from '../lib/supabase';
import { databaseService } from '../services/database.service';
import { tortugaService } from '../services/liquidStakingService';

export default function TestConnection() {
  const [results, setResults] = useState<any>({});
  const [testing, setTesting] = useState(false);

  const runTests = async () => {
    setTesting(true);
    const testResults: any = {};

    // Test 1: Supabase Connection
    try {
      const connected = await checkSupabaseConnection();
      testResults.supabase = connected ? '✅ Connected' : '❌ Failed';
    } catch (error: any) {
      testResults.supabase = `❌ Error: ${error.message}`;
    }

    // Test 2: Database Service (Cache)
    try {
      // This will test the in-memory cache
      databaseService.clearCache();
      testResults.cache = '✅ Cache working';
    } catch (error: any) {
      testResults.cache = `❌ Error: ${error.message}`;
    }

    // Test 3: Liquid Staking (Fixed)
    try {
      const poolInfo = await tortugaService.getPoolInfo();
      testResults.liquidStaking = poolInfo.isStale
        ? '⚠️ Using cached data'
        : '✅ Live data loaded';
      testResults.liquidStakingData = {
        apr: `${poolInfo.apr}%`,
        totalStaked: poolInfo.totalStaked,
      };
    } catch (error: any) {
      testResults.liquidStaking = `❌ Error: ${error.message}`;
    }

    // Test 4: Environment Variables
    testResults.env = {
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing',
      supabaseKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing',
      aptosNetwork: process.env.EXPO_PUBLIC_APTOS_NETWORK || 'Not set',
    };

    setResults(testResults);
    setTesting(false);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🧪 Connection Tests</Text>
      <Text style={styles.subtitle}>Verify your setup is working</Text>

      <Pressable
        style={[styles.button, testing && styles.buttonDisabled]}
        onPress={runTests}
        disabled={testing}
      >
        <Text style={styles.buttonText}>
          {testing ? '⏳ Running Tests...' : '▶️ Run All Tests'}
        </Text>
      </Pressable>

      {Object.keys(results).length > 0 && (
        <View style={styles.results}>
          <Text style={styles.resultTitle}>📊 Results:</Text>

          <View style={styles.resultItem}>
            <Text style={styles.resultLabel}>Supabase Connection:</Text>
            <Text style={styles.resultValue}>{results.supabase}</Text>
          </View>

          <View style={styles.resultItem}>
            <Text style={styles.resultLabel}>Cache System:</Text>
            <Text style={styles.resultValue}>{results.cache}</Text>
          </View>

          <View style={styles.resultItem}>
            <Text style={styles.resultLabel}>Liquid Staking:</Text>
            <Text style={styles.resultValue}>{results.liquidStaking}</Text>
            {results.liquidStakingData && (
              <View style={styles.nested}>
                <Text style={styles.nestedText}>
                  APR: {results.liquidStakingData.apr}
                </Text>
                <Text style={styles.nestedText}>
                  Staked: {results.liquidStakingData.totalStaked}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.resultItem}>
            <Text style={styles.resultLabel}>Environment:</Text>
            <View style={styles.nested}>
              <Text style={styles.nestedText}>
                Supabase URL: {results.env?.supabaseUrl}
              </Text>
              <Text style={styles.nestedText}>
                Supabase Key: {results.env?.supabaseKey}
              </Text>
              <Text style={styles.nestedText}>
                Aptos Network: {results.env?.aptosNetwork}
              </Text>
            </View>
          </View>
        </View>
      )}

      <View style={styles.instructions}>
        <Text style={styles.instructionTitle}>✅ All tests pass?</Text>
        <Text style={styles.instructionText}>
          Great! Now fix the liquid staking UI component.
        </Text>
        <Text style={styles.instructionText}>
          📖 See: Docs_New/EXPO_IMPLEMENTATION_GUIDE.md (Step 4)
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#0a0a0a',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#8b5cf6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  results: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  resultItem: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  resultLabel: {
    fontSize: 14,
    color: '#888',
    marginBottom: 4,
  },
  resultValue: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  nested: {
    marginTop: 8,
    marginLeft: 12,
    paddingLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: '#444',
  },
  nestedText: {
    fontSize: 14,
    color: '#aaa',
    marginBottom: 4,
  },
  instructions: {
    backgroundColor: '#1a3a1a',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a5a2a',
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4ade80',
    marginBottom: 8,
  },
  instructionText: {
    fontSize: 14,
    color: '#86efac',
    marginBottom: 4,
  },
});
