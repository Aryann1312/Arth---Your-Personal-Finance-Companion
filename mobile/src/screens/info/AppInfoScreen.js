/**
 * @file AppInfoScreen.js
 * @description Dedicated screen presenting the preserved codebase modules:
 * - Features ("Engineered for Financial Accuracy")
 * - How It Works (4 transparent steps)
 * - FAQ Accordion (Regulatory & calculation clarity)
 * Supports initialSection navigation parameter from the side drawer.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  FeaturesSection,
  HowItWorksSection,
  FaqAccordionSection
} from '../landing/LandingScreen.js';
import { TeamCard } from '../../components/drawer/TeamCard.js';
import { COLORS, RADII, SPACING, useResponsiveLayout } from '../../theme/index.js';

const TABS = [
  { id: 'features', label: 'Features' },
  { id: 'howItWorks', label: 'How It Works' },
  { id: 'faq', label: 'FAQ' },
  { id: 'team', label: 'Team' }
];

export function AppInfoScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { isTablet } = useResponsiveLayout();
  const initialSection = route?.params?.initialSection || 'features';
  const [activeTab, setActiveTab] = useState(initialSection);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (route?.params?.initialSection) {
      setActiveTab(route.params.initialSection);
    }
  }, [route?.params?.initialSection]);

  const handleTabPress = (tabId) => {
    try {
      Haptics.selectionAsync();
    } catch {
      // Haptics fallback
    }
    setActiveTab(tabId);
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ y: 0, animated: true });
    }
  };

  return (
    <View style={styles.screen}>
      {/* Top Segment Tab Bar */}
      <View style={styles.tabBarContainer}>
        <View style={styles.tabPillRow}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => handleTabPress(tab.id)}
                activeOpacity={0.75}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}
                accessibilityLabel={`${tab.label} section`}
                style={[styles.tabButton, isActive && styles.tabButtonActive]}
              >
                <Text style={[styles.tabButtonText, isActive && styles.tabButtonTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Main Content Area */}
      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={[
          styles.contentContainer,
          {
            paddingBottom: insets.bottom + SPACING.xxl,
            maxWidth: isTablet ? 840 : '100%',
            alignSelf: 'center'
          }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'features' && (
          <View style={styles.sectionWrap}>
            <FeaturesSection isTablet={isTablet} />
          </View>
        )}

        {activeTab === 'howItWorks' && (
          <View style={styles.sectionWrap}>
            <HowItWorksSection />
          </View>
        )}

        {activeTab === 'faq' && (
          <View style={styles.sectionWrap}>
            <FaqAccordionSection />
          </View>
        )}

        {activeTab === 'team' && (
          <View style={styles.sectionWrap}>
            <TeamCard />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  tabBarContainer: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    alignItems: 'center'
  },
  tabPillRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: RADII.full,
    padding: 3,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.25)',
    maxWidth: 420,
    width: '100%'
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: RADII.full,
    alignItems: 'center',
    justifyContent: 'center'
  },
  tabButtonActive: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.4)',
    shadowColor: COLORS.goldDeep,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary
  },
  tabButtonTextActive: {
    color: COLORS.goldDeep,
    fontWeight: '700'
  },
  scrollView: {
    flex: 1
  },
  contentContainer: {
    width: '100%',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg
  },
  sectionWrap: {
    width: '100%'
  }
});
