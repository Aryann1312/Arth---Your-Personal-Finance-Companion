/**
 * @file goldLoan.test.js
 * @description Comprehensive unit tests for gold loan calculations, pure weight conversion,
 * RBI tiered LTV rules, boundary conditions, collateral limits, and repayment structures.
 */

import {
  calculateGoldLoan,
  calculateTieredLtvLoanCeiling,
  validateCollateralLimits,
  resolvePurity
} from '../../lib/calc/goldLoan.js';
import { ILLUSTRATIVE_LENDER_PRESETS } from '../../lib/calc/config.js';

describe('Gold Loan Engine & Tiered Regulatory LTV', () => {
  test('Purity resolution and conversion factor precision', () => {
    expect(resolvePurity('24K').factor).toBe(0.999);
    expect(resolvePurity('22K').factor).toBe(0.916);
    expect(resolvePurity('18K').factor).toBe(0.750);
    expect(resolvePurity(22).karat).toBe(22);
  });

  describe('Tiered Regulatory LTV Rules & Boundary Analysis', () => {
    test('Tier 1: Assessed Value Rs 2,00,000 qualifies for 85% LTV', () => {
      const ceiling = calculateTieredLtvLoanCeiling(200000);
      expect(ceiling.regulatoryLtvPercent).toBe(85);
      expect(ceiling.maxRegulatoryLoan).toBe(170000); // 0.85 * 200,000
      expect(ceiling.appliedTier).toContain('Tier 1');
    });

    test('Boundary 1: Assessed Value Rs 3,00,000 (85% crosses 250k, 80% <= 250k) capped at Rs 2,50,000', () => {
      const ceiling = calculateTieredLtvLoanCeiling(300000);
      expect(ceiling.maxRegulatoryLoan).toBe(250000);
      expect(ceiling.appliedTier).toContain('Boundary capped at Rs 2.5 Lakh');
    });

    test('Tier 2: Assessed Value Rs 4,50,000 qualifies for 80% LTV', () => {
      const ceiling = calculateTieredLtvLoanCeiling(450000);
      expect(ceiling.regulatoryLtvPercent).toBe(80);
      expect(ceiling.maxRegulatoryLoan).toBe(360000); // 0.80 * 450,000
      expect(ceiling.appliedTier).toContain('Tier 2');
    });

    test('Boundary 2: Assessed Value Rs 6,40,000 (80% crosses 500k, 75% <= 500k) capped at Rs 5,00,000', () => {
      const ceiling = calculateTieredLtvLoanCeiling(640000);
      expect(ceiling.maxRegulatoryLoan).toBe(500000);
      expect(ceiling.appliedTier).toContain('Boundary capped at Rs 5 Lakh');
    });

    test('Tier 3: Assessed Value Rs 10,00,000 qualifies for 75% LTV', () => {
      const ceiling = calculateTieredLtvLoanCeiling(1000000);
      expect(ceiling.regulatoryLtvPercent).toBe(75);
      expect(ceiling.maxRegulatoryLoan).toBe(750000); // 0.75 * 1,000,000
      expect(ceiling.appliedTier).toContain('Tier 3');
    });
  });

  describe('Collateral Limits Enforcement (RBI Directions)', () => {
    test('Ornaments under 1,000g are valid; exceeding 1,000g fails validation', () => {
      const valid = validateCollateralLimits({ weight: 500, collateralType: 'ornament' });
      expect(valid.isValid).toBe(true);

      const invalid = validateCollateralLimits({ weight: 1050, collateralType: 'ornament' });
      expect(invalid.isValid).toBe(false);
      expect(invalid.error).toContain('1,000 grams');
    });

    test('Gold coins up to 50g are valid; exceeding 50g fails validation', () => {
      const valid = validateCollateralLimits({ weight: 20, collateralType: 'coin' });
      expect(valid.isValid).toBe(true);

      const invalid = validateCollateralLimits({ weight: 60, collateralType: 'coin' });
      expect(invalid.isValid).toBe(false);
      expect(invalid.error).toContain('50 grams');
    });
  });

  describe('Repayment Methods Calculations (Bullet, EMI, Maturity)', () => {
    const baseParams = {
      weight: 50, // 50 grams
      purity: '22K', // 0.916 -> 45.8 pure grams
      goldRatePerGram: 7500, // 24K rate
      annualRate: 12,
      tenureMonths: 12
    };

    test('Method 1: Bullet Repayment (Monthly Interest, Principal at Maturity)', () => {
      const result = calculateGoldLoan({
        ...baseParams,
        repaymentMethod: 'bullet'
      });

      // Assessed value = 50 * 0.916 * 7500 = 3,43,500
      expect(result.valuation.assessedGoldValue).toBe(343500);

      // Monthly interest = loan * (12 / 12 / 100) = 1% per month
      const loan = result.loan.approvedLoanAmount;
      const expectedMonthlyInterest = Math.round(loan * 0.01 * 100) / 100;
      expect(result.loan.periodicPayment).toBe(expectedMonthlyInterest);
      expect(result.loan.totalInterest).toBe(Math.round(expectedMonthlyInterest * 12 * 100) / 100);
      expect(result.loan.totalRepayment).toBe(loan + result.loan.totalInterest);
    });

    test('Method 2: EMI Repayment (Amortized Monthly Installment)', () => {
      const result = calculateGoldLoan({
        ...baseParams,
        repaymentMethod: 'emi'
      });

      const loan = result.loan.approvedLoanAmount;
      expect(result.loan.periodicPayment).toBeGreaterThan(0);
      expect(result.loan.totalRepayment).toBeGreaterThan(loan);
      expect(result.loan.totalInterest).toBe(Math.round((result.loan.totalRepayment - loan) * 100) / 100);
    });

    test('Method 3: Maturity Repayment (Bullet Interest & Principal at End)', () => {
      const result = calculateGoldLoan({
        ...baseParams,
        repaymentMethod: 'maturity'
      });

      const loan = result.loan.approvedLoanAmount;
      expect(result.loan.periodicPayment).toBe(0);
      // 12 months at 12% = 12% total interest
      const expectedInterest = Math.round(loan * 0.12 * 100) / 100;
      expect(result.loan.totalInterest).toBe(expectedInterest);
      expect(result.loan.maturityAmount).toBe(loan + expectedInterest);
    });
  });

  describe('Separation of Assessed Gold Value vs. Eligible Loan Amount', () => {
    test('Guarantees visual and data separation of collateral worth vs approved credit', () => {
      const result = calculateGoldLoan({
        weight: 100,
        purity: '22K',
        goldRatePerGram: 8000,
        requestedLoanAmount: 200000,
        annualRate: 9,
        tenureMonths: 12
      });

      // Assessed value is strictly collateral market worth
      expect(result.valuation.assessedGoldValue).toBe(732800); // 100 * 0.916 * 8000
      // Requested loan is Rs 2,00,000, which is approved within eligibility
      expect(result.loan.approvedLoanAmount).toBe(200000);
      expect(result.loan.approvedLoanAmount).toBeLessThan(result.valuation.assessedGoldValue);
      expect(result.valuation.valuationDisclaimer).toBeDefined();
      expect(result.loan.approvalDisclaimer).toBeDefined();
    });
  });

  describe('Illustrative Lender Presets', () => {
    test('3 illustrative presets are exported and valid', () => {
      expect(ILLUSTRATIVE_LENDER_PRESETS.length).toBe(3);
      for (const preset of ILLUSTRATIVE_LENDER_PRESETS) {
        expect(preset.isIllustrative).toBe(true);
        expect(preset.sourceUrl).toBeDefined();
        expect(preset.verifiedOn).toBeDefined();
        expect(preset.maxLtvPercent).toBeLessThanOrEqual(75);
      }
    });
  });
});
