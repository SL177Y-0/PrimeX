/**
 * Health Factor Simulator Component
 * 
 * Interactive component for simulating health factor changes
 * based on position adjustments (supply, withdraw, borrow, repay)
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Alert,
} from 'react-native';
import Slider from '@react-native-assets/slider';
import { TrendingUp, TrendingDown, AlertTriangle, Shield } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeProvider';
import { formatUSD, formatPercent } from '../utils/usdHelpers';
import { Card } from './Card';

interface HealthFactorSimulatorProps {
  currentCollateral: number;
  currentBorrowed: number;
  liquidationThreshold: number;
  currentHealthFactor: number;
  onSimulationChange?: (simulation: HealthSimulation) => void;
}

interface HealthSimulation {
  action: 'supply' | 'withdraw' | 'borrow' | 'repay';
  amount: number;
  newCollateral: number;
  newBorrowed: number;
  newHealthFactor: number;
  riskLevel: 'safe' | 'moderate' | 'high' | 'liquidation';
  maxSafeAmount: number;
}

export function HealthFactorSimulator({
  currentCollateral,
  currentBorrowed,
  liquidationThreshold,
  currentHealthFactor,
  onSimulationChange,
}: HealthFactorSimulatorProps) {
  const { theme } = useTheme();
  const [selectedAction, setSelectedAction] = useState<'supply' | 'withdraw' | 'borrow' | 'repay'>('supply');
  const [amount, setAmount] = useState(0);
  const [amountInput, setAmountInput] = useState('');

  const simulation = useMemo((): HealthSimulation => {
    let newCollateral = currentCollateral;
    let newBorrowed = currentBorrowed;

    switch (selectedAction) {
      case 'supply':
        newCollateral += amount;
        break;
      case 'withdraw':
        newCollateral = Math.max(0, currentCollateral - amount);
        break;
      case 'borrow':
        newBorrowed += amount;
        break;
      case 'repay':
        newBorrowed = Math.max(0, currentBorrowed - amount);
        break;
    }

    const adjustedCollateral = newCollateral * liquidationThreshold;
    const newHealthFactor = newBorrowed > 0 ? adjustedCollateral / newBorrowed : Infinity;

    let riskLevel: 'safe' | 'moderate' | 'high' | 'liquidation';
    if (newHealthFactor < 1) {
      riskLevel = 'liquidation';
    } else if (newHealthFactor < 1.2) {
      riskLevel = 'high';
    } else if (newHealthFactor < 1.5) {
      riskLevel = 'moderate';
    } else {
      riskLevel = 'safe';
    }

    // Calculate max safe amount for current action
    let maxSafeAmount = 0;
    const targetHF = 1.2; // Minimum safe health factor

    switch (selectedAction) {
      case 'supply':
        maxSafeAmount = 10000; // Arbitrary large number for supply
        break;
      case 'withdraw':
        if (currentBorrowed > 0) {
          const minCollateralNeeded = (currentBorrowed * targetHF) / liquidationThreshold;
          maxSafeAmount = Math.max(0, currentCollateral - minCollateralNeeded);
        } else {
          maxSafeAmount = currentCollateral;
        }
        break;
      case 'borrow':
        const maxBorrowable = (currentCollateral * liquidationThreshold) / targetHF - currentBorrowed;
        maxSafeAmount = Math.max(0, maxBorrowable);
        break;
      case 'repay':
        maxSafeAmount = currentBorrowed;
        break;
    }

    return {
      action: selectedAction,
      amount,
      newCollateral,
      newBorrowed,
      newHealthFactor,
      riskLevel,
      maxSafeAmount,
    };
  }, [selectedAction, amount, currentCollateral, currentBorrowed, liquidationThreshold]);

  useEffect(() => {
    onSimulationChange?.(simulation);
  }, [simulation, onSimulationChange]);

  const handleAmountChange = (value: number) => {
    setAmount(value);
    setAmountInput(value.toString());
  };

  const handleInputChange = (text: string) => {
    setAmountInput(text);
    const numValue = parseFloat(text) || 0;
    setAmount(numValue);
  };

  const setMaxAmount = () => {
    handleAmountChange(simulation.maxSafeAmount);
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'safe': return '#10b981';
      case 'moderate': return '#f59e0b';
      case 'high': return '#ef4444';
      case 'liquidation': return '#dc2626';
      default: return theme.colors.textSecondary;
    }
  };

  const getRiskIcon = (riskLevel: string) => {
    switch (riskLevel) {
      case 'safe': return <Shield size={16} color="#10b981" />;
      case 'moderate': return <AlertTriangle size={16} color="#f59e0b" />;
      case 'high': return <AlertTriangle size={16} color="#ef4444" />;
      case 'liquidation': return <TrendingDown size={16} color="#dc2626" />;
      default: return null;
    }
  };

  const actions = [
    { key: 'supply', label: 'Supply', icon: TrendingUp, color: '#10b981' },
    { key: 'withdraw', label: 'Withdraw', icon: TrendingDown, color: '#ef4444' },
    { key: 'borrow', label: 'Borrow', icon: TrendingDown, color: '#f59e0b' },
    { key: 'repay', label: 'Repay', icon: TrendingUp, color: '#8b5cf6' },
  ];

  return (
    <Card style={[styles.container, { backgroundColor: theme.colors.card }]} elevated>
      <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
        Health Factor Simulator
      </Text>

      {/* Action Selector */}
      <View style={styles.actionSelector}>
        {actions.map((action) => {
          const Icon = action.icon;
          const isSelected = selectedAction === action.key;
          
          return (
            <Pressable
              key={action.key}
              onPress={() => setSelectedAction(action.key as any)}
              style={[
                styles.actionButton,
                isSelected && [
                  styles.actionButtonActive,
                  { backgroundColor: action.color },
                ],
              ]}
            >
              <Icon 
                size={16} 
                color={isSelected ? '#fff' : theme.colors.textSecondary} 
              />
              <Text
                style={[
                  styles.actionButtonText,
                  { color: isSelected ? '#fff' : theme.colors.textSecondary },
                ]}
              >
                {action.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Amount Input */}
      <View style={styles.amountSection}>
        <View style={styles.amountHeader}>
          <Text style={[styles.amountLabel, { color: theme.colors.textSecondary }]}>
            Amount (USD)
          </Text>
          <Pressable onPress={setMaxAmount} style={styles.maxButton}>
            <Text style={[styles.maxButtonText, { color: '#8b5cf6' }]}>
              Max: {formatUSD(simulation.maxSafeAmount)}
            </Text>
          </Pressable>
        </View>

        <TextInput
          style={[
            styles.amountInput,
            {
              backgroundColor: theme.colors.bg,
              color: theme.colors.textPrimary,
              borderColor: theme.colors.border,
            },
          ]}
          value={amountInput}
          onChangeText={handleInputChange}
          placeholder="Enter amount..."
          placeholderTextColor={theme.colors.textSecondary}
          keyboardType="numeric"
        />

        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={simulation.maxSafeAmount}
          value={amount}
          onValueChange={handleAmountChange}
          minimumTrackTintColor="#8b5cf6"
          maximumTrackTintColor={theme.colors.border}
          thumbStyle={{ backgroundColor: '#8b5cf6' }}
        />
      </View>

      {/* Current vs New Comparison */}
      <View style={styles.comparisonSection}>
        <View style={styles.comparisonRow}>
          <Text style={[styles.comparisonLabel, { color: theme.colors.textSecondary }]}>
            Health Factor
          </Text>
          <View style={styles.comparisonValues}>
            <Text style={[styles.currentValue, { color: theme.colors.textPrimary }]}>
              {currentHealthFactor === Infinity ? '∞' : currentHealthFactor.toFixed(2)}
            </Text>
            <Text style={[styles.arrow, { color: theme.colors.textSecondary }]}>→</Text>
            <Text style={[styles.newValue, { color: getRiskColor(simulation.riskLevel) }]}>
              {simulation.newHealthFactor === Infinity ? '∞' : simulation.newHealthFactor.toFixed(2)}
            </Text>
          </View>
        </View>

        <View style={styles.comparisonRow}>
          <Text style={[styles.comparisonLabel, { color: theme.colors.textSecondary }]}>
            Collateral
          </Text>
          <View style={styles.comparisonValues}>
            <Text style={[styles.currentValue, { color: theme.colors.textPrimary }]}>
              {formatUSD(currentCollateral)}
            </Text>
            <Text style={[styles.arrow, { color: theme.colors.textSecondary }]}>→</Text>
            <Text style={[styles.newValue, { color: theme.colors.textPrimary }]}>
              {formatUSD(simulation.newCollateral)}
            </Text>
          </View>
        </View>

        <View style={styles.comparisonRow}>
          <Text style={[styles.comparisonLabel, { color: theme.colors.textSecondary }]}>
            Borrowed
          </Text>
          <View style={styles.comparisonValues}>
            <Text style={[styles.currentValue, { color: theme.colors.textPrimary }]}>
              {formatUSD(currentBorrowed)}
            </Text>
            <Text style={[styles.arrow, { color: theme.colors.textSecondary }]}>→</Text>
            <Text style={[styles.newValue, { color: theme.colors.textPrimary }]}>
              {formatUSD(simulation.newBorrowed)}
            </Text>
          </View>
        </View>
      </View>

      {/* Risk Assessment */}
      <View style={[styles.riskAssessment, { backgroundColor: theme.colors.bg }]}>
        <View style={styles.riskHeader}>
          {getRiskIcon(simulation.riskLevel)}
          <Text style={[styles.riskLevel, { color: getRiskColor(simulation.riskLevel) }]}>
            {simulation.riskLevel.charAt(0).toUpperCase() + simulation.riskLevel.slice(1)} Risk
          </Text>
        </View>

        {simulation.riskLevel === 'liquidation' && (
          <Text style={[styles.riskWarning, { color: '#dc2626' }]}>
            ⚠️ This action would put your position at risk of liquidation!
          </Text>
        )}

        {simulation.riskLevel === 'high' && (
          <Text style={[styles.riskWarning, { color: '#ef4444' }]}>
            ⚠️ High risk - consider reducing exposure
          </Text>
        )}

        {simulation.riskLevel === 'moderate' && (
          <Text style={[styles.riskInfo, { color: '#f59e0b' }]}>
            💡 Moderate risk - monitor closely
          </Text>
        )}

        {simulation.riskLevel === 'safe' && (
          <Text style={[styles.riskInfo, { color: '#10b981' }]}>
            ✅ Safe position with good health factor
          </Text>
        )}
      </View>

      {/* Action Button */}
      {amount > 0 && (
        <Pressable
          style={[
            styles.actionExecuteButton,
            { backgroundColor: actions.find(a => a.key === selectedAction)?.color },
            simulation.riskLevel === 'liquidation' && styles.actionExecuteButtonDisabled,
          ]}
          disabled={simulation.riskLevel === 'liquidation'}
          onPress={() => {
            Alert.alert(
              'Confirm Action',
              `${selectedAction.charAt(0).toUpperCase() + selectedAction.slice(1)} ${formatUSD(amount)}?`,
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Confirm', onPress: () => console.log('Action confirmed') },
              ]
            );
          }}
        >
          <Text style={styles.actionExecuteButtonText}>
            {selectedAction.charAt(0).toUpperCase() + selectedAction.slice(1)} {formatUSD(amount)}
          </Text>
        </Pressable>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    gap: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  actionSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
  },
  actionButtonActive: {
    backgroundColor: '#8b5cf6',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  amountSection: {
    gap: 12,
  },
  amountHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  maxButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  maxButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  amountInput: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
  },
  slider: {
    height: 40,
  },
  comparisonSection: {
    gap: 12,
  },
  comparisonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  comparisonLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  comparisonValues: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  currentValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  arrow: {
    fontSize: 14,
  },
  newValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  riskAssessment: {
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  riskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  riskLevel: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  riskWarning: {
    fontSize: 12,
    lineHeight: 18,
  },
  riskInfo: {
    fontSize: 12,
    lineHeight: 18,
  },
  actionExecuteButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionExecuteButtonDisabled: {
    opacity: 0.5,
  },
  actionExecuteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
