/**
 * @file MiniGoldChart.js
 * @description Native SVG historical gold chart with smooth gold gradient line,
 * soft area glow, interactive touch tooltips, and high/low tracking.
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, useWindowDimensions, TouchableOpacity, PanResponder } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Circle, Line } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { COLORS, RADII, SPACING, formatINR } from '../theme/index.js';

export function MiniGoldChart({
  records = [],
  height = 180,
  purity = '24K',
  onRangeChange,
  selectedRange = '1Y',
  showRangeSelector = true
}) {
  const { width } = useWindowDimensions();
  const [containerWidth, setContainerWidth] = useState(0);
  const chartWidth = containerWidth > 0 ? containerWidth : Math.min(width - 64, 600);
  const chartHeight = height;
  const paddingBottom = 25;
  const paddingTop = 20;

  const [activeIndex, setActiveIndex] = useState(null);

  // Reset active tooltip when range or records change
  useEffect(() => {
    setActiveIndex(null);
  }, [records]);

  const handleLayout = (e) => {
    const layoutWidth = e.nativeEvent?.layout?.width;
    if (layoutWidth > 0 && Math.round(layoutWidth) !== Math.round(containerWidth)) {
      setContainerWidth(layoutWidth);
    }
  };

  if (!records || records.length === 0) {
    return (
      <View style={[styles.emptyContainer, { height: chartHeight }]}>
        <Text style={styles.emptyText}>No trading records available for this period</Text>
      </View>
    );
  }

  // Calculate High, Low, and Points
  const prices = records.map(r => r.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice || 1;

  const points = records.map((record, index) => {
    const x = (index / (records.length - 1 || 1)) * (chartWidth - 20) + 10;
    const y = chartHeight - paddingBottom - ((record.price - minPrice) / priceRange) * (chartHeight - paddingTop - paddingBottom);
    return { x, y, record };
  });

  // Construct SVG Path
  let linePath = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    linePath += ` L ${points[i].x} ${points[i].y}`;
  }

  // Construct Area Fill Path
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${chartHeight} L ${points[0].x} ${chartHeight} Z`;

  const activePoint = activeIndex !== null && points[activeIndex] ? points[activeIndex] : points[points.length - 1];

  // Touch scrubbing handler
  const handleTouchAt = (touchX) => {
    if (!points || points.length === 0) return;
    const innerWidth = chartWidth - 20;
    const clampedX = Math.max(10, Math.min(chartWidth - 10, touchX));
    const ratio = (clampedX - 10) / (innerWidth || 1);
    const targetIndex = Math.max(0, Math.min(points.length - 1, Math.round(ratio * (points.length - 1))));

    setActiveIndex((prev) => {
      if (prev !== targetIndex) {
        try {
          Haptics.selectionAsync();
        } catch {
          // Ignore
        }
      }
      return targetIndex;
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        handleTouchAt(evt.nativeEvent.locationX);
      },
      onPanResponderMove: (evt) => {
        handleTouchAt(evt.nativeEvent.locationX);
      },
      onPanResponderTerminationRequest: () => true,
      onPanResponderRelease: () => {}
    })
  ).current;

  const ranges = ['1M', '3M', '6M', '1Y', '3Y', '5Y'];

  return (
    <View style={styles.container} onLayout={handleLayout}>
      {/* Header with active price tooltip */}
      <View style={styles.tooltipHeader}>
        <View style={styles.activePriceBox}>
          <Text style={styles.activePrice}>{formatINR(activePoint.record.price)}</Text>
          <Text style={styles.activeDate} numberOfLines={1}>
            Settlement: {activePoint.record.date || activePoint.record.observationDate} ({purity}/g)
          </Text>
        </View>

        <View style={styles.statBadgesRow}>
          <View style={styles.statBadgeHigh}>
            <Text style={styles.statBadgeTextHigh} numberOfLines={1}>
              H: {formatINR(maxPrice)}
            </Text>
          </View>
          <View style={styles.statBadgeLow}>
            <Text style={styles.statBadgeTextLow} numberOfLines={1}>
              L: {formatINR(minPrice)}
            </Text>
          </View>
        </View>
      </View>

      {/* SVG Chart Surface with Touch Scrubbing */}
      <View
        style={{ width: chartWidth, height: chartHeight, overflow: 'hidden' }}
        {...panResponder.panHandlers}
      >
        <Svg width={chartWidth} height={chartHeight}>
          <Defs>
            <LinearGradient id="goldAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#D4AF37" stopOpacity="0.35" />
              <Stop offset="80%" stopColor="#D4AF37" stopOpacity="0.05" />
              <Stop offset="100%" stopColor="#FAF8F5" stopOpacity="0" />
            </LinearGradient>
            <LinearGradient id="goldLineGrad" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0%" stopColor="#B8860B" />
              <Stop offset="50%" stopColor="#D4AF37" />
              <Stop offset="100%" stopColor="#FFD700" />
            </LinearGradient>
          </Defs>

          {/* Area Fill */}
          <Path d={areaPath} fill="url(#goldAreaGrad)" />

          {/* Stroke Line */}
          <Path d={linePath} stroke="url(#goldLineGrad)" strokeWidth={2.5} fill="none" />

          {/* Vertical indicator dashed guideline */}
          {activePoint && (
            <Line
              x1={activePoint.x}
              y1={paddingTop - 5}
              x2={activePoint.x}
              y2={chartHeight - paddingBottom}
              stroke="rgba(212, 175, 55, 0.45)"
              strokeWidth={1.5}
              strokeDasharray="4, 4"
            />
          )}

          {/* Active indicator ring & dot */}
          {activePoint && (
            <>
              <Circle
                cx={activePoint.x}
                cy={activePoint.y}
                r={6}
                fill="#FFFFFF"
                stroke="#B8860B"
                strokeWidth={2.5}
              />
              <Circle
                cx={activePoint.x}
                cy={activePoint.y}
                r={2.5}
                fill="#B8860B"
              />
            </>
          )}
        </Svg>
      </View>

      {/* Touch scrub hint */}
      <Text style={styles.scrubHint}>Drag or tap along chart to inspect dates & rates</Text>

      {/* Range Filter Selector */}
      {showRangeSelector && (
        <View style={styles.rangeSelectorRow}>
          {ranges.map((r) => {
            const isSelected = selectedRange === r;
            return (
              <TouchableOpacity
                key={r}
                onPress={() => onRangeChange && onRangeChange(r)}
                style={[styles.rangePill, isSelected && styles.rangePillSelected]}
              >
                <Text style={[styles.rangePillText, isSelected && styles.rangePillTextSelected]}>
                  {r}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: SPACING.sm,
    width: '100%',
    overflow: 'hidden'
  },
  tooltipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: SPACING.xs
  },
  activePriceBox: {
    flexShrink: 1,
    minWidth: 120
  },
  activePrice: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.2
  },
  activeDate: {
    fontSize: 11.5,
    color: COLORS.textMuted,
    fontWeight: '500',
    marginTop: 2
  },
  statBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    maxWidth: 200
  },
  statBadgeHigh: {
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: RADII.sm,
    backgroundColor: COLORS.successLight
  },
  statBadgeTextHigh: {
    fontSize: 10.5,
    fontWeight: '700',
    color: COLORS.success
  },
  statBadgeLow: {
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: RADII.sm,
    backgroundColor: COLORS.errorLight
  },
  statBadgeTextLow: {
    fontSize: 10.5,
    fontWeight: '700',
    color: COLORS.error
  },
  rangeSelectorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: RADII.md,
    padding: 3,
    marginTop: SPACING.md
  },
  rangePill: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: RADII.sm
  },
  rangePillSelected: {
    backgroundColor: COLORS.surface,
    shadowColor: '#111111',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2
  },
  rangePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary
  },
  rangePillTextSelected: {
    color: COLORS.goldDeep,
    fontWeight: '800'
  },
  scrubHint: {
    fontSize: 10.5,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 4,
    fontStyle: 'italic'
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: RADII.lg
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 13
  }
});
