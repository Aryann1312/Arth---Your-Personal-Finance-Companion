/**
 * @file IntroScreen.js
 * @description Full-screen host screen for the "Arth" Wordmark Intro Animation.
 *
 * Responsibilities:
 * - Keeps native splash visible with expo-splash-screen until font is ready (pearl #FAF8F5).
 * - Loads Ultra_400Regular with a 3-second timeout fallback to system serif.
 * - Bootstraps auth in parallel with zero extra latency.
 * - Respects safe areas and handles orientation rotations.
 * - Supports instant tap-to-skip.
 * - Routes to MainTabs if authenticated, Landing otherwise.
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, StyleSheet, Platform, AppState } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
import { Ultra_400Regular } from '@expo-google-fonts/ultra';

import { ArthWordmarkIntro } from '../../components/ArthWordmarkIntro.js';
import { useAuth } from '../../context/AuthContext.js';
import { COLORS } from '../../theme/index.js';

// Prevent native splash from hiding automatically until intro is prepared
SplashScreen.preventAutoHideAsync().catch(() => {});

export function IntroScreen({ navigation, onIntroComplete }) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [fontLoaded, setFontLoaded] = useState(false);
  const [fontFamilyName, setFontFamilyName] = useState(
    Platform.OS === 'ios' ? 'Georgia' : 'serif'
  );

  const hasNavigatedRef = useRef(false);

  // Load Ultra font with 3s timeout fallback
  useEffect(() => {
    let isMounted = true;

    async function prepareFonts() {
      try {
        const fontPromise = Font.loadAsync({ Ultra_400Regular });
        const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 3000));

        await Promise.race([fontPromise, timeoutPromise]);

        if (isMounted) {
          const isLoaded = Font.isLoaded('Ultra_400Regular');
          if (isLoaded) {
            setFontFamilyName('Ultra_400Regular');
          }
          setFontLoaded(true);
        }
      } catch (err) {
        console.log('[IntroScreen] Font load fallback:', err.message);
        if (isMounted) {
          setFontLoaded(true);
        }
      } finally {
        // Hide native splash once ready
        await SplashScreen.hideAsync().catch(() => {});
      }
    }

    prepareFonts();

    return () => {
      isMounted = false;
    };
  }, []);

  // Completion / Skip routing handler
  const handleTransition = useCallback(() => {
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
  }, [navigation, onIntroComplete, isAuthenticated]);

  // Cleanly handle app backgrounding
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'background') {
        // If backgrounded during intro, we can complete so user returns to landing/main
        handleTransition();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [handleTransition]);

  if (!fontLoaded) {
    // Keep container seamless with pearl background while font initializes
    return <View style={styles.container} />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ArthWordmarkIntro
        text="Arth"
        fontSize={160}
        ink="#111111"
        background="#FAF8F5"
        deckColors={['#D4AF37', '#8A6D1A', '#E9CF7A', '#5C4710', '#F5E6A8']}
        speed={1}
        fontFamily={fontFamilyName}
        onFinish={handleTransition}
        onSkip={handleTransition}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F5'
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#FAF8F5'
  }
});
