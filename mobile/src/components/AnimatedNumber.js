/**
 * @file AnimatedNumber.js
 * @description Count-up animated number display using tabular figures and Indian currency formatting
 */

import React, { useEffect, useRef, useState } from 'react';
import { Text, StyleSheet } from 'react-native';
import { formatINR, COLORS } from '../theme/index.js';
import { useSettings } from '../context/SettingsContext.js';

export function AnimatedNumber({
  value = 0,
  isCurrency = true,
  prefix = '',
  suffix = '',
  duration = 600,
  style
}) {
  const { reduceMotion } = useSettings();
  const [displayValue, setDisplayValue] = useState(value);
  const prevValue = useRef(value);

  useEffect(() => {
    if (reduceMotion) {
      setDisplayValue(value);
      prevValue.current = value;
      return;
    }

    const start = prevValue.current;
    const end = Number(value) || 0;
    const startTime = Date.now();

    const interval = setInterval(() => {
      const now = Date.now();
      const progress = Math.min(1, (now - startTime) / duration);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = start + (end - start) * eased;

      setDisplayValue(current);

      if (progress >= 1) {
        clearInterval(interval);
        prevValue.current = end;
      }
    }, 16);

    return () => clearInterval(interval);
  }, [value, reduceMotion, duration]);

  const formatted = isCurrency
    ? formatINR(displayValue, false)
    : Math.round(displayValue).toString();

  return (
    <Text style={[styles.text, style]}>
      {prefix}
      {formatted}
      {suffix}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    fontVariant: ['tabular-nums'],
    color: COLORS.textPrimary,
    fontWeight: '700'
  }
});
