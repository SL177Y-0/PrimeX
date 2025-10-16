/**
 * APR History Chart
 * 
 * Displays historical supply and borrow APR over time
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { APRDataPoint, formatChartDate } from '../utils/chartHelpers';
import { useTheme } from '../theme/ThemeProvider';

interface APRHistoryChartProps {
  data: APRDataPoint[];
  height?: number;
  showUtilization?: boolean;
}

export function APRHistoryChart({
  data,
  height = 250,
  showUtilization = false,
}: APRHistoryChartProps) {
  const { theme } = useTheme();

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload;
      
      return (
        <View style={[styles.tooltip, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.tooltipDate, { color: theme.colors.textPrimary }]}>
            {formatChartDate(dataPoint.timestamp, 'long')}
          </Text>
          <Text style={[styles.tooltipValue, { color: '#10b981' }]}>
            Supply APR: {dataPoint.supplyAPR.toFixed(2)}%
          </Text>
          <Text style={[styles.tooltipValue, { color: '#ef4444' }]}>
            Borrow APR: {dataPoint.borrowAPR.toFixed(2)}%
          </Text>
          {showUtilization && (
            <Text style={[styles.tooltipValue, { color: '#8b5cf6' }]}>
              Utilization: {dataPoint.utilization.toFixed(2)}%
            </Text>
          )}
        </View>
      );
    }
    return null;
  };

  return (
    <View style={styles.container}>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorSupply" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorBorrow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
            </linearGradient>
          </defs>
          
          <CartesianGrid strokeDasharray="3 3" stroke={theme.colors.border} opacity={0.3} />
          
          <XAxis
            dataKey="date"
            stroke={theme.colors.textSecondary}
            tick={{ fill: theme.colors.textSecondary, fontSize: 10 }}
          />
          
          <YAxis
            stroke={theme.colors.textSecondary}
            tick={{ fill: theme.colors.textSecondary, fontSize: 10 }}
            label={{
              value: 'APR %',
              angle: -90,
              position: 'insideLeft',
              fill: theme.colors.textSecondary,
            }}
          />
          
          <Tooltip content={<CustomTooltip />} />
          
          {/* Supply APR area */}
          <Area
            type="monotone"
            dataKey="supplyAPR"
            stroke="#10b981"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorSupply)"
          />
          
          {/* Borrow APR area */}
          <Area
            type="monotone"
            dataKey="borrowAPR"
            stroke="#ef4444"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorBorrow)"
          />
        </AreaChart>
      </ResponsiveContainer>
      
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#10b981' }]} />
          <Text style={[styles.legendText, { color: theme.colors.textSecondary }]}>
            Supply APR
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
          <Text style={[styles.legendText, { color: theme.colors.textSecondary }]}>
            Borrow APR
          </Text>
        </View>
      </View>
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
  tooltipDate: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  tooltipValue: {
    fontSize: 11,
    marginTop: 2,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginTop: 12,
    paddingHorizontal: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
