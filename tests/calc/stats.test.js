/**
 * @file stats.test.js
 * @description Unit tests for statistical calculations on gold historical records,
 * high/low detection, date comparisons, and handling non-trading days without data fabrication.
 */

import { calculateRangeStats, compareTwoDates } from '../../lib/calc/stats.js';

describe('Gold Statistics & Date Comparison Engine', () => {
  const sampleRecords = [
    { date: '2024-01-01', price: 6200 },
    { date: '2024-01-02', price: 6250 },
    { date: '2024-01-03', price: 6180 },
    { date: '2024-01-04', price: 6300 }, // High
    { date: '2024-01-05', price: 6150 }, // Low
    { date: '2024-01-08', price: 6220 }  // Weekend 06-07 skipped naturally
  ];

  test('calculateRangeStats accurately detects high, low, absolute and % change', () => {
    const stats = calculateRangeStats(sampleRecords);

    expect(stats.count).toBe(6);
    expect(stats.startDate).toBe('2024-01-01');
    expect(stats.endDate).toBe('2024-01-08');
    expect(stats.startPrice).toBe(6200);
    expect(stats.endPrice).toBe(6220);
    expect(stats.absoluteChange).toBe(20);
    expect(stats.percentageChange).toBeCloseTo(0.32, 2);
    expect(stats.highestPrice).toBe(6300);
    expect(stats.highestDate).toBe('2024-01-04');
    expect(stats.lowestPrice).toBe(6150);
    expect(stats.lowestDate).toBe('2024-01-05');
    expect(stats.averagePrice).toBeCloseTo(6216.67, 1);
  });

  test('calculateRangeStats handles empty or invalid inputs gracefully', () => {
    const emptyStats = calculateRangeStats([]);
    expect(emptyStats.count).toBe(0);
    expect(emptyStats.startPrice).toBe(0);
  });

  test('compareTwoDates identifies exact trading days and computes change', () => {
    const res = compareTwoDates(sampleRecords, '2024-01-01', '2024-01-04');
    expect(res.success).toBe(true);
    expect(res.date1.isExactTradingDay).toBe(true);
    expect(res.date1.price).toBe(6200);
    expect(res.date2.isExactTradingDay).toBe(true);
    expect(res.date2.price).toBe(6300);
    expect(res.comparison.absoluteChange).toBe(100);
    expect(res.comparison.rangeHighest).toBe(6300);
    expect(res.comparison.rangeLowest).toBe(6180);
  });

  test('compareTwoDates falls back to nearest prior trading day on weekend with explicit transparency', () => {
    // 2024-01-06 was Saturday (no trading data)
    const res = compareTwoDates(sampleRecords, '2024-01-01', '2024-01-06');
    expect(res.success).toBe(true);
    expect(res.date2.requestedDate).toBe('2024-01-06');
    expect(res.date2.isExactTradingDay).toBe(false);
    expect(res.date2.settledDate).toBe('2024-01-05'); // Friday prior settled record
    expect(res.date2.price).toBe(6150);
  });
});
