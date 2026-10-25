/**
 * @file SectionCard.js
 * @description Premium luxury card with thin gold top accent, soft elevation,
 * 18px rounded corners, and numbered or icon gold badge for section hierarchy.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADII, SHADOWS, SPACING } from '../../theme/index.js';

export function SectionCard({
  badge,
  icon,
  title,
  subtitle,
  rightElement,
  children,
  style,
  contentStyle
}) {
  return (
    <View style={[styles.card, SHADOWS.card, style]}>
      {/* Top Gold Accent Line */}
      <View style={styles.goldTopAccent} />

      {/* Section Header */}
      {(title || badge || icon) && (
        <View style={styles.headerRow}>
          <View style={styles.titleGroup}>
            {badge ? (
              <View style={styles.badgeContainer}>
                <Text style={styles.badgeText}>{badge}</Text>
              </View>
            ) : icon ? (
              <View style={styles.badgeContainer}>
                <Ionicons name={icon} size={13} color={COLORS.goldDeep} />
              </View>
            ) : null}

            <View style={styles.titleTextContainer}>
              <Text style={styles.title}>{title}</Text>
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </View>
          </View>

          {rightElement}
        </View>
      )}

      {/* Card Content */}
      <View style={[styles.content, contentStyle]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADII.xl,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    marginBottom: 18,
    overflow: 'hidden'
  },
  goldTopAccent: {
    height: 3,
    backgroundColor: COLORS.goldMain,
    width: '100%',
    opacity: 0.85
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xs
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1
  },
  badgeContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.goldLightBg,
    borderWidth: 1.5,
    borderColor: 'rgba(212, 175, 55, 0.45)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.goldDeep
  },
  titleTextContainer: {
    flex: 1
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: 0.2
  },
  subtitle: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 1
  },
  content: {
    padding: SPACING.lg
  }
});
