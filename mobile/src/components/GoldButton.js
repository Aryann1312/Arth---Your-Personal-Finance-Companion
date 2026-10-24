/**
 * @file GoldButton.js
 * @description Luxury gold gradient CTA button with press animations, haptic feedback,
 * and high-contrast accessible typography.
 */

import React, { useRef } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  Animated
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { COLORS, RADII, SHADOWS, SPACING } from '../theme/index.js';

export function GoldButton({
  title,
  onPress,
  variant = 'primary', // 'primary' | 'secondary' | 'dark' | 'outline' | 'danger'
  loading = false,
  disabled = false,
  icon,
  style,
  textStyle
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 20
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20
    }).start();
  };

  const handlePress = () => {
    if (disabled || loading) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Haptics fallback on unsupported platforms
    }
    if (onPress) onPress();
  };

  if (variant === 'primary') {
    return (
      <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, style]}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={disabled || loading}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={title}
        >
          <LinearGradient
            colors={disabled ? ['#D1CCC0', '#E5E0D5'] : COLORS.goldButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.button, styles.primaryShadow]}
          >
            {loading ? (
              <ActivityIndicator color="#111111" size="small" />
            ) : (
              <>
                {icon}
                <Text style={[styles.primaryText, textStyle]}>{title}</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  // Dark obsidian button with gold border
  if (variant === 'dark') {
    return (
      <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, style]}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={disabled || loading}
          style={[styles.button, styles.darkButton]}
        >
          {loading ? (
            <ActivityIndicator color="#FFD700" size="small" />
          ) : (
            <>
              {icon}
              <Text style={[styles.darkText, textStyle]}>{title}</Text>
            </>
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  }

  // Secondary pearl button with subtle golden rim
  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, style]}>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        style={[styles.button, styles.secondaryButton, variant === 'outline' && styles.outlineButton]}
      >
        {loading ? (
          <ActivityIndicator color={COLORS.goldDeep} size="small" />
        ) : (
          <>
            {icon}
            <Text style={[styles.secondaryText, textStyle]}>{title}</Text>
          </>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 50,
    borderRadius: RADII.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xxl,
    paddingVertical: SPACING.md
  },
  primaryShadow: {
    ...SHADOWS.button
  },
  primaryText: {
    color: '#111111',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3
  },
  darkButton: {
    backgroundColor: '#111111',
    borderWidth: 1.5,
    borderColor: COLORS.goldMain,
    ...SHADOWS.subtle
  },
  darkText: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3
  },
  secondaryButton: {
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.borderGold,
    ...SHADOWS.subtle
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderColor: COLORS.borderGold
  },
  secondaryText: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '600'
  }
});
