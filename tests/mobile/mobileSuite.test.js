/**
 * @file mobileSuite.test.js
 * @description Automated test suite for mobile UI logic: responsive breakpoint helpers,
 * Indian currency formatting (Lakhs / Crores), and mobile calculation engine bridges.
 */

import { BREAKPOINTS, SPACING, getResponsiveLayout, formatINR } from '../../lib/calc/responsive.js';
import { calculateEMI, generateAmortizationSchedule } from '../../lib/calc/emi.js';
import { calculateGoldLoan } from '../../lib/calc/goldLoan.js';
import { deriveINRPriceFromSpot } from '../../lib/calc/goldDerivation.js';

describe('Mobile Responsive Breakpoint Helper Tests (UI Logic)', () => {
  test('Correctly classifies compact phones (< 360px)', () => {
    // iPhone SE 1st gen / compact Android: 320 x 568
    const layout = getResponsiveLayout(320, 568);

    expect(layout.isCompact).toBe(true);
    expect(layout.isTablet).toBe(false);
    expect(layout.isLandscape).toBe(false);
    expect(layout.numColumns).toBe(1);
    expect(layout.horizontalPadding).toBe(SPACING.md); // 12px for tight screens
    expect(layout.contentMaxWidth).toBe(540);
  });

  test('Correctly classifies standard modern phones (360px - 599px in portrait)', () => {
    // iPhone 14/15/16, Pixel 8: 393 x 852
    const layout = getResponsiveLayout(393, 852);

    expect(layout.isCompact).toBe(false);
    expect(layout.isTablet).toBe(false);
    expect(layout.isLandscape).toBe(false);
    expect(layout.numColumns).toBe(1);
    expect(layout.horizontalPadding).toBe(SPACING.lg); // 16px standard padding
    expect(layout.contentMaxWidth).toBe(540);
  });

  test('Correctly classifies tablets (>= 600px width in portrait)', () => {
    // iPad Mini / standard tablet portrait: 768 x 1024
    const layout = getResponsiveLayout(768, 1024);

    expect(layout.isTablet).toBe(true);
    expect(layout.isCompact).toBe(false);
    expect(layout.isLandscape).toBe(false);
    expect(layout.numColumns).toBe(2); // Switches to 2-column split layout
    expect(layout.contentMaxWidth).toBe(1100);
    expect(layout.horizontalPadding).toBe(SPACING.xxxl); // 32px generous padding
  });

  test('Correctly adapts on phone landscape rotation (width >= 650px)', () => {
    // Phone held horizontally in landscape: 844 x 390
    const layout = getResponsiveLayout(844, 390);

    expect(layout.isLandscape).toBe(true);
    expect(layout.isTablet).toBe(true); // Triggers dual-column split layout on landscape
    expect(layout.numColumns).toBe(2);
    expect(layout.contentMaxWidth).toBe(1100);
  });
});

describe('Indian Currency Numbering Formatter Tests (UI Logic)', () => {
  test('Formats currency with rupee symbol in Indian numbering system (en-IN)', () => {
    expect(formatINR(500000)).toMatch(/₹\s*5,00,000/);
    expect(formatINR(12500000)).toMatch(/₹\s*1,25,00,000/);
    expect(formatINR(10623.52)).toMatch(/₹\s*10,623\.52/);
    expect(formatINR(0)).toMatch(/₹\s*0/);
  });

  test('Formats raw numbers without currency symbol when includeSymbol is false', () => {
    expect(formatINR(500000, false)).toBe('5,00,000');
    expect(formatINR(10623.52, false)).toBe('10,623.52');
  });

  test('Gracefully handles falsy or non-numeric inputs', () => {
    expect(formatINR(null)).toMatch(/₹\s*0/);
    expect(formatINR(undefined)).toMatch(/₹\s*0/);
    expect(formatINR('invalid')).toMatch(/₹\s*0/);
  });
});

describe('Mobile App Pure Calculation Bridge Tests', () => {
  test('Mobile EMI engine reproduces mandatory assessment test case accurately', () => {
    const result = calculateEMI({
      principal: 500000,
      annualRate: 10,
      tenureMonths: 60
    });

    expect(result.emi).toBeCloseTo(10623.52, 1);
    expect(result.totalPayment).toBeCloseTo(637411.20, -1);
    expect(result.totalInterest).toBeCloseTo(137411.20, -1);
  });

  test('Mobile Gold Loan engine applies RBI tiered LTV accurately', () => {
    // 25g of 22K: Assessed ~1.71L (Tier 1: <= 2.5L -> 85% LTV)
    const resultTier1 = calculateGoldLoan({
      weight: 25,
      purity: '22K',
      goldRatePerGram: 7500,
      annualRate: 9.5,
      tenureMonths: 12
    });
    expect(resultTier1.collateral.pureGoldEquivalentWeightGrams).toBeCloseTo(22.9, 1);
    expect(resultTier1.ltv.regulatoryLtvCapPercent).toBe(85);

    // 50g of 22K: Assessed ~3.43L (Tier 2: 2.5L to 5.0L -> 80% LTV)
    const resultTier2 = calculateGoldLoan({
      weight: 50,
      purity: '22K',
      goldRatePerGram: 7500,
      annualRate: 9.5,
      tenureMonths: 12
    });
    expect(resultTier2.collateral.pureGoldEquivalentWeightGrams).toBeCloseTo(45.8, 1);
    expect(resultTier2.ltv.regulatoryLtvCapPercent).toBe(80);
    expect(resultTier2.loan.maxEligibleLoan).toBeLessThanOrEqual(resultTier2.valuation.assessedGoldValue);
  });

  test('Mobile Gold Derivation engine correctly derives 24K and 22K rates from spot', () => {
    const derived = deriveINRPriceFromSpot({
      xauUsd: 2700,
      usdInr: 86.5,
      purity: '24K'
    });

    expect(derived.pricePerGram).toBeGreaterThan(7000);
    expect(derived.pricePer10Gram).toBeCloseTo(derived.pricePerGram * 10, 0);
  });
});
