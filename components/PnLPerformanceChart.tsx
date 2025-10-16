/**
 * PnL Performance Chart
 * 
 * Displays profit/loss performance over time with cumulative tracking
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { PnLDataPoint } from '../utils/chartHelpers';
import { useTheme } from '../theme/ThemeProvider';
import { formatUSD } from '../utils/usdHelpers';

interface PnLPerformanceChartProps {
  data: PnLDataPoint[];
  height?: number;
  showCumulative?: boolean;
}

export function PnLPerformanceChart({
  data,
  height = 250,
  showCumulative = true,
}: PnLPerformanceChartProps) {
  const { theme } = useTheme();

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload;
      const dailyPnL = dataPoint.pnl;
      const cumulativePnL = dataPoint.cumulativePnL;
      
      return (
        <View style={[styles.tooltip, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.tooltipDate, { color: theme.colors.textPrimary }]}>
            {dataPoint.date}
          </Text>
          <Text style={[styles.tooltipValue, { color: dailyPnL >= 0 ? '#10b981' : '#ef4444' }]}>
            Daily PnL: {formatUSD(dailyPnL, { showSign: true })}
          </Text>
          {showCumulative && (
            <Text style={[styles.tooltipValue, { color: cumulativePnL >= 0 ? '#10b981' : '#ef4444' }]}>
              Total PnL: {formatUSD(cumulativePnL, { showSign: true })}
            </Text>
          )}
        </View>
      );
    }
    return null;
  };

  // Calculate if we're overall positive or negative
  const latestData = data[data.length - 1];
  const isPositive = latestData ? latestData.cumulativePnL >= 0 : true;

  return (
    <View style={styles.container}>
      {/* Summary stats */}
      {latestData && (
        <View style={styles.summary}>
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              Total PnL
            </Text>
            <Text style={[styles.statValue, { color: isPositive ? '#10b981' : '#ef4444' }]}>
              {formatUSD(latestData.cumulativePnL, { showSign: true })}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              Latest Daily
            </Text>
            <Text style={[styles.statValue, { color: latestData.pnl >= 0 ? '#10b981' : '#ef4444' }]}>
              {formatUSD(latestData.pnl, { showSign: true })}
            </Text>
          </View>
        </View>
      )}

      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="pnlGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={isPositive ? '#10b981' : '#ef4444'} stopOpacity={0.3} />
              <stop offset="95%" stopColor={isPositive ? '#10b981' : '#ef4444'} stopOpacity={0} />
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
              value: 'PnL ($)',
              angle: -90,
              position: 'insideLeft',
              fill: theme.colors.textSecondary,
            }}
          />
          
          <Tooltip content={<CustomTooltip />} />
          
          {/* Zero line */}
          <ReferenceLine y={0} stroke={theme.colors.textSecondary} strokeDasharray="3 3" />
          
          {/* Cumulative PnL line */}
          {showCumulative && (
            <Line
              type="monotone"
              dataKey="cumulativePnL"
              stroke={isPositive ? '#10b981' : '#ef4444'}
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 6 }}
            />
          )}
          
          {/* Daily PnL bars (represented as line with dots) */}
          {!showCumulative && (
            <Line
              type="monotone"
              dataKey="pnl"
              stroke="#8b5cf6"
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 6 }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  summary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
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
});
