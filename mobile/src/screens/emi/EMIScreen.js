/**
 * @file EMIScreen.js
 * @description EMI Calculator Screen with instant recalculation, prepayment modeling,
 * principal-vs-interest donut visualization, 360+ row amortization schedule, and CSV export.
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  Alert
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

import { PearlCard } from '../../components/PearlCard.js';
import { Input } from '../../components/Input.js';
import { SliderInput } from '../../components/SliderInput.js';
import { GoldButton } from '../../components/GoldButton.js';
import { DonutChart } from '../../components/DonutChart.js';
import { AnimatedNumber } from '../../components/AnimatedNumber.js';
import { ResponsiveContainer } from '../../components/ResponsiveContainer.js';
import { PageTitleBanner } from '../../components/PageTitleBanner.js';
import { HamburgerButton, SideDrawer, useSideDrawer } from '../../components/drawer/index.js';
import { Toast } from '../../components/Toast.js';

import { COLORS, RADII, SPACING, formatINR, useResponsiveLayout } from '../../theme/index.js';

import { calculateEMI, generateAmortizationSchedule, exportAmortizationToCSV } from '../../lib/calc/emi.js';
import { apiRequest } from '../../services/api.js';
import { logger } from '../../services/eventLogger.js';

export function EMIScreen({ navigation }) {
  const drawer = useSideDrawer();
  const { isTablet } = useResponsiveLayout();

  // Inputs
  const [principal, setPrincipal] = useState('500000');
  const [annualRate, setAnnualRate] = useState('10.0');
  const [tenureValue, setTenureValue] = useState('5');
  const [tenureUnit, setTenureUnit] = useState('years'); // 'years' | 'months'
  const [processingFee, setProcessingFee] = useState('0.5');
  const [feeType, setFeeType] = useState('percent'); // 'percent' | 'flat'
  const [financeFee, setFinanceFee] = useState(false);

  // Prepayment inputs
  const [extraMonthlyPayment, setExtraMonthlyPayment] = useState('0');
  const [lumpSumAmount, setLumpSumAmount] = useState('0');
  const [lumpSumMonth, setLumpSumMonth] = useState('12');
  const [showPrepaymentSection, setShowPrepaymentSection] = useState(false);

  // UI state
  const [showAmortizationModal, setShowAmortizationModal] = useState(false);
  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const [saveLabel, setSaveLabel] = useState('Home Loan 5L');
  const [toastMessage, setToastMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Effective tenure in months
  const tenureMonths = useMemo(() => {
    const val = Number(tenureValue) || 1;
    return tenureUnit === 'years' ? Math.round(val * 12) : Math.round(val);
  }, [tenureValue, tenureUnit]);

  // Instant calculation via pure /lib/calc engine
  const calculationResult = useMemo(() => {
    const prepayments = Number(lumpSumAmount) > 0 ? [{ month: Number(lumpSumMonth) || 1, amount: Number(lumpSumAmount) }] : [];

    const baseEmi = calculateEMI({
      principal: Number(principal) || 0,
      annualRate: Number(annualRate) || 0,
      tenureMonths,
      processingFee: Number(processingFee) || 0,
      feeType,
      financeFee
    });

    const amortization = generateAmortizationSchedule({
      principal: Number(principal) || 0,
      annualRate: Number(annualRate) || 0,
      tenureMonths,
      extraMonthlyPayment: Number(extraMonthlyPayment) || 0,
      prepayments,
      processingFee: Number(processingFee) || 0,
      feeType,
      financeFee
    });

    return { baseEmi, amortization };
  }, [principal, annualRate, tenureMonths, processingFee, feeType, financeFee, extraMonthlyPayment, lumpSumAmount, lumpSumMonth]);

  // Log calculation debounced (1.5s settle time per specification)
  useEffect(() => {
    logger.logDebouncedCalculation({
      module: 'emi',
      action: 'calculate_emi',
      screen: 'EMIScreen',
      inputs: {
        principal: Number(principal),
        annualRate: Number(annualRate),
        tenureMonths,
        extraMonthlyPayment: Number(extraMonthlyPayment),
        lumpSumAmount: Number(lumpSumAmount)
      },
      resultSummary: {
        emi: calculationResult.baseEmi.emi,
        totalPayment: calculationResult.baseEmi.totalPayment,
        actualTenure: calculationResult.amortization.summary.actualTenureMonths,
        interestSaved: calculationResult.amortization.summary.interestSaved
      }
    });
  }, [principal, annualRate, tenureMonths, extraMonthlyPayment, lumpSumAmount]);

  // CSV Export
  const handleExportCSV = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const csvString = exportAmortizationToCSV(calculationResult.amortization.schedule);
      const fileUri = `${FileSystem.documentDirectory}Amortization_Schedule_${Date.now()}.csv`;

      await FileSystem.writeAsStringAsync(fileUri, csvString, { encoding: FileSystem.EncodingType.UTF8 });

      logger.logAction({
        module: 'emi',
        action: 'export_csv',
        screen: 'EMIScreen',
        resultSummary: { rowsExported: calculationResult.amortization.schedule.length }
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Download Amortization Schedule CSV',
          UTI: 'public.comma-separated-values-text'
        });
      } else {
        Alert.alert('Export Complete', `File saved to: ${fileUri}`);
      }
    } catch (err) {
      Alert.alert('Export Error', err.message);
    }
  };

  // Save calculation to backend
  const handleSaveCalculation = async () => {
    if (!saveLabel.trim()) return;
    setIsSaving(true);

    try {
      await apiRequest('/calculations/save', {
        method: 'POST',
        body: JSON.stringify({
          type: 'emi',
          label: saveLabel.trim(),
          inputs: {
            principal: Number(principal),
            annualRate: Number(annualRate),
            tenureMonths,
            extraMonthlyPayment: Number(extraMonthlyPayment),
            lumpSumAmount: Number(lumpSumAmount),
            lumpSumMonth: Number(lumpSumMonth)
          },
          results: {
            emi: calculationResult.baseEmi.emi,
            totalInterest: calculationResult.amortization.summary.totalInterestPaid,
            totalPayment: calculationResult.amortization.summary.totalAmountPaid,
            actualTenureMonths: calculationResult.amortization.summary.actualTenureMonths,
            interestSaved: calculationResult.amortization.summary.interestSaved
          }
        })
      });

      setSaveModalVisible(false);
      setToastMessage('Calculation saved successfully!');
      setTimeout(() => setToastMessage(''), 3000);
    } catch (err) {
      Alert.alert('Save Failed', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Left Column / Card 1: Inputs & Controls
  const renderInputs = (
    <View style={isTablet ? styles.tabletCard : styles.phoneCard}>
      <PearlCard goldTrim={true} style={isTablet ? styles.tabletPearlCard : undefined}>
        <Text style={styles.cardHeaderTitle}>Loan Parameters</Text>

        <SliderInput
          label="Loan Principal Amount"
          value={principal}
          onValueChange={setPrincipal}
          min={10000}
          max={10000000}
          step={50000}
          prefix="₹"
          quickOptions={['100000', '500000', '1000000', '2500000']}
        />

        <SliderInput
          label="Annual Interest Rate (% p.a.)"
          value={annualRate}
          onValueChange={setAnnualRate}
          min={1.0}
          max={30.0}
          step={0.25}
          suffix="%"
          quickOptions={['8.5', '10.0', '12.0', '14.5']}
        />

        {/* Tenure row with Years / Months toggle */}
        <View style={styles.tenureHeaderRow}>
          <Text style={styles.inputLabel}>Loan Tenure</Text>
          <View style={styles.unitToggleRow}>
            <TouchableOpacity
              onPress={() => setTenureUnit('years')}
              style={[styles.unitToggleBtn, tenureUnit === 'years' && styles.unitToggleBtnActive]}
            >
              <Text style={[styles.unitToggleText, tenureUnit === 'years' && styles.unitToggleTextActive]}>Years</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setTenureUnit('months')}
              style={[styles.unitToggleBtn, tenureUnit === 'months' && styles.unitToggleBtnActive]}
            >
              <Text style={[styles.unitToggleText, tenureUnit === 'months' && styles.unitToggleTextActive]}>Months</Text>
            </TouchableOpacity>
          </View>
        </View>

        <SliderInput
          value={tenureValue}
          onValueChange={setTenureValue}
          min={1}
          max={tenureUnit === 'years' ? 30 : 360}
          step={1}
          suffix={tenureUnit === 'years' ? 'Yrs' : 'Mos'}
          quickOptions={tenureUnit === 'years' ? ['1', '3', '5', '10', '20'] : ['12', '36', '60', '120']}
        />

        {/* Processing Fee */}
        <View style={styles.feeRow}>
          <View style={{ flex: 1 }}>
            <Input
              label="Processing Fee"
              value={processingFee}
              onChangeText={setProcessingFee}
              keyboardType="decimal-pad"
              prefix={feeType === 'flat' ? '₹' : undefined}
              suffix={feeType === 'percent' ? '%' : undefined}
            />
          </View>
          <View style={styles.feeTypeButtons}>
            <TouchableOpacity
              onPress={() => setFeeType('percent')}
              style={[styles.feeTypeBtn, feeType === 'percent' && styles.feeTypeBtnActive]}
            >
              <Text style={[styles.feeTypeText, feeType === 'percent' && styles.feeTypeTextActive]}>%</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setFeeType('flat')}
              style={[styles.feeTypeBtn, feeType === 'flat' && styles.feeTypeBtnActive]}
            >
              <Text style={[styles.feeTypeText, feeType === 'flat' && styles.feeTypeTextActive]}>₹ Flat</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Prepayment Accordion Toggle */}
        <TouchableOpacity
          onPress={() => setShowPrepaymentSection(!showPrepaymentSection)}
          style={styles.prepaymentToggle}
        >
          <Text style={styles.prepaymentToggleText}>
            {showPrepaymentSection ? '▼ Hide Prepayment Options' : '▶ Add Prepayments (Save Interest & Tenure)'}
          </Text>
        </TouchableOpacity>

        {showPrepaymentSection && (
          <View style={styles.prepaymentBox}>
            <Input
              label="Extra Monthly Principal Payment"
              value={extraMonthlyPayment}
              onChangeText={setExtraMonthlyPayment}
              placeholder="e.g. 5000"
              keyboardType="numeric"
              prefix="₹"
            />
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1.4 }}>
                <Input
                  label="Lump-Sum Prepayment"
                  value={lumpSumAmount}
                  onChangeText={setLumpSumAmount}
                  placeholder="e.g. 100000"
                  keyboardType="numeric"
                  prefix="₹"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  label="At Month"
                  value={lumpSumMonth}
                  onChangeText={setLumpSumMonth}
                  placeholder="12"
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>
        )}
      </PearlCard>
    </View>
  );

  // Right Column / Card 2: Outputs, Donut Chart, and Actions
  const renderResults = (
    <View style={isTablet ? styles.tabletCard : styles.phoneCard}>
      <PearlCard goldTrim={true} style={[styles.resultCard, isTablet && styles.tabletPearlCard]}>
        <Text style={styles.cardHeaderTitle}>Calculated EMI Summary</Text>

        <View style={styles.mainEmiContainer}>
          <Text style={styles.emiLabel}>Monthly Installment (EMI)</Text>
          <AnimatedNumber
            value={calculationResult.baseEmi.emi}
            isCurrency={true}
            style={styles.mainEmiNumber}
          />
          <Text style={styles.roundingRuleNote}>
            Exact paise compounding. Final installment adjusted to balance precisely at ₹0.00.
          </Text>
        </View>

        {/* Donut Chart */}
        <DonutChart
          principal={calculationResult.amortization.summary.effectivePrincipal}
          interest={calculationResult.amortization.summary.totalInterestPaid}
        />

        {/* Prepayment Savings Badge */}
        {calculationResult.amortization.summary.interestSaved > 0 && (
          <View style={styles.savingsBanner}>
            <Text style={styles.savingsBannerTitle}>🎉 Prepayment Savings</Text>
            <Text style={styles.savingsBannerText}>
              You save <Text style={styles.savingsBold}>{formatINR(calculationResult.amortization.summary.interestSaved)}</Text> in total interest and close the loan <Text style={styles.savingsBold}>{calculationResult.amortization.summary.monthsSaved} months</Text> earlier!
            </Text>
          </View>
        )}

        {/* Breakdown Metric Rows */}
        <View style={styles.metricsContainer}>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Loan Amount</Text>
            <Text style={styles.metricValue}>{formatINR(calculationResult.amortization.summary.effectivePrincipal)}</Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Processing Fee</Text>
            <Text style={styles.metricValue}>{formatINR(calculationResult.baseEmi.processingFeeAmount)}</Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Total Interest Payable</Text>
            <Text style={[styles.metricValue, { color: '#B8860B' }]}>
              {formatINR(calculationResult.amortization.summary.totalInterestPaid)}
            </Text>
          </View>
          <View style={[styles.metricRow, styles.metricRowTotal]}>
            <Text style={styles.metricLabelTotal}>Total Amount Payable</Text>
            <Text style={styles.metricValueTotal}>
              {formatINR(calculationResult.amortization.summary.totalAmountPaid)}
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtonsRow}>
          <GoldButton
            title="View Full Schedule"
            variant="secondary"
            onPress={() => setShowAmortizationModal(true)}
            style={{ flex: 1 }}
            buttonStyle={{ flex: 1 }}
          />
          <GoldButton
            title="Export CSV"
            variant="dark"
            onPress={handleExportCSV}
            style={{ flex: 1 }}
            buttonStyle={{ flex: 1 }}
          />
        </View>

        <GoldButton
          title="Save Calculation"
          variant="primary"
          onPress={() => setSaveModalVisible(true)}
          style={{ marginTop: 10 }}
        />
      </PearlCard>

      {/* Amortization Schedule Full Modal */}
      <Modal
        visible={showAmortizationModal}
        animationType="slide"
        onRequestClose={() => setShowAmortizationModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Amortization Schedule</Text>
            <TouchableOpacity onPress={() => setShowAmortizationModal(false)} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕ Close</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.tableHeaderRow}>
            <Text style={[styles.thCell, { flex: 0.8 }]}>Month</Text>
            <Text style={[styles.thCell, { flex: 1.4 }]}>EMI</Text>
            <Text style={[styles.thCell, { flex: 1.2 }]}>Principal</Text>
            <Text style={[styles.thCell, { flex: 1.2 }]}>Interest</Text>
            <Text style={[styles.thCell, { flex: 1.4 }]}>Balance</Text>
          </View>

          <FlatList
            data={calculationResult.amortization.schedule}
            keyExtractor={(item) => String(item.month)}
            renderItem={({ item }) => (
              <View style={styles.tableRow}>
                <Text style={[styles.tdCell, { flex: 0.8 }]}>{item.month}</Text>
                <Text style={[styles.tdCell, { flex: 1.4, fontWeight: '700' }]}>{formatINR(item.emi)}</Text>
                <Text style={[styles.tdCell, { flex: 1.2, color: COLORS.success }]}>{formatINR(item.principalPaid)}</Text>
                <Text style={[styles.tdCell, { flex: 1.2, color: COLORS.goldDeep }]}>{formatINR(item.interest)}</Text>
                <Text style={[styles.tdCell, { flex: 1.4 }]}>{formatINR(item.closingBalance)}</Text>
              </View>
            )}
            initialNumToRender={24}
            maxToRenderPerBatch={36}
            windowSize={11}
          />

          <View style={styles.modalFooter}>
            <GoldButton
              title="Download CSV"
              variant="primary"
              onPress={handleExportCSV}
            />
          </View>
        </View>
      </Modal>

      {/* Save Modal */}
      <Modal
        visible={saveModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSaveModalVisible(false)}
      >
        <View style={styles.saveModalOverlay}>
          <PearlCard style={styles.saveModalCard}>
            <Text style={styles.saveModalTitle}>Save Calculation</Text>
            <Text style={styles.saveModalSubtitle}>Provide a label to access this calculation in My History</Text>

            <Input
              label="Calculation Label"
              value={saveLabel}
              onChangeText={setSaveLabel}
              placeholder="e.g. SBI Home Loan"
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
                onPress={handleSaveCalculation}
                loading={isSaving}
                style={{ flex: 1 }}
              />
            </View>
          </PearlCard>
        </View>
      </Modal>
    </View>
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
        title="EMI CALCULATOR"
        description={`Plan monthly installments, interest amortization,\nand total repayment clarity`}
      />
    </View>
  );

  return (
    <View style={styles.screen}>
      <Toast message={toastMessage} visible={Boolean(toastMessage)} />
      <ResponsiveContainer headerContent={renderHeader} scrollable={!drawer.isOpen}>
        <View style={isTablet ? styles.tabletWrapper : styles.phoneWrapper}>
          {renderInputs}
          {renderResults}

          {/* Bottom Saved Calculations Button Aligned to Middle at Bottom-most */}
          <View style={styles.bottomSavedContainer}>
            <TouchableOpacity
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                navigation.navigate('SavedEMI');
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
        </View>
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
    maxWidth: 720,
    alignSelf: 'center',
    alignItems: 'center'
  },
  tabletCard: {
    width: '100%',
    marginBottom: 24
  },
  tabletPearlCard: {
    padding: SPACING.xl
  },
  phoneWrapper: {
    width: '100%'
  },
  phoneCard: {
    width: '100%',
    marginBottom: 16
  },
  cardHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
    letterSpacing: -0.2
  },
  tenureHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary
  },
  unitToggleRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: RADII.sm,
    padding: 2
  },
  unitToggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: RADII.sm - 2
  },
  unitToggleBtnActive: {
    backgroundColor: COLORS.surface,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1
  },
  unitToggleText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600'
  },
  unitToggleTextActive: {
    color: COLORS.goldDeep,
    fontWeight: '800'
  },
  feeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12
  },
  feeTypeButtons: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: RADII.md,
    padding: 2,
    marginTop: 22
  },
  feeTypeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: RADII.md - 2
  },
  feeTypeBtnActive: {
    backgroundColor: COLORS.surface
  },
  feeTypeText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '600'
  },
  feeTypeTextActive: {
    color: COLORS.goldDeep,
    fontWeight: '700'
  },
  prepaymentToggle: {
    paddingVertical: SPACING.sm,
    marginTop: SPACING.xs
  },
  prepaymentToggleText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.goldDeep
  },
  prepaymentBox: {
    marginTop: SPACING.xs,
    padding: SPACING.md,
    backgroundColor: COLORS.goldLightBg,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: COLORS.borderGold
  },
  resultCard: {
    padding: SPACING.lg
  },
  mainEmiContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.goldLightBg,
    borderRadius: RADII.lg,
    borderWidth: 1.5,
    borderColor: COLORS.borderGold
  },
  emiLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  mainEmiNumber: {
    fontSize: 32,
    fontWeight: '900',
    color: COLORS.goldDeep,
    marginVertical: 4
  },
  roundingRuleNote: {
    fontSize: 10,
    color: COLORS.textMuted,
    textAlign: 'center',
    paddingHorizontal: SPACING.md
  },
  savingsBanner: {
    backgroundColor: '#ECFDF5',
    padding: SPACING.md,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginVertical: SPACING.sm
  },
  savingsBannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#065F46',
    marginBottom: 2
  },
  savingsBannerText: {
    fontSize: 12,
    color: '#047857',
    lineHeight: 16
  },
  savingsBold: {
    fontWeight: '800'
  },
  metricsContainer: {
    marginTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    paddingTop: SPACING.sm
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6
  },
  metricRowTotal: {
    borderTopWidth: 1.5,
    borderTopColor: COLORS.border,
    marginTop: 8,
    paddingTop: 12,
    paddingBottom: 4
  },
  metricLabel: {
    fontSize: 13,
    color: COLORS.textSecondary
  },
  metricValue: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary
  },
  metricLabelTotal: {
    fontSize: 15.5,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.2
  },
  metricValueTotal: {
    fontSize: 19,
    fontWeight: '900',
    color: COLORS.goldDeep
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: SPACING.md
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: 45
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary
  },
  closeBtn: {
    padding: SPACING.xs
  },
  closeBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.goldDeep
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceMuted,
    paddingVertical: 10,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border
  },
  thCell: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    backgroundColor: COLORS.surface
  },
  tdCell: {
    fontSize: 12,
    color: COLORS.textPrimary
  },
  modalFooter: {
    padding: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight
  },
  saveModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: SPACING.xl
  },
  saveModalCard: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
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
