/**
 * @file PearlCard.js
 * @description Pure white pearl luxury card with soft shadow and golden accent border
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, RADII, SHADOWS, SPACING } from '../theme/index.js';

export function PearlCard({
  children,
  style,
  onPress,
  goldTrim = false,
  elevated = true,
  noPadding = false
}) {
  const Container = onPress ? TouchableOpacity : View;

  return (
    <Container
      activeOpacity={onPress ? 0.85 : 1}
      onPress={onPress}
      style={[
        styles.card,
        elevated && SHADOWS.card,
        goldTrim && styles.goldTrim,
        noPadding ? styles.noPadding : styles.padding,
        style
      ]}
    >
      {children}
    </Container>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADII.xl,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    marginBottom: SPACING.md
  },
  goldTrim: {
    borderColor: 'rgba(212, 175, 55, 0.45)',
    borderTopWidth: 2
  },
  padding: {
    padding: SPACING.lg
  },
  noPadding: {
    padding: 0
  }
});
