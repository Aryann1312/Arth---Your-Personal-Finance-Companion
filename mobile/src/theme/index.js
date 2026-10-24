/**
 * @file index.js
 * @description Central luxury fintech Design System & Responsive layout tokens.
 * Light luxury theme: Pearl white surfaces, deep obsidian text, shiny golden accents.
 */

import { useWindowDimensions } from 'react-native';
import { getResponsiveLayout } from './responsive.js';

export { BREAKPOINTS, getResponsiveLayout, formatINR } from './responsive.js';

export const COLORS = {
  // Pearl White luxury surfaces
  background: '#FAF8F5',
  surface: '#FFFFFF',
  surfaceMuted: '#F5F1EA',
  surfaceElevated: '#FFFFFF',
  border: '#E8E2D6',
  borderLight: '#F0ECE4',
  borderGold: '#E5C158',

  // Deep Obsidian Text & Icons
  textPrimary: '#111111',
  textSecondary: '#4A463F',
  textMuted: '#7D776C',
  textInverse: '#FFFFFF',

  // Shiny Golden Accents (Gradients & Accents)
  goldDeep: '#B8860B',
  goldMain: '#D4AF37',
  goldBright: '#FFD700',
  goldChampagne: '#F5E6A8',
  goldLightBg: '#FFFDF7',
  goldBadgeBg: '#FCF7E8',

  // Golden Gradient arrays for LinearGradient
  goldGradient: ['#B8860B', '#D4AF37', '#FFD700', '#F5E6A8'],
  goldButtonGradient: ['#9A7007', '#C69E26', '#E4B834'],
  cardGlowGradient: ['rgba(212, 175, 55, 0.15)', 'rgba(255, 255, 255, 0)'],
  pearlGradient: ['#FFFFFF', '#FAF8F5'],

  // Semantic Status
  success: '#059669',
  successLight: '#ECFDF5',
  warning: '#D97706',
  warningLight: '#FFFBEB',
  error: '#DC2626',
  errorLight: '#FEF2F2',
  info: '#2563EB',
  infoLight: '#EFF6FF'
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40
};

export const RADII = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  xxl: 24,
  full: 9999
};

export const SHADOWS = {
  subtle: {
    shadowColor: '#111111',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2
  },
  card: {
    shadowColor: '#111111',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4
  },
  goldGlow: {
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5
  },
  button: {
    shadowColor: '#9A7007',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4
  }
};

/**
 * Custom hook returning responsive device classifications and geometry
 */
export function useResponsiveLayout() {
  const { width, height } = useWindowDimensions();
  return getResponsiveLayout(width, height);
}

