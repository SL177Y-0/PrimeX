/**
 * E-Mode (Efficiency Mode) Panel Component
 * 
 * Displays E-Mode categories and allows users to enable/disable E-Mode
 * for correlated assets to achieve higher capital efficiency
 */

import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Zap, CheckCircle, AlertCircle, Info } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeProvider';
import { useResponsive } from '../hooks/useResponsive';
import { PAGE_ACCENTS } from '../theme/pageAccents';
import type { EModeCategory, UserPortfolio } from '../types/aries';

interface EModePanelProps {
  categories: EModeCategory[];
  userPortfolio: UserPortfolio | null;
  activeCategory?: number;
  onEnableEMode: (categoryId: number) => Promise<void>;
  onDisableEMode: () => Promise<void>;
}

export function EModePanel({
  categories,
  userPortfolio,
  activeCategory,
  onEnableEMode,
  onDisableEMode,
}: EModePanelProps) {
  const { theme } = useTheme();
  const { spacing, fontSize } = useResponsive();
  const pageAccent = PAGE_ACCENTS.LEND;

  const [loading, setLoading] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<number | null>(null);

  // Check if user can enable E-Mode (must have compatible assets)
  const canEnableEMode = useMemo(() => {
    if (!userPortfolio) return false;
    
    return categories.some(category => {
      const userAssets = [
        ...userPortfolio.supplies.map(s => s.coinType),
        ...userPortfolio.borrows.map(b => b.coinType),
      ];
      
      // User must have at least one asset in the category
      return userAssets.some(asset => category.assets.includes(asset));
    });
  }, [userPortfolio, categories]);

  const handleToggleEMode = async (categoryId: number) => {
    setLoading(true);
    try {
      if (activeCategory === categoryId) {
        await onDisableEMode();
      } else {
        await onEnableEMode(categoryId);
      }
    } catch (error) {
      console.error('[EModePanel] Error toggling E-Mode:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatPercentage = (bips: number) => {
    return `${(bips / 100).toFixed(1)}%`;
  };

  if (categories.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Zap size={22} color={pageAccent.primary} />
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
            Efficiency Mode (E-Mode)
          </Text>
        </View>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          Maximize capital efficiency with correlated assets
        </Text>
      </View>

      {/* Info Card */}
      <LinearGradient
        colors={[`${pageAccent.primary}20`, `${pageAccent.primary}10`] as any}
        style={styles.infoCard}
      >
        <Info size={18} color={pageAccent.primary} />
        <View style={styles.infoContent}>
          <Text style={[styles.infoText, { color: theme.colors.textPrimary }]}>
            E-Mode allows higher loan-to-value and liquidation thresholds for correlated assets,
            enabling more efficient borrowing.
          </Text>
        </View>
      </LinearGradient>

      {/* Active E-Mode Status */}
      {activeCategory !== undefined && activeCategory > 0 && (
        <LinearGradient
          colors={[theme.colors.positive, `${theme.colors.positive}CC`] as any}
          style={styles.activeCard}
        >
          <CheckCircle size={20} color="#FFFFFF" />
          <View style={styles.activeContent}>
            <Text style={styles.activeTitle}>E-Mode Active</Text>
            <Text style={styles.activeSubtitle}>
              {categories.find(c => c.categoryId === activeCategory)?.label || 'Unknown Category'}
            </Text>
          </View>
        </LinearGradient>
      )}

      {/* E-Mode Categories */}
      <View style={styles.categoriesContainer}>
        {categories.map((category) => {
          const isActive = activeCategory === category.categoryId;
          const isExpanded = expandedCategory === category.categoryId;
          const userHasAssets = userPortfolio && 
            [...userPortfolio.supplies, ...userPortfolio.borrows].some(
              pos => category.assets.includes(pos.coinType)
            );

          return (
            <Pressable
              key={category.categoryId}
              style={[
                styles.categoryCard,
                {
                  backgroundColor: isActive 
                    ? `${pageAccent.primary}20` 
                    : theme.colors.surface,
                  borderColor: isActive ? pageAccent.primary : 'transparent',
                  borderWidth: isActive ? 2 : 0,
                },
              ]}
              onPress={() => setExpandedCategory(isExpanded ? null : category.categoryId)}
            >
              {/* Category Header */}
              <View style={styles.categoryHeader}>
                <View style={styles.categoryTitleRow}>
                  {isActive && (
                    <CheckCircle size={18} color={pageAccent.primary} />
                  )}
                  <Text
                    style={[
                      styles.categoryTitle,
                      { color: theme.colors.textPrimary },
                    ]}
                  >
                    {category.label}
                  </Text>
                  {userHasAssets && !isActive && (
                    <View style={[styles.badge, { backgroundColor: pageAccent.light }]}>
                      <Text style={[styles.badgeText, { color: pageAccent.primary }]}>
                        Compatible
                      </Text>
                    </View>
                  )}
                </View>

                {/* Key Metrics */}
                <View style={styles.metricsRow}>
                  <View style={styles.metric}>
                    <Text style={[styles.metricLabel, { color: theme.colors.textSecondary }]}>
                      Max LTV
                    </Text>
                    <Text style={[styles.metricValue, { color: theme.colors.positive }]}>
                      {formatPercentage(category.maxLTV)}
                    </Text>
                  </View>

                  <View style={styles.metric}>
                    <Text style={[styles.metricLabel, { color: theme.colors.textSecondary }]}>
                      Liq. Threshold
                    </Text>
                    <Text style={[styles.metricValue, { color: theme.colors.orange }]}>
                      {formatPercentage(category.liquidationThreshold)}
                    </Text>
                  </View>

                  <View style={styles.metric}>
                    <Text style={[styles.metricLabel, { color: theme.colors.textSecondary }]}>
                      Liq. Bonus
                    </Text>
                    <Text style={[styles.metricValue, { color: theme.colors.textPrimary }]}>
                      {formatPercentage(category.liquidationBonus)}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Expanded Details */}
              {isExpanded && (
                <View style={styles.categoryDetails}>
                  <View style={styles.detailSection}>
                    <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
                      Compatible Assets
                    </Text>
                    <View style={styles.assetsList}>
                      {category.assets.map((asset) => {
                        // Extract symbol from coin type
                        const symbol = asset.split('::').pop() || asset;
                        return (
                          <View
                            key={asset}
                            style={[
                              styles.assetChip,
                              { backgroundColor: theme.colors.elevated },
                            ]}
                          >
                            <Text style={[styles.assetText, { color: theme.colors.textPrimary }]}>
                              {symbol}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>

                  <View style={styles.benefitsSection}>
                    <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
                      Benefits
                    </Text>
                    <View style={styles.benefitsList}>
                      <View style={styles.benefitItem}>
                        <CheckCircle size={14} color={theme.colors.positive} />
                        <Text style={[styles.benefitText, { color: theme.colors.textSecondary }]}>
                          Higher borrowing power
                        </Text>
                      </View>
                      <View style={styles.benefitItem}>
                        <CheckCircle size={14} color={theme.colors.positive} />
                        <Text style={[styles.benefitText, { color: theme.colors.textSecondary }]}>
                          Lower liquidation risk
                        </Text>
                      </View>
                      <View style={styles.benefitItem}>
                        <CheckCircle size={14} color={theme.colors.positive} />
                        <Text style={[styles.benefitText, { color: theme.colors.textSecondary }]}>
                          Better capital efficiency
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Action Button */}
                  <Pressable
                    style={[
                      styles.actionButton,
                      {
                        backgroundColor: isActive 
                          ? theme.colors.negative 
                          : pageAccent.primary,
                      },
                    ]}
                    onPress={() => handleToggleEMode(category.categoryId)}
                    disabled={loading || (!isActive && !userHasAssets)}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.actionButtonText}>
                        {isActive ? 'Disable E-Mode' : 'Enable E-Mode'}
                      </Text>
                    )}
                  </Pressable>

                  {!isActive && !userHasAssets && (
                    <View style={styles.warningBox}>
                      <AlertCircle size={16} color={theme.colors.orange} />
                      <Text style={[styles.warningText, { color: theme.colors.orange }]}>
                        You need to supply or borrow compatible assets to use this E-Mode
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      {/* Footer Note */}
      {!canEnableEMode && (
        <View style={styles.footerNote}>
          <Text style={[styles.footerText, { color: theme.colors.textSecondary }]}>
            To use E-Mode, supply or borrow assets from the same category
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  header: {
    gap: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  infoCard: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    borderRadius: 10,
  },
  infoContent: {
    flex: 1,
  },
  infoText: {
    fontSize: 12,
    lineHeight: 18,
  },
  activeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
  },
  activeContent: {
    flex: 1,
  },
  activeTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  activeSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  categoriesContainer: {
    gap: 12,
  },
  categoryCard: {
    borderRadius: 12,
    padding: 16,
    gap: 16,
  },
  categoryHeader: {
    gap: 14,
  },
  categoryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 20,
  },
  metric: {
    gap: 4,
  },
  metricLabel: {
    fontSize: 11,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  categoryDetails: {
    gap: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  detailSection: {
    gap: 10,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  assetsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  assetChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  assetText: {
    fontSize: 13,
    fontWeight: '600',
  },
  benefitsSection: {
    gap: 10,
  },
  benefitsList: {
    gap: 8,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  benefitText: {
    fontSize: 13,
  },
  actionButton: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  footerNote: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  footerText: {
    fontSize: 12,
    textAlign: 'center',
  },
});
