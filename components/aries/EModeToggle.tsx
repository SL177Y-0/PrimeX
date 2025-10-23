/**
 * E-Mode Toggle Component
 * Allows users to enter/exit E-Mode with benefit preview
 */

import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Zap, TrendingUp, AlertTriangle, Info } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { canEnterEMode, calculateEModeBenefit, EMODE_CATEGORIES } from '../../utils/ariesEModeUtils';
import { formatUSD, formatPercentage } from '../../utils/ariesFormatters';

interface EModeToggleProps {
  userDeposits: string[]; // Array of coin types
  currentEMode: number | null; // Current E-Mode category ID (null if not in E-Mode)
  onToggleEMode: (categoryId: number | null) => Promise<void>;
  loading?: boolean;
}

export function EModeToggle({
  userDeposits,
  currentEMode,
  onToggleEMode,
  loading = false,
}: EModeToggleProps) {
  const { theme } = useTheme();
  const [expanding, setExpanding] = useState(false);

  // Check E-Mode eligibility
  const aptosEligibility = useMemo(
    () => canEnterEMode(userDeposits, 1),
    [userDeposits]
  );

  const stableEligibility = useMemo(
    () => canEnterEMode(userDeposits, 2),
    [userDeposits]
  );

  const isInEMode = currentEMode !== null;
  const currentCategory = currentEMode ? EMODE_CATEGORIES[currentEMode === 1 ? 'APTOS_ECOSYSTEM' : 'STABLECOINS'] : null;

  const handleToggle = async (categoryId: number | null) => {
    setExpanding(true);
    try {
      await onToggleEMode(categoryId);
    } finally {
      setExpanding(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.card }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Zap size={20} color="#8b5cf6" />
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
            E-Mode (Efficiency Mode)
          </Text>
        </View>
        {isInEMode && (
          <View style={[styles.badge, { backgroundColor: '#8b5cf6' }]}>
            <Text style={styles.badgeText}>Active</Text>
          </View>
        )}
      </View>

      {/* Current Status */}
      {isInEMode && currentCategory && (
        <View style={[styles.statusCard, { backgroundColor: theme.colors.bg }]}>
          <Text style={[styles.statusLabel, { color: theme.colors.textSecondary }]}>
            Current E-Mode
          </Text>
          <Text style={[styles.statusValue, { color: theme.colors.textPrimary }]}>
            {currentCategory.name}
          </Text>
          <Text style={[styles.statusDetail, { color: theme.colors.textSecondary }]}>
            {formatPercentage(currentCategory.maxLTV)} LTV • {formatPercentage(currentCategory.liquidationThreshold)} Liq Threshold
          </Text>
        </View>
      )}

      {/* Info */}
      <View style={styles.infoBox}>
        <Info size={16} color={theme.colors.textSecondary} />
        <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
          E-Mode allows higher LTV for correlated assets, increasing borrowing power
        </Text>
      </View>

      {/* Available E-Modes */}
      <View style={styles.optionsContainer}>
        {/* Aptos Ecosystem E-Mode */}
        <TouchableOpacity
          style={[
            styles.option,
            { 
              backgroundColor: theme.colors.bg,
              borderColor: currentEMode === 1 ? '#8b5cf6' : theme.colors.border,
              borderWidth: currentEMode === 1 ? 2 : 1,
            }
          ]}
          onPress={() => handleToggle(currentEMode === 1 ? null : 1)}
          disabled={!aptosEligibility.canEnter || loading || expanding}
        >
          <View style={styles.optionHeader}>
            <Text style={[styles.optionTitle, { color: theme.colors.textPrimary }]}>
              Aptos Ecosystem
            </Text>
            {currentEMode === 1 && (
              <View style={[styles.activeDot, { backgroundColor: '#8b5cf6' }]} />
            )}
          </View>

          <Text style={[styles.optionDetail, { color: theme.colors.textSecondary }]}>
            APT, stAPT, amAPT
          </Text>

          <View style={styles.optionStats}>
            <View style={styles.stat}>
              <TrendingUp size={14} color="#10b981" />
              <Text style={[styles.statText, { color: '#10b981' }]}>
                90% LTV
              </Text>
            </View>
            <View style={styles.stat}>
              <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>
                95% Liq Threshold
              </Text>
            </View>
          </View>

          {!aptosEligibility.canEnter && (
            <View style={styles.warningBox}>
              <AlertTriangle size={12} color="#f59e0b" />
              <Text style={[styles.warningText, { color: '#f59e0b' }]}>
                {aptosEligibility.reason}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Stablecoins E-Mode */}
        <TouchableOpacity
          style={[
            styles.option,
            { 
              backgroundColor: theme.colors.bg,
              borderColor: currentEMode === 2 ? '#8b5cf6' : theme.colors.border,
              borderWidth: currentEMode === 2 ? 2 : 1,
            }
          ]}
          onPress={() => handleToggle(currentEMode === 2 ? null : 2)}
          disabled={!stableEligibility.canEnter || loading || expanding}
        >
          <View style={styles.optionHeader}>
            <Text style={[styles.optionTitle, { color: theme.colors.textPrimary }]}>
              Stablecoins
            </Text>
            {currentEMode === 2 && (
              <View style={[styles.activeDot, { backgroundColor: '#8b5cf6' }]} />
            )}
          </View>

          <Text style={[styles.optionDetail, { color: theme.colors.textSecondary }]}>
            USDC, USDT, USDY
          </Text>

          <View style={styles.optionStats}>
            <View style={styles.stat}>
              <TrendingUp size={14} color="#10b981" />
              <Text style={[styles.statText, { color: '#10b981' }]}>
                80% LTV
              </Text>
            </View>
            <View style={styles.stat}>
              <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>
                85% Liq Threshold
              </Text>
            </View>
          </View>

          {!stableEligibility.canEnter && (
            <View style={styles.warningBox}>
              <AlertTriangle size={12} color="#f59e0b" />
              <Text style={[styles.warningText, { color: '#f59e0b' }]}>
                {stableEligibility.reason}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Exit E-Mode Button */}
      {isInEMode && (
        <TouchableOpacity
          style={[styles.exitButton, { backgroundColor: theme.colors.bg }]}
          onPress={() => handleToggle(null)}
          disabled={loading || expanding}
        >
          {expanding ? (
            <ActivityIndicator size="small" color={theme.colors.textPrimary} />
          ) : (
            <Text style={[styles.exitButtonText, { color: theme.colors.textPrimary }]}>
              Exit E-Mode
            </Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  statusCard: {
    padding: 12,
    borderRadius: 12,
    gap: 4,
  },
  statusLabel: {
    fontSize: 12,
  },
  statusValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  statusDetail: {
    fontSize: 12,
  },
  infoBox: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  optionsContainer: {
    gap: 12,
  },
  option: {
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  optionDetail: {
    fontSize: 12,
  },
  optionStats: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 4,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    fontWeight: '500',
  },
  warningBox: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
    padding: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  warningText: {
    flex: 1,
    fontSize: 11,
  },
  exitButton: {
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  exitButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
