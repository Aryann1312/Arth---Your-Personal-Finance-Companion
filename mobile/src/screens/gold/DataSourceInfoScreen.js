/**
 * @file DataSourceInfoScreen.js
 * @description Redesigned Data Source & Methodology screen with modular cards,
 * clear visual hierarchy, scannable fact tiles, monospace formula block,
 * purity chips, statutory tariff tiles, staggered entrance animations, and full safe-area spacing.
 */

import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Linking,
  TouchableOpacity,
  Animated,
  Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { METHODOLOGY_DATA } from './methodologyData.js';
import { COLORS, RADII, SPACING } from '../../theme/index.js';

// Reusable Section Header with numbered gold badge
function SectionHeader({ step, title, subtitle }) {
  return (
    <View style={styles.sectionHeaderRow}>
      <View style={styles.stepBadge}>
        <Text style={styles.stepBadgeText}>{step}</Text>
      </View>
      <View style={styles.sectionHeaderTextWrap}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
      </View>
    </View>
  );
}

// Reusable Fact Tile with icon and scannable label/value
function FactTile({ icon, label, value }) {
  return (
    <View style={styles.factTile}>
      <View style={styles.factIconBox}>
        <Ionicons name={icon} size={18} color={COLORS.goldDeep} />
      </View>
      <View style={styles.factContent}>
        <Text style={styles.factLabel}>{label}</Text>
        <Text style={styles.factValue}>{value}</Text>
      </View>
    </View>
  );
}

// Reusable Outlined Luxury Link Button
function LinkButton({ title, url }) {
  const handlePress = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    if (url) {
      Linking.openURL(url);
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={handlePress}
      style={styles.linkButton}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <Text style={styles.linkButtonText}>{title}</Text>
      <Ionicons name="open-outline" size={16} color={COLORS.goldDeep} />
    </TouchableOpacity>
  );
}

// Reusable Tariff Tile for Duty & GST Breakdown
function TariffTile({ rate, title, tag, detail }) {
  return (
    <View style={styles.tariffTile}>
      <View style={styles.tariffTopRow}>
        <View style={styles.tariffRateBadge}>
          <Text style={styles.tariffRateText}>{rate}</Text>
        </View>
        <View style={styles.tariffTitleGroup}>
          <Text style={styles.tariffTitle}>{title}</Text>
          <Text style={styles.tariffTag}>{tag}</Text>
        </View>
      </View>
      <Text style={styles.tariffDetail}>{detail}</Text>
    </View>
  );
}

export function DataSourceInfoScreen() {
  const insets = useSafeAreaInsets();
  const { header, primaryProvider, formulaSection, retailDifferenceSection, footer } = METHODOLOGY_DATA;

  // Staggered entrance animations for each card
  const animHeader = useRef(new Animated.Value(0)).current;
  const animCard1 = useRef(new Animated.Value(0)).current;
  const animCard2 = useRef(new Animated.Value(0)).current;
  const animCard3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(80, [
      Animated.timing(animHeader, { toValue: 1, duration: 360, useNativeDriver: true }),
      Animated.timing(animCard1, { toValue: 1, duration: 360, useNativeDriver: true }),
      Animated.timing(animCard2, { toValue: 1, duration: 360, useNativeDriver: true }),
      Animated.timing(animCard3, { toValue: 1, duration: 360, useNativeDriver: true })
    ]).start();
  }, []);

  const getAnimatedStyle = (anim) => ({
    opacity: anim,
    transform: [
      {
        translateY: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [18, 0]
        })
      }
    ]
  });

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingBottom: insets.bottom + 95 }
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Top Intro Header Card with Audit Badge */}
      <Animated.View style={[styles.introCard, getAnimatedStyle(animHeader)]}>
        <View style={styles.verifiedBadgeRow}>
          <View style={styles.verifiedBadge}>
            <Ionicons name="shield-checkmark" size={13} color="#059669" />
            <Text style={styles.verifiedBadgeText}>{header.badge}</Text>
          </View>
        </View>
        <Text style={styles.mainTitle}>{header.title}</Text>
        <Text style={styles.mainSubtitle}>{header.subtitle}</Text>
      </Animated.View>

      {/* Card 1: Primary Provider (WGC & LBMA) */}
      <Animated.View style={[styles.sectionCard, getAnimatedStyle(animCard1)]}>
        <SectionHeader
          step={primaryProvider.step}
          title={primaryProvider.title}
          subtitle={primaryProvider.subtitle}
        />
        <Text style={styles.bodyParagraph}>{primaryProvider.description}</Text>

        {/* Key Fact Mini-Tiles */}
        <View style={styles.factsContainer}>
          {primaryProvider.facts.map((fact) => (
            <FactTile
              key={fact.id}
              icon={fact.icon}
              label={fact.label}
              value={fact.value}
            />
          ))}
        </View>

        {/* Outlined Luxury Link Button */}
        <LinkButton
          title={primaryProvider.linkText}
          url={primaryProvider.linkUrl}
        />
      </Animated.View>

      {/* Card 2: Derivation Formula (Spot to INR) */}
      <Animated.View style={[styles.sectionCard, getAnimatedStyle(animCard2)]}>
        <SectionHeader
          step={formulaSection.step}
          title={formulaSection.title}
          subtitle={formulaSection.subtitle}
        />

        {/* Clean Formula Card with Left Gold Accent */}
        <View style={styles.formulaCard}>
          <View style={styles.formulaHeaderRow}>
            <Ionicons name="calculator-outline" size={15} color={COLORS.goldDeep} />
            <Text style={styles.formulaHeaderLabel}>STANDARDIZED DERIVATION</Text>
          </View>
          {formulaSection.formulaLines.map((line, idx) => (
            <Text key={idx} style={styles.formulaLine}>
              {line}
            </Text>
          ))}
        </View>

        {/* Highlighted Weight Conversion Callout */}
        <View style={styles.highlightCallout}>
          <Ionicons name="scale-outline" size={16} color={COLORS.goldDeep} />
          <Text style={styles.highlightCalloutText}>
            {formulaSection.weightConversionNote}
          </Text>
        </View>

        {/* Purity Factors Table / Chips */}
        <Text style={styles.subHeading}>Hallmark Purity Multipliers</Text>
        <View style={styles.purityRow}>
          {formulaSection.purityFactors.map((item) => (
            <View key={item.carat} style={styles.purityChip}>
              <View style={styles.purityTop}>
                <Text style={styles.purityCarat}>{item.carat}</Text>
                <Text style={styles.purityFactor}>{item.factor}</Text>
              </View>
              <Text style={styles.purityLabel}>{item.label} ({item.percentage})</Text>
            </View>
          ))}
        </View>

        <Text style={styles.helperText}>{formulaSection.fxSourceNote}</Text>
      </Animated.View>

      {/* Card 3: Why International Spot Differs (Tariffs & GST) */}
      <Animated.View style={[styles.sectionCard, getAnimatedStyle(animCard3)]}>
        <SectionHeader
          step={retailDifferenceSection.step}
          title={retailDifferenceSection.title}
          subtitle={retailDifferenceSection.subtitle}
        />
        <Text style={styles.bodyParagraph}>{retailDifferenceSection.description}</Text>

        {/* Structured Tariff Tiles */}
        <View style={styles.tariffsContainer}>
          {retailDifferenceSection.tariffs.map((t) => (
            <TariffTile
              key={t.id}
              rate={t.rate}
              title={t.title}
              tag={t.tag}
              detail={t.detail}
            />
          ))}
        </View>

        {/* Full Transparency / Audit Honesty Box */}
        <View style={styles.auditDisclaimerBox}>
          <Ionicons name="information-circle-outline" size={18} color={COLORS.goldDeep} style={{ marginTop: 2 }} />
          <Text style={styles.auditDisclaimerText}>
            {retailDifferenceSection.disclaimer}
          </Text>
        </View>
      </Animated.View>

      {/* Bottom Metadata & Status */}
      <View style={styles.footerWrap}>
        <Text style={styles.footerTimestamp}>{footer.lastVerified}</Text>
        <Text style={styles.footerBadge}>{footer.auditBadge}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md
  },

  // Top Intro Banner
  introCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADII.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.22)',
    shadowColor: '#111',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2
  },
  verifiedBadgeRow: {
    flexDirection: 'row',
    marginBottom: SPACING.sm
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: RADII.sm,
    borderWidth: 1,
    borderColor: '#A7F3D0'
  },
  verifiedBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#059669',
    letterSpacing: 0.2
  },
  mainTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.3
  },
  mainSubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 4,
    lineHeight: 18.5
  },

  // Main Section Cards
  sectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADII.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.25)',
    borderTopWidth: 2,
    borderTopColor: 'rgba(212, 175, 55, 0.55)',
    shadowColor: '#111',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: SPACING.md
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.35)',
    marginTop: 1
  },
  stepBadgeText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.goldDeep
  },
  sectionHeaderTextWrap: {
    flex: 1
  },
  sectionTitle: {
    fontSize: 16.5,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.2
  },
  sectionSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2
  },
  bodyParagraph: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 22,
    marginBottom: SPACING.md
  },

  // Fact Mini-Tiles
  factsContainer: {
    gap: 8,
    marginBottom: SPACING.md
  },
  factTile: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.sm + 2,
    backgroundColor: '#FAF8F5',
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    gap: 10
  },
  factIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.2)'
  },
  factContent: {
    flex: 1
  },
  factLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4
  },
  factValue: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 1
  },

  // Outlined Link Button
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    paddingHorizontal: SPACING.md,
    backgroundColor: '#FFFDF7',
    borderRadius: RADII.md,
    borderWidth: 1.5,
    borderColor: COLORS.goldDeep
  },
  linkButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.goldDeep
  },

  // Formula Card
  formulaCard: {
    backgroundColor: '#FAF5EE',
    borderRadius: RADII.md,
    padding: SPACING.md,
    borderLeftWidth: 3.5,
    borderLeftColor: COLORS.goldDeep,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.22)',
    marginBottom: SPACING.sm
  },
  formulaHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6
  },
  formulaHeaderLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: COLORS.goldDeep,
    letterSpacing: 0.5
  },
  formulaLine: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    lineHeight: 20
  },

  // Highlight Callout
  highlightCallout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FAF8F5',
    paddingHorizontal: SPACING.md,
    paddingVertical: 9,
    borderRadius: RADII.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md
  },
  highlightCalloutText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: COLORS.textPrimary
  },

  // Purity Multiplier Chips
  subHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8
  },
  purityRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: SPACING.sm
  },
  purityChip: {
    flex: 1,
    backgroundColor: '#FAF8F5',
    padding: 8,
    borderRadius: RADII.sm,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.25)'
  },
  purityTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  purityCarat: {
    fontSize: 12.5,
    fontWeight: '800',
    color: COLORS.goldDeep
  },
  purityFactor: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary
  },
  purityLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 2
  },
  helperText: {
    fontSize: 11.5,
    color: COLORS.textMuted,
    lineHeight: 16,
    marginTop: 4
  },

  // Tariff Tiles
  tariffsContainer: {
    gap: 8,
    marginBottom: SPACING.md
  },
  tariffTile: {
    backgroundColor: '#FAF8F5',
    borderRadius: RADII.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.2)'
  },
  tariffTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4
  },
  tariffRateBadge: {
    backgroundColor: 'rgba(212, 175, 55, 0.18)',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: RADII.sm,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.35)'
  },
  tariffRateText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.goldDeep
  },
  tariffTitleGroup: {
    flex: 1
  },
  tariffTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: COLORS.textPrimary
  },
  tariffTag: {
    fontSize: 10.5,
    color: COLORS.textMuted
  },
  tariffDetail: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 17,
    marginTop: 2
  },

  // Audit Disclaimer Box
  auditDisclaimerBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FFFDF7',
    padding: SPACING.md,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: COLORS.borderGold
  },
  auditDisclaimerText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.goldDeep,
    fontWeight: '600',
    lineHeight: 18
  },

  // Footer Metadata
  footerWrap: {
    alignItems: 'center',
    paddingVertical: SPACING.md
  },
  footerTimestamp: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 2
  },
  footerBadge: {
    fontSize: 10.5,
    color: COLORS.textMuted,
    textAlign: 'center'
  }
});
