/**
 * @file LuxurySplash.js
 * @description High-tier interactive luxury splash / loading screen.
 * Replaces the static white blank screen with an animated golden emblem aura,
 * dynamic status ticker, and institutional fintech branding.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  TouchableOpacity,
  Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AppLogo } from './AppLogo.js';
import { COLORS, RADII, SPACING } from '../theme/index.js';

const { width } = Dimensions.get('window');

const STATUS_MESSAGES = [
  'Verifying Vault Connectivity...',
  'Syncing World Gold Council Rates...',
  'Calibrating RBI Tiered LTV Engine...',
  'Institutional Precision Ready'
];

export function LuxurySplash({ onDismiss }) {
  // Animation values
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.4)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [statusIndex, setStatusIndex] = useState(0);

  useEffect(() => {
    // Fade in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true
    }).start();

    // Subtle breathing pulse on logo
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.06,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        })
      ])
    );
    pulseLoop.start();

    // Glowing aura expansion
    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 0.9,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        }),
        Animated.timing(glowAnim, {
          toValue: 0.4,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        })
      ])
    );
    glowLoop.start();

    // Smooth progress bar fill
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 2200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false
    }).start();

    // Rotate status messages
    const interval = setInterval(() => {
      setStatusIndex((prev) => (prev < STATUS_MESSAGES.length - 1 ? prev + 1 : prev));
    }, 600);

    return () => {
      pulseLoop.stop();
      glowLoop.stop();
      clearInterval(interval);
    };
  }, []);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['10%', '100%']
  });

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Subtle Warm Background Gradient */}
      <LinearGradient
        colors={['#FAF8F5', '#F5EFE6', '#EDE5D6']}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Decorative Golden Ambient Circles */}
      <Animated.View
        style={[
          styles.glowCircle,
          {
            opacity: glowAnim,
            transform: [{ scale: pulseAnim }]
          }
        ]}
      />

      <View style={styles.centerContent}>
        {/* Animated Brand Logo */}
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <View style={styles.logoWrapper}>
            <AppLogo size={96} variant="gold" />
          </View>
        </Animated.View>

        {/* Brand Text */}
        <View style={styles.badge}>
          <Text style={styles.badgeText}>✦ 24K FINTECH PRECISION ✦</Text>
        </View>

        <Text style={styles.title}>GOLD & LOAN</Text>
        <Text style={styles.subtitle}>INTELLIGENCE PLATFORM</Text>

        <Text style={styles.caption}>
          Zero IEEE-754 Drift • Tiered RBI LTV Architecture
        </Text>

        {/* Progress Bar Container */}
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressBar, { width: progressWidth }]}>
            <LinearGradient
              colors={['#E6C65B', '#D4AF37', '#997300']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFillObject}
            />
          </Animated.View>
        </View>

        {/* Live Status Indicator */}
        <Text style={styles.statusText}>{STATUS_MESSAGES[statusIndex]}</Text>
      </View>

      {/* Quick Interactive Dismiss Option */}
      {onDismiss && (
        <TouchableOpacity
          onPress={onDismiss}
          style={styles.skipButton}
          activeOpacity={0.7}
        >
          <Text style={styles.skipText}>Tap anywhere to enter →</Text>
        </TouchableOpacity>
      )}

      {/* Bottom Footer Credits */}
      <View style={styles.footer}>
        <Text style={styles.footerBrand}>Powered by RBI Regulatory Compliance Standards</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAF8F5'
  },
  glowCircle: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(212, 175, 55, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.28)'
  },
  centerContent: {
    alignItems: 'center',
    paddingHorizontal: SPACING.xl
  },
  logoWrapper: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(212, 175, 55, 0.35)',
    marginBottom: SPACING.lg
  },
  badge: {
    backgroundColor: 'rgba(212, 175, 55, 0.12)',
    paddingHorizontal: SPACING.md,
    paddingVertical: 5,
    borderRadius: RADII.full,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.4)',
    marginBottom: SPACING.sm
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8C6600',
    letterSpacing: 1.5
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: '#1A1816',
    letterSpacing: 2,
    textAlign: 'center'
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#D4AF37',
    letterSpacing: 3,
    marginTop: 2,
    marginBottom: SPACING.sm,
    textAlign: 'center'
  },
  caption: {
    fontSize: 12,
    color: '#7C756A',
    textAlign: 'center',
    marginBottom: SPACING.xl
  },
  progressTrack: {
    width: width * 0.65,
    maxWidth: 280,
    height: 4,
    backgroundColor: 'rgba(212, 175, 55, 0.18)',
    borderRadius: RADII.full,
    overflow: 'hidden',
    marginBottom: SPACING.md
  },
  progressBar: {
    height: '100%',
    borderRadius: RADII.full
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8C6600',
    letterSpacing: 0.4
  },
  skipButton: {
    marginTop: SPACING.xl,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg
  },
  skipText: {
    fontSize: 12,
    color: '#997300',
    fontWeight: '700'
  },
  footer: {
    position: 'absolute',
    bottom: SPACING.huge
  },
  footerBrand: {
    fontSize: 11,
    color: '#9E978C',
    fontWeight: '600'
  }
});
