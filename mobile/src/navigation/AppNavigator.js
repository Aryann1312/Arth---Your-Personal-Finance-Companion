/**
 * @file AppNavigator.js
 * @description Central navigation controller with Auth Stack, Bottom Tab Navigator for the 3 main modules,
 * nested stacks within each module, and header profile/history shortcuts.
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Image } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Font from 'expo-font';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../context/AuthContext.js';
import { COLORS, RADII } from '../theme/index.js';
import { IntroScreen } from '../screens/intro/IntroScreen.js';
import { AppLogo } from '../components/AppLogo.js';
import { MarketTrendIcon, LoanPeakIcon, EMIPieIcon } from '../components/TabIcons.js';

// Safe local asset reference for Yeseva One font
let localYesevaFont = null;
try {
  localYesevaFont = require('../../assets/fonts/YesevaOne_400Regular.ttf');
} catch (e) {
  // fallback if asset not resolved
}

const profileAvatarImage = require('../../assets/profile-avatar.png');

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
import { AppInfoScreen } from '../screens/info/AppInfoScreen.js';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const GoldStack = createNativeStackNavigator();
const GoldLoanStack = createNativeStackNavigator();
const EMIStack = createNativeStackNavigator();

// Unified Header Action Buttons (Profile Avatar)
function HeaderRightActions({ navigation }) {
  return (
    <View style={styles.headerButtonsRow}>
      <TouchableOpacity
        onPress={() => navigation.navigate('Profile')}
        style={styles.avatarButton}
        accessibilityRole="button"
        accessibilityLabel="My Profile and Settings"
        activeOpacity={0.75}
      >
        <Image
          source={profileAvatarImage}
          style={styles.avatarImage}
          resizeMode="contain"
        />
      </TouchableOpacity>
    </View>
  );
}

// Deprecated alias for backwards compatibility
function HeaderProfileButton({ navigation }) {
  return <HeaderRightActions navigation={navigation} />;
}

// Brand Header Title: App logo without background circle + app name "Arth"
function HeaderBrandTitle() {
  const [fontLoaded, setFontLoaded] = useState(() => {
    try {
      return Font.isLoaded('YesevaOne_400Regular');
    } catch {
      return false;
    }
  });

  React.useEffect(() => {
    if (!fontLoaded && localYesevaFont) {
      Font.loadAsync({ YesevaOne_400Regular: localYesevaFont })
        .then(() => setFontLoaded(true))
        .catch(() => {});
    }
  }, [fontLoaded]);

  return (
    <View style={styles.headerBrandRow}>
      <AppLogo size={26} variant="gold" />
      <Text
        allowFontScaling={false}
        style={[
          styles.headerBrandText,
          {
            fontFamily: fontLoaded
              ? 'YesevaOne_400Regular'
              : (Platform.OS === 'ios' ? 'Georgia' : 'serif')
          }
        ]}
      >
        Arth
      </Text>
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
          headerTitleAlign: 'left',
          headerTitle: () => <HeaderBrandTitle />,
          headerRight: () => <HeaderRightActions navigation={navigation} />
        }}
      />
      <GoldStack.Screen name="CompareDates" component={CompareDatesScreen} options={{ title: 'Compare Dates' }} />
      <GoldStack.Screen
        name="DataSourceInfo"
        component={DataSourceInfoScreen}
        options={({ navigation: screenNav }) => ({
          title: 'Data Methodology',
          headerTitleStyle: styles.subHeaderTitle,
          headerRight: () => (
            <TouchableOpacity
              onPress={() => screenNav.navigate('Settings')}
              style={styles.headerSettingsBtn}
              accessibilityLabel="Settings"
              activeOpacity={0.7}
            >
              <Ionicons name="settings-outline" size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )
        })}
      />
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
          headerTitleAlign: 'left',
          headerTitle: () => <HeaderBrandTitle />,
          headerRight: () => <HeaderRightActions navigation={navigation} />
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
          headerTitleAlign: 'left',
          headerTitle: () => <HeaderBrandTitle />,
          headerRight: () => <HeaderRightActions navigation={navigation} />
        }}
      />
      <EMIStack.Screen name="SavedEMI" component={SavedEMIScreen} options={{ title: 'Saved EMI Calculations' }} />
    </EMIStack.Navigator>
  );
}

// Main Bottom Tab Navigator with Safe Area Padding
function MainTabs() {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 8);
  const tabBarHeight = 56 + bottomInset;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopWidth: 1,
          borderTopColor: COLORS.borderLight,
          height: tabBarHeight,
          paddingBottom: bottomInset,
          paddingTop: 6,
          elevation: 8,
          shadowColor: '#111111',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.04,
          shadowRadius: 6
        },
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
          tabBarIcon: ({ color }) => <MarketTrendIcon color={color} size={22} />
        }}
      />
      <Tab.Screen
        name="GoldLoanTab"
        component={GoldLoanNavigator}
        options={{
          tabBarLabel: 'Gold Loan',
          tabBarIcon: ({ color }) => <LoanPeakIcon color={color} size={22} />
        }}
      />
      <Tab.Screen
        name="EMITab"
        component={EMINavigator}
        options={{
          tabBarLabel: 'EMI Calc',
          tabBarIcon: ({ color }) => <EMIPieIcon color={color} size={22} />
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
            <Stack.Screen
              name="AppInfo"
              component={AppInfoScreen}
              options={({ route }) => ({
                headerShown: true,
                title: route.params?.title || 'Features & Clarity',
                headerStyle: { backgroundColor: COLORS.surface },
                headerTintColor: COLORS.textPrimary
              })}
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
    gap: 8,
    marginRight: Platform.OS === 'ios' ? 0 : 6
  },
  headerBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  headerBrandText: {
    fontSize: 21,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: 0.3
  },
  avatarButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarImage: {
    width: 28,
    height: 28
  },
  headerSettingsBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.35)',
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4
  },
  subHeaderTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textPrimary
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
