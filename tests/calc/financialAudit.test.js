/**
 * @file financialAudit.test.js
 * @description Master financial calculation audit test suite:
 * 1. Independent Reducing-Balance EMI Formula Verification
 * 2. Section 4 Realistic Gold Loan Test Cases:
 *    - Valuations: ₹12,67,234 and ₹25,34,468
 *    - Desired Loans: ₹5,00,000 and ₹7,00,000
 *    - LTV Calculations: 75% and 39.46%
 *    - Processing fees and net disbursals
 * 3. Section 5 Boundary & Edge Case EMI Scenarios:
 *    - Zero interest
 *    - Zero/negative principal
 *    - Invalid interest rates and tenure
 *    - Very large amounts (10 Crores) and long tenures (30 years)
 * 4. Regression tests for custom karat string resolution ('14K', '10K', '20K')
 * 5. Safe no-argument / null parameter defaults
 */

import { calculateEMI, generateAmortizationSchedule } from '../../lib/calc/emi.js';
import { calculateGoldLoan, calculateTieredLtvLoanCeiling } from '../../lib/calc/goldLoan.js';
import { resolvePurity, evaluateGoldCollateral } from '../../lib/calc/goldValuation.js';
import { deriveINRPriceFromSpot, estimateIndianRetailPrice, convertGoldWeight } from '../../lib/calc/goldDerivation.js';

describe('Financial Calculation Audit - Independent Verification', () => {

  describe('1. Gold Loan Valuation & Regulatory LTV (Section 4 Realistic Examples)', () => {
    /**
     * Valuation 1: ₹12,67,234
     * Tier 3 (> ₹5 Lakh): LTV Cap = 75%
     * Maximum Eligible Loan = ₹12,67,234 * 0.75 = ₹9,50,425.50
     */
    const val1 = 1267234;

    test('Valuation ₹12,67,234: Tier 3 ceiling is 75% = ₹9,50,425.50', () => {
      const ceiling = calculateTieredLtvLoanCeiling(val1);
      expect(ceiling.tierNumber).toBe(3);
      expect(ceiling.regulatoryLtvPercent).toBe(75);
      expect(ceiling.maxRegulatoryLoan).toBe(950425.5);
    });

    test('Valuation ₹12,67,234 with Desired Loan ₹5,00,000: Effective LTV = 39.46%', () => {
      // 100g 24K gold @ ₹12,672.34/g = exactly ₹12,67,234.00
      const result = calculateGoldLoan({
        weight: 100,
        purity: '24K',
        goldRatePerGram: 12672.34,
        requestedLoanAmount: 500000,
        annualRate: 9.0,
        tenureMonths: 12,
        repaymentMethod: 'bullet'
      });

      // Independent expected values:
      const expectedAssessedValue = 1267234;
      const expectedEligibleLoan = 950425.5; // 75% of 1267234
      const expectedApprovedLoan = 500000;
      const expectedEffectiveLtv = Math.round((500000 / 1267234) * 10000) / 100; // 39.46%

      expect(result.valuation.assessedGoldValue).toBe(expectedAssessedValue);
      expect(result.loan.estimatedMaxLoanEligibility).toBe(expectedEligibleLoan);
      expect(result.loan.approvedLoanAmount).toBe(expectedApprovedLoan);
      expect(result.loan.hasShortfall).toBe(false);
      expect(result.loan.shortfallAmount).toBe(0);
      expect(result.ltv.effectiveApprovedLtvPercent).toBe(39.46);
      expect(result.ltv.requestedLtvPercent).toBe(39.46);
      expect(result.ltv.regulatoryLtvPercent).toBe(75);
    });

    test('Valuation ₹12,67,234 with Desired Loan ₹7,00,000: Effective LTV = 55.24%', () => {
      const result = calculateGoldLoan({
        weight: 100,
        purity: '24K',
        goldRatePerGram: 12672.34,
        requestedLoanAmount: 700000,
        annualRate: 9.0,
        tenureMonths: 12,
        repaymentMethod: 'bullet'
      });

      const expectedEffectiveLtv = Math.round((700000 / 1267234) * 10000) / 100; // 55.24%

      expect(result.valuation.assessedGoldValue).toBe(1267234);
      expect(result.loan.approvedLoanAmount).toBe(700000);
      expect(result.loan.hasShortfall).toBe(false);
      expect(result.ltv.effectiveApprovedLtvPercent).toBe(expectedEffectiveLtv);
      expect(result.loan.estimatedMaxLoanEligibility).toBe(950425.5);
    });

    /**
     * Valuation 2: ₹25,34,468 (2x ₹12,67,234)
     * Tier 3 (> ₹5 Lakh): LTV Cap = 75%
     * Maximum Eligible Loan = ₹25,34,468 * 0.75 = ₹19,00,851.00
     */
    const val2 = 2534468;

    test('Valuation ₹25,34,468: Tier 3 ceiling is 75% = ₹19,00,851.00', () => {
      const ceiling = calculateTieredLtvLoanCeiling(val2);
      expect(ceiling.tierNumber).toBe(3);
      expect(ceiling.regulatoryLtvPercent).toBe(75);
      expect(ceiling.maxRegulatoryLoan).toBe(1900851);
    });

    test('Valuation ₹25,34,468 with Desired Loan ₹5,00,000: Effective LTV = 19.73%', () => {
      // 200g 24K gold @ ₹12,672.34/g = exactly ₹25,34,468.00
      const result = calculateGoldLoan({
        weight: 200,
        purity: '24K',
        goldRatePerGram: 12672.34,
        requestedLoanAmount: 500000,
        annualRate: 8.75,
        tenureMonths: 12
      });

      const expectedEffectiveLtv = Math.round((500000 / 2534468) * 10000) / 100; // 19.73%

      expect(result.valuation.assessedGoldValue).toBe(val2);
      expect(result.loan.estimatedMaxLoanEligibility).toBe(1900851);
      expect(result.loan.approvedLoanAmount).toBe(500000);
      expect(result.ltv.effectiveApprovedLtvPercent).toBe(expectedEffectiveLtv);
    });

    test('Valuation ₹25,34,468 with Desired Loan ₹7,00,000: Effective LTV = 27.62%', () => {
      const result = calculateGoldLoan({
        weight: 200,
        purity: '24K',
        goldRatePerGram: 12672.34,
        requestedLoanAmount: 700000,
        annualRate: 8.75,
        tenureMonths: 12
      });

      const expectedEffectiveLtv = Math.round((700000 / 2534468) * 10000) / 100; // 27.62%

      expect(result.valuation.assessedGoldValue).toBe(val2);
      expect(result.loan.approvedLoanAmount).toBe(700000);
      expect(result.ltv.effectiveApprovedLtvPercent).toBe(expectedEffectiveLtv);
    });

    test('Processing fees and net disbursals for different loan amounts', () => {
      // 0.50% on ₹5,00,000 = ₹2,500 fee -> Net = ₹4,97,500
      const res5L_half = calculateGoldLoan({
        weight: 100,
        goldRatePerGram: 10000,
        requestedLoanAmount: 500000,
        processingFee: 0.5,
        feeType: 'percent'
      });
      expect(res5L_half.loan.processingFeeAmount).toBe(2500);
      expect(res5L_half.loan.netDisbursalAmount).toBe(497500);

      // 1.00% on ₹5,00,000 = ₹5,000 fee -> Net = ₹4,95,000
      const res5L_one = calculateGoldLoan({
        weight: 100,
        goldRatePerGram: 10000,
        requestedLoanAmount: 500000,
        processingFee: 1.0,
        feeType: 'percent'
      });
      expect(res5L_one.loan.processingFeeAmount).toBe(5000);
      expect(res5L_one.loan.netDisbursalAmount).toBe(495000);

      // Flat ₹500 fee on ₹5,00,000 -> Net = ₹4,99,500
      const res5L_flat = calculateGoldLoan({
        weight: 100,
        goldRatePerGram: 10000,
        requestedLoanAmount: 500000,
        processingFee: 500,
        feeType: 'flat'
      });
      expect(res5L_flat.loan.processingFeeAmount).toBe(500);
      expect(res5L_flat.loan.netDisbursalAmount).toBe(499500);

      // 0.50% on ₹7,00,000 = ₹3,500 fee -> Net = ₹6,96,500
      const res7L_half = calculateGoldLoan({
        weight: 150,
        goldRatePerGram: 10000,
        requestedLoanAmount: 700000,
        processingFee: 0.5,
        feeType: 'percent'
      });
      expect(res7L_half.loan.processingFeeAmount).toBe(3500);
      expect(res7L_half.loan.netDisbursalAmount).toBe(696500);

      // 1.00% on ₹7,00,000 = ₹7,000 fee -> Net = ₹6,93,000
      const res7L_one = calculateGoldLoan({
        weight: 150,
        goldRatePerGram: 10000,
        requestedLoanAmount: 700000,
        processingFee: 1.0,
        feeType: 'percent'
      });
      expect(res7L_one.loan.processingFeeAmount).toBe(7000);
      expect(res7L_one.loan.netDisbursalAmount).toBe(693000);
    });
  });

  describe('2. Independent Reducing-Balance EMI Formula Verification (Section 5)', () => {
    // Independent formula implementation: EMI = P * r * (1 + r)^n / ((1 + r)^n - 1)
    function expectedEmiFormula(P, annualRatePercent, months) {
      if (P <= 0 || months <= 0) return 0;
      if (annualRatePercent === 0) return P / months;
      const r = annualRatePercent / 12 / 100;
      const comp = Math.pow(1 + r, months);
      return (P * r * comp) / (comp - 1);
    }

    test('P=5,00,000, 10% annual rate, 60 months (5 years) matches independent formula within 0.01 tolerance', () => {
      const P = 500000;
      const annualRate = 10;
      const n = 60;

      const expectedEmi = expectedEmiFormula(P, annualRate, n); // ~10623.5238
      const expectedTotal = expectedEmi * n; // ~637411.43
      const expectedInterest = expectedTotal - P; // ~137411.43

      const actual = calculateEMI({ principal: P, annualRate, tenureMonths: n });

      expect(actual.emi).toBeCloseTo(expectedEmi, 2);
      expect(actual.totalPayment).toBeCloseTo(expectedTotal, 1);
      expect(actual.totalInterest).toBeCloseTo(expectedInterest, 1);
    });

    test('P=7,00,000, 8.5% annual rate, 36 months (3 years) matches independent formula', () => {
      const P = 700000;
      const annualRate = 8.5;
      const n = 36;

      const expectedEmi = expectedEmiFormula(P, annualRate, n);
      const actual = calculateEMI({ principal: P, annualRate, tenureMonths: n });

      expect(actual.emi).toBeCloseTo(expectedEmi, 2);
    });

    test('Zero interest case: P=60,000, 0%, 12 months produces EMI = 5,000 and 0 interest', () => {
      const actual = calculateEMI({ principal: 60000, annualRate: 0, tenureMonths: 12 });
      expect(actual.emi).toBe(5000);
      expect(actual.totalInterest).toBe(0);
      expect(actual.totalPayment).toBe(60000);
    });

    test('Zero or negative principal safely returns zero without NaN', () => {
      const zeroPrincipal = calculateEMI({ principal: 0, annualRate: 10, tenureMonths: 12 });
      expect(zeroPrincipal.emi).toBe(0);
      expect(zeroPrincipal.totalInterest).toBe(0);
      expect(zeroPrincipal.totalPayment).toBe(0);

      const negativePrincipal = calculateEMI({ principal: -50000, annualRate: 10, tenureMonths: 12 });
      expect(negativePrincipal.emi).toBe(0);
      expect(negativePrincipal.totalInterest).toBe(0);
    });

    test('Invalid interest rates: negative rates clamp to 0; rates > 100 clamp to 100', () => {
      const negRate = calculateEMI({ principal: 100000, annualRate: -5, tenureMonths: 12 });
      expect(negRate.annualRate).toBe(0);
      expect(negRate.emi).toBe(8333.33);

      const overRate = calculateEMI({ principal: 100000, annualRate: 150, tenureMonths: 12 });
      expect(overRate.annualRate).toBe(100);
      expect(overRate.emi).toBeGreaterThan(0);
    });

    test('Invalid tenure (zero or negative) clamps to minimum 1 month', () => {
      const zeroTenure = calculateEMI({ principal: 100000, annualRate: 12, tenureMonths: 0 });
      expect(zeroTenure.tenureMonths).toBe(1);

      const negTenure = calculateEMI({ principal: 100000, annualRate: 12, tenureMonths: -10 });
      expect(negTenure.tenureMonths).toBe(1);
    });

    test('Very large amount: 10 Crores (₹10,00,00,000) for 360 months (30 years) at 8.5%', () => {
      const P = 100000000; // 10 Cr
      const annualRate = 8.5;
      const n = 360;

      const expectedEmi = expectedEmiFormula(P, annualRate, n);
      const actual = calculateEMI({ principal: P, annualRate, tenureMonths: n });

      expect(actual.emi).toBeCloseTo(expectedEmi, 1);
      expect(Number.isFinite(actual.emi)).toBe(true);
      expect(actual.emi).toBeCloseTo(768913.48, 0);

      // Verify full amortization schedule reconciles to exactly 0.00 paise
      const sched = generateAmortizationSchedule({ principal: P, annualRate, tenureMonths: n });
      expect(sched.summary.isReconciled).toBe(true);
      expect(sched.summary.roundingDifferencePaise).toBe(0);
      expect(sched.schedule[sched.schedule.length - 1].closingBalance).toBe(0);
    });
  });

  describe('3. Purity String Resolution Defect Regression Tests', () => {
    test('Arbitrary karat strings with K suffix (14K, 10K, 20K) resolve to exact fine gold ratio', () => {
      const p14 = resolvePurity('14K');
      expect(p14.karat).toBe(14);
      // 14 / 24 * 0.999 = 0.583
      expect(p14.factor).toBe(0.583);
      expect(p14.label).toBe('14K');

      const p10 = resolvePurity('10K');
      expect(p10.karat).toBe(10);
      // 10 / 24 * 0.999 = 0.416
      expect(p10.factor).toBe(0.416);
      expect(p10.label).toBe('10K');

      const p20 = resolvePurity('20k');
      expect(p20.karat).toBe(20);
      // 20 / 24 * 0.999 = 0.833
      expect(p20.factor).toBe(0.833);
    });

    test('Standard hallmarks continue to return canonical factors', () => {
      expect(resolvePurity('24K').factor).toBe(1.0);
      expect(resolvePurity('22K').factor).toBe(0.916);
      expect(resolvePurity('18K').factor).toBe(0.750);
    });
  });

  describe('4. Zero-Argument and Null/Undefined Parameter Safety', () => {
    test('calculateEMI called with no arguments does not throw and returns clean zeros', () => {
      expect(() => calculateEMI()).not.toThrow();
      const res = calculateEMI();
      expect(res.emi).toBe(0);
      expect(res.totalInterest).toBe(0);
    });

    test('generateAmortizationSchedule called with no arguments does not throw', () => {
      expect(() => generateAmortizationSchedule()).not.toThrow();
      const res = generateAmortizationSchedule();
      expect(res.schedule).toEqual([]);
      expect(res.summary.effectivePrincipal).toBe(0);
    });

    test('calculateGoldLoan called with no arguments does not throw', () => {
      expect(() => calculateGoldLoan()).not.toThrow();
      const res = calculateGoldLoan();
      expect(res.collateral.grossWeightGrams).toBe(0);
      expect(res.valuation.assessedGoldValue).toBe(0);
      expect(res.loan.estimatedMaxLoanEligibility).toBe(0);
    });

    test('deriveINRPriceFromSpot and estimateIndianRetailPrice called with no arguments do not throw', () => {
      expect(() => deriveINRPriceFromSpot()).not.toThrow();
      expect(() => estimateIndianRetailPrice()).not.toThrow();
    });
  });
});
