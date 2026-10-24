/**
 * @file DonutChart.js
 * @description Native SVG Donut chart displaying Principal vs Interest breakdown
 * with financial legend and center summary amount.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { COLORS, RADII, SPACING, formatINR } from '../theme/index.js';

export function DonutChart({
  principal = 0,
  interest = 0,
  size = 180,
  strokeWidth = 24
}) {
  const p = Math.max(0, Number(principal) || 0);
  const i = Math.max(0, Number(interest) || 0);
  const total = p + i;

  const principalRatio = total > 0 ? p / total : 0.5;
  const interestRatio = total > 0 ? i / total : 0.5;

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const principalStrokeDashoffset = circumference * (1 - principalRatio);
  const interestStrokeDashoffset = circumference * (1 - interestRatio);

  return (
    <View style={styles.container}>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={size} height={size}>
          <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
            {/* Background Track */}
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={COLORS.borderLight}
              strokeWidth={strokeWidth}
              fill="none"
            />

            {/* Interest Segment (Charcoal) */}
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="#2B2823"
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={interestStrokeDashoffset}
              strokeLinecap="round"
              fill="none"
            />

            {/* Principal Segment (Gold) */}
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={COLORS.goldMain}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={principalStrokeDashoffset}
              strokeLinecap="round"
              fill="none"
            />
          </G>
        </Svg>

        {/* Center Text */}
        <View style={styles.centerContainer}>
          <Text style={styles.centerLabel}>Total Repayment</Text>
          <Text style={styles.centerValue}>{formatINR(total)}</Text>
        </View>
      </View>

      {/* Legend Row */}
      <View style={styles.legendContainer}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.goldMain }]} />
          <View>
            <Text style={styles.legendLabel}>Principal ({Math.round(principalRatio * 100)}%)</Text>
            <Text style={styles.legendAmount}>{formatINR(p)}</Text>
          </View>
        </View>

        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#2B2823' }]} />
          <View>
            <Text style={styles.legendLabel}>Total Interest ({Math.round(interestRatio * 100)}%)</Text>
            <Text style={styles.legendAmount}>{formatINR(i)}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: SPACING.md
  },
  centerContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xs
  },
  centerLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4
  },
  centerValue: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 2
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: SPACING.lg,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: RADII.sm
  },
  legendLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '500'
  },
  legendAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary
  }
});
