/**
 * @file PrivacyNoticeScreen.js
 * @description Privacy Notice explicitly disclosing analytics collection,
 * administrator visibility, data retention policies, and user erasure rights.
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { PearlCard } from '../../components/PearlCard.js';
import { COLORS, RADII, SPACING } from '../../theme/index.js';

export function PrivacyNoticeScreen() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent}>
      <PearlCard goldTrim={true}>
        <Text style={styles.title}>Privacy Notice & Data Transparency</Text>
        <Text style={styles.subtitle}>Last updated: October 2026 • Effective Baseline</Text>

        <View style={styles.section}>
          <Text style={styles.sectionHeading}>1. Purpose of Data Collection</Text>
          <Text style={styles.bodyText}>
            This application is built for a rigorous technical evaluation. To satisfy stakeholder audit requirements, interactions and settled calculation parameters are logged to evaluate model accuracy, user navigation, and feature adoption.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeading}>2. What Data Is Collected</Text>
          <Text style={styles.bodyText}>
            • <Text style={styles.bold}>Account Profile:</Text> Full name, email address, role, and registration date.
          </Text>
          <Text style={styles.bodyText}>
            • <Text style={styles.bold}>Interaction History:</Text> Screen views, date comparisons, gold loan valuations, and EMI amortization parameters (debounced to log settled inputs only).
          </Text>
          <Text style={styles.bodyText}>
            • <Text style={styles.bold}>Device Telemetry:</Text> Device classification (phone vs tablet), operating platform (iOS/Android), and screen orientation.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeading}>3. What Is NEVER Collected or Stored</Text>
          <View style={styles.alertBox}>
            <Text style={styles.alertText}>
              We NEVER log passwords, session tokens, government identity numbers (PAN/Aadhaar), or banking credentials in activity feeds. All incoming client events are stripped of sensitive fields on the backend.
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeading}>4. Administrator Visibility</Text>
          <Text style={styles.bodyText}>
            System administrators have access to an internal Admin Portal to inspect registered users, chronological activity feeds, and summary analytics. Input parameters are visible to administrators for technical verification unless masked by system policy.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeading}>5. Retention Period (12 Months)</Text>
          <Text style={styles.bodyText}>
            All activity events are governed by an automated MongoDB TTL (Time-To-Live) index that automatically purges records older than 12 months (365 days).
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeading}>6. Your Rights: Export & Cascade Deletion</Text>
          <Text style={styles.bodyText}>
            Under our data dignity commitment, you have the right to:
          </Text>
          <Text style={styles.bodyText}>
            • <Text style={styles.bold}>Export My Data:</Text> Download a machine-readable JSON archive of your entire profile, saved calculations, and history at any time.
          </Text>
          <Text style={styles.bodyText}>
            • <Text style={styles.bold}>Delete My Account:</Text> Permanently remove your account, which automatically cascades to erase all your saved calculations and logged activity records from MongoDB.
          </Text>
        </View>
      </PearlCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  scrollContent: {
    padding: SPACING.lg
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
    marginBottom: SPACING.lg
  },
  section: {
    marginBottom: SPACING.md
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.goldDeep,
    marginBottom: SPACING.xs
  },
  bodyText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 19,
    marginBottom: 4
  },
  bold: {
    fontWeight: '700',
    color: COLORS.textPrimary
  },
  alertBox: {
    backgroundColor: COLORS.goldLightBg,
    padding: SPACING.md,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: COLORS.borderGold,
    marginVertical: SPACING.xs
  },
  alertText: {
    fontSize: 12,
    color: COLORS.goldDeep,
    fontWeight: '600',
    lineHeight: 17
  }
});
