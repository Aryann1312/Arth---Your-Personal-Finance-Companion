/**
 * @file GoldLoanScreen.js
 * @description Gold Loan Calculator Screen with tiered regulatory LTV, collateral limit checks,
 * separation of intrinsic value vs eligible loan, 3 repayment methods, and illustrative lender comparisons.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert
} from 'react-native';
import * as Haptics from 'expo-haptics';

import { PearlCard } from '../../components/PearlCard.js';
import { Input } from '../../components/Input.js';
import { SliderInput } from '../../components/SliderInput.js';
import { GoldButton } from '../../components/GoldButton.js';
import { AnimatedNumber } from '../../components/AnimatedNumber.js';
import { ResponsiveContainer } from '../../components/ResponsiveContainer.js';
import { Toast } from '../../components/Toast.js';
import { COLORS, RADII, SPACING, formatINR } from '../../theme/index.js';

import { calculateGoldLoan } from '../../lib/calc/goldLoan.js';
import { ILLUSTRATIVE_LENDER_PRESETS } from '../../lib/calc/config.js';
import { apiRequest } from '../../services/api.js';
import { logger } from '../../services/eventLogger.js';

export function GoldLoanScreen({ navigation }) {
  // Inputs
  const [weight, setWeight] = useState('50');
  const [purity, setPurity] = useState('22K'); // '24K' | '22K' | '18K'
  const [goldRatePerGram, setGoldRatePerGram] = useState('7850');
  const [isManualRate, setIsManualRate] = useState(false);
  const [collateralType, setCollateralType] = useState('ornament'); // 'ornament' | 'coin'
  const [requestedLoanAmount, setRequestedLoanAmount] = useState('');
  const [repaymentMethod, setRepaymentMethod] = useState('bullet'); // 'bullet' | 'emi' | 'maturity'
  const [annualRate, setAnnualRate] = useState('10.5');
  const [tenureMonths, setTenureMonths] = useState('12');
  const [selectedLenderId, setSelectedLenderId] = useState('psu-bank-standard');

  // UI state
  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const [saveLabel, setSaveLabel] = useState('Gold Loan 50g');
  const [toastMessage, setToastMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Fetch live rate on mount
  useEffect(() => {
    async function fetchLiveRate() {
      try {
        const res = await apiRequest('/gold/live');
        if (res && res.data && res.data.price24kPerGram) {
          if (!isManualRate) {
            setGoldRatePerGram(String(res.data.price24kPerGram));
          }
        }
      } catch {
        // Fallback to default benchmark
      }
    }
    fetchLiveRate();
  }, []);

  // Selected lender preset
  const selectedLender = useMemo(() => {
    return ILLUSTRATIVE_LENDER_PRESETS.find(p => p.id === selectedLenderId) || ILLUSTRATIVE_LENDER_PRESETS[0];
  }, [selectedLenderId]);

  // When lender changes, update default rate & tenure
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

  // Instant Calculation
  const result = useMemo(() => {
    return calculateGoldLoan({
      weight: Number(weight) || 0,
      purity,
      goldRatePerGram: Number(goldRatePerGram) || 0,
      requestedLoanAmount: requestedLoanAmount ? Number(requestedLoanAmount) : undefined,
      annualRate: Number(annualRate) || 0,
      tenureMonths: Number(tenureMonths) || 12,
      repaymentMethod,
      collateralType,
      processingFee: selectedLender.processingFeePercent,
      feeType: selectedLender.feeType,
      lenderPreset: selectedLender
    });
  }, [weight, purity, goldRatePerGram, requestedLoanAmount, annualRate, tenureMonths, repaymentMethod, collateralType, selectedLender]);

  // Log calculation debounced
  useEffect(() => {
    logger.logDebouncedCalculation({
      module: 'gold_loan',
      action: 'calculate_gold_loan',
      screen: 'GoldLoanScreen',
      inputs: {
        weight: Number(weight),
        purity,
        goldRatePerGram: Number(goldRatePerGram),
        repaymentMethod,
        collateralType,
        selectedLender: selectedLender.name
      },
      resultSummary: {
        assessedValue: result.valuation.assessedGoldValue,
        maxEligibleLoan: result.loan.maxEligibleLoan,
        approvedLoan: result.loan.approvedLoanAmount,
        periodicPayment: result.loan.periodicPayment,
        appliedTier: result.ltv.appliedTier
      }
    });
  }, [weight, purity, goldRatePerGram, requestedLoanAmount, repaymentMethod, collateralType, selectedLenderId]);

  // Save calculation
  const handleSave = async () => {
    if (!saveLabel.trim()) return;
    setIsSaving(true);

    try {
      await apiRequest('/calculations/save', {
        method: 'POST',
        body: JSON.stringify({
          type: 'gold-loan',
          label: saveLabel.trim(),
          inputs: {
            weight: Number(weight),
            purity,
            goldRatePerGram: Number(goldRatePerGram),
            repaymentMethod,
            collateralType,
            annualRate: Number(annualRate),
            tenureMonths: Number(tenureMonths),
            lender: selectedLender.name
          },
          results: {
            pureWeightGrams: result.collateral.pureGoldEquivalentWeightGrams,
            assessedGoldValue: result.valuation.assessedGoldValue,
            maxEligibleLoan: result.loan.maxEligibleLoan,
            approvedLoanAmount: result.loan.approvedLoanAmount,
            periodicPayment: result.loan.periodicPayment,
            totalInterest: result.loan.totalInterest,
            totalRepayment: result.loan.totalRepayment,
            appliedTier: result.ltv.appliedTier
          }
        })
      });

      setSaveModalVisible(false);
      setToastMessage('Gold loan calculation saved!');
      setTimeout(() => setToastMessage(''), 3000);
    } catch (err) {
      Alert.alert('Save Failed', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Left Column: Inputs & Collateral Specifications
  const renderInputs = (
    <View>
      <PearlCard goldTrim={true}>
        <Text style={styles.cardHeaderTitle}>Gold Collateral Details</Text>

        {/* Collateral Type Toggle */}
        <View style={styles.pillToggleRow}>
          <TouchableOpacity
            onPress={() => setCollateralType('ornament')}
            style={[styles.pillToggleBtn, collateralType === 'ornament' && styles.pillToggleBtnActive]}
          >
            <Text style={[styles.pillToggleText, collateralType === 'ornament' && styles.pillToggleTextActive]}>
              Jewellery / Ornaments (Max 1 kg)
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setCollateralType('coin')}
            style={[styles.pillToggleBtn, collateralType === 'coin' && styles.pillToggleBtnActive]}
          >
            <Text style={[styles.pillToggleText, collateralType === 'coin' && styles.pillToggleTextActive]}>
              Coins (Max 50 g)
            </Text>
          </TouchableOpacity>
        </View>

        {/* Collateral limit error warning if breached */}
        {!result.collateral.isCollateralValid && (
          <View style={styles.collateralWarningBox}>
            <Text style={styles.collateralWarningText}>
              ⚠️ {result.collateral.collateralLimitError}
            </Text>
          </View>
        )}

        <SliderInput
          label="Gross Gold Weight (Grams)"
          value={weight}
          onValueChange={setWeight}
          min={1}
          max={collateralType === 'coin' ? 50 : 500}
          step={5}
          suffix="g"
          quickOptions={collateralType === 'coin' ? ['5', '10', '20', '50'] : ['20', '50', '100', '250']}
        />

        {/* Purity Segmented Control */}
        <Text style={styles.inputLabel}>Gold Purity Hallmark</Text>
        <View style={styles.purityRow}>
          {['24K', '22K', '18K'].map((p) => {
            const isSelected = purity === p;
            return (
              <TouchableOpacity
                key={p}
                onPress={() => setPurity(p)}
                style={[styles.purityBtn, isSelected && styles.purityBtnActive]}
              >
                <Text style={[styles.purityBtnTitle, isSelected && styles.purityBtnTitleActive]}>{p}</Text>
                <Text style={[styles.purityBtnSub, isSelected && styles.purityBtnSubActive]}>
                  {p === '24K' ? '99.9%' : p === '22K' ? '91.6%' : '75.0%'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 24K Gold Rate Reference & Manual Override Toggle */}
        <View style={styles.rateHeaderRow}>
          <Text style={styles.inputLabel}>24K Gold Benchmark Rate</Text>
          <TouchableOpacity onPress={() => setIsManualRate(!isManualRate)}>
            <Text style={styles.overrideToggleText}>
              {isManualRate ? 'Auto Live Rate' : 'Manual Override'}
            </Text>
          </TouchableOpacity>
        </View>
        <Input
          value={goldRatePerGram}
          onChangeText={setGoldRatePerGram}
          keyboardType="numeric"
          prefix="₹"
          suffix="/ gram"
          editable={isManualRate}
          style={{ marginBottom: SPACING.md }}
        />

        {/* Pure Gold Equivalent Badge */}
        <View style={styles.pureWeightBadge}>
          <Text style={styles.pureWeightLabel}>Pure Gold Equivalent (24K fine):</Text>
          <Text style={styles.pureWeightValue}>{result.collateral.pureGoldEquivalentWeightGrams} g</Text>
        </View>

        {/* Repayment Method Selector */}
        <Text style={[styles.inputLabel, { marginTop: SPACING.md }]}>Repayment Structure</Text>
        <View style={styles.repaymentRow}>
          {[
            { id: 'bullet', label: 'Monthly Interest', sub: 'Principal at end' },
            { id: 'emi', label: 'Regular EMI', sub: 'Installments' },
            { id: 'maturity', label: 'Bullet Repayment', sub: 'All at end' }
          ].map((m) => {
            const isSelected = repaymentMethod === m.id;
            return (
              <TouchableOpacity
                key={m.id}
                onPress={() => setRepaymentMethod(m.id)}
                style={[styles.repaymentBtn, isSelected && styles.repaymentBtnActive]}
              >
                <Text style={[styles.repaymentTitle, isSelected && styles.repaymentTitleActive]}>{m.label}</Text>
                <Text style={[styles.repaymentSub, isSelected && styles.repaymentSubActive]}>{m.sub}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Requested Loan Amount (Optional) */}
        <Input
          label="Desired Loan Amount (Optional)"
          value={requestedLoanAmount}
          onChangeText={setRequestedLoanAmount}
          placeholder="Leave blank for max eligible"
          keyboardType="numeric"
          prefix="₹"
          style={{ marginTop: SPACING.md }}
        />
      </PearlCard>

      {/* Illustrative Lender Comparison Cards */}
      <View style={styles.lenderSection}>
        <Text style={styles.sectionHeaderTitle}>Compare Lender Assumptions</Text>
        <Text style={styles.sectionSubtitle}>Select an illustrative preset (not official loan offers):</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.lendersScroll}>
          {ILLUSTRATIVE_LENDER_PRESETS.map((preset) => {
            const isSelected = selectedLenderId === preset.id;
            return (
              <TouchableOpacity
                key={preset.id}
                onPress={() => handleSelectLender(preset)}
                style={[styles.lenderCard, isSelected && styles.lenderCardActive]}
              >
                <View style={styles.lenderBadgeRow}>
                  <Text style={styles.lenderCategory}>{preset.category}</Text>
                  {preset.isIllustrative && (
                    <View style={styles.illustrativeBadge}>
                      <Text style={styles.illustrativeBadgeText}>Illustrative</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.lenderName}>{preset.name}</Text>
                <Text style={styles.lenderRate}>{preset.defaultAnnualRate}% p.a.</Text>
                <Text style={styles.lenderTenure}>Tenure: Up to {preset.maxTenureMonths} Mos</Text>
                <Text style={styles.lenderFee}>
                  Fee: {preset.processingFeePercent > 0 ? `${preset.processingFeePercent}%` : `₹${preset.processingFeeFlat}`}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );

  // Right Column: Valuation, Eligible Loan & Repayment
  const renderResults = (
    <View>
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
            Intrinsic metal value before stone deductions or risk haircuts.
          </Text>
        </View>

        {/* Regulatory LTV Tier Badge */}
        <View style={styles.tierContainer}>
          <View style={styles.tierHeaderRow}>
            <Text style={styles.tierTitle}>RBI Regulatory LTV Cap</Text>
            <Text style={styles.tierPercentBadge}>{result.ltv.effectiveMaxLtvPercent}% Max LTV</Text>
          </View>
          <Text style={styles.tierDescription}>{result.ltv.appliedTier}</Text>
        </View>

        {/* Separate Loan Eligible Amount */}
        <View style={styles.loanApprovalBox}>
          <Text style={styles.loanApprovalLabel}>Maximum Eligible Loan Approval</Text>
          <AnimatedNumber
            value={result.loan.approvedLoanAmount}
            isCurrency={true}
            style={styles.loanApprovalAmount}
          />
          <Text style={styles.actualLtvText}>
            Effective LTV: {result.ltv.effectiveApprovedLtvPercent}% of collateral value
          </Text>
        </View>

        {/* Repayment Breakdown */}
        <View style={styles.repaymentSummaryBox}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>
              {repaymentMethod === 'emi' ? 'Monthly EMI' : repaymentMethod === 'bullet' ? 'Monthly Interest' : 'Periodic Payment'}
            </Text>
            <Text style={styles.summaryValueGold}>{formatINR(result.loan.periodicPayment)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Interest ({tenureMonths} Months)</Text>
            <Text style={styles.summaryValue}>{formatINR(result.loan.totalInterest)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Processing Fee</Text>
            <Text style={styles.summaryValue}>{formatINR(result.loan.processingFeeAmount)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Net Disbursal</Text>
            <Text style={styles.summaryValue}>{formatINR(result.loan.netDisbursalAmount)}</Text>
          </View>
          <View style={[styles.summaryRow, styles.summaryTotalRow]}>
            <Text style={styles.summaryTotalLabel}>Total Repayment</Text>
            <Text style={styles.summaryTotalValue}>{formatINR(result.loan.totalRepayment)}</Text>
          </View>
        </View>

        <Text style={styles.approvalDisclaimer}>
          {result.loan.approvalDisclaimer}
        </Text>

        <GoldButton
          title="Save Gold Loan"
          variant="primary"
          onPress={() => setSaveModalVisible(true)}
          style={{ marginTop: SPACING.md }}
        />
      </PearlCard>

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
    </View>
  );

  return (
    <View style={styles.screen}>
      <Toast message={toastMessage} visible={Boolean(toastMessage)} />
      <ResponsiveContainer
        leftContent={renderInputs}
        rightContent={renderResults}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  cardHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md
  },
  pillToggleRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: RADII.md,
    padding: 3,
    marginBottom: SPACING.md
  },
  pillToggleBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: RADII.sm
  },
  pillToggleBtnActive: {
    backgroundColor: COLORS.surface,
    elevation: 2
  },
  pillToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary
  },
  pillToggleTextActive: {
    color: COLORS.goldDeep,
    fontWeight: '800'
  },
  collateralWarningBox: {
    backgroundColor: COLORS.errorLight,
    padding: SPACING.md,
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
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs
  },
  purityRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: SPACING.md
  },
  purityBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: RADII.md,
    backgroundColor: COLORS.surfaceMuted,
    borderWidth: 1.5,
    borderColor: COLORS.border
  },
  purityBtnActive: {
    backgroundColor: COLORS.goldLightBg,
    borderColor: COLORS.goldMain
  },
  purityBtnTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textSecondary
  },
  purityBtnTitleActive: {
    color: COLORS.goldDeep
  },
  purityBtnSub: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2
  },
  purityBtnSubActive: {
    color: COLORS.goldDeep,
    fontWeight: '700'
  },
  rateHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs
  },
  overrideToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.goldDeep
  },
  pureWeightBadge: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surfaceMuted,
    padding: SPACING.md,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    marginBottom: SPACING.md
  },
  pureWeightLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500'
  },
  pureWeightValue: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.goldDeep
  },
  repaymentRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: SPACING.sm
  },
  repaymentBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
    borderRadius: RADII.md,
    backgroundColor: COLORS.surfaceMuted,
    borderWidth: 1.5,
    borderColor: COLORS.border
  },
  repaymentBtnActive: {
    backgroundColor: COLORS.goldLightBg,
    borderColor: COLORS.goldMain
  },
  repaymentTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textAlign: 'center'
  },
  repaymentTitleActive: {
    color: COLORS.goldDeep
  },
  repaymentSub: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 2,
    textAlign: 'center'
  },
  repaymentSubActive: {
    color: COLORS.goldDeep
  },
  lenderSection: {
    marginTop: SPACING.lg
  },
  sectionHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 2
  },
  sectionSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: SPACING.sm
  },
  lendersScroll: {
    marginBottom: SPACING.md
  },
  lenderCard: {
    width: 200,
    padding: SPACING.md,
    borderRadius: RADII.lg,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    marginRight: 10
  },
  lenderCardActive: {
    borderColor: COLORS.goldMain,
    backgroundColor: COLORS.goldLightBg
  },
  lenderBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4
  },
  lenderCategory: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase'
  },
  illustrativeBadge: {
    backgroundColor: COLORS.surfaceMuted,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4
  },
  illustrativeBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.textMuted
  },
  lenderName: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 4
  },
  lenderRate: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.goldDeep,
    marginBottom: 2
  },
  lenderTenure: {
    fontSize: 11,
    color: COLORS.textSecondary
  },
  lenderFee: {
    fontSize: 11,
    color: COLORS.textMuted
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
    paddingHorizontal: SPACING.sm
  },
  tierContainer: {
    backgroundColor: COLORS.goldLightBg,
    padding: SPACING.md,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: COLORS.borderGold,
    marginBottom: SPACING.md
  },
  tierHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  tierTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.goldDeep,
    textTransform: 'uppercase'
  },
  tierPercentBadge: {
    fontSize: 13,
    fontWeight: '900',
    color: COLORS.goldDeep
  },
  tierDescription: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2
  },
  loanApprovalBox: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    backgroundColor: '#FFFFFF',
    borderRadius: RADII.xl,
    borderWidth: 2,
    borderColor: COLORS.goldMain,
    marginBottom: SPACING.md,
    elevation: 3
  },
  loanApprovalLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.goldDeep,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  loanApprovalAmount: {
    fontSize: 34,
    fontWeight: '900',
    color: COLORS.textPrimary,
    marginVertical: 4
  },
  actualLtvText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.success
  },
  repaymentSummaryBox: {
    paddingVertical: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5
  },
  summaryLabel: {
    fontSize: 13,
    color: COLORS.textSecondary
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary
  },
  summaryValueGold: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.goldDeep
  },
  summaryTotalRow: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: 4,
    paddingTop: 8
  },
  summaryTotalLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary
  },
  summaryTotalValue: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.goldDeep
  },
  approvalDisclaimer: {
    fontSize: 10,
    color: COLORS.textMuted,
    lineHeight: 14,
    marginTop: SPACING.sm,
    textAlign: 'center'
  },
  saveModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: SPACING.xl
  },
  saveModalCard: {
    padding: SPACING.xl
  },
  saveModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary
  },
  saveModalSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4
  }
});
