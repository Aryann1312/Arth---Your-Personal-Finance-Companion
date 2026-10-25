/**
 * @file goldLoanFinancialAccuracy.test.js
 * @description Comprehensive automated test suite for Arth Gold Loan Calculator:
 * 1. RBI Tiered LTV calculations (at, below, above ₹2.5L and ₹5L)
 * 2. Bullet repayment maturity obligation LTV tier selection
 * 3. Requested loan amount separation vs estimated maximum eligibility (with shortfall analysis)
 * 4. Purity hallmark conversion (24K, 22K, 18K) and decimal weights/prices
 * 5. Stone and non-gold deductions
 * 6. Missing/unavailable market data fallbacks and indicative labeling
 * 7. EMI, monthly interest, and bullet repayment formulas
 * 8. Processing fee deductions, net disbursal, and rounding validation
 */

import {
  calculateGoldLoan,
  calculateTieredLtvLoanCeiling,
  validateCollateralLimits
} from '../../lib/calc/goldLoan.js';
import {
  evaluateGoldCollateral,
  calculateNetWeight,
  resolvePurity,
  determineRbiBenchmarkRate
} from '../../lib/calc/goldValuation.js';
import { REGULATORY_LTV_TIERS, PURITY_FACTORS, COLLATERAL_LIMITS } from '../../lib/calc/config.js';
import { calculateEMI } from '../../lib/calc/emi.js';
import { formatINR } from '../../lib/calc/responsive.js';

describe('1. RBI LTV Eligibility Tiers (at, below, above ₹2.5L and ₹5L)', () => {
  // Benchmark rate: ₹10,000 / g 24K fine gold for clean calculations
  const rate24K = 10000;

  test('Below ₹2.5 Lakh: qualifies for Tier 1 (85% LTV)', () => {
    // 20g 24K gold = ₹2,00,000 assessed value
    // 85% of ₹2,00,000 = ₹1,70,000 (<= ₹2,50,000)
    const result = calculateGoldLoan({
      weight: 20,
      purity: '24K',
      goldRatePerGram: rate24K,
      repaymentMethod: 'emi'
    });

    expect(result.valuation.assessedGoldValue).toBe(200000);
    expect(result.ltv.tierNumber).toBe(1);
    expect(result.ltv.regulatoryLtvPercent).toBe(85);
    expect(result.loan.estimatedMaxLoanEligibility).toBe(170000);
  });

  test('Exactly at ₹2.5 Lakh boundary: max loan is ₹2,50,000 at Tier 1 (85% LTV)', () => {
    // Assessed value: ₹2,50,000 / 0.85 = ₹294,117.65
    // 29.4118g 24K gold = ₹294,117.65
    const assessedVal = 250000 / 0.85;
    const ceiling = calculateTieredLtvLoanCeiling({ assessedValue: assessedVal, repaymentMethod: 'emi' });

    expect(ceiling.tierNumber).toBe(1);
    expect(ceiling.maxRegulatoryLoan).toBe(250000);
    expect(ceiling.regulatoryLtvPercent).toBe(85);
  });

  test('Just above ₹2.5 Lakh boundary (e.g. ₹3,20,000 assessed value): applies Tier 2 (80% LTV)', () => {
    // 40g 24K = ₹4,00,000 assessed value
    // 80% of ₹4,00,000 = ₹3,20,000 (Between ₹2.5L and ₹5.0L)
    const result = calculateGoldLoan({
      weight: 40,
      purity: '24K',
      goldRatePerGram: rate24K,
      repaymentMethod: 'emi'
    });

    expect(result.valuation.assessedGoldValue).toBe(400000);
    expect(result.ltv.tierNumber).toBe(2);
    expect(result.ltv.regulatoryLtvPercent).toBe(80);
    expect(result.loan.estimatedMaxLoanEligibility).toBe(320000);
  });

  test('Exactly at ₹5.0 Lakh boundary: max loan is ₹5,00,000 at Tier 2 (80% LTV)', () => {
    // Assessed value: ₹5,00,000 / 0.80 = ₹6,25,000
    const assessedVal = 500000 / 0.80;
    const ceiling = calculateTieredLtvLoanCeiling({ assessedValue: assessedVal, repaymentMethod: 'emi' });

    expect(ceiling.tierNumber).toBe(2);
    expect(ceiling.maxRegulatoryLoan).toBe(500000);
    expect(ceiling.regulatoryLtvPercent).toBe(80);
  });

  test('Above ₹5.0 Lakh: applies Tier 3 (75% LTV)', () => {
    // 100g 24K = ₹10,00,000 assessed value
    // 75% of ₹10,00,000 = ₹7,50,000 (> ₹5L)
    const result = calculateGoldLoan({
      weight: 100,
      purity: '24K',
      goldRatePerGram: rate24K,
      repaymentMethod: 'emi'
    });

    expect(result.valuation.assessedGoldValue).toBe(1000000);
    expect(result.ltv.tierNumber).toBe(3);
    expect(result.ltv.regulatoryLtvPercent).toBe(75);
    expect(result.loan.estimatedMaxLoanEligibility).toBe(750000);
  });
});

describe('2. Bullet Repayment Maturity Obligation Tier Selection', () => {
  const rate24K = 10000;

  test('Bullet repayment LTV cap applies to total maturity obligation (Principal + Accrued Interest)', () => {
    // 25g 24K = ₹2,50,000 assessed value
    // Under Tier 1, max maturity obligation = 85% of ₹2,50,000 = ₹2,12,500
    // At 12% annual rate for 12 months, maturity multiplier = 1 + (0.12 * 1) = 1.12
    // Max Principal = ₹2,12,500 / 1.12 = ₹189,732.14
    const result = calculateGoldLoan({
      weight: 25,
      purity: '24K',
      goldRatePerGram: rate24K,
      repaymentMethod: 'maturity',
      annualRate: 12,
      tenureMonths: 12
    });

    expect(result.ltv.isBulletMaturity).toBe(true);
    expect(result.loan.estimatedMaxLoanEligibility).toBeCloseTo(189732.14, 1);
    // Maturity obligation (Principal + Interest) should not exceed ₹2,12,500 (85% of ₹2.5L)
    expect(result.loan.maturityAmount).toBeLessThanOrEqual(212500.50);
    expect(result.loan.maturityAmount).toBeCloseTo(212500, 0);
  });

  test('Bullet repayment tier selection changes based on maturity obligation crossing ₹2.5L', () => {
    // 35g 24K = ₹3,50,000 collateral
    // Under 80% LTV, potential maturity = ₹2,80,000 (> ₹2.5L Tier 1 ceiling)
    // Thus it moves into Tier 2 (80% LTV) because total maturity obligation exceeds ₹2.5 Lakh
    const result = calculateGoldLoan({
      weight: 35,
      purity: '24K',
      goldRatePerGram: rate24K,
      repaymentMethod: 'maturity',
      annualRate: 10,
      tenureMonths: 12
    });

    expect(result.ltv.tierNumber).toBe(2);
    expect(result.ltv.regulatoryLtvPercent).toBe(80);
    // At 80% LTV, maturity cap = ₹2,80,000. Principal = 280000 / 1.10 = ₹254,545.45
    expect(result.loan.estimatedMaxLoanEligibility).toBeCloseTo(254545.45, 1);
  });
});

describe('3. Separation of Requested Amount from Maximum Eligibility', () => {
  const rate24K = 8000;

  test('When requested amount is below maximum eligibility, repayment is calculated on requested amount', () => {
    // 50g 22K (45.8g pure) @ ₹8000/g 24K (~₹7328/g 22K) -> Assessed ~₹3,66,400
    // Tier 2: 80% LTV -> Max eligibility ~₹2,93,120
    // User requests ₹2,00,000
    const result = calculateGoldLoan({
      weight: 50,
      purity: '22K',
      goldRatePerGram: rate24K,
      requestedLoanAmount: 200000,
      annualRate: 10,
      tenureMonths: 12,
      repaymentMethod: 'bullet'
    });

    expect(result.loan.isRequestedSpecified).toBe(true);
    expect(result.loan.requestedLoanAmount).toBe(200000);
    expect(result.loan.hasExceededEligibility).toBe(false);
    expect(result.loan.finalEstimatedLoanAmount).toBe(200000);
    expect(result.loan.estimatedMaxLoanEligibility).toBeGreaterThan(250000);
    // Monthly interest on requested ₹2,00,000 at 10% = ₹1,666.67
    expect(result.loan.periodicPayment).toBeCloseTo(1666.67, 1);
  });

  test('When requested amount exceeds maximum eligibility, it is not silently replaced and calculates compliant alternative', () => {
    // 20g 22K -> Assessed ~₹1,46,560. Max eligibility (85% LTV) = ~₹1,24,576
    // User requests ₹2,00,000
    const result = calculateGoldLoan({
      weight: 20,
      purity: '22K',
      goldRatePerGram: rate24K,
      requestedLoanAmount: 200000,
      annualRate: 10,
      tenureMonths: 12
    });

    expect(result.loan.isRequestedSpecified).toBe(true);
    expect(result.loan.requestedLoanAmount).toBe(200000); // User request preserved
    expect(result.loan.hasExceededEligibility).toBe(true);
    expect(result.loan.shortfallAmount).toBeGreaterThan(0);
    expect(result.loan.finalEstimatedLoanAmount).toBe(result.loan.estimatedMaxLoanEligibility); // Compliant alternative
    expect(result.loan.cappingExplanation).toContain('exceeds');
    expect(result.loan.additionalWeightNeededGrams).toBeGreaterThan(0);
  });
});

describe('4. Purity Hallmark Conversion & Decimal Weights / Prices', () => {
  test('Accurately converts 24K (1.0), 22K (0.916), and 18K (0.750) purity factors', () => {
    const p24 = resolvePurity('24K');
    const p22 = resolvePurity('22K');
    const p18 = resolvePurity('18K');

    expect(p24.factor).toBe(1.0);
    expect(p22.factor).toBe(0.916);
    expect(p18.factor).toBe(0.750);
  });

  test('Handles decimal weights and fractional gold prices without precision errors', () => {
    // 37.85g of 22K gold @ ₹7,842.65 / g 24K
    const result = calculateGoldLoan({
      weight: 37.85,
      purity: '22K',
      goldRatePerGram: 7842.65,
      annualRate: 9.75,
      tenureMonths: 18
    });

    expect(result.collateral.grossWeightGrams).toBe(37.85);
    // 37.85 * 0.916 = 34.671g pure
    expect(result.collateral.pureGoldEquivalentWeightGrams).toBeCloseTo(34.671, 2);
    expect(result.valuation.assessedGoldValue).toBeGreaterThan(0);
    expect(Number.isFinite(result.loan.estimatedMaxLoanEligibility)).toBe(true);
  });
});

describe('5. Stone and Non-Gold Material Deductions', () => {
  test('Correctly excludes stone weight before calculating pure gold and valuation', () => {
    // Gross: 50.0g, Stone deduction: 8.5g -> Net gold: 41.5g
    const netInfo = calculateNetWeight(50.0, 8.5);
    expect(netInfo.eligibleNetWeightGrams).toBe(41.5);
    expect(netInfo.stoneDeductionGrams).toBe(8.5);
    expect(netInfo.stoneDeductionPercent).toBe(17);

    // Valuation check with stone deductions
    const result = calculateGoldLoan({
      weight: 50.0,
      stoneDeductions: 8.5,
      purity: '22K',
      goldRatePerGram: 8000
    });

    expect(result.collateral.grossWeightGrams).toBe(50.0);
    expect(result.collateral.stoneDeductionGrams).toBe(8.5);
    expect(result.collateral.eligibleNetWeightGrams).toBe(41.5);
    // Assessed value is calculated on 41.5g net, not 50.0g gross!
    const expectedValue = Math.round(41.5 * Math.round(8000 * 0.916 * 100) / 100 * 100) / 100;
    expect(result.valuation.assessedGoldValue).toBe(expectedValue);
  });

  test('Coins automatically ignore stone deductions (pure bullion)', () => {
    const result = calculateGoldLoan({
      weight: 20,
      stoneDeductions: 5,
      collateralType: 'coin',
      purity: '24K',
      goldRatePerGram: 8000
    });

    expect(result.collateral.stoneDeductionGrams).toBe(0);
    expect(result.collateral.eligibleNetWeightGrams).toBe(20);
  });
});

describe('6. Gold Valuation: RBI 30-Day vs 1-Day Comparison & Missing Data Handling', () => {
  test('Applies lower of preceding 30-day average and preceding day closing per RBI methodology', () => {
    // 30-day avg = ₹7,800/g, Preceding day = ₹7,950/g -> Should select ₹7,800/g
    const check1 = determineRbiBenchmarkRate({
      goldRate24K: 8000,
      preceding30DayAvg24K: 7800,
      precedingDayClosing24K: 7950
    });
    expect(check1.valuationRate24K).toBe(7800);
    expect(check1.hasHistoricalComparison).toBe(true);

    // 30-day avg = ₹7,900/g, Preceding day = ₹7,750/g -> Should select ₹7,750/g
    const check2 = determineRbiBenchmarkRate({
      goldRate24K: 8000,
      preceding30DayAvg24K: 7900,
      precedingDayClosing24K: 7750
    });
    expect(check2.valuationRate24K).toBe(7750);
    expect(check2.hasHistoricalComparison).toBe(true);
  });

  test('Discloses limitation and marks rate as indicative when 30-day history is unavailable', () => {
    const evaluation = evaluateGoldCollateral({
      grossWeight: 50,
      purity: '22K',
      goldRate24K: 7500,
      preceding30DayAvg24K: null,
      precedingDayClosing24K: null,
      isLiveMarket: false
    });

    expect(evaluation.rate.hasHistoricalComparison).toBe(false);
    expect(evaluation.rate.statusLabel).toBe('INDICATIVE BENCHMARK');
    expect(evaluation.rate.methodologyDescription).toContain('Full 30-day historical closing series unavailable');
  });

  test('Manual override is explicitly marked as MANUAL OVERRIDE (never labeled Live)', () => {
    const evaluation = evaluateGoldCollateral({
      grossWeight: 50,
      purity: '22K',
      rateForSelectedPurity: 7200,
      isManualOverride: true,
      isLiveMarket: true
    });

    expect(evaluation.rate.isManualOverride).toBe(true);
    expect(evaluation.rate.statusLabel).toBe('MANUAL OVERRIDE');
    expect(evaluation.rate.isLive).toBe(false);
  });
});

describe('7. Repayment Calculations (Reducing EMI, Monthly Interest, Bullet)', () => {
  const principal = 300000;
  const annualRate = 12;
  const tenureMonths = 12;

  test('Regular EMI: matches exact reducing-balance formula and rounding', () => {
    // P = 300,000, r = 12/12/100 = 0.01, n = 12
    // EMI = 300000 * 0.01 * (1.01)^12 / ((1.01)^12 - 1) = 26,654.64
    const emiResult = calculateEMI({
      principal,
      annualRate,
      tenureMonths
    });

    expect(emiResult.emi).toBeCloseTo(26654.64, 1);
    expect(emiResult.totalPayment).toBeCloseTo(319855.68, 0);
    expect(emiResult.totalInterest).toBeCloseTo(19855.68, 0);
  });

  test('Monthly Interest: services periodic interest and repays principal at maturity', () => {
    // Monthly interest = 300,000 * (12/12/100) = ₹3,000 / month
    // Total interest = ₹3,000 * 12 = ₹36,000
    // Total repayment = ₹3,36,000
    const result = calculateGoldLoan({
      weight: 100,
      purity: '24K',
      goldRatePerGram: 10000,
      requestedLoanAmount: principal,
      annualRate,
      tenureMonths,
      repaymentMethod: 'bullet'
    });

    expect(result.loan.periodicPayment).toBe(3000);
    expect(result.loan.totalInterest).toBe(36000);
    expect(result.loan.totalRepayment).toBe(336000);
    expect(result.loan.maturityAmount).toBe(303000); // Final month principal + final interest
  });

  test('Bullet Repayment (Maturity): settles principal and interest together at maturity', () => {
    // Interest = 300,000 * (12/100) * (12/12) = ₹36,000
    // Periodic payment during term = 0
    // Maturity amount = ₹3,36,000
    const result = calculateGoldLoan({
      weight: 100,
      purity: '24K',
      goldRatePerGram: 10000,
      requestedLoanAmount: principal,
      annualRate,
      tenureMonths,
      repaymentMethod: 'maturity'
    });

    expect(result.loan.periodicPayment).toBe(0);
    expect(result.loan.totalInterest).toBe(36000);
    expect(result.loan.totalRepayment).toBe(336000);
    expect(result.loan.maturityAmount).toBe(336000);
  });
});

describe('8. Processing Fees, Net Disbursal & Input Safety', () => {
  test('Correctly calculates percentage and flat processing fees and net disbursal', () => {
    // 1% on ₹2,00,000 = ₹2,000 fee -> Net disbursal = ₹1,98,000
    const resPercent = calculateGoldLoan({
      weight: 50,
      purity: '24K',
      goldRatePerGram: 10000,
      requestedLoanAmount: 200000,
      processingFee: 1.0,
      feeType: 'percent'
    });
    expect(resPercent.loan.processingFeeAmount).toBe(2000);
    expect(resPercent.loan.netDisbursalAmount).toBe(198000);

    // Flat fee of ₹750 -> Net disbursal = ₹1,99,250
    const resFlat = calculateGoldLoan({
      weight: 50,
      purity: '24K',
      goldRatePerGram: 10000,
      requestedLoanAmount: 200000,
      processingFee: 750,
      feeType: 'flat'
    });
    expect(resFlat.loan.processingFeeAmount).toBe(750);
    expect(resFlat.loan.netDisbursalAmount).toBe(199250);
  });

  test('Safely handles zero, negative, and invalid inputs without throwing errors or returning NaN', () => {
    const resZero = calculateGoldLoan({
      weight: 0,
      goldRatePerGram: 0,
      requestedLoanAmount: -50000,
      annualRate: -5,
      tenureMonths: 0
    });

    expect(resZero.collateral.grossWeightGrams).toBe(0);
    expect(resZero.loan.estimatedMaxLoanEligibility).toBe(0);
    expect(resZero.loan.periodicPayment).toBe(0);
    expect(Number.isNaN(resZero.loan.totalInterest)).toBe(false);

    const resNaN = calculateGoldLoan({
      weight: 'invalid',
      goldRatePerGram: undefined,
      requestedLoanAmount: null
    });
    expect(resNaN.loan.estimatedMaxLoanEligibility).toBe(0);
    expect(Number.isNaN(resNaN.valuation.assessedGoldValue)).toBe(false);
  });

  test('Enforces regulatory collateral ceilings (1 kg ornaments, 50g coins)', () => {
    const validOrnament = validateCollateralLimits({ weight: 500, collateralType: 'ornament' });
    expect(validOrnament.isValid).toBe(true);

    const breachedOrnament = validateCollateralLimits({ weight: 1200, collateralType: 'ornament' });
    expect(breachedOrnament.isValid).toBe(false);
    expect(breachedOrnament.error).toContain('1,000 grams');

    const validCoin = validateCollateralLimits({ weight: 50, collateralType: 'coin' });
    expect(validCoin.isValid).toBe(true);

    const breachedCoin = validateCollateralLimits({ weight: 55, collateralType: 'coin' });
    expect(breachedCoin.isValid).toBe(false);
    expect(breachedCoin.error).toContain('50 grams');
  });
});
