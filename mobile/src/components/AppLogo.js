/**
 * @file AppLogo.js
 * @description Master Vector Logo component representing the Gold & Loan Intelligence mark:
 * Stylized apex peak with an ascending financial growth arrow.
 * Supports luxury gold gradient, monochrome dark, and inverse white variants.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, G, Defs, LinearGradient, Stop } from 'react-native-svg';
import { COLORS } from '../theme/index.js';

// Precise geometric vector paths mapped in 512x512 space
const PATH_UPPER_APEX = "M 258 46 L 250 46 L 236 60 L 66 404 L 74 404 L 152 306 L 208 248 L 218 248 L 256 292 L 330 200 L 270 60 Z";
const PATH_ARROW_BASE = "M 454 134 L 362 148 L 394 176 L 268 332 L 254 338 L 210 294 L 68 460 L 72 464 L 212 464 L 414 200 L 442 224 Z";
const PATH_LOWER_RIGHT = "M 376 304 L 322 380 L 356 464 L 442 464 L 382 304 Z";

export function AppLogo({
  size = 56,
  variant = 'gold', // 'gold' | 'dark' | 'white' | 'solid-gold'
  color,
  style
}) {
  const gradId = `goldGrad_${Math.random().toString(36).substring(2, 7)}`;

  let fillValue;
  if (color) {
    fillValue = color;
  } else {
    switch (variant) {
      case 'dark':
        fillValue = COLORS.textPrimary || '#1A1816';
        break;
      case 'white':
        fillValue = '#FFFFFF';
        break;
      case 'solid-gold':
        fillValue = COLORS.goldMain || '#D4AF37';
        break;
      case 'gold':
      default:
        fillValue = `url(#${gradId})`;
        break;
    }
  }

  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      <Svg width={size} height={size} viewBox="0 0 512 512">
        <Defs>
          <LinearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#FDEAB0" stopOpacity="1" />
            <Stop offset="30%" stopColor="#D4AF37" stopOpacity="1" />
            <Stop offset="70%" stopColor="#AA820A" stopOpacity="1" />
            <Stop offset="100%" stopColor="#6E5000" stopOpacity="1" />
          </LinearGradient>
        </Defs>
        <G fill={fillValue}>
          <Path d={PATH_UPPER_APEX} />
          <Path d={PATH_ARROW_BASE} />
          <Path d={PATH_LOWER_RIGHT} />
        </G>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center'
  }
});
