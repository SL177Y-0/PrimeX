/**
 * Chart Data Converter Utility
 * Converts between different CandleData formats to resolve type conflicts
 */

import { CandleData as MockCandleData } from '../data/mock';
import { CandleData as ChartCandleData } from '../components/CandleChart';

/**
 * Convert mock candle data to chart candle data format
 */
export function convertToChartCandleData(mockData: MockCandleData[]): ChartCandleData[] {
  return mockData.map((candle) => ({
    ...candle,
    time: candle.timestamp,
    value: candle.close,
    color: candle.close > candle.open ? '#10b981' : '#ef4444'
  }));
}

/**
 * Create a proper CandleData object for charts
 */
export function createChartCandle(
  hoursAgo: number, 
  open: number, 
  high: number, 
  low: number, 
  close: number, 
  volume: number
): ChartCandleData {
  const timestamp = Date.now() - hoursAgo * 60 * 60 * 1000;
  return {
    timestamp,
    open,
    high,
    low,
    close,
    volume,
    time: timestamp,
    value: close,
    color: close > open ? '#10b981' : '#ef4444'
  };
}

/**
 * Generate sample chart data for testing
 */
export function generateSampleChartData(): ChartCandleData[] {
  return [
    createChartCandle(23, 64500, 65200, 64200, 64800, 800),
    createChartCandle(22, 64800, 65500, 64500, 65100, 900),
    createChartCandle(21, 65100, 65800, 64800, 65400, 950),
    createChartCandle(20, 65400, 66100, 65100, 65700, 1000),
    createChartCandle(19, 65700, 66400, 65400, 66000, 1050),
    createChartCandle(18, 66000, 66700, 65700, 66300, 1100),
    createChartCandle(17, 66300, 67000, 66000, 66600, 1150),
    createChartCandle(16, 66600, 67300, 66300, 66900, 1200),
    createChartCandle(15, 66900, 67600, 66600, 67200, 1250),
    createChartCandle(14, 67200, 67900, 66900, 67500, 1300),
    createChartCandle(13, 67500, 68200, 67200, 67800, 1350),
    createChartCandle(12, 67800, 68500, 67500, 68100, 1400),
    createChartCandle(11, 68100, 68800, 67800, 68400, 1450),
    createChartCandle(10, 68400, 69100, 68100, 68700, 1500),
    createChartCandle(9, 68700, 69400, 68400, 69000, 1550),
    createChartCandle(8, 69000, 69700, 68700, 69300, 1600),
    createChartCandle(7, 69300, 70000, 69000, 69600, 1650),
    createChartCandle(6, 69600, 70300, 69300, 69900, 1700),
    createChartCandle(5, 69900, 70600, 69600, 70200, 1750),
    createChartCandle(4, 70200, 70900, 69900, 70500, 1800),
    createChartCandle(3, 70500, 71200, 70200, 70800, 1850),
    createChartCandle(2, 70800, 71500, 70500, 71100, 1900),
    createChartCandle(1, 71100, 71800, 70800, 71400, 1950),
    createChartCandle(0, 71400, 72100, 71100, 71800, 2000),
  ];
}

/**
 * Generate sample BTC/ETH data for spot trading
 */
export function generateBTCETHChartData(): ChartCandleData[] {
  return [
    createChartCandle(11, 14.8, 15.2, 14.6, 15.1, 500),
    createChartCandle(10, 15.1, 15.4, 14.9, 14.9, 600),
    createChartCandle(9, 14.9, 15.3, 14.7, 15.3, 550),
    createChartCandle(8, 15.3, 15.5, 15.0, 15.0, 650),
    createChartCandle(7, 15.0, 15.4, 14.8, 15.4, 700),
    createChartCandle(6, 15.4, 15.6, 15.2, 15.2, 750),
    createChartCandle(5, 15.2, 15.5, 15.1, 15.5, 800),
    createChartCandle(4, 15.5, 15.7, 15.3, 15.3, 850),
    createChartCandle(3, 15.3, 15.6, 15.2, 15.6, 900),
    createChartCandle(2, 15.6, 15.8, 15.4, 15.4, 950),
    createChartCandle(1, 15.4, 15.7, 15.3, 15.6, 1000),
    createChartCandle(0, 15.6, 15.8, 15.4, 15.42, 1050),
  ];
}
