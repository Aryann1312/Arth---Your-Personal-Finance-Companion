/**
 * @file OptionCard.js
 * @description Selectable luxury card with checkmark badge, 1.5-2px gold border,
 * faint gold background tint, centered typography, and spring scale animation on press.
 */

import React, { useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { COLORS, RADII, SPACING } from '../../theme/index.js';

export function OptionCard({
  title,
  subtitle,
  isSelected = false,
  onPress,
  badgeText,
  equalHeight = true,
  minHeight = 72,
  style,
  titleStyle,
  subtitleStyle,
  accessibilityLabel
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 25
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 25
    }).start();
  };

  const handlePress = () => {
    try {
      Haptics.selectionAsync();
    } catch {
      // Ignore
    }
    if (onPress) onPress();
  };

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, equalHeight && { flex: 1 }]}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel || `${title}, ${subtitle || ''}`}
        accessibilityState={{ selected: isSelected }}
        style={[
          styles.card,
          equalHeight && { minHeight },
          isSelected ? styles.cardSelected : styles.cardUnselected,
          style
        ]}
      >
        {/* Selection Check Icon Badge */}
        {isSelected && (
          <View style={styles.checkBadge}>
            <Ionicons name="checkmark-circle" size={14} color={COLORS.goldDeep} />
          </View>
        )}

        {/* Optional Custom Badge Text */}
        {badgeText && (
          <View style={[styles.customBadge, isSelected && styles.customBadgeSelected]}>
            <Text style={[styles.customBadgeText, isSelected && styles.customBadgeTextSelected]}>
              {badgeText}
            </Text>
          </View>
        )}

        {/* Title */}
        <Text
          style={[
            styles.title,
            isSelected ? styles.titleSelected : styles.titleUnselected,
            titleStyle
          ]}
          numberOfLines={2}
        >
          {title}
        </Text>

        {/* Subtitle */}
        {subtitle ? (
          <Text
            style={[
              styles.subtitle,
              isSelected ? styles.subtitleSelected : styles.subtitleUnselected,
              subtitleStyle
            ]}
            numberOfLines={2}
          >
            {subtitle}
          </Text>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: RADII.md,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative'
  },
  cardUnselected: {
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.borderLight
  },
  cardSelected: {
    backgroundColor: COLORS.goldLightBg,
    borderWidth: 2,
    borderColor: COLORS.goldMain,
    shadowColor: COLORS.goldMain,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2
  },
  checkBadge: {
    position: 'absolute',
    top: 5,
    right: 5
  },
  customBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: COLORS.surfaceMuted,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3
  },
  customBadgeSelected: {
    backgroundColor: COLORS.goldBadgeBg
  },
  customBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.textMuted
  },
  customBadgeTextSelected: {
    color: COLORS.goldDeep
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 17
  },
  titleUnselected: {
    color: COLORS.textPrimary
  },
  titleSelected: {
    color: COLORS.goldDeep,
    fontWeight: '800'
  },
  subtitle: {
    fontSize: 10.5,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 2,
    lineHeight: 14
  },
  subtitleUnselected: {
    color: COLORS.textMuted
  },
  subtitleSelected: {
    color: COLORS.goldDeep,
    fontWeight: '600'
  }
});
