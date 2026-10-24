/**
 * @file GoldOverviewScreen.js
 * @description Gold Price Tracker Screen displaying live 24K and 22K prices,
 * 5-year interactive historical chart, touch tooltips, and stale-data indicators.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity
} from 'react-native';
import { PearlCard } from '../../components/PearlCard.js';
import { MiniGoldChart } from '../../components/MiniGoldChart.js';
import { GoldButton } from '../../components/GoldButton.js';
import { Skeleton } from '../../components/Skeleton.js';
import { Toast } from '../../components/Toast.js';
import { ResponsiveContainer } from '../../components/ResponsiveContainer.js';
import { COLORS, RADII, SPACING, formatINR } from '../../theme/index.js';

import { apiRequest } from '../../services/api.js';
import { logger } from '../../services/eventLogger.js';

export function GoldOverviewScreen({ navigation }) {
  const [liveData, setLiveData] = useState(null);
  const [historyRecords, setHistoryRecords] = useState([]);
  const [historyStats, setHistoryStats] = useState(null);
  const [selectedRange, setSelectedRange] = useState('1Y');
  const [selectedPurity, setSelectedPurity] = useState('24K');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Fetch Live Rates
  const loadLiveData = async () => {
    try {
      const res = await apiRequest('/gold/live');
      if (res && res.data) {
        setLiveData(res.data);
      }
    } catch (err) {
      setError(err.message || 'Could not refresh live rate.');
    }
  };

  // Fetch Historical Series
  const loadHistory = async (range = selectedRange, purity = selectedPurity) => {
    try {
      const res = await apiRequest(`/gold/history?range=${range}&purity=${purity}`);
      if (res && res.records) {
        setHistoryRecords(res.records);
        setHistoryStats(res.stats);
      }
    } catch (err) {
      console.warn('[GoldOverview] History fetch failed:', err.message);
    }
  };

  const loadAll = async () => {
    setError('');
    await Promise.all([loadLiveData(), loadHistory()]);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    loadAll();
    logger.logAction({
      module: 'gold_prices',
      action: 'view_overview',
      screen: 'GoldOverviewScreen'
    });
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadAll();
  }, [selectedRange, selectedPurity]);

  const handleRangeChange = (r) => {
    setSelectedRange(r);
    loadHistory(r, selectedPurity);
    logger.logAction({
      module: 'gold_prices',
      action: 'change_range',
      screen: 'GoldOverviewScreen',
      inputs: { range: r, purity: selectedPurity }
    });
  };

  const handlePurityChange = (p) => {
    setSelectedPurity(p);
    loadHistory(selectedRange, p);
  };

  // Left Column: Live Spot Tickers & Purity Switcher
  const renderLeftColumn = (
    <View>
      {/* Live Market Price Card */}
      <PearlCard goldTrim={true} style={styles.liveCard}>
        <View style={styles.liveHeaderRow}>
          <View style={styles.liveStatusRow}>
            <View style={[styles.liveIndicatorDot, liveData?.isStale && styles.staleIndicatorDot]} />
            <Text style={[styles.liveStatusText, liveData?.isStale && styles.staleStatusText]}>
              {liveData?.statusLabel || 'Live Market Rate'}
            </Text>
          </View>
          <Text style={styles.currencyBadge}>INR (₹)</Text>
        </View>

        {loading ? (
          <View style={{ marginVertical: SPACING.md }}>
            <Skeleton height={38} width="60%" />
            <Skeleton height={18} width="40%" style={{ marginTop: 8 }} />
          </View>
        ) : (
          <View style={styles.priceHeroRow}>
            <View style={styles.priceBox}>
              <Text style={styles.pricePurityTitle}>24K Fine Gold (99.9%)</Text>
              <Text style={styles.priceBig}>{formatINR(liveData?.price24kPerGram || 7850)}</Text>
              <Text style={styles.priceUnitLabel}>per gram (₹ {formatINR(liveData?.price24kPer10g || 78500, false)} / 10g)</Text>
            </View>

            <View style={styles.priceDivider} />

            <View style={styles.priceBox}>
              <Text style={styles.pricePurityTitle}>22K Standard Hallmark (91.6%)</Text>
              <Text style={styles.priceBig}>{formatINR(liveData?.price22kPerGram || 7190)}</Text>
              <Text style={styles.priceUnitLabel}>per gram (₹ {formatINR(liveData?.price22kPer10g || 71900, false)} / 10g)</Text>
            </View>
          </View>
        )}

        <View style={styles.metaRow}>
          <Text style={styles.metaText}>
            Updated: {liveData?.updatedAt ? new Date(liveData.updatedAt).toLocaleTimeString('en-IN') : 'Just now'}
          </Text>
          <Text style={styles.metaText}>Source: {liveData?.sourceName || 'LBMA / WGC'}</Text>
        </View>

        {liveData?.isStale && (
          <View style={styles.staleAlertBox}>
            <Text style={styles.staleAlertText}>
              ⚠️ {liveData.staleWarning || 'Displaying last verified settlement price. Live feed reconnecting.'}
            </Text>
          </View>
        )}
      </PearlCard>

      {/* Purity Hallmark Selector */}
      <View style={styles.purityToggleRow}>
        <TouchableOpacity
          onPress={() => handlePurityChange('24K')}
          style={[styles.purityToggleBtn, selectedPurity === '24K' && styles.purityToggleBtnActive]}
        >
          <Text style={[styles.purityToggleText, selectedPurity === '24K' && styles.purityToggleTextActive]}>
            24K (99.9% Pure)
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handlePurityChange('22K')}
          style={[styles.purityToggleBtn, selectedPurity === '22K' && styles.purityToggleBtnActive]}
        >
          <Text style={[styles.purityToggleText, selectedPurity === '22K' && styles.purityToggleTextActive]}>
            22K (91.6% Hallmark)
          </Text>
        </TouchableOpacity>
      </View>

      {/* Navigation Quick Actions */}
      <View style={styles.quickNavRow}>
        <GoldButton
          title="Compare Dates"
          variant="secondary"
          onPress={() => navigation.navigate('CompareDates')}
          style={{ flex: 1 }}
        />
        <GoldButton
          title="Data Methodology"
          variant="secondary"
          onPress={() => navigation.navigate('DataSourceInfo')}
          style={{ flex: 1 }}
        />
      </View>
    </View>
  );

  // Right Column: Interactive 5-Year Chart & Statistics
  const renderRightColumn = (
    <View>
      <PearlCard goldTrim={true} style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>Historical Performance ({selectedPurity})</Text>
          {historyStats && (
            <Text style={[styles.changeText, { color: historyStats.isPositive ? COLORS.success : COLORS.error }]}>
              {historyStats.isPositive ? '+' : ''}{historyStats.percentageChange}% ({formatINR(historyStats.absoluteChange)})
            </Text>
          )}
        </View>

        {loading ? (
          <Skeleton height={200} borderRadius={RADII.lg} />
        ) : (
          <MiniGoldChart
            records={historyRecords}
            purity={selectedPurity}
            selectedRange={selectedRange}
            onRangeChange={handleRangeChange}
            height={200}
          />
        )}

        {/* Statistical Summary Grid */}
        {historyStats && (
          <View style={styles.statsGrid}>
            <View style={styles.statCell}>
              <Text style={styles.statCellLabel}>Range Low</Text>
              <Text style={styles.statCellValue}>{formatINR(historyStats.lowestPrice)}</Text>
              <Text style={styles.statCellSub}>{historyStats.lowestDate}</Text>
            </View>

            <View style={styles.statCell}>
              <Text style={styles.statCellLabel}>Range High</Text>
              <Text style={[styles.statCellValue, { color: COLORS.goldDeep }]}>{formatINR(historyStats.highestPrice)}</Text>
              <Text style={styles.statCellSub}>{historyStats.highestDate}</Text>
            </View>

            <View style={styles.statCell}>
              <Text style={styles.statCellLabel}>Period Average</Text>
              <Text style={styles.statCellValue}>{formatINR(historyStats.averagePrice)}</Text>
              <Text style={styles.statCellSub}>{historyStats.count} Trading Days</Text>
            </View>
          </View>
        )}

        <Text style={styles.tariffDisclosure}>
          * Indicative international spot converted to INR. Excludes Indian Customs Duty (~6%) and 3% domestic GST.
        </Text>
      </PearlCard>
    </View>
  );

  return (
    <ScrollView
      style={styles.screen}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.goldDeep} />}
    >
      <Toast message={error} type="error" visible={Boolean(error)} />
      <ResponsiveContainer
        leftContent={renderLeftColumn}
        rightContent={renderRightColumn}
        scrollable={false}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  liveCard: {
    padding: SPACING.lg
  },
  liveHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md
  },
  liveStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  liveIndicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.success
  },
  staleIndicatorDot: {
    backgroundColor: COLORS.warning
  },
  liveStatusText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.success,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  staleStatusText: {
    color: COLORS.warning
  },
  currencyBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.goldDeep,
    backgroundColor: COLORS.goldLightBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADII.sm,
    borderWidth: 1,
    borderColor: COLORS.borderGold
  },
  priceHeroRow: {
    paddingVertical: SPACING.xs
  },
  priceBox: {
    paddingVertical: SPACING.xs
  },
  priceDivider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
    marginVertical: SPACING.sm
  },
  pricePurityTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary
  },
  priceBig: {
    fontSize: 30,
    fontWeight: '900',
    color: COLORS.textPrimary,
    marginVertical: 2
  },
  priceUnitLabel: {
    fontSize: 12,
    color: COLORS.textMuted
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    paddingTop: SPACING.sm,
    marginTop: SPACING.md
  },
  metaText: {
    fontSize: 11,
    color: COLORS.textMuted
  },
  staleAlertBox: {
    backgroundColor: COLORS.warningLight,
    padding: SPACING.sm,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: COLORS.warning,
    marginTop: SPACING.sm
  },
  staleAlertText: {
    fontSize: 11,
    color: COLORS.warning,
    fontWeight: '600'
  },
  purityToggleRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: RADII.md,
    padding: 3,
    marginVertical: SPACING.md
  },
  purityToggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: RADII.sm
  },
  purityToggleBtnActive: {
    backgroundColor: COLORS.surface,
    elevation: 2
  },
  purityToggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary
  },
  purityToggleTextActive: {
    color: COLORS.goldDeep,
    fontWeight: '800'
  },
  quickNavRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: SPACING.md
  },
  chartCard: {
    padding: SPACING.lg
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary
  },
  changeText: {
    fontSize: 14,
    fontWeight: '800'
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    paddingTop: SPACING.md,
    marginTop: SPACING.md
  },
  statCell: {
    flex: 1,
    alignItems: 'center'
  },
  statCellLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase'
  },
  statCellValue: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 2
  },
  statCellSub: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 1
  },
  tariffDisclosure: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: SPACING.md,
    lineHeight: 14,
    textAlign: 'center'
  }
});
