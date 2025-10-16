/**
 * Enhanced Portfolio Card
 * 
 * Shows portfolio value with real-time price updates and PnL tracking
 */

import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Card } from './Card';
import { useTheme } from '../theme/ThemeProvider';
import { usePrice } from '../hooks/usePriceData';
import { usePnLData } from '../hooks/usePnLData';
import { formatUSD, formatPercent, getValueColor } from '../utils/usdHelpers';

interface EnhancedPortfolioCardProps {
  userId?: string;
  hideBalances?: boolean;
  mockPortfolioValue?: number;
}

export function EnhancedPortfolioCard({ 
  userId, 
  hideBalances = false,
  mockPortfolioValue = 20988.00 
}: EnhancedPortfolioCardProps) {
  const { theme } = useTheme();
  
  // Fetch APT price for demo
  const { price: aptPrice, loading: priceLoading } = usePrice('APT');
  
  // Fetch PnL data if userId is provided
  const { metrics, loading: pnlLoading } = usePnLData(userId || '', !!userId);

  const portfolioValue = userId && metrics 
    ? metrics.totalValue 
    : mockPortfolioValue;
  
  const pnl = userId && metrics ? metrics.netPnL : 545.90;
  const pnlPercent = userId && metrics ? metrics.netPnLPercent : 13.5;
  
  const pnlColor = getValueColor(pnl);
  const isLoading = priceLoading || (userId && pnlLoading);

  return (
    <Card style={[styles.card, { backgroundColor: theme.colors.portfolioCard }]} elevated>
      <View style={styles.header}>
        <Text style={[styles.label, { color: theme.colors.portfolioTextSecondary }]}>
          Portfolio Value
        </Text>
        {isLoading && (
          <ActivityIndicator size="small" color={theme.colors.portfolioTextSecondary} />
        )}
      </View>
      
      <Text style={[styles.value, { 
        color: theme.colors.portfolioTextPrimary,
        ...theme.typography.displayXL 
      }]}>
        {hideBalances ? '••••••' : formatUSD(portfolioValue)}
      </Text>
      
      <View style={styles.changeRow}>
        <Text style={[styles.changeText, { color: pnlColor }]}>
          {hideBalances ? '•••••' : `${formatPercent(pnlPercent)} (${formatUSD(pnl, { showSign: true })}) Last month`}
        </Text>
      </View>

      {/* Real-time Price Indicator */}
      {!hideBalances && aptPrice > 0 && (
        <View style={styles.priceIndicator}>
          <View style={[styles.liveDot, { backgroundColor: '#10b981' }]} />
          <Text style={[styles.priceText, { color: theme.colors.portfolioTextSecondary }]}>
            APT: {formatUSD(aptPrice)}
          </Text>
        </View>
      )}

      {/* Health Factor if available */}
      {userId && metrics?.healthFactor && !hideBalances && (
        <View style={styles.healthFactor}>
          <Text style={[styles.healthLabel, { color: theme.colors.portfolioTextSecondary }]}>
            Health Factor:
          </Text>
          <Text style={[styles.healthValue, { 
            color: metrics.healthFactor > 2 ? '#10b981' : '#fbbf24' 
          }]}>
            {metrics.healthFactor.toFixed(2)}
          </Text>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 14,
    borderRadius: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
  },
  value: {
    fontFamily: 'Inter-Bold',
    marginBottom: 8,
  },
  changeRow: {
    marginBottom: 12,
  },
  changeText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
  },
  priceIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
  },
  priceText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  healthFactor: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  healthLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  healthValue: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
  },
});
