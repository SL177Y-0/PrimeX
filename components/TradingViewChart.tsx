import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview';
import { useTheme } from '../theme/ThemeProvider';
import { realMarketDataService } from '../Docs_New/PrimeX-master/services/realMarketDataService';

interface TradingViewChartProps {
  symbol: string;
  height?: number;
  width?: number;
  interval?: '1' | '5' | '15' | '60' | '240' | '1D';
  showVolume?: boolean;
}

export const TradingViewChart: React.FC<TradingViewChartProps> = ({
  symbol,
  height = 400,
  width,
  interval = '15',
  showVolume = true,
}) => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const screenWidth = Dimensions.get('window').width;
  const chartWidth = width || screenWidth - 32;
  const [chartData, setChartData] = useState<string>('[]');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const days = interval === '1D' ? 30 : 1;
        const data = await realMarketDataService.getCandlestickData(symbol, days);
        
        if (data && data.length > 0) {
          const formatted = data.map((candle: any) => ({
            time: Math.floor(candle.timestamp / 1000),
            open: candle.open,
            high: candle.high,
            low: candle.low,
            close: candle.close,
            volume: candle.volume || 0,
          }));
          setChartData(JSON.stringify(formatted));
        }
        setLoading(false);
      } catch (error) {
        console.error('Chart data error:', error);
        setLoading(false);
      }
    };

    fetchData();
    const updateInterval = setInterval(fetchData, 30000);
    return () => clearInterval(updateInterval);
  }, [symbol, interval]);

  const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <script src="https://unpkg.com/lightweight-charts@4.1.3/dist/lightweight-charts.standalone.production.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: ${theme.colors.bg}; }
    #chart { width: 100%; height: 100%; }
  </style>
</head>
<body>
  <div id="chart"></div>
  <script>
    const data = ${chartData};
    const chart = LightweightCharts.createChart(document.getElementById('chart'), {
      width: ${chartWidth},
      height: ${height},
      layout: {
        background: { color: '${theme.colors.bg}' },
        textColor: '${theme.colors.textSecondary}',
      },
      grid: {
        vertLines: { color: '${theme.colors.border}' },
        horzLines: { color: '${theme.colors.border}' },
      },
      timeScale: {
        borderColor: '${theme.colors.border}',
        timeVisible: true,
      },
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: '#10b981',
      downColor: '#ef4444',
      borderUpColor: '#10b981',
      borderDownColor: '#ef4444',
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    });

    ${showVolume ? `
    const volumeSeries = chart.addHistogramSeries({
      priceFormat: { type: 'volume' },
      priceScaleId: '',
      scaleMargins: { top: 0.8, bottom: 0 },
    });
    volumeSeries.setData(data.map(d => ({
      time: d.time,
      value: d.volume,
      color: d.close >= d.open ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.5)',
    })));
    ` : ''}

    candleSeries.setData(data);
    chart.timeScale().fitContent();
  </script>
</body>
</html>`;

  return (
    <View style={[styles.container, { height, width: chartWidth }]}>
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={theme.colors.accentFrom} />
        </View>
      )}
      <WebView
        originWhitelist={['*']}
        source={{ html: htmlContent }}
        style={styles.webview}
        javaScriptEnabled={true}
        scrollEnabled={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 12,
  },
  webview: {
    backgroundColor: 'transparent',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 10,
  },
});
