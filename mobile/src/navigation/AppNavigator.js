/**
 * @file AppNavigator.js
 * @description Central navigation controller with Auth Stack, Bottom Tab Navigator for the 3 main modules,
 * nested stacks within each module, and header profile/history shortcuts.
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { useAuth } from '../context/AuthContext.js';
import { COLORS, RADII } from '../theme/index.js';
import { IntroScreen } from '../screens/intro/IntroScreen.js';

// Screens
import { LandingScreen } from '../screens/landing/LandingScreen.js';
import { LoginScreen } from '../screens/auth/LoginScreen.js';
import { SignUpScreen } from '../screens/auth/SignUpScreen.js';

// Module A
import { GoldOverviewScreen } from '../screens/gold/GoldOverviewScreen.js';
import { CompareDatesScreen } from '../screens/gold/CompareDatesScreen.js';
import { DataSourceInfoScreen } from '../screens/gold/DataSourceInfoScreen.js';

// Module B
import { GoldLoanScreen } from '../screens/goldloan/GoldLoanScreen.js';
import { SavedGoldLoansScreen } from '../screens/goldloan/SavedGoldLoansScreen.js';

// Module C
import { EMIScreen } from '../screens/emi/EMIScreen.js';
import { SavedEMIScreen } from '../screens/emi/SavedEMIScreen.js';

// Common
import { ProfileScreen } from '../screens/profile/ProfileScreen.js';
import { MyHistoryScreen } from '../screens/history/MyHistoryScreen.js';
import { SettingsScreen } from '../screens/profile/SettingsScreen.js';
import { PrivacyNoticeScreen } from '../screens/profile/PrivacyNoticeScreen.js';
import { AdminPortalScreen } from '../screens/admin/AdminPortalScreen.js';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const GoldStack = createNativeStackNavigator();
const GoldLoanStack = createNativeStackNavigator();
const EMIStack = createNativeStackNavigator();

// Header Avatar Button navigating to Profile
function HeaderProfileButton({ navigation }) {
  const { user } = useAuth();
  const initials = user?.name ? user.name.slice(0, 2).toUpperCase() : 'US';

  return (
    <View style={styles.headerButtonsRow}>
      <TouchableOpacity
        onPress={() => navigation.navigate('MyHistory')}
        style={styles.headerHistoryBtn}
        accessibilityLabel="My History"
      >
        <Text style={styles.historyBtnText}>History</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => navigation.navigate('Profile')}
        style={styles.avatarButton}
        accessibilityLabel="My Profile"
      >
        <Text style={styles.avatarText}>{initials}</Text>
      </TouchableOpacity>
    </View>
  );
}

// Module A Stack
function GoldNavigator({ navigation }) {
  return (
    <GoldStack.Navigator screenOptions={{ headerStyle: { backgroundColor: COLORS.surface }, headerTintColor: COLORS.textPrimary }}>
      <GoldStack.Screen
        name="GoldOverview"
        component={GoldOverviewScreen}
        options={{
          title: 'Gold Price Tracker',
          headerRight: () => <HeaderProfileButton navigation={navigation} />
        }}
      />
      <GoldStack.Screen name="CompareDates" component={CompareDatesScreen} options={{ title: 'Compare Dates' }} />
      <GoldStack.Screen name="DataSourceInfo" component={DataSourceInfoScreen} options={{ title: 'Data Methodology' }} />
    </GoldStack.Navigator>
  );
}

// Module B Stack
function GoldLoanNavigator({ navigation }) {
  return (
    <GoldLoanStack.Navigator screenOptions={{ headerStyle: { backgroundColor: COLORS.surface }, headerTintColor: COLORS.textPrimary }}>
      <GoldLoanStack.Screen
        name="GoldLoanMain"
        component={GoldLoanScreen}
        options={{
          title: 'Gold Loan Calculator',
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity onPress={() => navigation.navigate('SavedGoldLoans')} style={{ marginRight: 12 }}>
                <Text style={styles.savedLink}>Saved</Text>
              </TouchableOpacity>
              <HeaderProfileButton navigation={navigation} />
            </View>
          )
        }}
      />
      <GoldLoanStack.Screen name="SavedGoldLoans" component={SavedGoldLoansScreen} options={{ title: 'Saved Gold Loans' }} />
    </GoldLoanStack.Navigator>
  );
}

// Module C Stack
function EMINavigator({ navigation }) {
  return (
    <EMIStack.Navigator screenOptions={{ headerStyle: { backgroundColor: COLORS.surface }, headerTintColor: COLORS.textPrimary }}>
      <EMIStack.Screen
        name="EMIMain"
        component={EMIScreen}
        options={{
          title: 'EMI Calculator',
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity onPress={() => navigation.navigate('SavedEMI')} style={{ marginRight: 12 }}>
                <Text style={styles.savedLink}>Saved</Text>
              </TouchableOpacity>
              <HeaderProfileButton navigation={navigation} />
            </View>
          )
        }}
      />
      <EMIStack.Screen name="SavedEMI" component={SavedEMIScreen} options={{ title: 'Saved EMI Calculations' }} />
    </EMIStack.Navigator>
  );
}

// Main Bottom Tab Navigator
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: COLORS.goldDeep,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarLabelStyle: styles.tabLabel
      }}
    >
      <Tab.Screen
        name="GoldTab"
        component={GoldNavigator}
        options={{
          tabBarLabel: 'Gold Rates',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🪙</Text>
        }}
      />
      <Tab.Screen
        name="GoldLoanTab"
        component={GoldLoanNavigator}
        options={{
          tabBarLabel: 'Gold Loan',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>⚖️</Text>
        }}
      />
      <Tab.Screen
        name="EMITab"
        component={EMINavigator}
        options={{
          tabBarLabel: 'EMI Calc',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🧮</Text>
        }}
      />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  const { isAuthenticated } = useAuth();
  const [hasShownIntro, setHasShownIntro] = useState(false);

  // Cold-start 'Arth' Opening Animation is the very first screen
  if (!hasShownIntro) {
    return (
      <IntroScreen
        onIntroComplete={() => {
          setHasShownIntro(true);
        }}
      />
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          // Logged-out Stack
          <>
            <Stack.Screen name="Landing" component={LandingScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="SignUp" component={SignUpScreen} />
          </>
        ) : (
          // Logged-in Main App & Nested Modals
          <>
            <Stack.Screen name="MainTabs" component={MainTabs} />
            <Stack.Screen
              name="Profile"
              component={ProfileScreen}
              options={{ headerShown: true, title: 'My Profile', headerStyle: { backgroundColor: COLORS.surface }, headerTintColor: COLORS.textPrimary }}
            />
            <Stack.Screen
              name="MyHistory"
              component={MyHistoryScreen}
              options={{ headerShown: true, title: 'Interaction History', headerStyle: { backgroundColor: COLORS.surface }, headerTintColor: COLORS.textPrimary }}
            />
            <Stack.Screen
              name="Settings"
              component={SettingsScreen}
              options={{ headerShown: true, title: 'Settings', headerStyle: { backgroundColor: COLORS.surface }, headerTintColor: COLORS.textPrimary }}
            />
            <Stack.Screen
              name="PrivacyNotice"
              component={PrivacyNoticeScreen}
              options={{ headerShown: true, title: 'Privacy Notice', headerStyle: { backgroundColor: COLORS.surface }, headerTintColor: COLORS.textPrimary }}
            />
            <Stack.Screen
              name="AdminPortal"
              component={AdminPortalScreen}
              options={{ headerShown: true, title: 'Stakeholder Admin Portal', headerStyle: { backgroundColor: COLORS.surface }, headerTintColor: COLORS.textPrimary }}
            />
            <Stack.Screen
              name="SavedGoldLoans"
              component={SavedGoldLoansScreen}
              options={{ headerShown: true, title: 'Saved Gold Loans', headerStyle: { backgroundColor: COLORS.surface }, headerTintColor: COLORS.textPrimary }}
            />
            <Stack.Screen
              name="SavedEMI"
              component={SavedEMIScreen}
              options={{ headerShown: true, title: 'Saved EMI Calculations', headerStyle: { backgroundColor: COLORS.surface }, headerTintColor: COLORS.textPrimary }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  tabBar: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    height: 60,
    paddingBottom: 6,
    paddingTop: 6
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '700'
  },
  headerButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  headerHistoryBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADII.sm,
    backgroundColor: COLORS.surfaceMuted
  },
  historyBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.goldDeep
  },
  avatarButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.goldLightBg,
    borderWidth: 1.5,
    borderColor: COLORS.goldMain,
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.goldDeep
  },
  savedLink: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.goldDeep
  },
  splashContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center'
  },
  splashBrand: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.goldDeep,
    letterSpacing: 1.5
  },
  splashSub: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 6
  }
});
