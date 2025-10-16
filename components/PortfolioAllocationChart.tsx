/**
 * Portfolio Allocation Chart
 * 
 * Displays portfolio composition as a pie chart
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { PortfolioAllocation } from '../utils/chartHelpers';
import { useTheme } from '../theme/ThemeProvider';
import { formatUSD, formatPercent } from '../utils/usdHelpers';

interface PortfolioAllocationChartProps {
  data: PortfolioAllocation[];
  height?: number;
  showLegend?: boolean;
}

export function PortfolioAllocationChart({
  data,
  height = 300,
  showLegend = true,
}: PortfolioAllocationChartProps) {
  const { theme } = useTheme();

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      
      return (
        <View style={[styles.tooltip, { backgroundColor: theme.colors.card }]}>
          <View style={styles.tooltipHeader}>
            <View style={[styles.colorDot, { backgroundColor: item.color }]} />
            <Text style={[styles.tooltipAsset, { color: theme.colors.textPrimary }]}>
              {item.asset}
            </Text>
          </View>
          <Text style={[styles.tooltipValue, { color: theme.colors.textPrimary }]}>
            {formatUSD(item.value)}
          </Text>
          <Text style={[styles.tooltipPercent, { color: theme.colors.textSecondary }]}>
            {formatPercent(item.percentage, { showSign: false })}
          </Text>
        </View>
      );
    }
    return null;
  };

  const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    // Only show label if slice is > 5%
    if (percent < 0.05) return null;

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        fontSize={12}
        fontWeight="600"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  if (data.length === 0) {
    return (
      <View style={[styles.emptyContainer, { height }]}>
        <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
          No portfolio data available
        </Text>
      </View>
    );
  }

  // Convert data to recharts format
  const chartData = data.map(item => ({
    ...item,
    name: item.asset,
  }));

  return (
    <View style={styles.container}>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={chartData as any}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={CustomLabel}
            outerRadius={height * 0.35}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>

      {showLegend && (
        <View style={styles.legendContainer}>
          {data.map((item, index) => (
            <View key={index} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: item.color }]} />
              <View style={styles.legendTextContainer}>
                <Text style={[styles.legendAsset, { color: theme.colors.textPrimary }]}>
                  {item.asset}
                </Text>
                <Text style={[styles.legendValue, { color: theme.colors.textSecondary }]}>
                  {formatUSD(item.value)} ({formatPercent(item.percentage, { showSign: false })})
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
  tooltip: {
    padding: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  tooltipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  tooltipAsset: {
    fontSize: 14,
    fontWeight: '600',
  },
  tooltipValue: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  tooltipPercent: {
    fontSize: 12,
  },
  legendContainer: {
    marginTop: 16,
    paddingHorizontal: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  legendTextContainer: {
    flex: 1,
  },
  legendAsset: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  legendValue: {
    fontSize: 12,
  },
});
