/**
 * Utilization Curve Chart
 * 
 * Displays the interest rate model curve showing how borrow/supply APRs
 * change with utilization percentage
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { generateUtilizationCurve } from '../utils/chartHelpers';
import { useTheme } from '../theme/ThemeProvider';

interface UtilizationChartProps {
  interestRateConfig: {
    minBorrowRate: number;
    optimalBorrowRate: number;
    maxBorrowRate: number;
    optimalUtilization: number;
  };
  currentUtilization?: number;
  height?: number;
  showLegend?: boolean;
}

export function UtilizationChart({
  interestRateConfig,
  currentUtilization,
  height = 300,
  showLegend = true,
}: UtilizationChartProps) {
  const { theme } = useTheme();

  const data = generateUtilizationCurve(
    {
      ...interestRateConfig,
      reserveRatio: 0.1,
    },
    20
  );

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <View style={[styles.tooltip, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.tooltipLabel, { color: theme.colors.textPrimary }]}>
            Utilization: {payload[0].payload.utilization.toFixed(1)}%
          </Text>
          <Text style={[styles.tooltipValue, { color: '#10b981' }]}>
            Supply APR: {payload[0].payload.supplyRate.toFixed(2)}%
          </Text>
          <Text style={[styles.tooltipValue, { color: '#ef4444' }]}>
            Borrow APR: {payload[0].payload.borrowRate.toFixed(2)}%
          </Text>
        </View>
      );
    }
    return null;
  };

  return (
    <View style={styles.container}>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={theme.colors.border} opacity={0.3} />
          
          <XAxis
            dataKey="utilization"
            stroke={theme.colors.textSecondary}
            tick={{ fill: theme.colors.textSecondary, fontSize: 12 }}
            label={{
              value: 'Utilization %',
              position: 'insideBottom',
              offset: -5,
              fill: theme.colors.textSecondary,
            }}
          />
          
          <YAxis
            stroke={theme.colors.textSecondary}
            tick={{ fill: theme.colors.textSecondary, fontSize: 12 }}
            label={{
              value: 'APR %',
              angle: -90,
              position: 'insideLeft',
              fill: theme.colors.textSecondary,
            }}
          />
          
          <Tooltip content={<CustomTooltip />} />
          
          {showLegend && (
            <Legend
              wrapperStyle={{ paddingTop: 10 }}
              iconType="line"
            />
          )}
          
          {/* Supply APR line */}
          <Line
            type="monotone"
            dataKey="supplyRate"
            stroke="#10b981"
            strokeWidth={2}
            dot={false}
            name="Supply APR"
            activeDot={{ r: 6, fill: '#10b981' }}
          />
          
          {/* Borrow APR line */}
          <Line
            type="monotone"
            dataKey="borrowRate"
            stroke="#ef4444"
            strokeWidth={2}
            dot={false}
            name="Borrow APR"
            activeDot={{ r: 6, fill: '#ef4444' }}
          />
          
          {/* Current utilization marker */}
          {currentUtilization !== undefined && (
            <Line
              type="monotone"
              dataKey={() => currentUtilization}
              stroke="#8b5cf6"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              name="Current"
            />
          )}
        </LineChart>
      </ResponsiveContainer>
      
      {currentUtilization !== undefined && (
        <View style={styles.currentMarker}>
          <View style={[styles.dot, { backgroundColor: '#8b5cf6' }]} />
          <Text style={[styles.currentText, { color: theme.colors.textSecondary }]}>
            Current Utilization: {currentUtilization.toFixed(2)}%
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
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
  tooltipLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  tooltipValue: {
    fontSize: 11,
    marginTop: 2,
  },
  currentMarker: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingHorizontal: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  currentText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
