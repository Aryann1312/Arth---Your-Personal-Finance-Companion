/**
 * @file SliderInput.js
 * @description Combined interactive slider and direct numeric input for interest rates,
 * loan tenure, and principal values.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Input } from './Input.js';
import { COLORS, RADII, SPACING, formatCompactINR, formatINR } from '../theme/index.js';

export function SliderInput({
  label,
  value,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  prefix,
  suffix,
  quickOptions = [],
  style,
  labelStyle
}) {
  const numericVal = Number(value) || min;

  const handleQuickSelect = (opt) => {
    try {
      Haptics.selectionAsync();
    } catch {
      // Ignore
    }
    onValueChange(String(opt));
  };

  const handleStep = (direction) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Ignore
    }
    const next = direction === 'inc'
      ? Math.min(max, numericVal + step)
      : Math.max(min, numericVal - step);
    onValueChange(String(next));
  };

  const isCurrency = prefix === '₹';

  return (
    <View style={[styles.container, style]}>
      <View style={styles.headerRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={[styles.label, labelStyle]}>{label}</Text>
          {isCurrency && numericVal > 0 && (
            <Text style={styles.groupedHint}>({formatINR(numericVal, true)})</Text>
          )}
        </View>
        <View style={styles.stepperContainer}>
          <TouchableOpacity
            onPress={() => handleStep('dec')}
            style={styles.stepButton}
            accessibilityLabel="Decrease value"
          >
            <Text style={styles.stepButtonText}>−</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleStep('inc')}
            style={styles.stepButton}
            accessibilityLabel="Increase value"
          >
            <Text style={styles.stepButtonText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Input
        value={String(value)}
        onChangeText={onValueChange}
        keyboardType="decimal-pad"
        prefix={prefix}
        suffix={suffix}
        style={styles.inputWrapper}
      />

      {quickOptions.length > 0 && (
        <View style={styles.quickOptionsRow}>
          {quickOptions.map((opt, idx) => {
            const isSelected = Number(opt) === numericVal;
            const chipLabel = isCurrency ? formatCompactINR(opt) : `${opt} ${suffix || ''}`.trim();
            return (
              <TouchableOpacity
                key={idx}
                onPress={() => handleQuickSelect(opt)}
                style={[styles.quickPill, isSelected && styles.quickPillSelected]}
              >
                <Text style={[styles.quickPillText, isSelected && styles.quickPillTextSelected]}>
                  {chipLabel}
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
    marginBottom: SPACING.md
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary
  },
  groupedHint: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.goldDeep
  },
  stepperContainer: {
    flexDirection: 'row',
    gap: 8
  },
  stepButton: {
    width: 40,
    height: 40,
    minWidth: 40,
    minHeight: 40,
    borderRadius: RADII.md,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#111111',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1
  },
  stepButtonText: {
    fontSize: 19,
    fontWeight: '700',
    color: COLORS.textPrimary,
    lineHeight: 21
  },
  inputWrapper: {
    marginBottom: SPACING.xs
  },
  quickOptionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6
  },
  quickPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    minHeight: 32,
    borderRadius: RADII.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center'
  },
  quickPillSelected: {
    backgroundColor: COLORS.goldLightBg,
    borderColor: COLORS.goldMain,
    borderWidth: 1.5,
    shadowColor: COLORS.goldMain,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2
  },
  quickPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary
  },
  quickPillTextSelected: {
    color: COLORS.goldDeep,
    fontWeight: '800'
  }
});
