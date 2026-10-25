/**
 * @file GoldLoanScreen.js
 * @description Luxury Gold Loan Calculator Screen:
 * - RBI-compliant tiered LTV eligibility (85% <= ₹2.5L, 80% ₹2.5L-₹5L, 75% > ₹5L)
 * - Total maturity obligation accounting for bullet repayment loans
 * - Clear separation of user Requested Amount from Estimated Maximum Loan Eligibility
 * - Transparent compliant alternative calculation when requested amount exceeds ceiling
 * - Stone and non-gold deductions for jewellery
 * - Provenance labeling and verified rate status (Live vs Indicative vs Manual Override)
 * - Reducing-balance EMI, monthly interest, and bullet repayment schedules
 * - Responsive 2x2 grid on tablet with centered primary CTA and middle-aligned results card
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Animated
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

import { PearlCard } from '../../components/PearlCard.js';
import { Input } from '../../components/Input.js';
import { SliderInput } from '../../components/SliderInput.js';
import { GoldButton } from '../../components/GoldButton.js';
import { AnimatedNumber } from '../../components/AnimatedNumber.js';
import { ResponsiveContainer } from '../../components/ResponsiveContainer.js';
import { PageTitleBanner } from '../../components/PageTitleBanner.js';
import { HamburgerButton, SideDrawer, useSideDrawer } from '../../components/drawer/index.js';
import { Toast } from '../../components/Toast.js';
import { COLORS, RADII, SPACING, SHADOWS, formatINR, formatCompactINR, useResponsiveLayout } from '../../theme/index.js';

import { SectionCard, OptionCard, SummaryTile } from '../../components/goldloan/index.js';
import { calculateGoldLoan } from '../../lib/calc/goldLoan.js';
import { ILLUSTRATIVE_LENDER_PRESETS } from '../../lib/calc/config.js';
import { apiRequest } from '../../services/api.js';
import { useGoldPrice } from '../../context/GoldPriceContext.js';
import { useSettings } from '../../context/SettingsContext.js';
import { logger } from '../../services/eventLogger.js';

export function GoldLoanScreen({ navigation }) {
  const drawer = useSideDrawer();
  const { goldPrice, getRateForPurity } = useGoldPrice();
  const { reduceMotion } = useSettings();
  const { isTablet } = useResponsiveLayout();

  // Inputs
  const [weight, setWeight] = useState('50');
  const [stoneDeductions, setStoneDeductions] = useState('0');
  const [purity, setPurity] = useState('22K'); // '24K' | '22K' | '18K'
  const [isManualRate, setIsManualRate] = useState(false);
  const [manualRate, setManualRate] = useState('');
  const [collateralType, setCollateralType] = useState('ornament'); // 'ornament' | 'coin'
  const [requestedLoanAmount, setRequestedLoanAmount] = useState('');
  const [repaymentMethod, setRepaymentMethod] = useState('bullet'); // 'bullet' | 'emi' | 'maturity'

  // Selected lender preset (default: PSU Bank Standard 8.75%)
  const defaultPreset = ILLUSTRATIVE_LENDER_PRESETS[0];
  const [selectedLenderId, setSelectedLenderId] = useState(defaultPreset.id);
  const [annualRate, setAnnualRate] = useState(String(defaultPreset.defaultAnnualRate));
  const [tenureMonths, setTenureMonths] = useState(String(defaultPreset.defaultTenureMonths));

  // UI state
  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const [saveLabel, setSaveLabel] = useState('Gold Loan 50g');
  const [toastMessage, setToastMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Compare Lender Assumptions Dropdown state
  const [isLenderDropdownOpen, setIsLenderDropdownOpen] = useState(false);
  const lenderDropdownArrowAnim = useRef(new Animated.Value(0)).current;

  // Staggered Entrance Animations
  const card1Anim = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const card2Anim = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const card3Anim = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const ctaAnim = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const lenderAnim = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const resultsAnim = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;

  useEffect(() => {
    if (!reduceMotion) {
      Animated.stagger(80, [
        Animated.timing(card1Anim, { toValue: 1, duration: 320, useNativeDriver: true }),
        Animated.timing(card2Anim, { toValue: 1, duration: 320, useNativeDriver: true }),
        Animated.timing(card3Anim, { toValue: 1, duration: 320, useNativeDriver: true }),
        Animated.timing(lenderAnim, { toValue: 1, duration: 320, useNativeDriver: true }),
        Animated.timing(ctaAnim, { toValue: 1, duration: 320, useNativeDriver: true }),
        Animated.timing(resultsAnim, { toValue: 1, duration: 320, useNativeDriver: true })
      ]).start();
    }
  }, [reduceMotion]);

  const card1TranslateY = card1Anim.interpolate({ inputRange: [0, 1], outputRange: [18, 0] });
  const card2TranslateY = card2Anim.interpolate({ inputRange: [0, 1], outputRange: [18, 0] });
  const card3TranslateY = card3Anim.interpolate({ inputRange: [0, 1], outputRange: [18, 0] });
  const ctaTranslateY = ctaAnim.interpolate({ inputRange: [0, 1], outputRange: [18, 0] });
  const lenderTranslateY = lenderAnim.interpolate({ inputRange: [0, 1], outputRange: [18, 0] });
  const resultsTranslateY = resultsAnim.interpolate({ inputRange: [0, 1], outputRange: [18, 0] });

  // Selected lender preset reference
  const selectedLender = useMemo(() => {
    return ILLUSTRATIVE_LENDER_PRESETS.find(p => p.id === selectedLenderId) || defaultPreset;
  }, [selectedLenderId, defaultPreset]);

  // Derived benchmark rate for selected purity from canonical store
  const benchmarkRateForSelectedPurity = useMemo(() => {
    return getRateForPurity(purity) || 0;
  }, [getRateForPurity, purity]);

  // Effective rate used for selected purity
  const effectiveRate = isManualRate && manualRate ? Number(manualRate) : benchmarkRateForSelectedPurity;

  // Switching purity clears manual override and displays notice
  const handlePurityChange = (newPurity) => {
    setPurity(newPurity);
    if (isManualRate) {
      setIsManualRate(false);
      setManualRate('');
      const newBenchmark = getRateForPurity(newPurity);
      setToastMessage(`Purity changed to ${newPurity}. Benchmark rate updated to ${formatINR(newBenchmark)}/g. Manual override cleared.`);
    }
  };

  // Collateral type selection handler with haptic feedback
  const handleCollateralTypeChange = (type) => {
    try {
      Haptics.selectionAsync();
    } catch {
      // Ignore
    }
    setCollateralType(type);
    if (type === 'coin') {
      setStoneDeductions('0');
    }
  };

  // Toggle or edit rate
  const handleToggleManualRate = () => {
    try {
      Haptics.selectionAsync();
    } catch {
      // Ignore
    }
    if (isManualRate) {
      setIsManualRate(false);
      setManualRate('');
      setToastMessage(`Switched to live benchmark rate for ${purity}`);
      setTimeout(() => setToastMessage(''), 2000);
    } else {
      setIsManualRate(true);
      setManualRate(String(effectiveRate || ''));
    }
  };

  // Reset to live rate
  const handleResetRate = () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // Ignore
    }
    setIsManualRate(false);
    setManualRate('');
    setToastMessage(`Reset to benchmark rate: ${formatINR(benchmarkRateForSelectedPurity)}/g`);
    setTimeout(() => setToastMessage(''), 2000);
  };

  // Primary Action Button (Calculate / See Eligibility)
  const handleCalculateAction = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      // Ignore
    }
    setToastMessage(`Calculated: Up to ${formatINR(result.loan.estimatedMaxLoanEligibility)} loan eligibility`);
    setTimeout(() => setToastMessage(''), 2500);
  };

  // When lender changes, update default rate & tenure from preset
  const handleSelectLender = (preset) => {
    try {
      Haptics.selectionAsync();
    } catch {
      // Ignore
    }
    setSelectedLenderId(preset.id);
    setAnnualRate(String(preset.defaultAnnualRate));
    setTenureMonths(String(preset.defaultTenureMonths));
  };

  // Toggle Compare Lender Assumptions Dropdown
  const toggleLenderDropdown = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Ignore
    }
    const nextState = !isLenderDropdownOpen;
    setIsLenderDropdownOpen(nextState);
    Animated.timing(lenderDropdownArrowAnim, {
      toValue: nextState ? 1 : 0,
      duration: 220,
      useNativeDriver: true
    }).start();
  };

  const lenderArrowRotation = lenderDropdownArrowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg']
  });

  const handleSelectLenderPreset = (preset) => {
    handleSelectLender(preset);
    setIsLenderDropdownOpen(false);
    Animated.timing(lenderDropdownArrowAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true
    }).start();
    setToastMessage(`Preset applied: ${preset.name} (${preset.defaultAnnualRate}% p.a.)`);
    setTimeout(() => setToastMessage(''), 2000);
  };

  // Instant Calculation Engine (Pure functional call adhering to RBI directions)
  const result = useMemo(() => {
    return calculateGoldLoan({
      weight: Number(weight) || 0,
      stoneDeductions: Number(stoneDeductions) || 0,
      purity,
      goldRatePerGram: effectiveRate,
      ratePerGramSelectedPurity: effectiveRate,
      isRateForSelectedPurity: true,
      requestedLoanAmount: requestedLoanAmount ? Number(requestedLoanAmount) : undefined,
      annualRate: Number(annualRate) || selectedLender.defaultAnnualRate,
      tenureMonths: Number(tenureMonths) || selectedLender.defaultTenureMonths,
      repaymentMethod,
      collateralType,
      processingFee: selectedLender.processingFeePercent,
      feeType: selectedLender.feeType,
      lenderPreset: selectedLender,
      sourceName: goldPrice?.source || 'World Gold Council (Goldhub) & LBMA',
      isManualOverride: isManualRate,
      isLiveMarket: Boolean(goldPrice?.isLive && !isManualRate)
    });
  }, [weight, stoneDeductions, purity, effectiveRate, requestedLoanAmount, annualRate, tenureMonths, repaymentMethod, collateralType, selectedLender, goldPrice, isManualRate]);

  // Log calculation debounced
  useEffect(() => {
    logger.logDebouncedCalculation({
      module: 'gold_loan',
      action: 'calculate_gold_loan',
      screen: 'GoldLoanScreen',
      inputs: {
        weight: Number(weight),
        stoneDeductions: Number(stoneDeductions) || 0,
        purity,
        goldRatePerGram: effectiveRate,
        annualRate: Number(annualRate),
        repaymentMethod,
        collateralType,
        selectedLender: selectedLender.name
      },
      resultSummary: {
        assessedValue: result.valuation.assessedGoldValue,
        estimatedMaxLoanEligibility: result.loan.estimatedMaxLoanEligibility,
        finalEstimatedLoanAmount: result.loan.finalEstimatedLoanAmount,
        periodicPayment: result.loan.periodicPayment,
        appliedTier: result.ltv.appliedTier
      }
    });
  }, [weight, stoneDeductions, purity, effectiveRate, requestedLoanAmount, annualRate, repaymentMethod, collateralType, selectedLenderId]);

  // Save calculation to My History with debounce/prevent double tap
  const handleSave = async () => {
    if (!saveLabel.trim() || isSaving) return;
    setIsSaving(true);

    try {
      await apiRequest('/calculations/save', {
        method: 'POST',
        body: JSON.stringify({
          type: 'gold-loan',
          label: saveLabel.trim(),
          inputs: {
            weight: Number(weight),
            stoneDeductions: Number(stoneDeductions) || 0,
            purity,
            goldRatePerGram: Number(effectiveRate),
            repaymentMethod,
            collateralType,
            annualRate: Number(annualRate),
            tenureMonths: Number(tenureMonths),
            lender: selectedLender.name,
            requestedLoanAmount: requestedLoanAmount ? Number(requestedLoanAmount) : null
          },
          results: {
            eligibleNetWeightGrams: result.collateral.eligibleNetWeightGrams,
            pureWeightGrams: result.collateral.pureGoldEquivalentWeightGrams,
            assessedGoldValue: result.valuation.assessedGoldValue,
            estimatedMaxLoanEligibility: result.loan.estimatedMaxLoanEligibility,
            finalEstimatedLoanAmount: result.loan.finalEstimatedLoanAmount,
            periodicPayment: result.loan.periodicPayment,
            totalInterest: result.loan.totalInterest,
            totalRepayment: result.loan.totalRepayment,
            appliedTier: result.ltv.appliedTier
          }
        })
      });

      setSaveModalVisible(false);
      setToastMessage('Gold loan calculation saved to My History!');
      setTimeout(() => setToastMessage(''), 3000);
    } catch (err) {
      Alert.alert('Save Failed', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // CARD 1: Gold Details
  const renderCard1 = (
    <SectionCard
      badge="1"
      title="Gold Details"
      subtitle="Select collateral category, weight and hallmark purity"
      style={isTablet ? styles.sectionCardTablet : undefined}
    >
      {/* Collateral Type Toggle */}
      <Text style={styles.inputFieldLabel}>Collateral Classification</Text>
      <View style={styles.optionRow}>
        <OptionCard
          title="Jewellery / Ornaments"
          subtitle="(Max 1 kg)"
          isSelected={collateralType === 'ornament'}
          onPress={() => handleCollateralTypeChange('ornament')}
          accessibilityLabel="Jewellery and Ornaments, maximum 1 kilogram"
        />
        <OptionCard
          title="Gold Coins"
          subtitle="(Max 50 g)"
          isSelected={collateralType === 'coin'}
          onPress={() => handleCollateralTypeChange('coin')}
          accessibilityLabel="Gold Coins, maximum 50 grams"
        />
      </View>

      {/* Collateral limit error warning if breached */}
      {!result.collateral.isCollateralValid && (
        <View style={styles.collateralWarningBox}>
          <Text style={styles.collateralWarningText}>
            ⚠️ {result.collateral.collateralLimitError}
          </Text>
        </View>
      )}

      {/* Gross Weight with 40x40 Stepper Buttons and Gold Quick Chips */}
      <SliderInput
        label="Gross Gold Weight (Grams)"
        value={weight}
        onValueChange={setWeight}
        min={1}
        max={collateralType === 'coin' ? 50 : 500}
        step={5}
        suffix="g"
        quickOptions={collateralType === 'coin' ? ['5', '10', '20', '50'] : ['20', '50', '100', '250']}
        labelStyle={styles.inputFieldLabel}
      />

      {/* Stone & Non-Gold Deductions (For Ornaments) */}
      {collateralType === 'ornament' && (
        <View style={styles.stoneDeductionBox}>
          <View style={styles.stoneHeaderRow}>
            <Text style={styles.inputFieldLabel}>Stone & Non-Gold Deductions (Grams)</Text>
            {Number(stoneDeductions) > 0 && (
              <View style={styles.netWeightBadge}>
                <Text style={styles.netWeightBadgeText}>
                  Net Gold: {result.collateral.eligibleNetWeightGrams}g
                </Text>
              </View>
            )}
          </View>
          <Input
            value={stoneDeductions}
            onChangeText={(txt) => setStoneDeductions(txt.replace(/[^0-9.]/g, ''))}
            keyboardType="decimal-pad"
            suffix="g"
            placeholder="0"
            style={styles.whiteInputWrapper}
          />
          {/* Quick Deduction Chips */}
          <View style={styles.quickChipRow}>
            {['0', '2', '5', '10', '15'].map((chip) => {
              const isActive = stoneDeductions === chip;
              return (
                <TouchableOpacity
                  key={chip}
                  onPress={() => setStoneDeductions(chip)}
                  style={[styles.quickChip, isActive && styles.quickChipActive]}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={`Deduct ${chip} grams`}
                >
                  <Text style={[styles.quickChipText, isActive && styles.quickChipTextActive]}>
                    {chip === '0' ? 'None (0g)' : `-${chip}g`}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={styles.stoneNoticeText}>
            Stones, wax, and enamel are excluded from regulatory collateral valuation.
          </Text>
        </View>
      )}

      {/* Purity Hallmark Cards */}
      <Text style={[styles.inputFieldLabel, { marginTop: SPACING.md }]}>Gold Purity Hallmark</Text>
      <View style={styles.optionRow}>
        {[
          { p: '24K', title: '24K', sub: '100% (Pure)' },
          { p: '22K', title: '22K', sub: '91.6% Hallmark' },
          { p: '18K', title: '18K', sub: '75.0% Hallmark' }
        ].map((item) => (
          <OptionCard
            key={item.p}
            title={item.title}
            subtitle={item.sub}
            isSelected={purity === item.p}
            onPress={() => handlePurityChange(item.p)}
            accessibilityLabel={`${item.title} Hallmark, ${item.sub}`}
          />
        ))}
      </View>
    </SectionCard>
  );

  // CARD 2: Rate & Valuation
  const renderCard2 = (
    <SectionCard
      badge="2"
      title="Rate & Intrinsic Value"
      subtitle="Reference benchmark and pure fine gold conversion"
      style={isTablet ? styles.sectionCardTablet : undefined}
      contentStyle={isTablet ? styles.card2ContentTablet : undefined}
    >
      <View>
        {/* Purity-Aware Benchmark Rate Header */}
        <View style={styles.rateHeaderRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.inputFieldLabel}>{purity} Valuation Rate</Text>
            <Text style={styles.rateStatusProvenanceText}>
              {result.valuation.statusLabel} • {goldPrice?.asOfIST ? `As of ${goldPrice.asOfIST}` : 'Indicative reference'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleToggleManualRate}
            style={styles.editRatePill}
            accessibilityRole="button"
            accessibilityLabel={isManualRate ? 'Auto Benchmark Rate' : 'Edit Rate'}
            activeOpacity={0.75}
          >
            <Ionicons
              name={isManualRate ? 'checkmark-circle-outline' : 'pencil-outline'}
              size={13}
              color={COLORS.goldDeep}
            />
            <Text style={styles.overrideToggleText}>
              {isManualRate ? 'Auto Benchmark' : 'Edit Rate'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* White Pure Input */}
        <Input
          value={isManualRate ? manualRate : (effectiveRate ? String(effectiveRate) : '')}
          onChangeText={(txt) => {
            setIsManualRate(true);
            setManualRate(txt);
          }}
          keyboardType="decimal-pad"
          prefix="₹"
          suffix="/ gram"
          editable={true}
          style={styles.whiteInputWrapper}
        />

        {/* Reset to live rate link when overridden */}
        {isManualRate && (
          <TouchableOpacity
            onPress={handleResetRate}
            style={styles.resetRateRow}
            accessibilityRole="button"
            accessibilityLabel="Reset to live benchmark rate"
            activeOpacity={0.75}
          >
            <Ionicons name="refresh-outline" size={13} color={COLORS.goldDeep} />
            <Text style={styles.resetRateLinkText}>
              Reset to benchmark ({formatINR(benchmarkRateForSelectedPurity)}/g)
            </Text>
          </TouchableOpacity>
        )}

        <Text style={styles.rateNoticeText}>
          {result.valuation.methodologyDescription || `Rate applied for ${purity}: ${formatINR(effectiveRate)} / gram`}
        </Text>
      </View>

      {/* Highlighted Pure Gold Equivalent Summary Tile */}
      <SummaryTile
        label="Collateral Pure Gold Equivalent:"
        subtitle={`Net pure metal: ${result.collateral.eligibleNetWeightGrams}g eligible × ${result.collateral.purityFactor} (${result.collateral.purityLabel})`}
        value={result.collateral.pureGoldEquivalentWeightGrams}
        unit="g"
        style={{ marginTop: SPACING.sm }}
      />
    </SectionCard>
  );

  // CARD 3: Loan Preferences
  const renderCard3 = (
    <SectionCard
      badge="3"
      title="Loan Preferences"
      subtitle="Repayment schedule and desired borrowing amount"
      style={isTablet ? styles.sectionCardTablet : undefined}
    >
      {/* Equal-Height Repayment Method Options */}
      <Text style={styles.inputFieldLabel}>Repayment Structure</Text>
      <View style={styles.optionRow}>
        {[
          { id: 'bullet', title: 'Monthly Interest', sub: 'Principal at end' },
          { id: 'emi', title: 'Regular EMI', sub: 'Installments' },
          { id: 'maturity', title: 'Bullet Repayment', sub: 'All at end' }
        ].map((m) => (
          <OptionCard
            key={m.id}
            title={m.title}
            subtitle={m.sub}
            isSelected={repaymentMethod === m.id}
            onPress={() => setRepaymentMethod(m.id)}
            minHeight={76}
            accessibilityLabel={`${m.title}, ${m.sub}`}
          />
        ))}
      </View>

      {/* Requested Loan Amount (Optional) */}
      <Input
        label="Desired Loan Amount (Optional)"
        value={requestedLoanAmount}
        onChangeText={(txt) => setRequestedLoanAmount(txt.replace(/[^0-9.]/g, ''))}
        placeholder="Leave blank for estimated maximum eligibility"
        keyboardType="decimal-pad"
        prefix="₹"
        style={[{ marginTop: SPACING.md }, styles.whiteInputWrapper]}
      />

      {/* Real-time notice when requested exceeds regulatory maximum */}
      {result.loan.hasExceededEligibility && (
        <View style={styles.inlineWarningBox}>
          <Text style={styles.inlineWarningText}>
            ⚠️ Requested ₹{Number(requestedLoanAmount).toLocaleString('en-IN')} exceeds regulatory limit of {formatINR(result.loan.estimatedMaxLoanEligibility)}. A compliant alternative will be calculated.
          </Text>
        </View>
      )}
    </SectionCard>
  );

  // CARD 4: Compare Lender Assumptions
  const renderCard4 = (
    <SectionCard
      badge="4"
      title="Compare Lender Assumptions"
      subtitle="Select a preset to auto-fill interest rate & tenure"
      style={isTablet ? styles.sectionCardTablet : undefined}
    >
      {/* Simple Dropdown Trigger */}
      <Text style={styles.inputFieldLabel}>Lender Preset</Text>
      <TouchableOpacity
        onPress={toggleLenderDropdown}
        style={[styles.simpleDropdownTrigger, isLenderDropdownOpen && styles.simpleDropdownTriggerActive]}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`Select lender preset. Currently: ${selectedLender.name}`}
        accessibilityExpanded={isLenderDropdownOpen}
      >
        <Text style={styles.simpleDropdownSelectedText} numberOfLines={1}>
          {selectedLender.name}
        </Text>
        <Animated.View style={{ transform: [{ rotate: lenderArrowRotation }] }}>
          <Ionicons name="chevron-down" size={18} color={COLORS.textSecondary} />
        </Animated.View>
      </TouchableOpacity>

      {/* Simple Dropdown Menu */}
      {isLenderDropdownOpen && (
        <View style={styles.simpleDropdownMenu}>
          {ILLUSTRATIVE_LENDER_PRESETS.map((preset, index) => {
            const isSelected = selectedLenderId === preset.id;
            return (
              <TouchableOpacity
                key={preset.id}
                onPress={() => handleSelectLenderPreset(preset)}
                style={[
                  styles.simpleDropdownItem,
                  index > 0 && styles.simpleDropdownItemBorder,
                  isSelected && styles.simpleDropdownItemSelected
                ]}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`${preset.name}, ${preset.defaultAnnualRate} percent`}
              >
                <Text style={[styles.simpleDropdownItemText, isSelected && styles.simpleDropdownItemTextActive]}>
                  {preset.name}
                </Text>
                <View style={styles.simpleDropdownItemRight}>
                  <Text style={[styles.simpleDropdownItemRate, isSelected && styles.simpleDropdownItemRateActive]}>
                    {preset.defaultAnnualRate}%
                  </Text>
                  {isSelected && (
                    <Ionicons name="checkmark" size={16} color={COLORS.goldDeep} style={{ marginLeft: 6 }} />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Minimal 3-Metric Info Box */}
      <View style={styles.minimalInfoBox}>
        <View style={styles.minimalInfoCol}>
          <Text style={styles.minimalInfoLabel}>Interest Rate</Text>
          <Text style={styles.minimalInfoValueGold}>{selectedLender.defaultAnnualRate}% p.a.</Text>
        </View>

        <View style={styles.minimalInfoDivider} />

        <View style={styles.minimalInfoCol}>
          <Text style={styles.minimalInfoLabel}>Max Tenure</Text>
          <Text style={styles.minimalInfoValue}>{selectedLender.maxTenureMonths} Months</Text>
        </View>

        <View style={styles.minimalInfoDivider} />

        <View style={styles.minimalInfoCol}>
          <Text style={styles.minimalInfoLabel}>Processing Fee</Text>
          <Text style={styles.minimalInfoValue}>
            {selectedLender.feeType === 'percent' ? `${selectedLender.processingFeePercent}%` : `₹${selectedLender.processingFeeFlat}`}
          </Text>
        </View>
      </View>

      {/* Editable Custom Annual Interest Rate */}
      <View style={styles.customRateBox}>
        <SliderInput
          label="Annual Interest Rate (% p.a.)"
          value={annualRate}
          onValueChange={setAnnualRate}
          min={5.0}
          max={24.0}
          step={0.25}
          suffix="%"
          quickOptions={['8.75', '9.50', '10.50', '12.00']}
          labelStyle={styles.inputFieldLabel}
        />
      </View>

      {/* Loan Tenure Slider */}
      <View style={{ marginTop: SPACING.md }}>
        <SliderInput
          label="Loan Tenure (Months)"
          value={tenureMonths}
          onValueChange={setTenureMonths}
          min={selectedLender.minTenureMonths || 3}
          max={selectedLender.maxTenureMonths || 36}
          step={1}
          suffix="Months"
          quickOptions={['6', '12', '24', '36']}
          labelStyle={styles.inputFieldLabel}
        />
      </View>
    </SectionCard>
  );

  // PRIMARY ACTION CTA
  const renderCta = (
    <GoldButton
      title="See Loan Eligibility"
      variant="primary"
      disabled={!weight || Number(weight) <= 0}
      onPress={handleCalculateAction}
      style={isTablet ? styles.primaryActionButtonTablet : styles.primaryActionButton}
    />
  );

  // Main Big Last Section: Estimated Maximum Loan Eligibility & Repayment
  const renderResults = (
    <PearlCard goldTrim={true} style={styles.resultCard}>
      {/* Estimated Intrinsic Gold Value */}
      <View style={styles.valuationBox}>
        <Text style={styles.valuationLabel}>Estimated Collateral Gold Value</Text>
        <AnimatedNumber
          value={result.valuation.assessedGoldValue}
          isCurrency={true}
          style={styles.valuationAmount}
        />
        <Text style={styles.valuationDisclaimerText}>
          Intrinsic bullion value of {result.collateral.eligibleNetWeightGrams}g net {result.collateral.purityLabel} gold.
        </Text>
      </View>

      {/* Regulatory LTV Tier Badge */}
      <View style={styles.tierContainer}>
        <View style={styles.tierHeaderRow}>
          <Text style={styles.tierTitle}>RBI Regulatory LTV Cap</Text>
          <Text style={styles.tierPercentBadge}>{result.ltv.effectiveMaxLtvPercent}% Max LTV</Text>
        </View>
        <Text style={styles.tierDescription}>{result.ltv.appliedTier}</Text>
        {result.ltv.isBulletMaturity && (
          <Text style={styles.bulletRegulatoryNote}>
            ℹ️ Under RBI bullet repayment directions, the LTV cap applies to the total amount payable at maturity (Principal + Accrued Interest).
          </Text>
        )}
      </View>

      {/* ESTIMATED MAXIMUM LOAN ELIGIBILITY (Hero Result) */}
      <View style={styles.loanApprovalBox}>
        <Text style={styles.loanApprovalLabel}>Estimated Maximum Loan Eligibility</Text>
        <AnimatedNumber
          value={result.loan.estimatedMaxLoanEligibility}
          isCurrency={true}
          style={styles.loanApprovalAmount}
        />
        <Text style={styles.actualLtvText}>
          Regulatory ceiling: {result.ltv.effectiveMaxLtvPercent}% of collateral value
        </Text>
      </View>

      {/* Separate Requested Amount vs Final Estimated Loan Amount */}
      <View style={styles.comparisonBox}>
        <View style={styles.comparisonRow}>
          <Text style={styles.comparisonLabel}>Requested Loan Amount:</Text>
          <Text style={styles.comparisonValue}>
            {result.loan.isRequestedSpecified ? formatINR(result.loan.requestedLoanAmount) : 'Not specified (Max Eligible)'}
          </Text>
        </View>
        {result.loan.isRequestedSpecified && (
          <View style={styles.comparisonRow}>
            <Text style={styles.comparisonLabel}>Requested Effective LTV:</Text>
            <Text style={[styles.comparisonValue, result.loan.hasExceededEligibility && styles.warningText]}>
              {result.ltv.requestedLtvPercent}% {result.loan.hasExceededEligibility ? '(Exceeds Cap)' : ''}
            </Text>
          </View>
        )}
        <View style={[styles.comparisonRow, styles.comparisonHighlightRow]}>
          <Text style={styles.comparisonHighlightLabel}>Final Estimated Loan Amount Used:</Text>
          <Text style={styles.comparisonHighlightValue}>
            {formatINR(result.loan.finalEstimatedLoanAmount)}
          </Text>
        </View>
        <Text style={styles.basisNoteText}>
          {result.loan.calculationBasis}
        </Text>
      </View>

      {/* Eligibility Capping Alert when Requested exceeds Eligibility */}
      {result.loan.hasExceededEligibility && (
        <View style={styles.shortfallCard}>
          <Text style={styles.shortfallTitle}>⚠️ Capped at Regulatory Ceiling</Text>
          <Text style={styles.shortfallBody}>{result.loan.cappingExplanation}</Text>
          <View style={styles.shortfallBadgeRow}>
            <Text style={styles.shortfallAmountText}>
              Shortfall: {formatINR(result.loan.shortfallAmount)}
            </Text>
            {result.loan.additionalWeightNeededGrams > 0 && (
              <Text style={styles.shortfallGoldNeededText}>
                Need +{result.loan.additionalWeightNeededGrams}g of {result.collateral.purityLabel} gold
              </Text>
            )}
          </View>
        </View>
      )}

      {/* Repayment Breakdown Table */}
      <View style={styles.repaymentSummaryBox}>
        <Text style={styles.repaymentTableTitle}>
          Repayment Breakdown ({tenureMonths} Months • {repaymentMethod === 'emi' ? 'Regular EMI' : repaymentMethod === 'bullet' ? 'Monthly Interest' : 'Bullet Repayment'})
        </Text>

        <View style={[styles.summaryRow, styles.rateUsedRow]}>
          <Text style={styles.rateUsedLabel}>Interest Rate Applied:</Text>
          <View style={styles.rateUsedValueCol}>
            <Text style={styles.rateUsedValue}>{result.loan.annualRate}% p.a.</Text>
            <Text style={styles.rateUsedLenderSubtext}>({selectedLender.name})</Text>
          </View>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Benchmark Rate Used ({purity}):</Text>
          <Text style={styles.summaryValue}>{formatINR(result.valuation.ratePerGramSelectedPurity)} / g</Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>
            {repaymentMethod === 'emi' ? 'Monthly EMI' : repaymentMethod === 'bullet' ? 'Monthly Interest' : 'Periodic Payment'}
          </Text>
          <Text style={styles.summaryValueGold}>
            {repaymentMethod === 'maturity' ? '₹0.00 (All at maturity)' : formatINR(result.loan.periodicPayment)}
          </Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Total Interest ({tenureMonths} Months)</Text>
          <Text style={styles.summaryValue}>{formatINR(result.loan.totalInterest)}</Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Processing Fee (Upfront)</Text>
          <Text style={styles.summaryValue}>{formatINR(result.loan.processingFeeAmount)}</Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Estimated Net Disbursal</Text>
          <Text style={styles.summaryValue}>{formatINR(result.loan.netDisbursalAmount)}</Text>
        </View>

        <View style={[styles.summaryRow, styles.summaryTotalRow]}>
          <Text style={styles.summaryTotalLabel}>Total Repayment</Text>
          <Text style={styles.summaryTotalValue}>{formatINR(result.loan.totalRepayment)}</Text>
        </View>
      </View>

      <Text style={styles.approvalDisclaimer}>
        {result.loan.disclaimer}
      </Text>

      <GoldButton
        title="Save Gold Loan"
        variant="primary"
        onPress={() => setSaveModalVisible(true)}
        style={{ marginTop: SPACING.md }}
      />
    </PearlCard>
  );

  const renderHeader = (
    <View style={styles.headerWrapper}>
      <View style={styles.topMenuRow}>
        <HamburgerButton
          isOpen={drawer.isOpen}
          animValue={drawer.animValue}
          onPress={drawer.toggleDrawer}
        />
      </View>
      <PageTitleBanner
        title="GOLD LOAN"
        description={`Evaluate maximum borrowing eligibility, regulatory\nLTV limits, and repayment terms`}
      />
    </View>
  );

  return (
    <View style={styles.screen}>
      <Toast message={toastMessage} visible={Boolean(toastMessage)} />
      <ResponsiveContainer headerContent={renderHeader}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardContainer}
        >
          {isTablet ? (
            <View style={styles.tabletWrapper}>
              {/* Row 1: 2 input sections beside each other */}
              <View style={styles.tabletRow}>
                <Animated.View style={[styles.tabletCol, { opacity: card1Anim, transform: [{ translateY: card1TranslateY }] }]}>
                  {renderCard1}
                </Animated.View>
                <Animated.View style={[styles.tabletCol, { opacity: card2Anim, transform: [{ translateY: card2TranslateY }] }]}>
                  {renderCard2}
                </Animated.View>
              </View>

              {/* Row 2: 2 input sections beside each other */}
              <View style={styles.tabletRow}>
                <Animated.View style={[styles.tabletCol, { opacity: card3Anim, transform: [{ translateY: card3TranslateY }] }]}>
                  {renderCard3}
                </Animated.View>
                <Animated.View style={[styles.tabletCol, { opacity: lenderAnim, transform: [{ translateY: lenderTranslateY }] }]}>
                  {renderCard4}
                </Animated.View>
              </View>

              {/* Primary CTA Centered */}
              <Animated.View style={[styles.tabletCtaContainer, { opacity: ctaAnim, transform: [{ translateY: ctaTranslateY }] }]}>
                {renderCta}
              </Animated.View>

              {/* Main Big Last Section Middle Aligned */}
              <Animated.View style={[styles.tabletResultsContainer, { opacity: resultsAnim, transform: [{ translateY: resultsTranslateY }] }]}>
                {renderResults}
              </Animated.View>
            </View>
          ) : (
            <View style={styles.phoneWrapper}>
              <Animated.View style={[{ opacity: card1Anim, transform: [{ translateY: card1TranslateY }] }]}>
                {renderCard1}
              </Animated.View>
              <Animated.View style={[{ opacity: card2Anim, transform: [{ translateY: card2TranslateY }] }]}>
                {renderCard2}
              </Animated.View>
              <Animated.View style={[{ opacity: card3Anim, transform: [{ translateY: card3TranslateY }] }]}>
                {renderCard3}
              </Animated.View>
              <Animated.View style={[{ opacity: lenderAnim, transform: [{ translateY: lenderTranslateY }] }]}>
                {renderCard4}
              </Animated.View>
              <Animated.View style={[{ opacity: ctaAnim, transform: [{ translateY: ctaTranslateY }] }]}>
                {renderCta}
              </Animated.View>
              <Animated.View style={[{ opacity: resultsAnim, transform: [{ translateY: resultsTranslateY }] }]}>
                {renderResults}
              </Animated.View>
            </View>
          )}

          {/* Bottom Saved Calculations Button Aligned to Middle at Bottom-most */}
          <View style={styles.bottomSavedContainer}>
            <TouchableOpacity
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                navigation.navigate('SavedGoldLoans');
              }}
              style={styles.bottomSavedButton}
              accessibilityRole="button"
              accessibilityLabel="Saved Calculations"
              activeOpacity={0.75}
            >
              <Ionicons name="bookmark-outline" size={15} color={COLORS.goldDeep} />
              <Text style={styles.bottomSavedButtonText}>Saved</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>

        {/* Save Modal */}
        <Modal
          visible={saveModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setSaveModalVisible(false)}
        >
          <View style={styles.saveModalOverlay}>
            <PearlCard style={styles.saveModalCard}>
              <Text style={styles.saveModalTitle}>Save Gold Loan</Text>
              <Text style={styles.saveModalSubtitle}>Label this calculation for quick recall in My History</Text>

              <Input
                label="Calculation Label"
                value={saveLabel}
                onChangeText={setSaveLabel}
                placeholder="e.g. 50g 22K Wedding Jewellery"
                style={{ marginVertical: SPACING.md }}
              />

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                <GoldButton
                  title="Cancel"
                  variant="secondary"
                  onPress={() => setSaveModalVisible(false)}
                  style={{ flex: 1 }}
                />
                <GoldButton
                  title="Save"
                  variant="primary"
                  onPress={handleSave}
                  loading={isSaving}
                  style={{ flex: 1 }}
                />
              </View>
            </PearlCard>
          </View>
        </Modal>
      </ResponsiveContainer>

      {/* Side Navigation Drawer */}
      <SideDrawer
        isOpen={drawer.isOpen}
        animValue={drawer.animValue}
        onClose={drawer.closeDrawer}
        navigation={navigation}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  headerWrapper: {
    width: '100%'
  },
  topMenuRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: SPACING.xs,
    paddingBottom: SPACING.xs
  },
  keyboardContainer: {
    width: '100%',
    alignItems: 'center'
  },
  bottomSavedContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.xl,
    marginBottom: SPACING.lg
  },
  bottomSavedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: RADII.full,
    backgroundColor: COLORS.goldLightBg,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.4)',
    shadowColor: COLORS.goldDeep,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2
  },
  bottomSavedButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.goldDeep,
    letterSpacing: 0.3
  },
  tabletWrapper: {
    width: '100%',
    maxWidth: 1040,
    alignSelf: 'center'
  },
  tabletRow: {
    flexDirection: 'row',
    gap: 18,
    marginBottom: 18,
    alignItems: 'stretch',
    width: '100%'
  },
  tabletCol: {
    flex: 1,
    minWidth: 0
  },
  sectionCardTablet: {
    flex: 1,
    marginBottom: 0
  },
  card2ContentTablet: {
    flex: 1,
    justifyContent: 'space-between'
  },
  tabletCtaContainer: {
    alignSelf: 'center',
    width: 380,
    maxWidth: '100%',
    marginTop: 6,
    marginBottom: 24
  },
  primaryActionButtonTablet: {
    width: '100%'
  },
  tabletResultsContainer: {
    width: '100%',
    maxWidth: 860,
    alignSelf: 'center'
  },
  phoneWrapper: {
    width: '100%'
  },
  optionRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: SPACING.md
  },
  inputFieldLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    letterSpacing: 0.1
  },
  whiteInputWrapper: {
    marginBottom: 4
  },
  stoneDeductionBox: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight
  },
  stoneHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2
  },
  netWeightBadge: {
    backgroundColor: COLORS.goldLightBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADII.sm,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.35)'
  },
  netWeightBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.goldDeep
  },
  quickChipRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
    marginBottom: 6
  },
  quickChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADII.sm,
    backgroundColor: COLORS.surfaceMuted,
    borderWidth: 1,
    borderColor: COLORS.borderLight
  },
  quickChipActive: {
    backgroundColor: COLORS.goldLightBg,
    borderColor: COLORS.goldMain
  },
  quickChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary
  },
  quickChipTextActive: {
    color: COLORS.goldDeep,
    fontWeight: '700'
  },
  stoneNoticeText: {
    fontSize: 10.5,
    color: COLORS.textMuted,
    marginTop: 2
  },
  rateHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs
  },
  rateStatusProvenanceText: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: -2
  },
  editRatePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADII.sm,
    backgroundColor: COLORS.goldLightBg,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.35)'
  },
  overrideToggleText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.goldDeep
  },
  resetRateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    marginBottom: 4
  },
  resetRateLinkText: {
    fontSize: 11,
    color: COLORS.goldDeep,
    fontWeight: '600',
    textDecorationLine: 'underline'
  },
  rateNoticeText: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 4,
    lineHeight: 15
  },
  collateralWarningBox: {
    backgroundColor: COLORS.errorLight,
    padding: SPACING.sm,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: COLORS.error,
    marginBottom: SPACING.md
  },
  collateralWarningText: {
    color: COLORS.error,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16
  },
  inlineWarningBox: {
    backgroundColor: COLORS.warningLight,
    padding: SPACING.sm,
    borderRadius: RADII.sm,
    borderWidth: 1,
    borderColor: 'rgba(217, 119, 6, 0.35)',
    marginTop: 6
  },
  inlineWarningText: {
    fontSize: 11,
    color: COLORS.warning,
    fontWeight: '600',
    lineHeight: 15
  },
  primaryActionButton: {
    marginBottom: SPACING.lg
  },
  simpleDropdownTrigger: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    marginBottom: SPACING.sm
  },
  simpleDropdownTriggerActive: {
    borderColor: COLORS.goldMain
  },
  simpleDropdownSelectedText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: COLORS.textPrimary,
    flex: 1
  },
  simpleDropdownMenu: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.md,
    marginBottom: SPACING.md,
    overflow: 'hidden'
  },
  simpleDropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 10
  },
  simpleDropdownItemBorder: {
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight
  },
  simpleDropdownItemSelected: {
    backgroundColor: COLORS.goldLightBg
  },
  simpleDropdownItemText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500'
  },
  simpleDropdownItemTextActive: {
    color: COLORS.goldDeep,
    fontWeight: '700'
  },
  simpleDropdownItemRight: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  simpleDropdownItemRate: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '600'
  },
  simpleDropdownItemRateActive: {
    color: COLORS.goldDeep,
    fontWeight: '700'
  },
  minimalInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: RADII.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    marginTop: 2
  },
  minimalInfoCol: {
    flex: 1,
    alignItems: 'center'
  },
  minimalInfoDivider: {
    width: 1,
    height: 24,
    backgroundColor: COLORS.border
  },
  minimalInfoLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
    marginBottom: 2
  },
  minimalInfoValue: {
    fontSize: 12.5,
    fontWeight: '700',
    color: COLORS.textPrimary
  },
  minimalInfoValueGold: {
    fontSize: 12.5,
    fontWeight: '800',
    color: COLORS.goldDeep
  },
  customRateBox: {
    marginTop: SPACING.md
  },
  resultCard: {
    padding: SPACING.lg
  },
  valuationBox: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: RADII.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md
  },
  valuationLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4
  },
  valuationAmount: {
    fontSize: 26,
    fontWeight: '900',
    color: COLORS.textPrimary,
    marginVertical: 2
  },
  valuationDisclaimerText: {
    fontSize: 10,
    color: COLORS.textMuted,
    textAlign: 'center',
    paddingHorizontal: SPACING.md
  },
  tierContainer: {
    backgroundColor: COLORS.goldLightBg,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.4)',
    padding: SPACING.md,
    marginBottom: SPACING.md
  },
  tierHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2
  },
  tierTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary
  },
  tierPercentBadge: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADII.sm,
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.goldDeep,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.4)'
  },
  tierDescription: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2
  },
  bulletRegulatoryNote: {
    fontSize: 10.5,
    color: COLORS.goldDeep,
    marginTop: 6,
    lineHeight: 14
  },
  loanApprovalBox: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    backgroundColor: COLORS.goldLightBg,
    borderRadius: RADII.lg,
    borderWidth: 1.5,
    borderColor: COLORS.goldMain,
    marginBottom: SPACING.md
  },
  loanApprovalLabel: {
    fontSize: 11.5,
    fontWeight: '800',
    color: COLORS.goldDeep,
    textTransform: 'uppercase',
    letterSpacing: 0.6
  },
  loanApprovalAmount: {
    fontSize: 32,
    fontWeight: '900',
    color: COLORS.textPrimary,
    marginVertical: 4
  },
  actualLtvText: {
    fontSize: 11.5,
    color: COLORS.textSecondary,
    fontWeight: '600'
  },
  comparisonBox: {
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    padding: SPACING.md,
    marginBottom: SPACING.md
  },
  comparisonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3
  },
  comparisonHighlightRow: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 6,
    marginTop: 4
  },
  comparisonLabel: {
    fontSize: 12,
    color: COLORS.textSecondary
  },
  comparisonValue: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary
  },
  comparisonHighlightLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: COLORS.textPrimary
  },
  comparisonHighlightValue: {
    fontSize: 13.5,
    fontWeight: '800',
    color: COLORS.goldDeep
  },
  basisNoteText: {
    fontSize: 10.5,
    color: COLORS.textMuted,
    marginTop: 4,
    fontStyle: 'italic'
  },
  warningText: {
    color: COLORS.error
  },
  shortfallCard: {
    backgroundColor: COLORS.warningLight,
    padding: SPACING.md,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: 'rgba(217, 119, 6, 0.4)',
    marginBottom: SPACING.md
  },
  shortfallTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.warning,
    marginBottom: 4
  },
  shortfallBody: {
    fontSize: 11.5,
    color: COLORS.textSecondary,
    lineHeight: 16
  },
  shortfallBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6
  },
  shortfallAmountText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: COLORS.warning
  },
  shortfallGoldNeededText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textPrimary
  },
  repaymentSummaryBox: {
    backgroundColor: COLORS.surface,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.md
  },
  repaymentTableTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
    letterSpacing: -0.1
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight
  },
  rateUsedRow: {
    backgroundColor: COLORS.goldLightBg,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: RADII.sm,
    borderBottomWidth: 0,
    marginBottom: 6,
    alignItems: 'center'
  },
  rateUsedLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.goldDeep,
    flexShrink: 0
  },
  rateUsedValueCol: {
    alignItems: 'flex-end',
    flexShrink: 1,
    marginLeft: 10
  },
  rateUsedValue: {
    fontSize: 12.5,
    fontWeight: '800',
    color: COLORS.goldDeep
  },
  rateUsedLenderSubtext: {
    fontSize: 10.5,
    fontWeight: '600',
    color: COLORS.goldDeep,
    opacity: 0.9,
    marginTop: 1.5,
    textAlign: 'right'
  },
  summaryLabel: {
    fontSize: 12,
    color: COLORS.textSecondary
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary
  },
  summaryValueGold: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.goldDeep
  },
  summaryTotalRow: {
    borderTopWidth: 1.5,
    borderTopColor: COLORS.border,
    borderBottomWidth: 0,
    paddingTop: 10,
    marginTop: 4,
    paddingBottom: 4
  },
  summaryTotalLabel: {
    fontSize: 15.5,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.2
  },
  summaryTotalValue: {
    fontSize: 19,
    fontWeight: '900',
    color: COLORS.goldDeep
  },
  approvalDisclaimer: {
    fontSize: 10,
    color: COLORS.textMuted,
    lineHeight: 14,
    textAlign: 'center',
    paddingHorizontal: SPACING.xs
  },
  saveModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg
  },
  saveModalCard: {
    width: '100%',
    maxWidth: 420,
    padding: SPACING.xl
  },
  saveModalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 2
  },
  saveModalSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted
  }
});
