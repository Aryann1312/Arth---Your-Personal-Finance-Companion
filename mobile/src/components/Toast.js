/**
 * @file Toast.js
 * @description Accessible notification banner with success, warning, and error states
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, RADII, SHADOWS, SPACING } from '../theme/index.js';

export function Toast({ message, type = 'success', visible = false }) {
  if (!visible || !message) return null;

  const getStyleForType = () => {
    switch (type) {
      case 'error':
        return { bg: COLORS.errorLight, text: COLORS.error, border: COLORS.error };
      case 'warning':
        return { bg: COLORS.warningLight, text: COLORS.warning, border: COLORS.warning };
      default:
        return { bg: COLORS.goldLightBg, text: COLORS.goldDeep, border: COLORS.goldMain };
    }
  };

  const current = getStyleForType();

  return (
    <View style={[styles.toast, { backgroundColor: current.bg, borderColor: current.border }]}>
      <Text style={[styles.text, { color: current.text }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  toast: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADII.lg,
    borderWidth: 1.2,
    marginVertical: SPACING.xs,
    ...SHADOWS.subtle
  },
  text: {
    fontSize: 14,
    fontWeight: '600'
  }
});
