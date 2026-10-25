/**
 * @file DrawerItem.js
 * @description Clickable menu item row with gold line icon, label, chevron,
 * light gold pressed feedback, and staggered entrance animation.
 */

import React, { useState } from 'react';
import {
  TouchableOpacity,
  Text,
  View,
  StyleSheet,
  Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { COLORS, RADII, SPACING } from '../../theme/index.js';

export function DrawerItem({
  item,
  onPress,
  staggerAnim
}) {
  const [isPressed, setIsPressed] = useState(false);

  const handlePress = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Haptics fallback on unsupported platforms
    }
    if (onPress) {
      onPress(item);
    }
  };

  // Staggered slide-in and fade-in
  const opacity = staggerAnim
    ? staggerAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1]
      })
    : 1;

  const translateX = staggerAnim
    ? staggerAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [18, 0]
      })
    : 0;

  return (
    <Animated.View
      style={[
        styles.wrapper,
        {
          opacity,
          transform: [{ translateX }]
        }
      ]}
    >
      <TouchableOpacity
        onPress={handlePress}
        onPressIn={() => setIsPressed(true)}
        onPressOut={() => setIsPressed(false)}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={`Navigate to ${item.label}`}
        accessibilityHint={item.sublabel}
        style={[
          styles.container,
          isPressed && styles.containerPressed
        ]}
      >
        <View style={styles.leftRow}>
          <View style={styles.iconBox}>
            <Ionicons name={item.icon} size={20} color={COLORS.goldDeep} />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.label}>{item.label}</Text>
            {Boolean(item.sublabel) && (
              <Text style={styles.sublabel} numberOfLines={1}>
                {item.sublabel}
              </Text>
            )}
          </View>
        </View>

        <Ionicons
          name="chevron-forward"
          size={16}
          color={isPressed ? COLORS.goldDeep : COLORS.textMuted}
        />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    marginBottom: 6
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: RADII.md,
    minHeight: 54,
    backgroundColor: 'transparent'
  },
  containerPressed: {
    backgroundColor: COLORS.goldLightBg,
    transform: [{ scale: 0.985 }]
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: COLORS.goldLightBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  textContainer: {
    flex: 1
  },
  label: {
    fontSize: 15.5,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: 0.2
  },
  sublabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 1.5
  }
});
