/**
 * @file IntroScreen.js
 * @description Full-screen host screen for the "Arth" Wordmark Intro Animation.
 *
 * Requirements:
 * - First screen on a cold start.
 * - Keeps native splash visible (expo-splash-screen preventAutoHideAsync) until fonts are loaded,
 *   then hides it and starts animation so there is zero blank flash.
 * - 3-second fallback: If Ultra fails to load within 3s, falls back to bold system serif and plays.
 * - Bootstraps auth in parallel. When animation ends, routes to Main if logged in, otherwise Landing.
 * - Tap anywhere to skip (calls onSkip, jumps to end state, then navigates).
 * - Pauses or finishes cleanly if app is backgrounded mid-animation.
 * - Fully responsive with SafeAreaView support.
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { StyleSheet, Platform, AppState, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';

import { ArthWordmarkIntro } from '../../components/ArthWordmarkIntro.js';
import { useAuth } from '../../context/AuthContext.js';

// Safe local asset reference for Yeseva One font
let localYesevaFont = null;
try {
  localYesevaFont = require('../../../assets/fonts/YesevaOne_400Regular.ttf');
} catch (e) {
  console.warn('[IntroScreen] Local YesevaOne font asset missing, fallback active:', e?.message || e);
}

// Prevent native splash from hiding automatically until fonts are verified/ready
SplashScreen.preventAutoHideAsync().catch(() => {});

export function IntroScreen({ navigation, onIntroComplete }) {
  const { isAuthenticated } = useAuth();
  const [isFontReady, setIsFontReady] = useState(false);
  const [fontFamilyName, setFontFamilyName] = useState(
    Platform.OS === 'ios' ? 'Georgia' : 'serif'
  );

  const hasNavigatedRef = useRef(false);

  // Synchronize font loading with native splash screen & 3s fallback
  useEffect(() => {
    let isMounted = true;
    let fallbackTimer = null;

    async function loadFontAndPrepare() {
      try {
        if (localYesevaFont) {
          const fontPromise = Font.loadAsync({
            YesevaOne_400Regular: localYesevaFont
          });
          const timeoutPromise = new Promise((resolve) => {
            fallbackTimer = setTimeout(() => resolve('timeout'), 3000);
          });

          const outcome = await Promise.race([fontPromise, timeoutPromise]);
          if (outcome !== 'timeout' && isMounted) {
            clearTimeout(fallbackTimer);
            setFontFamilyName('YesevaOne_400Regular');
          }
        }
      } catch (err) {
        console.warn('[IntroScreen] Font loading fallback activated:', err?.message || err);
      } finally {
        if (isMounted) {
          setIsFontReady(true);
          // Hide native splash once fonts are ready to avoid blank flash
          await SplashScreen.hideAsync().catch(() => {});
        }
      }
    }

    loadFontAndPrepare();

    return () => {
      isMounted = false;
      if (fallbackTimer) clearTimeout(fallbackTimer);
    };
  }, []);

  // Completion / Skip routing handler
  const handleNavigation = useCallback(() => {
    if (hasNavigatedRef.current) return;
    hasNavigatedRef.current = true;

    if (onIntroComplete) {
      onIntroComplete();
    } else if (navigation) {
      if (isAuthenticated) {
        navigation.replace('MainTabs');
      } else {
        navigation.replace('Landing');
      }
    }
  }, [onIntroComplete, navigation, isAuthenticated]);

  // Cleanly handle app backgrounding mid-animation
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'background') {
        handleNavigation();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [handleNavigation]);

  // While waiting for font load race, keep pearl background seamlessly aligned with native splash
  if (!isFontReady) {
    return <View style={styles.container} />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <ArthWordmarkIntro
        text="Arth"
        fontSize={68}
        ink="#111111"
        background="#FAF8F5"
        deckColors={['#D4AF37', '#8A6D1A', '#E9CF7A', '#5C4710', '#F5E6A8']}
        speed={1}
        fontFamily={fontFamilyName}
        onFinish={handleNavigation}
        onSkip={handleNavigation}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F5'
  }
});
