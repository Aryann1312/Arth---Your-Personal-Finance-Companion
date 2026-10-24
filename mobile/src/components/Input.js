/**
 * @file Input.js
 * @description Accessible luxury input component with floating label, prefix/suffix units,
 * reliable touch targets, Android cursor stability, and full prop forwarding.
 */

import React, { useState, useRef, useImperativeHandle, forwardRef } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, Platform } from 'react-native';
import { COLORS, RADII, SPACING } from '../theme/index.js';

export const Input = forwardRef(function Input({
  label,
  value,
  onChangeText,
  placeholder,
  prefix,
  suffix,
  error,
  secureTextEntry = false,
  keyboardType = 'default',
  editable = true,
  rightElement,
  style,
  inputStyle,
  accessibilityLabel,
  autoCapitalize = 'sentences',
  autoCorrect = true,
  returnKeyType,
  onSubmitEditing,
  onFocus,
  onBlur,
  ...restProps
}, ref) {
  const [isFocused, setIsFocused] = useState(false);
  const internalInputRef = useRef(null);

  useImperativeHandle(ref, () => ({
    focus: () => internalInputRef.current?.focus(),
    blur: () => internalInputRef.current?.blur(),
    isFocused: () => internalInputRef.current?.isFocused(),
    clear: () => internalInputRef.current?.clear()
  }));

  const handleWrapperPress = () => {
    if (editable && internalInputRef.current) {
      internalInputRef.current.focus();
    }
  };

  const handleFocus = (e) => {
    setIsFocused(true);
    if (onFocus) onFocus(e);
  };

  const handleBlur = (e) => {
    setIsFocused(false);
    if (onBlur) onBlur(e);
  };

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}

      <Pressable
        onPress={handleWrapperPress}
        style={[
          styles.inputWrapper,
          isFocused && styles.inputWrapperFocused,
          error ? styles.inputWrapperError : null,
          !editable && styles.inputWrapperDisabled
        ]}
      >
        {prefix && <Text style={styles.prefix}>{prefix}</Text>}

        <TextInput
          ref={internalInputRef}
          value={value !== undefined && value !== null ? String(value) : ''}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#A8A29E"
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          editable={editable}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          cursorColor={COLORS.goldDeep}
          selectionColor="rgba(212, 175, 55, 0.35)"
          onFocus={handleFocus}
          onBlur={handleBlur}
          style={[styles.input, inputStyle]}
          accessibilityLabel={accessibilityLabel || label}
          {...restProps}
        />

        {suffix && <Text style={styles.suffix}>{suffix}</Text>}
        {rightElement}
      </Pressable>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.md
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    letterSpacing: 0.2
  },
  inputWrapper: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADII.lg,
    paddingHorizontal: SPACING.md
  },
  inputWrapperFocused: {
    borderColor: COLORS.goldMain,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    ...(Platform.OS === 'ios' ? {
      shadowColor: COLORS.goldMain,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 6
    } : {})
  },
  inputWrapperError: {
    borderColor: COLORS.error,
    borderWidth: 1.5
  },
  inputWrapperDisabled: {
    backgroundColor: COLORS.surfaceMuted,
    opacity: 0.75
  },
  prefix: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.goldDeep,
    marginRight: SPACING.xs
  },
  suffix: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginLeft: SPACING.xs
  },
  input: {
    flex: 1,
    height: '100%',
    minHeight: 48,
    fontSize: 16,
    color: COLORS.textPrimary,
    paddingVertical: Platform.OS === 'android' ? 6 : 8,
    paddingHorizontal: 0
  },
  errorText: {
    color: COLORS.error,
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500'
  }
});
