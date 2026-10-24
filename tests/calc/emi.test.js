/**
 * @file emi.test.js
 * @description Unit tests for EMI calculation, paise integer reconciliation,
 * prepayment impact, and mandatory specification validation case.
 */

import { calculateEMI, generateAmortizationSchedule, exportAmortizationToCSV } from '../../lib/calc/emi.js';

describe('EMI Calculation Engine & Amortization Reconciliation', () => {
  /**
   * MANDATORY EMI VALIDATION TEST
   * P = 5,00,000, 10% annual rate, 60 months tenure.
   * Specification requirement:
   * - EMI is within +/- Rs 2 of the brief (~10,624.44 vs exact formula ~10,623.52)
   * - Total payment is within +/- Rs 120 of the brief (~6,37,466 vs exact ~6,37,411)
   * - Sum of principal column = loan amount (5,00,000)
   * - Sum of EMIs = total repayment
   * - Final closing balance = 0.00 paise
   */
  test('MANDATORY VALIDATION: P=500000, 10%, 60 months reconciles with brief tolerances', () => {
    const principal = 500000;
    const annualRate = 10;
    const tenureMonths = 60;

    const calc = calculateEMI({ principal, annualRate, tenureMonths });
    const { schedule, summary } = generateAmortizationSchedule({ principal, annualRate, tenureMonths });

    // 1. Assert EMI within +/- Rs 2 of 10,624.44
    expect(Math.abs(calc.emi - 10624.44)).toBeLessThanOrEqual(2.0);
    // Formula exact value check: 10,623.52
    expect(calc.emi).toBeCloseTo(10623.52, 1);

    // 2. Assert total repayment within +/- Rs 120 of 6,37,466
    expect(Math.abs(summary.totalAmountPaid - 637466)).toBeLessThanOrEqual(120);

    // 3. Assert total interest within +/- Rs 120 of 1,37,466
    expect(Math.abs(summary.totalInterestPaid - 137466)).toBeLessThanOrEqual(120);

    // 4. Assert sum of principal column = original loan amount
    const sumPrincipalPaid = schedule.reduce((sum, row) => sum + row.principalPaid, 0);
    expect(Math.round(sumPrincipalPaid * 100) / 100).toBe(principal);

    // 5. Assert sum of EMIs = total repayment
    const sumPayments = schedule.reduce((sum, row) => sum + row.totalPayment, 0);
    expect(Math.round(sumPayments * 100) / 100).toBe(summary.totalAmountPaid);

    // 6. Assert final closing balance is exactly 0.00
    const finalRow = schedule[schedule.length - 1];
    expect(finalRow.closingBalance).toBe(0);
    expect(summary.isReconciled).toBe(true);
    expect(summary.roundingDifferencePaise).toBe(0);
  });

  test('Zero Interest Loan: P=120000, 0%, 12 months', () => {
    const calc = calculateEMI({ principal: 120000, annualRate: 0, tenureMonths: 12 });
    expect(calc.emi).toBe(10000);
    expect(calc.totalInterest).toBe(0);
    expect(calc.totalPayment).toBe(120000);

    const { schedule, summary } = generateAmortizationSchedule({
      principal: 120000,
      annualRate: 0,
      tenureMonths: 12
    });
    expect(schedule.length).toBe(12);
    expect(summary.totalInterestPaid).toBe(0);
    expect(summary.totalAmountPaid).toBe(120000);
    expect(schedule[schedule.length - 1].closingBalance).toBe(0);
    expect(summary.isReconciled).toBe(true);
  });

  test('Edge Case: 1-month tenure loan', () => {
    const calc = calculateEMI({ principal: 100000, annualRate: 12, tenureMonths: 1 });
    // 12% per year = 1% per month -> Interest = 1000, EMI = 101,000
    expect(calc.emi).toBe(101000);
    expect(calc.totalInterest).toBe(1000);

    const { schedule, summary } = generateAmortizationSchedule({
      principal: 100000,
      annualRate: 12,
      tenureMonths: 1
    });
    expect(schedule.length).toBe(1);
    expect(schedule[0].closingBalance).toBe(0);
    expect(schedule[0].principalPaid).toBe(100000);
    expect(summary.isReconciled).toBe(true);
  });

  test('Edge Case: 30-year (360 months) long tenure loan', () => {
    const principal = 3000000; // 30 Lakhs
    const annualRate = 8.5;
    const tenureMonths = 360;

    const { schedule, summary } = generateAmortizationSchedule({
      principal,
      annualRate,
      tenureMonths
    });

    expect(schedule.length).toBe(360);
    expect(schedule[359].closingBalance).toBe(0);
    expect(summary.isReconciled).toBe(true);
    expect(summary.roundingDifferencePaise).toBe(0);
  });

  test('Prepayment Impact: Extra monthly principal reduces tenure and saves interest', () => {
    const principal = 1000000; // 10 Lakhs
    const annualRate = 9;
    const tenureMonths = 120; // 10 years

    // Without prepayment
    const standard = generateAmortizationSchedule({
      principal,
      annualRate,
      tenureMonths
    });

    // With Rs 5,000 extra monthly prepayment
    const withPrepay = generateAmortizationSchedule({
      principal,
      annualRate,
      tenureMonths,
      extraMonthlyPayment: 5000
    });

    expect(withPrepay.summary.actualTenureMonths).toBeLessThan(120);
    expect(withPrepay.summary.monthsSaved).toBeGreaterThan(0);
    expect(withPrepay.summary.totalInterestPaid).toBeLessThan(standard.summary.totalInterestPaid);
    expect(withPrepay.summary.interestSaved).toBeGreaterThan(0);
    expect(withPrepay.summary.isReconciled).toBe(true);
  });

  test('Lump-Sum Prepayment: Single lump sum at month 12 reduces total interest and tenure', () => {
    const principal = 500000;
    const annualRate = 10;
    const tenureMonths = 60;

    const withLumpSum = generateAmortizationSchedule({
      principal,
      annualRate,
      tenureMonths,
      prepayments: [{ month: 12, amount: 100000 }]
    });

    expect(withLumpSum.summary.actualTenureMonths).toBeLessThan(60);
    expect(withLumpSum.summary.monthsSaved).toBeGreaterThan(0);
    expect(withLumpSum.summary.interestSaved).toBeGreaterThan(0);
    expect(withLumpSum.schedule[withLumpSum.schedule.length - 1].closingBalance).toBe(0);
    expect(withLumpSum.summary.isReconciled).toBe(true);
  });

  test('Processing Fee: Financed vs Upfront fee handling', () => {
    const principal = 200000;
    const annualRate = 10;
    const tenureMonths = 24;

    // Upfront 1% fee (2,000 INR)
    const upfront = calculateEMI({
      principal,
      annualRate,
      tenureMonths,
      processingFee: 1,
      feeType: 'percent',
      financeFee: false
    });
    expect(upfront.effectivePrincipal).toBe(200000);
    expect(upfront.processingFeeAmount).toBe(2000);

    // Financed 1% fee (fee added to principal = 202,000 INR)
    const financed = calculateEMI({
      principal,
      annualRate,
      tenureMonths,
      processingFee: 1,
      feeType: 'percent',
      financeFee: true
    });
    expect(financed.effectivePrincipal).toBe(202000);
    expect(financed.emi).toBeGreaterThan(upfront.emi);
  });

  test('CSV Export contains all columns and rows', () => {
    const { schedule } = generateAmortizationSchedule({
      principal: 100000,
      annualRate: 10,
      tenureMonths: 12
    });

    const csv = exportAmortizationToCSV(schedule);
    expect(csv).toContain('Month,Opening Balance (INR),EMI (INR)');
    expect(csv.split('\n').length).toBe(14); // 1 header + 12 data rows + 1 trailing newline
  });
});
