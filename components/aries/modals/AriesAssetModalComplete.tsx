/**
 * Aries Asset Modal - Complete Implementation
 * Matches official Aries Markets modal with all 4 tabs
 * 
 * Features:
 * - Deposit, Withdraw, Borrow, Repay tabs
 * - Amount input with slider and quick buttons (half/max)
 * - Wallet balance, deposited amount, APR display
 * - Interest rate curve chart
 * - "Connect Wallet" state for non-connected users
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import { X, Repeat } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../../theme/ThemeProvider';
import Slider from '@react-native-assets/slider';

const SCREEN_WIDTH = Dimensions.get('window').width;

type TabType = 'deposit' | 'withdraw' | 'borrow' | 'repay';

interface Props {
  visible: boolean;
  asset: any;
  connected: boolean;
  hasProfile: boolean;
  onClose: () => void;
}

export default function AriesAssetModalComplete({ visible, asset, connected, hasProfile, onClose }: Props) {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>('deposit');
  const [amount, setAmount] = useState('');
  const [sliderValue, setSliderValue] = useState(0);
  const [showMoreInfo, setShowMoreInfo] = useState(false);

  if (!asset) return null;

  // ==========================================================================
  // COMPUTED VALUES
  // ==========================================================================

  const walletBalance = 2.244488; // TODO: Get from actual wallet
  const depositedAmount = 0.00; // TODO: Get from portfolio
  const borrowedAmount = 0.00; // TODO: Get from portfolio
  const apr = asset.supplyAPR || 0;
  const borrowAPR = asset.borrowAPR || 0;

  const maxAmount = useMemo(() => {
    switch (activeTab) {
      case 'deposit':
        return walletBalance;
      case 'withdraw':
        return depositedAmount;
      case 'borrow':
        return 0; // TODO: Calculate based on borrowing power
      case 'repay':
        return Math.min(walletBalance, borrowedAmount);
      default:
        return 0;
    }
  }, [activeTab, walletBalance, depositedAmount, borrowedAmount]);

  const isValidAmount = useMemo(() => {
    const numAmount = parseFloat(amount);
    return !isNaN(numAmount) && numAmount > 0 && numAmount <= maxAmount;
  }, [amount, maxAmount]);

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const handleSliderChange = (value: number) => {
    setSliderValue(value);
    const calculatedAmount = (maxAmount * value / 100).toFixed(6);
    setAmount(calculatedAmount);
  };

  const handleQuickAmount = (percentage: number) => {
    setSliderValue(percentage);
    const calculatedAmount = (maxAmount * percentage / 100).toFixed(6);
    setAmount(calculatedAmount);
  };

  const handleSubmit = () => {
    if (!connected) {
      // Show connect wallet
      return;
    }
    if (!isValidAmount) return;

    // TODO: Implement actual transaction
    console.log(`${activeTab} ${amount} ${asset.symbol}`);
    onClose();
  };

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, { backgroundColor: theme.colors.surface }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
            <View style={styles.headerLeft}>
              <View style={[styles.assetIcon, { backgroundColor: theme.colors.purple }]}>
                <Text style={styles.assetIconText}>{asset.symbol[0]}</Text>
              </View>
              <Text style={[styles.assetName, { color: theme.colors.textPrimary }]}>
                {asset.name}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <View style={styles.tabs}>
            {(['deposit', 'withdraw', 'borrow', 'repay'] as TabType[]).map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[
                  styles.tab,
                  activeTab === tab && [styles.tabActive, { borderBottomColor: theme.colors.purple }]
                ]}
                onPress={() => setActiveTab(tab)}
              >
                <Text
                  style={[
                    styles.tabText,
                    { color: activeTab === tab ? theme.colors.textPrimary : theme.colors.textSecondary }
                  ]}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Amount Input */}
            <View style={[styles.inputContainer, { backgroundColor: theme.colors.elevated, borderColor: theme.colors.border }]}>
              <TextInput
                style={[styles.input, { color: theme.colors.textPrimary }]}
                placeholder="0.00"
                placeholderTextColor={theme.colors.textSecondary}
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
              />
              <View style={styles.assetBadge}>
                <Text style={[styles.assetBadgeText, { color: theme.colors.textPrimary }]}>
                  {asset.symbol}
                </Text>
                <Repeat size={16} color={theme.colors.textSecondary} />
              </View>
            </View>

            {/* Quick Buttons */}
            <View style={styles.quickButtons}>
              <TouchableOpacity
                style={[styles.quickButton, { backgroundColor: theme.colors.elevated, borderColor: theme.colors.border }]}
                onPress={() => handleQuickAmount(50)}
              >
                <Text style={[styles.quickButtonText, { color: theme.colors.textPrimary }]}>half</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.quickButton, { backgroundColor: theme.colors.elevated, borderColor: theme.colors.border }]}
                onPress={() => handleQuickAmount(100)}
              >
                <Text style={[styles.quickButtonText, { color: theme.colors.textPrimary }]}>max</Text>
              </TouchableOpacity>
            </View>

            {/* Slider */}
            <View style={styles.sliderContainer}>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={100}
                value={sliderValue}
                onValueChange={handleSliderChange}
                minimumTrackTintColor={theme.colors.purple}
                maximumTrackTintColor={theme.colors.chip}
                thumbTintColor={theme.colors.purple}
              />
              <View style={styles.sliderLabels}>
                {[0, 25, 50, 75, 100].map((value) => (
                  <Text key={value} style={[styles.sliderLabel, { color: theme.colors.textSecondary }]}>
                    {value}%
                  </Text>
                ))}
              </View>
            </View>

            {/* Stats */}
            <View style={styles.stats}>
              <View style={styles.statRow}>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Wallet</Text>
                <View style={styles.statValue}>
                  <Text style={[styles.statAmount, { color: theme.colors.textPrimary }]}>
                    {walletBalance.toFixed(2)} {asset.symbol}
                  </Text>
                  <Text style={[styles.statUSD, { color: theme.colors.textSecondary }]}>
                    ${(walletBalance * (asset.priceUSD || 0)).toFixed(2)}
                  </Text>
                </View>
              </View>

              <View style={styles.statRow}>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Deposited</Text>
                <View style={styles.statValue}>
                  <Text style={[styles.statAmount, { color: theme.colors.textPrimary }]}>
                    {depositedAmount.toFixed(2)} {asset.symbol}
                  </Text>
                  <Text style={[styles.statUSD, { color: theme.colors.textSecondary }]}>
                    ${(depositedAmount * (asset.priceUSD || 0)).toFixed(2)}
                  </Text>
                </View>
              </View>

              <View style={styles.statRow}>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>APR</Text>
                <Text style={[styles.statAPR, { color: theme.colors.positive }]}>
                  {activeTab === 'borrow' || activeTab === 'repay'
                    ? (borrowAPR * 100).toFixed(2)
                    : (apr * 100).toFixed(2)}%
                </Text>
              </View>
            </View>

            {/* Submit Button or Connect Wallet */}
            {!connected ? (
              <LinearGradient
                colors={[theme.colors.purple, theme.colors.accentFrom]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.connectWalletButton}
              >
                <Text style={styles.connectWalletText}>Connect Wallet</Text>
              </LinearGradient>
            ) : (
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  !isValidAmount && styles.submitButtonDisabled,
                  { backgroundColor: isValidAmount ? theme.colors.purple : theme.colors.chip }
                ]}
                onPress={handleSubmit}
                disabled={!isValidAmount}
              >
                <Text style={[styles.submitButtonText, { color: isValidAmount ? '#FFFFFF' : theme.colors.textSecondary }]}>
                  {isValidAmount
                    ? `${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} ${asset.symbol}`
                    : 'Please input a valid number'}
                </Text>
              </TouchableOpacity>
            )}

            {/* More Info Section */}
            <TouchableOpacity
              style={styles.moreInfoButton}
              onPress={() => setShowMoreInfo(!showMoreInfo)}
            >
              <Text style={[styles.moreInfoText, { color: theme.colors.purple }]}>
                More Info {showMoreInfo ? '∧' : '∨'}
              </Text>
            </TouchableOpacity>

            {showMoreInfo && (
              <View style={styles.moreInfoContainer}>
                <Text style={[styles.chartTitle, { color: theme.colors.textPrimary }]}>
                  Interest rate curve
                </Text>
                <InterestRateCurve asset={asset} theme={theme} />
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

/**
 * Interest Rate Curve Chart
 */
function InterestRateCurve({ asset, theme }: { asset: any; theme: any }) {
  // Simplified curve data - in production, this would be calculated from reserve config
  const curveData = [
    { utilization: 0, rate: 0 },
    { utilization: 30, rate: 65 },
    { utilization: 70, rate: 130 },
    { utilization: 100, rate: 250 },
  ];

  const maxRate = 250;
  const chartHeight = 150;
  const chartWidth = SCREEN_WIDTH * 0.5 - 80;

  return (
    <View style={styles.chartContainer}>
      <View style={styles.chart}>
        {/* Y-axis labels */}
        <View style={styles.yAxis}>
          {[250, 130, 65, 0].map((value) => (
            <Text key={value} style={[styles.axisLabel, { color: theme.colors.textSecondary }]}>
              {value}%
            </Text>
          ))}
        </View>

        {/* Chart area */}
        <View style={styles.chartArea}>
          {/* Grid lines */}
          {[0, 1, 2, 3].map((i) => (
            <View
              key={i}
              style={[
                styles.gridLine,
                { borderColor: theme.colors.border, top: (i * chartHeight) / 3 }
              ]}
            />
          ))}

          {/* Curve path (simplified with View components) */}
          {curveData.map((point, index) => {
            if (index === 0) return null;
            const prevPoint = curveData[index - 1];
            
            const x1 = (prevPoint.utilization / 100) * chartWidth;
            const y1 = chartHeight - (prevPoint.rate / maxRate) * chartHeight;
            const x2 = (point.utilization / 100) * chartWidth;
            const y2 = chartHeight - (point.rate / maxRate) * chartHeight;

            return (
              <View
                key={index}
                style={[
                  styles.curveLine,
                  {
                    left: x1,
                    top: y1,
                    width: Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2)),
                    transform: [
                      {
                        rotate: `${Math.atan2(y2 - y1, x2 - x1)}rad`,
                      },
                    ],
                    backgroundColor: theme.colors.purple,
                  },
                ]}
              />
            );
          })}

          {/* Data points */}
          {curveData.map((point, index) => (
            <View
              key={index}
              style={[
                styles.dataPoint,
                {
                  left: (point.utilization / 100) * chartWidth - 4,
                  top: chartHeight - (point.rate / maxRate) * chartHeight - 4,
                  backgroundColor: theme.colors.purple,
                },
              ]}
            />
          ))}
        </View>
      </View>

      {/* X-axis label */}
      <View style={styles.xAxisContainer}>
        <Text style={[styles.xAxisLabel, { color: theme.colors.textSecondary }]}>
          Utilization Rate
        </Text>
      </View>
    </View>
  );
}

// ==========================================================================
// STYLES
// ==========================================================================

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: Math.min(SCREEN_WIDTH * 0.5, 600),
    maxHeight: '90%',
    borderRadius: 16,
    overflow: 'hidden',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  assetIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  assetIconText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  assetName: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },

  // Tabs
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Content
  content: {
    padding: 20,
  },

  // Input
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    fontSize: 24,
    fontWeight: '600',
  },
  assetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  assetBadgeText: {
    fontSize: 18,
    fontWeight: '600',
  },

  // Quick Buttons
  quickButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  quickButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    borderWidth: 1,
  },
  quickButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Slider
  sliderContainer: {
    marginBottom: 24,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  sliderLabel: {
    fontSize: 11,
  },

  // Stats
  stats: {
    marginBottom: 20,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  statLabel: {
    fontSize: 13,
  },
  statValue: {
    alignItems: 'flex-end',
  },
  statAmount: {
    fontSize: 13,
    fontWeight: '600',
  },
  statUSD: {
    fontSize: 11,
    marginTop: 2,
  },
  statAPR: {
    fontSize: 14,
    fontWeight: '700',
  },

  // Buttons
  connectWalletButton: {
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  connectWalletText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  submitButton: {
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // More Info
  moreInfoButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  moreInfoText: {
    fontSize: 13,
    fontWeight: '600',
  },
  moreInfoContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 16,
  },

  // Chart
  chartContainer: {
    marginBottom: 20,
  },
  chart: {
    flexDirection: 'row',
    height: 150,
  },
  yAxis: {
    width: 50,
    justifyContent: 'space-between',
    paddingRight: 8,
  },
  axisLabel: {
    fontSize: 10,
    textAlign: 'right',
  },
  chartArea: {
    flex: 1,
    position: 'relative',
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    borderTopWidth: 1,
    borderStyle: 'dashed',
  },
  curveLine: {
    position: 'absolute',
    height: 2,
  },
  dataPoint: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  xAxisContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  xAxisLabel: {
    fontSize: 11,
  },
});
