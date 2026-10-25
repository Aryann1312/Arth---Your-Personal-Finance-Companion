/**
 * @file PageTitleBanner.js
 * @description Luxury centered page title banner with Yeseva One serif typography in bright gold (#EFBF04),
 * and high-contrast bold black centered description.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import * as Font from 'expo-font';
import { SPACING } from '../theme/index.js';

let localYesevaFont = null;
try {
  localYesevaFont = require('../../assets/fonts/YesevaOne_400Regular.ttf');
} catch (e) {
  // fallback if asset not resolved
}

export function PageTitleBanner({ title, description, style }) {
  const [isFontReady, setIsFontReady] = useState(() => {
    try {
      return Font.isLoaded('YesevaOne_400Regular');
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (!isFontReady && localYesevaFont) {
      Font.loadAsync({ YesevaOne_400Regular: localYesevaFont })
        .then(() => setIsFontReady(true))
        .catch(() => { });
    }
  }, [isFontReady]);

  return (
    <View style={[styles.container, style]}>
      <Text
        allowFontScaling={false}
        style={[
          styles.title,
          {
            fontFamily: isFontReady
              ? 'YesevaOne_400Regular'
              : (Platform.OS === 'ios' ? 'Georgia' : 'serif')
          }
        ]}
      >
        {title}
      </Text>

      {Boolean(description) && (
        <Text
          allowFontScaling={false}
          style={[
            styles.description,
            {
              fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif'
            }
          ]}
        >
          {description}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 65,
    paddingBottom: 60,
    paddingHorizontal: SPACING.lg
  },
  title: {
    fontSize: 45,
    fontWeight: '700',
    color: '#EFBF04',
    textAlign: 'center',
    letterSpacing: 2.2,
    textTransform: 'uppercase'
  },
  description: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#111111',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 12,
    maxWidth: 330,
    alignSelf: 'center'
  }
});
