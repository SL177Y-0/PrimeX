/**
 * E-Mode Selection Modal
 * Allows users to enter Efficiency Mode for higher LTV on correlated assets
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { CustomModal } from '../CustomModal';
import { useTheme } from '../../theme/ThemeProvider';
import { useWallet } from '../../app/providers/WalletProvider';

interface EModeCategory {
  id: number;
  name: string;
  description: string;
  ltv: number;
  liquidationThreshold: number;
  liquidationBonus: number;
  assets: string[];
}

const EMODE_CATEGORIES: EModeCategory[] = [
  {
    id: 0,
    name: 'Disabled',
    description: 'Standard mode with default LTV ratios',
    ltv: 0,
    liquidationThreshold: 0,
    liquidationBonus: 0,
    assets: [],
  },
  {
    id: 1,
    name: 'Stablecoins',
    description: 'Higher LTV for correlated stablecoins (USDT, USDC, sUSDe)',
    ltv: 97,
    liquidationThreshold: 98,
    liquidationBonus: 2,
    assets: ['USDT', 'USDC', 'sUSDe'],
  },
  {
    id: 2,
    name: 'APT Derivatives',
    description: 'Higher LTV for APT and liquid staking derivatives',
    ltv: 93,
    liquidationThreshold: 95,
    liquidationBonus: 3,
    assets: ['APT', 'stAPT', 'amAPT'],
  },
  {
    id: 3,
    name: 'BTC Derivatives',
    description: 'Higher LTV for wrapped BTC variants',
    ltv: 90,
    liquidationThreshold: 93,
    liquidationBonus: 4,
    assets: ['WBTC', 'xBTC', 'aBTC', 'zWBTC'],
  },
];

interface EModeModalProps {
  visible: boolean;
  currentCategory: number;
  onClose: () => void;
  onSelect: (categoryId: number) => Promise<void>;
}

export default function EModeModal({ visible, currentCategory, onClose, onSelect }: EModeModalProps) {
  const { theme } = useTheme();
  const { account } = useWallet();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(currentCategory);

  const handleSelect = async (categoryId: number) => {
    if (categoryId === currentCategory) {
      onClose();
      return;
    }

    setIsSubmitting(true);
    try {
      await onSelect(categoryId);
      onClose();
    } catch (error) {
      console.error('[EMode] Error selecting category:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <CustomModal visible={visible} onClose={onClose}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>E-Mode Selection</Text>
        <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>Maximize capital efficiency with correlated assets</Text>
      </View>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={[styles.warningBox, { backgroundColor: theme.colors.orange + '20', borderColor: theme.colors.orange }]}>
          <Text style={[styles.warningText, { color: theme.colors.orange }]}>
            ⚠️ E-Mode increases your LTV but restricts which assets you can use as collateral.
            Only assets in the selected category can be used.
          </Text>
        </View>

        {EMODE_CATEGORIES.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryCard,
              {
                backgroundColor: theme.colors.elevated,
                borderColor: selectedCategory === category.id ? theme.colors.purple : theme.colors.border,
                borderWidth: selectedCategory === category.id ? 2 : 1,
              },
            ]}
            onPress={() => setSelectedCategory(category.id)}
            disabled={isSubmitting}
          >
            <View style={styles.categoryHeader}>
              <View>
                <Text style={[styles.categoryName, { color: theme.colors.textPrimary }]}>
                  {category.name}
                </Text>
                <Text style={[styles.categoryDescription, { color: theme.colors.textSecondary }]}>
                  {category.description}
                </Text>
              </View>
              {currentCategory === category.id && (
                <View style={[styles.activeBadge, { backgroundColor: theme.colors.positive }]}>
                  <Text style={styles.activeBadgeText}>Active</Text>
                </View>
              )}
            </View>

            {category.id > 0 && (
              <>
                <View style={styles.categoryStats}>
                  <View style={styles.statItem}>
                    <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Max LTV</Text>
                    <Text style={[styles.statValue, { color: theme.colors.positive }]}>{category.ltv}%</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Liq. Threshold</Text>
                    <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>{category.liquidationThreshold}%</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Liq. Bonus</Text>
                    <Text style={[styles.statValue, { color: theme.colors.orange }]}>{category.liquidationBonus}%</Text>
                  </View>
                </View>

                <View style={styles.assetsContainer}>
                  <Text style={[styles.assetsLabel, { color: theme.colors.textSecondary }]}>Eligible Assets:</Text>
                  <View style={styles.assetsList}>
                    {category.assets.map((asset) => (
                      <View key={asset} style={[styles.assetChip, { backgroundColor: theme.colors.purple + '20' }]}>
                        <Text style={[styles.assetChipText, { color: theme.colors.purple }]}>{asset}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </>
            )}
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          style={[
            styles.confirmButton,
            {
              backgroundColor: selectedCategory !== currentCategory ? theme.colors.purple : theme.colors.border,
              opacity: isSubmitting ? 0.6 : 1,
            },
          ]}
          onPress={() => handleSelect(selectedCategory)}
          disabled={isSubmitting || selectedCategory === currentCategory}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.confirmButtonText}>
              {selectedCategory === currentCategory ? 'Already Active' : 'Confirm Selection'}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </CustomModal>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  container: {
    maxHeight: 600,
  },
  warningBox: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  warningText: {
    fontSize: 14,
    lineHeight: 20,
  },
  categoryCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  categoryName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  categoryDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  activeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  categoryStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  assetsContainer: {
    marginTop: 8,
  },
  assetsLabel: {
    fontSize: 12,
    marginBottom: 8,
  },
  assetsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  assetChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  assetChipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  confirmButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
