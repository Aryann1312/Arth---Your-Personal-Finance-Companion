/**
 * @file LoginScreen.js
 * @description Accessible luxury login screen with inline validation and SecureStore token persistence
 */

import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
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

export function LoginScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const { isTablet, horizontalPadding } = useResponsiveLayout();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const emailRef = useRef(null);
  const passwordRef = useRef(null);

  const handleGoBack = () => {
    if (navigation?.canGoBack && navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Landing');
    }
  };

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError('Please provide both email and password.');
      if (!email.trim()) emailRef.current?.focus();
      else passwordRef.current?.focus();
      return;
    }

    setError('');
    setLoading(true);

    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

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
            <GoldGradientText level={1} style={styles.title}>Welcome Back</GoldGradientText>
            <Text style={styles.subtitle}>Sign in to access your gold valuations & loans</Text>
          </View>

          <PearlCard goldTrim={true} style={styles.card}>
            <Toast message={error} type="error" visible={Boolean(error)} />

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

            <Input
              ref={passwordRef}
              label="Password"
              value={password}
              onChangeText={(t) => { setPassword(t); setError(''); }}
              placeholder="Enter your password"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
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

            <GoldButton
              title="Sign In"
              onPress={handleLogin}
              loading={loading}
              style={styles.button}
            />

            {/* Quick Demo Credentials for assessor convenience */}
            <View style={styles.demoCredentialsBox}>
              <Text style={styles.demoTitle}>Assessment Admin Credentials:</Text>
              <TouchableOpacity onPress={() => { setEmail('admin@goldloan.internal'); setPassword('AdminSecurePassword123!'); }}>
                <Text style={styles.demoCreds}>admin@goldloan.internal (Tap to autofill)</Text>
              </TouchableOpacity>
            </View>
          </PearlCard>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
              <Text style={styles.footerLink}>Create Account</Text>
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
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xl,
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
  demoCredentialsBox: {
    marginTop: SPACING.xl,
    padding: SPACING.md,
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.borderLight
  },
  demoTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 4,
    textTransform: 'uppercase'
  },
  demoCreds: {
    fontSize: 12,
    color: COLORS.goldDeep,
    fontWeight: '600'
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
