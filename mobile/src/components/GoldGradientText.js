/**
 * @file GoldGradientText.js
 * @description Accessible luxury typography with golden gradient highlight and high contrast
 */

import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { COLORS } from '../theme/index.js';

export function GoldGradientText({ children, style, level = 1 }) {
  const getStyleForLevel = () => {
    switch (level) {
      case 1:
        return styles.h1;
      case 2:
        return styles.h2;
      case 3:
        return styles.h3;
      default:
        return styles.h1;
    }
  };

  return (
    <Text style={[getStyleForLevel(), style]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  h1: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.goldDeep,
    letterSpacing: -0.5
  },
  h2: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.goldDeep,
    letterSpacing: -0.3
  },
  h3: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.goldDeep
  }
});
