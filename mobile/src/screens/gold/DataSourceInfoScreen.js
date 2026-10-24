/**
 * @file DataSourceInfoScreen.js
 * @description Data transparency and methodology screen detailing providers,
 * pricing basis, historical coverage, tariffs, and licensing terms.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Linking, TouchableOpacity } from 'react-native';
import { PearlCard } from '../../components/PearlCard.js';
import { apiRequest } from '../../services/api.js';
import { COLORS, RADII, SPACING } from '../../theme/index.js';

export function DataSourceInfoScreen() {
  const [sourceData, setSourceData] = useState(null);

  useEffect(() => {
    async function loadInfo() {
      try {
        const res = await apiRequest('/gold/source-info');
        if (res && res.sources) {
          setSourceData(res);
        }
      } catch {
        // Fallback
      }
    }
    loadInfo();
  }, []);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent}>
      <PearlCard goldTrim={true}>
        <Text style={styles.title}>Data Source & Pricing Methodology</Text>
        <Text style={styles.subtitle}>Commitment to genuine, traceable market data with full audit honesty.</Text>

        <View style={styles.section}>
          <Text style={styles.sectionHeader}>1. Primary Provider: World Gold Council (Goldhub) & LBMA</Text>
          <Text style={styles.bodyText}>
            Historical gold prices are ingested from the London Bullion Market Association (LBMA) official fixing series published via the World Gold Council.
          </Text>
          <Text style={styles.bodyText}>
            • <Text style={styles.bold}>Coverage:</Text> 5+ Years of continuous daily trading settlement records (2019 to 2026).
          </Text>
          <Text style={styles.bodyText}>
            • <Text style={styles.bold}>Frequency:</Text> Daily PM Fixings (excluding London & Mumbai trading holidays).
          </Text>
          <Text style={styles.bodyText}>
            • <Text style={styles.bold}>Licensing:</Text> Public reference dataset under World Gold Council Terms of Use with explicit source attribution.
          </Text>

          <TouchableOpacity onPress={() => Linking.openURL('https://www.gold.org/goldhub/data/gold-prices')}>
            <Text style={styles.linkText}>Visit World Gold Council Goldhub ↗</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.sectionHeader}>2. Derivation Formula: Spot to INR</Text>
          <View style={styles.formulaBox}>
            <Text style={styles.formulaText}>
              INR / gram = (XAU_USD / 31.1034768) × USD_INR × PurityFactor
            </Text>
          </View>
          <Text style={styles.bodyText}>
            Where 1 troy ounce = 31.1034768 grams. Purity factors applied: 24K (0.999), 22K (0.916), 18K (0.750). USD/INR conversions use RBI / FBIL daily official reference rates.
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.sectionHeader}>3. Why International Spot Differs from Local Jewellers</Text>
          <Text style={styles.bodyText}>
            International spot converted directly to INR represents the un-tariffed bullion commodity value. Jewellers in India price retail jewellery based on:
          </Text>
          <Text style={styles.bodyText}>
            1. <Text style={styles.bold}>Basic Customs Duty (BCD):</Text> Slashing to ~6% in the Union Budget (July 2024).
          </Text>
          <Text style={styles.bodyText}>
            2. <Text style={styles.bold}>Goods and Services Tax (GST):</Text> Mandatory 3% GST levied on domestic retail gold.
          </Text>
          <Text style={styles.bodyText}>
            3. <Text style={styles.bold}>Local Premiums & Making Charges:</Text> Domestic vaulting, insurance, melting loss, and jeweller craftsmanship margins.
          </Text>
          <Text style={styles.disclaimerBox}>
            All derived prices in this application are clearly designated "Indicative, derived spot price (ex-customs & GST)" to guarantee complete data honesty.
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
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 4,
    marginBottom: SPACING.lg,
    lineHeight: 18
  },
  section: {
    marginVertical: SPACING.sm
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.goldDeep,
    marginBottom: SPACING.xs
  },
  bodyText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 4
  },
  bold: {
    fontWeight: '700',
    color: COLORS.textPrimary
  },
  linkText: {
    color: COLORS.goldDeep,
    fontWeight: '700',
    fontSize: 13,
    marginTop: SPACING.xs
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
    marginVertical: SPACING.md
  },
  formulaBox: {
    backgroundColor: COLORS.surfaceMuted,
    padding: SPACING.md,
    borderRadius: RADII.md,
    marginVertical: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  formulaText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
    fontFamily: 'monospace'
  },
  disclaimerBox: {
    backgroundColor: COLORS.goldLightBg,
    padding: SPACING.md,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: COLORS.borderGold,
    fontSize: 12,
    color: COLORS.goldDeep,
    lineHeight: 18,
    fontWeight: '600',
    marginTop: SPACING.sm
  }
});
