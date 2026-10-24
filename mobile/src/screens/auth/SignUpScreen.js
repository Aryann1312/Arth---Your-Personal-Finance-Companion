import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useAuth } from '../../context/AuthContext.js';
import { PearlCard } from '../../components/PearlCard.js';
import { Input } from '../../components/Input.js';
import { GoldButton } from '../../components/GoldButton.js';
import { GoldGradientText } from '../../components/GoldGradientText.js';
import { Toast } from '../../components/Toast.js';
import { AppLogo } from '../../components/AppLogo.js';
import { COLORS, RADII, SPACING, useResponsiveLayout } from '../../theme/index.js';

export function SignUpScreen({ navigation }) {
  const { signup } = useAuth();
  const { isTablet, horizontalPadding } = useResponsiveLayout();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Refs for seamless field-to-field keyboard navigation
  const nameRef = useRef(null);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const confirmPasswordRef = useRef(null);

  // Password strength calculation
  const getPasswordStrength = (pwd) => {
    if (!pwd) return { score: 0, label: '', color: COLORS.border };
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    switch (score) {
      case 1:
        return { score: 1, label: 'Weak', color: COLORS.error };
      case 2:
        return { score: 2, label: 'Fair', color: COLORS.warning };
      case 3:
        return { score: 3, label: 'Good', color: COLORS.info };
      case 4:
        return { score: 4, label: 'Strong', color: COLORS.success };
      default:
        return { score: 1, label: 'Weak', color: COLORS.error };
    }
  };

  const strength = getPasswordStrength(password);

  const handleSignUp = async () => {
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
    if (!acceptTerms) {
      setError('You must accept the Terms and Privacy Notice to proceed.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await signup({
        name: name.trim(),
        email: email.trim(),
        password,
        confirmPassword,
        acceptTerms
      });
    } catch (err) {
      setError(err.message || 'Account registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.keyboardContainer}
    >
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: horizontalPadding }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View style={[styles.innerContainer, isTablet && styles.tabletContainer]}>
          <View style={styles.header}>
            <View style={styles.logoBadgeWrapper}>
              <AppLogo size={54} variant="gold" />
            </View>
            <GoldGradientText level={1} style={styles.title}>Create Account</GoldGradientText>
            <Text style={styles.subtitle}>Unlock gold rate tracking and loan calculators</Text>
          </View>

          <PearlCard goldTrim={true} style={styles.card}>
            <Toast message={error} type="error" visible={Boolean(error)} />

            <Input
              ref={nameRef}
              label="Full Name"
              value={name}
              onChangeText={(t) => { setName(t); setError(''); }}
              placeholder="e.g. Aryan Sharma"
              autoCapitalize="words"
              returnKeyType="next"
              onSubmitEditing={() => emailRef.current?.focus()}
              style={styles.input}
            />

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
              placeholder="Min. 8 characters"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              onSubmitEditing={() => confirmPasswordRef.current?.focus()}
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

            {/* Password Strength Meter */}
            {password.length > 0 && (
              <View style={styles.strengthContainer}>
                <View style={styles.strengthBarsRow}>
                  {[1, 2, 3, 4].map((step) => (
                    <View
                      key={step}
                      style={[
                        styles.strengthBar,
                        { backgroundColor: step <= strength.score ? strength.color : COLORS.borderLight }
                      ]}
                    />
                  ))}
                </View>
                <Text style={[styles.strengthLabel, { color: strength.color }]}>
                  Strength: {strength.label}
                </Text>
              </View>
            )}

            <Input
              ref={confirmPasswordRef}
              label="Confirm Password"
              value={confirmPassword}
              onChangeText={(t) => { setConfirmPassword(t); setError(''); }}
              placeholder="Re-enter your password"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleSignUp}
              style={styles.input}
            />

            {/* Terms and Privacy Checkbox */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => { setAcceptTerms(!acceptTerms); setError(''); }}
              style={styles.checkboxRow}
            >
              <View style={[styles.checkbox, acceptTerms && styles.checkboxChecked]}>
                {acceptTerms && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.termsText}>
                I accept the <Text style={styles.termsHighlight}>Terms of Service</Text> and acknowledge the <Text style={styles.termsHighlight}>Privacy Notice</Text> regarding data logging.
              </Text>
            </TouchableOpacity>

            <GoldButton
              title="Create Account"
              onPress={handleSignUp}
              loading={loading}
              style={styles.button}
            />
          </PearlCard>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.footerLink}>Sign In</Text>
            </TouchableOpacity>
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
  scrollContent: {
    flexGrow: 1,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.huge
  },
  innerContainer: {
    width: '100%',
    alignSelf: 'center'
  },
  tabletContainer: {
    maxWidth: 500
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
  strengthContainer: {
    marginBottom: SPACING.md
  },
  strengthBarsRow: {
    flexDirection: 'row',
    gap: 4,
    height: 4,
    marginBottom: 4
  },
  strengthBar: {
    flex: 1,
    borderRadius: 2
  },
  strengthLabel: {
    fontSize: 11,
    fontWeight: '600'
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: SPACING.md
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: COLORS.borderGold,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 2
  },
  checkboxChecked: {
    backgroundColor: COLORS.goldDeep
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800'
  },
  termsText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 18
  },
  termsHighlight: {
    color: COLORS.goldDeep,
    fontWeight: '700'
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
