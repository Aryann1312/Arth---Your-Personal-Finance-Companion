/**
 * @file App.js
 * @description Root application entry for Gold & Loan Calculator Mobile Application.
 * Configured for managed Expo workflow, light theme status bar, and contextual state providers.
 */

import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext.js';
import { SettingsProvider } from './src/context/SettingsContext.js';
import { AppNavigator } from './src/navigation/AppNavigator.js';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <SettingsProvider>
          <StatusBar style="dark" backgroundColor="#FAF8F5" />
          <AppNavigator />
        </SettingsProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
