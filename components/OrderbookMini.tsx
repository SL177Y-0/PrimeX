import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { formatCurrency, formatNumber } from '../utils/number';

interface OrderbookLevel {
  price: number;
  size: number;
  total: number;
}

interface OrderbookMiniProps {
  bids: OrderbookLevel[];
  asks: OrderbookLevel[];
  onPriceSelect?: (price: number) => void;
}

export function OrderbookMini({ bids, asks, onPriceSelect }: OrderbookMiniProps) {
  const { theme } = useTheme();
  
  // Show top 5 levels each
  const topBids = bids.slice(0, 5).reverse();
  const topAsks = asks.slice(0, 5);
  
  const maxTotal = Math.max(
    ...topBids.map(b => b.total),
    ...topAsks.map(a => a.total)
  );
  
  const renderLevel = (level: OrderbookLevel, type: 'bid' | 'ask') => {
    const isAsk = type === 'ask';
    const color = isAsk ? theme.colors.negative : theme.colors.positive;
    const bgColor = `${color}15`;
    const widthPercent = (level.total / maxTotal) * 100;
    
    return (
      <Pressable
        key={`${type}-${level.price}`}
        style={styles.level}
        onPress={() => onPriceSelect?.(level.price)}
      >
        <View
          style={[
            styles.heatBar,
            {
              backgroundColor: bgColor,
              width: `${widthPercent}%`,
              right: isAsk ? 0 : undefined,
              left: isAsk ? undefined : 0,
            },
          ]}
        />
        <View style={[styles.levelContent, { flexDirection: isAsk ? 'row' : 'row-reverse' }]}>
          <Text style={[styles.price, { color }]}>
            {formatCurrency(level.price)}
          </Text>
          <Text style={[styles.size, { color: theme.colors.textSecondary }]}>
            {formatNumber(level.size)}
          </Text>
        </View>
      </Pressable>
    );
  };
  
  return (
    <View style={styles.container}>
      {/* Asks (sells) */}
      <View style={styles.side}>
        {topAsks.map(ask => renderLevel(ask, 'ask'))}
      </View>
      
      {/* Spread */}
      <View style={[styles.spread, { borderColor: theme.colors.border }]}>
        <Text style={[styles.spreadText, { color: theme.colors.textSecondary }]}>
          Spread: {formatCurrency(topAsks[0]?.price - topBids[0]?.price || 0)}
        </Text>
      </View>
      
      {/* Bids (buys) */}
      <View style={styles.side}>
        {topBids.map(bid => renderLevel(bid, 'bid'))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 240,
  },
  side: {
    flex: 1,
  },
  level: {
    height: 20,
    position: 'relative',
    marginBottom: 1,
  },
  heatBar: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    zIndex: 1,
  },
  levelContent: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    zIndex: 2,
  },
  price: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    minWidth: 80,
    textAlign: 'right',
  },
  size: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    minWidth: 60,
    textAlign: 'left',
  },
  spread: {
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    marginVertical: 4,
  },
  spreadText: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
  },
});

// Mock data generator
export const generateMockOrderbook = (basePrice: number): { bids: OrderbookLevel[]; asks: OrderbookLevel[] } => {
  const bids: OrderbookLevel[] = [];
  const asks: OrderbookLevel[] = [];
  
  let total = 0;
  
  // Generate bids (below current price)
  for (let i = 0; i < 10; i++) {
    const price = basePrice - (i + 1) * (basePrice * 0.0001);
    const size = Math.random() * 100 + 10;
    total += size;
    bids.push({ price, size, total });
  }
  
  total = 0;
  
  // Generate asks (above current price)
  for (let i = 0; i < 10; i++) {
    const price = basePrice + (i + 1) * (basePrice * 0.0001);
    const size = Math.random() * 100 + 10;
    total += size;
    asks.push({ price, size, total });
  }
  
  return { bids, asks };
};