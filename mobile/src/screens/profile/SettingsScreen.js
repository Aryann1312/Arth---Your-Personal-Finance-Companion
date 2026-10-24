/**
 * @file SettingsScreen.js
 * @description Settings and accessibility screen allowing users to toggle motion reduction,
 * configure default calculation purity, and select preferred lender presets.
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity } from 'react-native';
import { useSettings } from '../../context/SettingsContext.js';
import { PearlCard } from '../../components/PearlCard.js';
import { COLORS, RADII, SPACING } from '../../theme/index.js';
import { ILLUSTRATIVE_LENDER_PRESETS } from '../../lib/calc/config.js';

export function SettingsScreen() {
  const {
    reduceMotion,
    toggleReduceMotion,
    defaultPurity,
    setDefaultPurity,
    defaultLenderId,
    setDefaultLenderId
  } = useSettings();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent}>
      <PearlCard goldTrim={true}>
        <Text style={styles.sectionTitle}>Accessibility & Performance</Text>

        <View style={styles.settingRow}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={styles.settingLabel}>Reduce Motion</Text>
            <Text style={styles.settingSub}>
              Disables count-up number animations and transitions to preserve system battery and minimize visual motion.
            </Text>
          </View>
          <Switch
            value={reduceMotion}
            onValueChange={toggleReduceMotion}
            trackColor={{ false: COLORS.border, true: COLORS.goldMain }}
            thumbColor={reduceMotion ? COLORS.goldDeep : '#F4F3F4'}
          />
        </View>
      </PearlCard>

      <PearlCard style={{ marginTop: SPACING.md }}>
        <Text style={styles.sectionTitle}>Calculation Defaults</Text>

        <Text style={styles.subHeading}>Default Gold Purity</Text>
        <View style={styles.pillRow}>
          {['24K', '22K', '18K'].map(p => (
            <TouchableOpacity
              key={p}
              onPress={() => setDefaultPurity(p)}
              style={[styles.pill, defaultPurity === p && styles.pillActive]}
            >
              <Text style={[styles.pillText, defaultPurity === p && styles.pillTextActive]}>{p}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.subHeading, { marginTop: SPACING.lg }]}>Default Lender Preset</Text>
        <View style={styles.lenderList}>
          {ILLUSTRATIVE_LENDER_PRESETS.map(preset => {
            const isSelected = defaultLenderId === preset.id;
            return (
              <TouchableOpacity
                key={preset.id}
                onPress={() => setDefaultLenderId(preset.id)}
                style={[styles.lenderOption, isSelected && styles.lenderOptionActive]}
              >
                <View>
                  <Text style={[styles.lenderOptionName, isSelected && styles.lenderOptionNameActive]}>
                    {preset.name}
                  </Text>
                  <Text style={styles.lenderOptionSub}>{preset.defaultAnnualRate}% p.a. • {preset.category}</Text>
                </View>
                {isSelected && <Text style={styles.checkIcon}>✓</Text>}
              </TouchableOpacity>
            );
          })}
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary
  },
  settingSub: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
    lineHeight: 16
  },
  subHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs
  },
  pillRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: SPACING.sm
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: RADII.sm,
    backgroundColor: COLORS.surfaceMuted,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  pillActive: {
    backgroundColor: COLORS.goldLightBg,
    borderColor: COLORS.goldMain
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary
  },
  pillTextActive: {
    color: COLORS.goldDeep,
    fontWeight: '800'
  },
  lenderList: {
    gap: 8
  },
  lenderOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: RADII.md,
    backgroundColor: COLORS.surfaceMuted,
    borderWidth: 1,
    borderColor: COLORS.borderLight
  },
  lenderOptionActive: {
    backgroundColor: COLORS.goldLightBg,
    borderColor: COLORS.goldMain
  },
  lenderOptionName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary
  },
  lenderOptionNameActive: {
    color: COLORS.goldDeep
  },
  lenderOptionSub: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2
  },
  checkIcon: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.goldDeep
  }
});
