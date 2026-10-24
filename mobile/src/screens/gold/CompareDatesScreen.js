/**
 * @file CompareDatesScreen.js
 * @description Date comparison screen computing absolute and percentage change,
 * range high/low, and honest non-trading day settlement disclosures.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { PearlCard } from '../../components/PearlCard.js';
import { Input } from '../../components/Input.js';
import { GoldButton } from '../../components/GoldButton.js';
import { Toast } from '../../components/Toast.js';
import { COLORS, RADII, SPACING, formatINR } from '../../theme/index.js';

import { apiRequest } from '../../services/api.js';
import { logger } from '../../services/eventLogger.js';

export function CompareDatesScreen({ navigation }) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const oneYearAgoStr = new Date(Date.now() - (365 * 24 * 60 * 60 * 1000)).toISOString().slice(0, 10);

  const [date1, setDate1] = useState(oneYearAgoStr);
  const [date2, setDate2] = useState(todayStr);
  const [purity, setPurity] = useState('24K');
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const executeCompare = async () => {
    if (!date1 || !date2) {
      setError('Please provide both dates in YYYY-MM-DD format.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await apiRequest(`/gold/compare?date1=${date1}&date2=${date2}&purity=${purity}`);
      if (res && res.comparison) {
        setComparison(res.comparison);
        logger.logAction({
          module: 'gold_prices',
          action: 'compare_dates',
          screen: 'CompareDatesScreen',
          inputs: { date1, date2, purity },
          resultSummary: {
            change: res.comparison.comparison?.absoluteChange,
            pct: res.comparison.comparison?.percentageChange
          }
        });
      }
    } catch (err) {
      setError(err.message || 'Comparison failed. Please verify dates.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    executeCompare();
  }, [purity]);

  const handleQuickPreset = (days) => {
    const d1 = new Date(Date.now() - (days * 24 * 60 * 60 * 1000)).toISOString().slice(0, 10);
    setDate1(d1);
    setDate2(todayStr);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent}>
      <Toast message={error} type="error" visible={Boolean(error)} />

      <PearlCard goldTrim={true}>
        <Text style={styles.cardTitle}>Compare Gold Prices Across Dates</Text>
        <Text style={styles.cardSubtitle}>Evaluate price appreciation over historical settlement dates</Text>

        {/* Purity Selector */}
        <View style={styles.purityRow}>
          {['24K', '22K'].map(p => (
            <TouchableOpacity
              key={p}
              onPress={() => setPurity(p)}
              style={[styles.purityBtn, purity === p && styles.purityBtnActive]}
            >
              <Text style={[styles.purityText, purity === p && styles.purityTextActive]}>{p} Gold</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.inputsRow}>
          <View style={{ flex: 1 }}>
            <Input
              label="Starting Date (YYYY-MM-DD)"
              value={date1}
              onChangeText={setDate1}
              placeholder="YYYY-MM-DD"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Input
              label="Comparison Date (YYYY-MM-DD)"
              value={date2}
              onChangeText={setDate2}
              placeholder="YYYY-MM-DD"
            />
          </View>
        </View>

        {/* Quick Range Presets */}
        <Text style={styles.quickPresetTitle}>Quick Presets:</Text>
        <View style={styles.presetsRow}>
          {[
            { label: '1 Month', days: 30 },
            { label: '6 Months', days: 180 },
            { label: '1 Year', days: 365 },
            { label: '3 Years', days: 1095 },
            { label: '5 Years', days: 1825 }
          ].map(p => (
            <TouchableOpacity
              key={p.label}
              onPress={() => handleQuickPreset(p.days)}
              style={styles.presetPill}
            >
              <Text style={styles.presetPillText}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <GoldButton
          title="Compare Dates"
          variant="primary"
          onPress={executeCompare}
          loading={loading}
          style={{ marginTop: SPACING.md }}
        />
      </PearlCard>

      {/* Comparison Results Card */}
      {comparison && comparison.success && (
        <PearlCard goldTrim={true} style={styles.resultsCard}>
          <Text style={styles.resultsHeaderTitle}>Comparison Results ({purity})</Text>

          {/* Change Summary Banner */}
          <View style={[
            styles.changeBanner,
            { backgroundColor: comparison.comparison.isIncrease ? '#ECFDF5' : '#FEF2F2' }
          ]}>
            <Text style={styles.changeBannerTitle}>
              {comparison.comparison.isIncrease ? '📈 Net Appreciation' : '📉 Net Depreciation'}
            </Text>
            <Text style={[
              styles.changeBannerNumber,
              { color: comparison.comparison.isIncrease ? COLORS.success : COLORS.error }
            ]}>
              {comparison.comparison.isIncrease ? '+' : ''}{comparison.comparison.percentageChange}%
            </Text>
            <Text style={styles.changeBannerSub}>
              Absolute difference: {formatINR(comparison.comparison.absoluteChange)} / gram
            </Text>
          </View>

          {/* Date 1 Inspection Box */}
          <View style={styles.dateInspectionBox}>
            <View style={styles.dateInspectionRow}>
              <Text style={styles.dateLabel}>Date 1: {comparison.date1.requestedDate}</Text>
              <Text style={styles.datePrice}>{formatINR(comparison.date1.price)} / g</Text>
            </View>
            {!comparison.date1.isExactTradingDay && (
              <Text style={styles.weekendDisclosure}>
                ℹ️ Non-trading day. Price reflects latest prior trading settlement ({comparison.date1.settledDate}).
              </Text>
            )}
          </View>

          {/* Date 2 Inspection Box */}
          <View style={styles.dateInspectionBox}>
            <View style={styles.dateInspectionRow}>
              <Text style={styles.dateLabel}>Date 2: {comparison.date2.requestedDate}</Text>
              <Text style={styles.datePrice}>{formatINR(comparison.date2.price)} / g</Text>
            </View>
            {!comparison.date2.isExactTradingDay && (
              <Text style={styles.weekendDisclosure}>
                ℹ️ Non-trading day. Price reflects latest prior trading settlement ({comparison.date2.settledDate}).
              </Text>
            )}
          </View>

          {/* Interval Extremes */}
          <View style={styles.extremesRow}>
            <View style={styles.extremeCell}>
              <Text style={styles.extremeLabel}>Interval High</Text>
              <Text style={[styles.extremeValue, { color: COLORS.goldDeep }]}>
                {formatINR(comparison.comparison.rangeHighest)}
              </Text>
              <Text style={styles.extremeSub}>on {comparison.comparison.rangeHighestDate}</Text>
            </View>

            <View style={styles.extremeCell}>
              <Text style={styles.extremeLabel}>Interval Low</Text>
              <Text style={styles.extremeValue}>
                {formatINR(comparison.comparison.rangeLowest)}
              </Text>
              <Text style={styles.extremeSub}>on {comparison.comparison.rangeLowestDate}</Text>
            </View>
          </View>
        </PearlCard>
      )}
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
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary
  },
  cardSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
    marginBottom: SPACING.md
  },
  purityRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: SPACING.md
  },
  purityBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: RADII.sm,
    backgroundColor: COLORS.surfaceMuted,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  purityBtnActive: {
    backgroundColor: COLORS.goldLightBg,
    borderColor: COLORS.goldMain
  },
  purityText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary
  },
  purityTextActive: {
    color: COLORS.goldDeep,
    fontWeight: '800'
  },
  inputsRow: {
    flexDirection: 'row',
    gap: 12
  },
  quickPresetTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    marginTop: SPACING.xs,
    marginBottom: 6
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: SPACING.sm
  },
  presetPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADII.full,
    backgroundColor: COLORS.surfaceMuted,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  presetPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary
  },
  resultsCard: {
    marginTop: SPACING.md
  },
  resultsHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm
  },
  changeBanner: {
    padding: SPACING.md,
    borderRadius: RADII.lg,
    alignItems: 'center',
    marginBottom: SPACING.md
  },
  changeBannerTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary
  },
  changeBannerNumber: {
    fontSize: 32,
    fontWeight: '900',
    marginVertical: 4
  },
  changeBannerSub: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary
  },
  dateInspectionBox: {
    padding: SPACING.md,
    borderRadius: RADII.md,
    backgroundColor: COLORS.surfaceMuted,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    marginBottom: SPACING.sm
  },
  dateInspectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  dateLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary
  },
  datePrice: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.goldDeep
  },
  weekendDisclosure: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 4,
    lineHeight: 15
  },
  extremesRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    paddingTop: SPACING.md,
    marginTop: SPACING.xs
  },
  extremeCell: {
    flex: 1,
    alignItems: 'center'
  },
  extremeLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase'
  },
  extremeValue: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 2
  },
  extremeSub: {
    fontSize: 10,
    color: COLORS.textMuted
  }
});
