/**
 * @file GoldOverviewScreen.js
 * @description Gold Price Tracker Screen displaying live 24K and 22K prices,
 * 5-year interactive historical chart, touch tooltips, and stale-data indicators.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Animated,
  Platform,
  UIManager,
  LayoutAnimation
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { PearlCard } from '../../components/PearlCard.js';
import { MiniGoldChart } from '../../components/MiniGoldChart.js';
import { GoldButton } from '../../components/GoldButton.js';
import { GoldPriceCalculator } from '../../components/GoldPriceCalculator.js';
import { Skeleton } from '../../components/Skeleton.js';
import { Toast } from '../../components/Toast.js';
import { ResponsiveContainer } from '../../components/ResponsiveContainer.js';
import { PageTitleBanner } from '../../components/PageTitleBanner.js';
import { COLORS, RADII, SPACING, formatINR } from '../../theme/index.js';

import { apiRequest } from '../../services/api.js';
import { useGoldPrice } from '../../context/GoldPriceContext.js';
import { logger } from '../../services/eventLogger.js';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function ChevronDownIcon({ color = COLORS.goldDeep, size = 18 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 9L12 15L18 9"
        stroke={color}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function GoldOverviewScreen({ navigation }) {
  const { goldPrice, loading: priceLoading, refreshGoldPrice, getRateForPurity, getRetailForPurity } = useGoldPrice();
  const [historyRecords, setHistoryRecords] = useState([]);
  const [historyStats, setHistoryStats] = useState(null);
  const [selectedRange, setSelectedRange] = useState('1Y');
  const [selectedPurity, setSelectedPurity] = useState('24K');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Dropdown Accordion State for Indian Domestic Retail Estimate
  const [isRetailExpanded, setIsRetailExpanded] = useState(false);
  const arrowAnim = useRef(new Animated.Value(0)).current;

  const toggleRetailDropdown = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Haptics fallback on unsupported platforms
    }
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const nextState = !isRetailExpanded;
    setIsRetailExpanded(nextState);
    Animated.timing(arrowAnim, {
      toValue: nextState ? 1 : 0,
      duration: 250,
      useNativeDriver: Platform.OS !== 'web'
    }).start();
  };

  const arrowRotation = arrowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg']
  });

  // Fetch Historical Series
  const loadHistory = async (range = selectedRange, purity = selectedPurity) => {
    try {
      const res = await apiRequest(`/gold/history?range=${range}&purity=${purity}`);
      if (res && res.records) {
        let records = res.records;
        // Align latest chart point with canonical price store
        if (records.length > 0 && goldPrice?.inrPerGram?.[purity]) {
          const canonicalCurrent = goldPrice.inrPerGram[purity];
          records = [...records];
          records[records.length - 1] = {
            ...records[records.length - 1],
            price: canonicalCurrent
          };
        }
        setHistoryRecords(records);
        setHistoryStats(res.stats);
      }
    } catch (err) {
      console.warn('[GoldOverview] History fetch failed:', err.message);
    }
  };

  const loadAll = async () => {
    setError('');
    await Promise.all([refreshGoldPrice(), loadHistory(selectedRange, selectedPurity)]);
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
      {/* 1. Indicative Benchmark Card (Before Duty & GST) */}
      <PearlCard goldTrim={true} style={styles.liveCard}>
        <View style={styles.liveHeaderRow}>
          <View style={styles.liveStatusRow}>
            <View style={[styles.liveIndicatorDot, (!goldPrice?.isLive) && styles.staleIndicatorDot]} />
            <Text style={[styles.liveStatusText, (!goldPrice?.isLive) && styles.staleStatusText]}>
              {goldPrice?.isLive ? 'LIVE' : (goldPrice?.statusLabel || 'Benchmark Settlement')}
            </Text>
          </View>
          <Text style={styles.currencyBadge}>INR (₹)</Text>
        </View>

        <Text style={styles.basisHeaderLabel}>
          {goldPrice?.basisLabel || 'Indicative benchmark, before duty and GST'}
        </Text>

        {priceLoading ? (
          <View style={{ marginVertical: SPACING.md }}>
            <Skeleton height={38} width="60%" />
            <Skeleton height={18} width="40%" style={{ marginTop: 8 }} />
          </View>
        ) : (
          <View style={styles.priceHeroRow}>
            <View style={styles.priceBox}>
              <Text style={styles.pricePurityTitle}>24K Fine Gold (99.9%)</Text>
              <Text style={styles.priceBig}>
                {goldPrice?.inrPerGram?.['24K'] ? formatINR(goldPrice.inrPerGram['24K']) : 'Unavailable'}
              </Text>
              <Text style={styles.priceUnitLabel}>
                per gram ({goldPrice?.inrPer10g?.['24K'] ? `${formatINR(goldPrice.inrPer10g['24K'])} / 10g` : 'Rate unavailable'})
              </Text>
            </View>

            <View style={styles.priceDivider} />

            <View style={styles.priceBox}>
              <Text style={styles.pricePurityTitle}>22K Hallmark (91.6%)</Text>
              <Text style={styles.priceBig}>
                {goldPrice?.inrPerGram?.['22K'] ? formatINR(goldPrice.inrPerGram['22K']) : 'Unavailable'}
              </Text>
              <Text style={styles.priceUnitLabel}>
                per gram ({goldPrice?.inrPer10g?.['22K'] ? `${formatINR(goldPrice.inrPer10g['22K'])} / 10g` : 'Rate unavailable'})
              </Text>
            </View>

            <View style={styles.priceDivider} />

            <View style={styles.priceBox}>
              <Text style={styles.pricePurityTitle}>18K Hallmark (75.0%)</Text>
              <Text style={styles.priceBig}>
                {goldPrice?.inrPerGram?.['18K'] ? formatINR(goldPrice.inrPerGram['18K']) : 'Unavailable'}
              </Text>
              <Text style={styles.priceUnitLabel}>
                per gram ({goldPrice?.inrPer10g?.['18K'] ? `${formatINR(goldPrice.inrPer10g['18K'])} / 10g` : 'Rate unavailable'})
              </Text>
            </View>
          </View>
        )}

        <View style={styles.metaRow}>
          <Text style={styles.metaText}>
            <Text style={styles.metaBoldLabel}>As of: </Text>{goldPrice?.asOfIST || 'Settlement close'}
          </Text>
          <Text style={styles.metaText}>
            <Text style={styles.metaBoldLabel}>Source: </Text>{goldPrice?.sourceName || 'World Gold Council & LBMA'}
          </Text>
        </View>

        {goldPrice?.isStale && (
          <View style={styles.staleAlertBox}>
            <Text style={styles.staleAlertText}>
              ⚠️ {goldPrice.staleWarning || 'Displaying last verified settlement price. Live market feed reconnecting.'}
            </Text>
          </View>
        )}
      </PearlCard>

      {/* Purity Hallmark Selector (24K, 22K, 18K) */}
      <View style={styles.purityToggleRow}>
        {['24K', '22K', '18K'].map((p) => {
          const isSelected = selectedPurity === p;
          const sub = p === '24K' ? '99.9%' : p === '22K' ? '91.6%' : '75.0%';
          return (
            <TouchableOpacity
              key={p}
              onPress={() => handlePurityChange(p)}
              style={[styles.purityToggleBtn, isSelected && styles.purityToggleBtnActive]}
            >
              <Text style={[styles.purityToggleText, isSelected && styles.purityToggleTextActive]}>
                {p} ({sub})
              </Text>
            </TouchableOpacity>
          );
        })}
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
            <View
              style={[
                styles.changeBadge,
                { backgroundColor: historyStats.isPositive ? COLORS.successLight : COLORS.errorLight }
              ]}
            >
              <Text
                style={[
                  styles.changeText,
                  { color: historyStats.isPositive ? COLORS.success : COLORS.error }
                ]}
                numberOfLines={1}
              >
                {historyStats.isPositive ? '+' : ''}{historyStats.percentageChange}% ({formatINR(historyStats.absoluteChange)})
              </Text>
            </View>
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

      {/* Navigation Quick Actions - Moved Below Historical Performance Table */}
      <View style={styles.quickNavRow}>
        <GoldButton
          title="Compare Dates"
          variant="secondary"
          onPress={() => navigation.navigate('CompareDates')}
          style={styles.quickNavBtn}
          buttonStyle={styles.quickNavBtnInner}
          textStyle={styles.quickNavBtnText}
          numberOfLines={1}
        />
        <GoldButton
          title="Data Methodology"
          variant="secondary"
          onPress={() => navigation.navigate('DataSourceInfo')}
          style={styles.quickNavBtn}
          buttonStyle={styles.quickNavBtnInner}
          textStyle={styles.quickNavBtnText}
          numberOfLines={1}
        />
      </View>

      {/* Gold Price Calculator - Placed directly above Indian Retail Estimate */}
      <GoldPriceCalculator goldPricePerGram24K={goldPrice?.inrPerGram?.['24K']} />

      {/* 3. Indian Domestic Retail Estimate Collapsible Dropdown Card */}
      <PearlCard style={styles.retailCard}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={toggleRetailDropdown}
          style={styles.retailHeaderTouch}
          accessibilityRole="button"
          accessibilityLabel="Toggle Indian Retail Estimate breakdown"
        >
          <Text style={styles.retailCardTitle}>Indian Retail Estimate</Text>
          <Animated.View style={[styles.arrowContainer, { transform: [{ rotate: arrowRotation }] }]}>
            <ChevronDownIcon color={COLORS.goldDeep} size={18} />
          </Animated.View>
        </TouchableOpacity>

        {isRetailExpanded && (
          <View style={styles.retailExpandedContent}>
            <Text style={styles.retailCardSub}>
              Includes 6% Basic Customs Duty (as of Union Budget July 2024), 1% local premium, and 3% domestic GST.
            </Text>
            <View style={styles.retailGrid}>
              <View style={styles.retailCol}>
                <Text style={styles.retailColLabel}>24K Retail</Text>
                <Text style={styles.retailColPrice}>
                  {goldPrice?.retailEstimatePerGram?.['24K'] ? formatINR(goldPrice.retailEstimatePerGram['24K']) : 'Unavailable'}
                </Text>
              </View>
              <View style={styles.retailCol}>
                <Text style={styles.retailColLabel}>22K Retail</Text>
                <Text style={styles.retailColPrice}>
                  {goldPrice?.retailEstimatePerGram?.['22K'] ? formatINR(goldPrice.retailEstimatePerGram['22K']) : 'Unavailable'}
                </Text>
              </View>
              <View style={styles.retailCol}>
                <Text style={styles.retailColLabel}>18K Retail</Text>
                <Text style={styles.retailColPrice}>
                  {goldPrice?.retailEstimatePerGram?.['18K'] ? formatINR(goldPrice.retailEstimatePerGram['18K']) : 'Unavailable'}
                </Text>
              </View>
            </View>
          </View>
        )}
      </PearlCard>
    </View>
  );

  const renderHeader = (
    <PageTitleBanner
      title="GOLD RATE"
      description={`Live Spot benchmarks, retail estimates, \nand 5-years historical market trends`}
    />
  );

  return (
    <ScrollView
      style={styles.screen}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.goldDeep} />}
      keyboardShouldPersistTaps="handled"
    >
      <Toast message={error} type="error" visible={Boolean(error)} />
      <ResponsiveContainer
        headerContent={renderHeader}
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
  basisHeaderLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.goldDeep,
    marginBottom: SPACING.sm
  },
  retailCard: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: '#FAF5EE',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.25)',
    marginBottom: SPACING.xl
  },
  retailHeaderTouch: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  retailCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.goldDeep
  },
  arrowContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(212, 175, 55, 0.12)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  retailExpandedContent: {
    marginTop: SPACING.sm + 2,
    paddingTop: SPACING.sm + 2,
    borderTopWidth: 1,
    borderTopColor: 'rgba(212, 175, 55, 0.18)'
  },
  retailCardSub: {
    fontSize: 11,
    color: COLORS.textMuted,
    lineHeight: 15,
    marginBottom: SPACING.sm
  },
  retailGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  retailCol: {
    flex: 1,
    alignItems: 'center'
  },
  retailColLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary
  },
  retailColPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 2
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
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    paddingTop: 10,
    marginTop: 14,
    gap: 4
  },
  metaBoldLabel: {
    fontWeight: '700',
    color: '#6B665C'
  },
  metaText: {
    fontSize: 11,
    color: COLORS.textMuted,
    lineHeight: 16
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
    marginTop: SPACING.md,
    marginBottom: SPACING.md
  },
  quickNavBtn: {
    flex: 1
  },
  quickNavBtnInner: {
    paddingHorizontal: 8,
    minHeight: 46,
    height: 46
  },
  quickNavBtnText: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center'
  },
  chartCard: {
    padding: SPACING.lg,
    overflow: 'hidden'
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: SPACING.sm
  },
  chartTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
    flexShrink: 1
  },
  changeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADII.sm,
    alignSelf: 'flex-start'
  },
  changeText: {
    fontSize: 12.5,
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
