/**
 * @file SummaryTile.js
 * @description Highlighted luxury summary tile with solid gold accent bar on the left,
 * subtle tinted background, and animated numeric value.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AnimatedNumber } from '../AnimatedNumber.js';
import { COLORS, RADII, SPACING } from '../../theme/index.js';

export function SummaryTile({
  label = 'Pure Gold Equivalent (24K fine):',
  subtitle = 'Net 99.9% fine metal after hallmark purity factor',
  value = 0,
  unit = 'g',
  style
}) {
  return (
    <View style={[styles.tile, style]}>
      {/* Gold Left Accent Border */}
      <View style={styles.goldBar} />

      <View style={styles.body}>
        <View style={styles.textContainer}>
          <Text style={styles.label}>{label}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>

        <View style={styles.valueRow}>
          <AnimatedNumber
            value={value}
            style={styles.animatedValue}
          />
          <Text style={styles.unit}>{unit}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flexDirection: 'row',
    backgroundColor: COLORS.goldLightBg,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.35)',
    overflow: 'hidden',
    alignItems: 'center',
    marginVertical: SPACING.xs
  },
  goldBar: {
    width: 4,
    height: '100%',
    backgroundColor: COLORS.goldMain
  },
  body: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md
  },
  textContainer: {
    flex: 1,
    marginRight: SPACING.sm
  },
  label: {
    fontSize: 12.5,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 0.1
  },
  subtitle: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 2
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2
  },
  animatedValue: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.goldDeep
  },
  unit: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.goldDeep,
    marginLeft: 2
  }
});
