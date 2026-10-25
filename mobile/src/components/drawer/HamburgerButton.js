/**
 * @file HamburgerButton.js
 * @description Premium rounded-square 3-line hamburger button that smoothly
 * morphs into an 'X' close icon driven by a shared Animated.Value (0 -> 1).
 */

import React from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  View,
  Animated,
  Platform
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { COLORS, RADII } from '../../theme/index.js';

export function HamburgerButton({
  isOpen = false,
  animValue,
  onPress,
  style,
  size = 44,
  borderless = false
}) {
  // Safe fallback if animValue is not passed
  const fallbackAnim = React.useRef(new Animated.Value(isOpen ? 1 : 0)).current;
  const activeAnim = animValue || fallbackAnim;

  const handlePress = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Haptics fallback on unsupported platforms
    }
    if (onPress) {
      onPress();
    }
  };

  // Interpolations for top line: moves down to center (+6px) and rotates +45deg
  const topTranslateY = activeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 6]
  });
  const topRotate = activeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg']
  });

  // Interpolations for middle line: fades out and shrinks horizontally
  const middleOpacity = activeAnim.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [1, 0, 0]
  });
  const middleScaleX = activeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0]
  });

  // Interpolations for bottom line: moves up to center (-6px) and rotates -45deg
  const bottomTranslateY = activeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -6]
  });
  const bottomRotate = activeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-45deg']
  });

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={isOpen ? 'Close navigation panel' : 'Open navigation menu'}
      accessibilityState={{ expanded: isOpen }}
      style={[
        styles.button,
        borderless && styles.borderless,
        { width: size, height: size },
        isOpen && !borderless && styles.buttonOpen,
        style
      ]}
    >
      <View style={styles.iconContainer}>
        {/* Top line */}
        <Animated.View
          style={[
            styles.line,
            {
              transform: [
                { translateY: topTranslateY },
                { rotate: topRotate }
              ]
            }
          ]}
        />

        {/* Middle line */}
        <Animated.View
          style={[
            styles.line,
            styles.middleLine,
            {
              opacity: middleOpacity,
              transform: [{ scaleX: middleScaleX }]
            }
          ]}
        />

        {/* Bottom line */}
        <Animated.View
          style={[
            styles.line,
            {
              transform: [
                { translateY: bottomTranslateY },
                { rotate: bottomRotate }
              ]
            }
          ]}
        />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#FFFFFF',
    borderWidth: 0.75,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#1A1A1A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 5
      },
      android: {
        elevation: 3
      },
      default: {
        shadowColor: '#1A1A1A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 5
      }
    })
  },
  borderless: {
    borderWidth: 0,
    borderColor: 'transparent',
    backgroundColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0
  },
  buttonOpen: {
    borderColor: 'rgba(212, 175, 55, 0.4)',
    backgroundColor: '#FFFFFF'
  },
  iconContainer: {
    width: 20,
    height: 14,
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  line: {
    width: 18,
    height: 2,
    backgroundColor: '#1E293B',
    borderRadius: 1.5
  },
  middleLine: {
    // Exact middle placement handled by space-between
  }
});
