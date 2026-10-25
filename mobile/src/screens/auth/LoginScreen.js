/**
 * @file LoginScreen.js
 * @description Accessible luxury authentication screen with interactive Login / Sign Up mode shifter,
 * inline validation, and SecureStore token persistence.
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Animated,
  LayoutAnimation,
  UIManager
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { useAuth } from '../../context/AuthContext.js';
import { PearlCard } from '../../components/PearlCard.js';
import { Input } from '../../components/Input.js';
import { GoldButton } from '../../components/GoldButton.js';
import { GoldGradientText } from '../../components/GoldGradientText.js';
import { Toast } from '../../components/Toast.js';
import { AppLogo } from '../../components/AppLogo.js';
import { COLORS, RADII, SPACING, useResponsiveLayout } from '../../theme/index.js';

function ChevronLeftIcon({ color = '#2B2823', size = 18 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 18L9 12L15 6"
        stroke={color}
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function LoginScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { login, signup } = useAuth();
  const { isTablet, horizontalPadding } = useResponsiveLayout();

  const initialMode = route?.params?.mode === 'signup' ? 'signup' : 'login';
  const [mode, setMode] = useState(initialMode); // 'login' | 'signup'

  // Form input states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Input refs for seamless keyboard traversal
  const nameRef = useRef(null);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const confirmPasswordRef = useRef(null);

  // Smooth mode shifter animated sliding toggle
  const slideAnim = useRef(new Animated.Value(initialMode === 'signup' ? 1 : 0)).current;
  const [shifterWidth, setShifterWidth] = useState(0);

  const handleSwitchMode = (targetMode) => {
    if (mode === targetMode) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setMode(targetMode);
    setError('');
    Animated.spring(slideAnim, {
      toValue: targetMode === 'login' ? 0 : 1,
      damping: 18,
      stiffness: 160,
      mass: 0.8,
      useNativeDriver: Platform.OS !== 'web'
    }).start();
  };

  const handleGoBack = () => {
    if (navigation?.canGoBack && navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Landing');
    }
  };

  const handleAuthSubmit = async () => {
    setError('');

    if (mode === 'login') {
      if (!email.trim() || !password) {
        setError('Please provide both email and password.');
        if (!email.trim()) emailRef.current?.focus();
        else passwordRef.current?.focus();
        return;
      }

      setLoading(true);
      try {
        await login(email.trim(), password);
      } catch (err) {
        setError(err.message || 'Login failed. Please verify credentials.');
      } finally {
        setLoading(false);
      }
    } else {
      // Sign Up validation
      if (!name.trim()) {
        setError('Please provide your full name.');
        nameRef.current?.focus();
        return;
      }
      if (!email.trim()) {
        setError('Please provide your email address.');
        emailRef.current?.focus();
        return;
      }
      if (password.length < 8) {
        setError('Password must contain at least 8 characters.');
        passwordRef.current?.focus();
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        confirmPasswordRef.current?.focus();
        return;
      }

      setLoading(true);
      try {
        await signup({
          name: name.trim(),
          email: email.trim(),
          password,
          confirmPassword,
          acceptTerms: true
        });
      } catch (err) {
        setError(err.message || 'Account registration failed.');
      } finally {
        setLoading(false);
      }
    }
  };

  // Compute animated tab translation
  const tabWidth = shifterWidth > 0 ? (shifterWidth - 6) / 2 : 140;
  const translateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, tabWidth]
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.keyboardContainer}
    >
      {/* Top Left Go Back Button */}
      <View
        style={[
          styles.topBar,
          {
            paddingTop: insets.top + 6,
            paddingHorizontal: horizontalPadding
          }
        ]}
      >
        <TouchableOpacity
          onPress={handleGoBack}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={styles.goBackButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ChevronLeftIcon size={18} color="#2B2823" />
          <Text style={styles.goBackText}>Go back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingHorizontal: horizontalPadding,
            paddingBottom: Math.max(insets.bottom, SPACING.md)
          }
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View style={styles.centerStage}>
          <View style={[styles.innerContainer, isTablet && styles.tabletContainer]}>
            <View style={styles.header}>
              <View style={styles.logoBadgeWrapper}>
                <AppLogo size={54} variant="gold" />
              </View>
              <GoldGradientText level={1} style={styles.title}>
                {mode === 'login' ? 'Welcome Back' : 'Create Account'}
              </GoldGradientText>
              <Text style={styles.subtitle}>
                {mode === 'login'
                  ? 'Sign in to access your gold valuations & loans'
                  : 'Register to unlock your personalized gold portfolio'}
              </Text>
            </View>

            <PearlCard goldTrim={true} style={styles.card}>
              <Toast message={error} type="error" visible={Boolean(error)} />

              {/* Smooth Login / Sign Up Mode Shifter */}
              <View
                style={styles.shifterContainer}
                onLayout={(e) => setShifterWidth(e.nativeEvent.layout.width)}
              >
                {/* Hairline Center Divider */}
                <View style={styles.shifterDivider} pointerEvents="none" />

                {/* Animated Black Box Shifter Indicator */}
                <Animated.View
                  style={[
                    styles.shifterIndicator,
                    {
                      width: tabWidth,
                      transform: [{ translateX }]
                    }
                  ]}
                />

                {/* Login Tab */}
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => handleSwitchMode('login')}
                  style={styles.shifterTab}
                  accessibilityRole="button"
                  accessibilityLabel="Switch to Login mode"
                >
                  <Text
                    style={[
                      styles.shifterTabText,
                      mode === 'login' ? styles.shifterTextActive : styles.shifterTextInactive
                    ]}
                  >
                    Login
                  </Text>
                </TouchableOpacity>

                {/* Sign Up Tab */}
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => handleSwitchMode('signup')}
                  style={styles.shifterTab}
                  accessibilityRole="button"
                  accessibilityLabel="Switch to Sign Up mode"
                >
                  <Text
                    style={[
                      styles.shifterTabText,
                      mode === 'signup' ? styles.shifterTextActive : styles.shifterTextInactive
                    ]}
                  >
                    Sign Up
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Sign Up: Full Name Field */}
              {mode === 'signup' && (
                <Input
                  ref={nameRef}
                  label="Full Name"
                  value={name}
                  onChangeText={(t) => { setName(t); setError(''); }}
                  placeholder="e.g. Aryan Sharma"
                  autoCapitalize="words"
                  autoCorrect={false}
                  returnKeyType="next"
                  onSubmitEditing={() => emailRef.current?.focus()}
                  style={styles.input}
                />
              )}

              {/* Email Address */}
              <Input
                ref={emailRef}
                label="Email Address"
                value={email}
                onChangeText={(t) => { setEmail(t); setError(''); }}
                placeholder="e.g. name@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                style={styles.input}
              />

              {/* Password */}
              <Input
                ref={passwordRef}
                label="Password"
                value={password}
                onChangeText={(t) => { setPassword(t); setError(''); }}
                placeholder={mode === 'signup' ? 'At least 8 characters' : 'Enter your password'}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType={mode === 'signup' ? 'next' : 'done'}
                onSubmitEditing={() => {
                  if (mode === 'signup') confirmPasswordRef.current?.focus();
                  else handleAuthSubmit();
                }}
                rightElement={
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    style={styles.showHideBtn}
                  >
                    <Text style={styles.showHideText}>{showPassword ? 'Hide' : 'Show'}</Text>
                  </TouchableOpacity>
                }
                style={styles.input}
              />

              {/* Sign Up: Confirm Password Field */}
              {mode === 'signup' && (
                <Input
                  ref={confirmPasswordRef}
                  label="Confirm Password"
                  value={confirmPassword}
                  onChangeText={(t) => { setConfirmPassword(t); setError(''); }}
                  placeholder="Re-enter password"
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={handleAuthSubmit}
                  rightElement={
                    <TouchableOpacity
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                      style={styles.showHideBtn}
                    >
                      <Text style={styles.showHideText}>{showConfirmPassword ? 'Hide' : 'Show'}</Text>
                    </TouchableOpacity>
                  }
                  style={styles.input}
                />
              )}

              {/* Action Button */}
              <GoldButton
                title={mode === 'login' ? 'Sign In' : 'Create Account'}
                onPress={handleAuthSubmit}
                loading={loading}
                style={styles.button}
              />
            </PearlCard>

            {/* Footer Prompt */}
            <View style={styles.footerRow}>
              <Text style={styles.footerText}>
                {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              </Text>
              <TouchableOpacity onPress={() => handleSwitchMode(mode === 'login' ? 'signup' : 'login')}>
                <Text style={styles.footerLink}>
                  {mode === 'login' ? 'Create Account' : 'Sign In'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  topBar: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    zIndex: 10
  },
  goBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 8,
    paddingRight: 14
  },
  goBackText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2B2823',
    letterSpacing: -0.2
  },
  scrollContent: {
    flexGrow: 1
  },
  centerStage: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 14,
    paddingBottom: SPACING.xxl,
    width: '100%'
  },
  innerContainer: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center'
  },
  tabletContainer: {
    maxWidth: 480
  },
  header: {
    marginBottom: SPACING.lg,
    alignItems: 'center'
  },
  logoBadgeWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 1.5,
    borderColor: 'rgba(212, 175, 55, 0.35)',
    marginBottom: SPACING.sm
  },
  title: {
    textAlign: 'center'
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
    textAlign: 'center'
  },
  card: {
    padding: SPACING.xl
  },

  // Mode Shifter Segmented Switch
  shifterContainer: {
    height: 48,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#111111',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    position: 'relative',
    padding: 3,
    marginBottom: SPACING.xl
  },
  shifterDivider: {
    position: 'absolute',
    left: '50%',
    top: '22%',
    bottom: '22%',
    width: 1,
    backgroundColor: 'rgba(212, 175, 55, 0.45)',
    zIndex: 0
  },
  shifterIndicator: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    left: 3,
    backgroundColor: '#141312',
    borderRadius: 7,
    zIndex: 1
  },
  shifterTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2
  },
  shifterTabText: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3
  },
  shifterTextActive: {
    color: '#C5A059' // Warm luxury gold
  },
  shifterTextInactive: {
    color: '#9E7A38' // Muted warm bronze gold
  },

  input: {
    marginBottom: SPACING.md
  },
  showHideBtn: {
    padding: SPACING.xs
  },
  showHideText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.goldDeep,
    paddingHorizontal: SPACING.xs
  },
  button: {
    marginTop: SPACING.sm
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: SPACING.xl
  },
  footerText: {
    color: COLORS.textSecondary,
    fontSize: 14
  },
  footerLink: {
    color: COLORS.goldDeep,
    fontWeight: '700',
    fontSize: 14
  }
});
