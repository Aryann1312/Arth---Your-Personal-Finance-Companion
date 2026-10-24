/**
 * @file SliderInput.js
 * @description Combined interactive slider and direct numeric input for interest rates,
 * loan tenure, and principal values.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Input } from './Input.js';
import { COLORS, RADII, SPACING } from '../theme/index.js';

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
  style
}) {
  const numericVal = Number(value) || min;

  const handleQuickSelect = (opt) => {
    onValueChange(String(opt));
  };

  const handleStep = (direction) => {
    const next = direction === 'inc'
      ? Math.min(max, numericVal + step)
      : Math.max(min, numericVal - step);
    onValueChange(String(next));
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>{label}</Text>
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
            return (
              <TouchableOpacity
                key={idx}
                onPress={() => handleQuickSelect(opt)}
                style={[styles.quickPill, isSelected && styles.quickPillSelected]}
              >
                <Text style={[styles.quickPillText, isSelected && styles.quickPillTextSelected]}>
                  {opt} {suffix}
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
  stepperContainer: {
    flexDirection: 'row',
    gap: 6
  },
  stepButton: {
    width: 26,
    height: 26,
    borderRadius: RADII.sm,
    backgroundColor: COLORS.surfaceMuted,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center'
  },
  stepButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    lineHeight: 18
  },
  inputWrapper: {
    marginBottom: SPACING.xs
  },
  quickOptionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4
  },
  quickPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADII.full,
    backgroundColor: COLORS.surfaceMuted,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  quickPillSelected: {
    backgroundColor: COLORS.goldLightBg,
    borderColor: COLORS.goldMain
  },
  quickPillText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textSecondary
  },
  quickPillTextSelected: {
    color: COLORS.goldDeep,
    fontWeight: '700'
  }
});
