/**
 * @file ShinyButton.js
 * @description React Native implementation of the animated ShinyButton with a roaming golden border beam.
 *
 * Features:
 * - Thick, high-visibility golden beam roaming continuously 360° around the button border.
 * - Dual animation engine: Native UI driver on iOS/Android + hardware-accelerated CSS keyframes on Web.
 * - Flexbox absolute centering (no percentage offset / negative margin bugs).
 * - Luxury obsidian black button face with crisp gold typography.
 * - Tactile spring press feedback.
 * - 100% React Native JavaScript & StyleSheet compatible.
 */

import React, { useEffect, useRef } from 'react';
import {
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Easing,
  View,
  Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const isWeb = Platform.OS === 'web';

// On Web, inject the CSS keyframe once so rotation is guaranteed 60fps on browser GPU
if (isWeb && typeof document !== 'undefined') {
  const styleId = 'shiny-button-keyframes';
  if (!document.getElementById(styleId)) {
    const styleEl = document.createElement('style');
    styleEl.id = styleId;
    styleEl.innerHTML = `
      @keyframes shinyRotateBeam {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      .shiny-roaming-beam {
        animation: shinyRotateBeam 3s linear infinite !important;
      }
    `;
    document.head.appendChild(styleEl);
  }
}

export function ShinyButton({
  label = 'Get Started',
  onPress,
  onClick, // web alias compatibility
  fillColor = '#121110',
  labelColor = '#FAF8F5',
  accentColor = '#D4AF37',
  accentSoftColor = '#FDEAB0',
  sweepDuration = 3,
  cornerRadius = 10,
  borderThickness = 3,
  style,
  textStyle,
  accessibilityLabel
}) {
  const handlePressAction = onPress || onClick;

  // 1. Continuous 360-degree rotating animation
  const spinAnim = useRef(new Animated.Value(0)).current;

  // 2. Press spring scale
  const pressScaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: Math.max(sweepDuration * 1000, 1000),
        easing: Easing.linear,
        useNativeDriver: !isWeb // MUST be false on Web, true on iOS/Android
      })
    );
    loop.start();

    return () => loop.stop();
  }, [sweepDuration]);

  const spinInterpolation = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  const handlePressIn = () => {
    Animated.spring(pressScaleAnim, {
      toValue: 0.95,
      friction: 8,
      tension: 100,
      useNativeDriver: !isWeb
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(pressScaleAnim, {
      toValue: 1,
      friction: 8,
      tension: 100,
      useNativeDriver: !isWeb
    }).start();
  };

  return (
    <Animated.View
      style={[
        styles.outerWrapper,
        { transform: [{ scale: pressScaleAnim }] },
        style
      ]}
    >
      <Pressable
        onPress={handlePressAction}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.container,
          {
            borderRadius: cornerRadius,
            padding: borderThickness
          }
        ]}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel || label}
      >
        {/* Animated Rotating Golden Beam Roaming Around the Perimeter */}
        <View style={styles.beamWrapper} pointerEvents="none">
          <Animated.View
            className={isWeb ? 'shiny-roaming-beam' : undefined}
            style={[
              styles.rotatingTrack,
              { transform: [{ rotate: spinInterpolation }] },
              isWeb && {
                // Inline CSS fallback for web bundlers
                animation: `shinyRotateBeam ${sweepDuration}s linear infinite`
              }
            ]}
          >
            <LinearGradient
              colors={[
                'transparent',
                'transparent',
                'rgba(212, 175, 55, 0.2)',
                '#C59A27',
                accentSoftColor,
                '#FFFFFF',
                accentSoftColor,
                accentColor,
                'rgba(212, 175, 55, 0.3)',
                'transparent',
                'transparent'
              ]}
              locations={[
                0,
                0.28,
                0.38,
                0.45,
                0.485,
                0.50,
                0.515,
                0.55,
                0.62,
                0.72,
                1
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
          </Animated.View>
        </View>

        {/* Inner Solid Button Face */}
        <View
          style={[
            styles.innerFace,
            {
              backgroundColor: fillColor,
              borderRadius: Math.max(cornerRadius - borderThickness, 2)
            }
          ]}
        >
          {/* Button Label Text */}
          <Text
            allowFontScaling={false}
            style={[
              styles.labelText,
              { color: labelColor },
              textStyle
            ]}
          >
            {label}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default ShinyButton;

const styles = StyleSheet.create({
  outerWrapper: {
    shadowColor: '#8C6708',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 4
  },
  container: {
    overflow: 'hidden',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0A0908' // Dark obsidian border track for high contrast
  },
  beamWrapper: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden'
  },
  rotatingTrack: {
    position: 'absolute',
    width: 320,
    height: 320,
    alignItems: 'center',
    justifyContent: 'center'
  },
  innerFace: {
    paddingHorizontal: 20,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.25)' // Luxury gold chamfer
  },
  labelText: {
    fontSize: 13.5,
    fontWeight: '800',
    letterSpacing: 0.7,
    zIndex: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2
  }
});
