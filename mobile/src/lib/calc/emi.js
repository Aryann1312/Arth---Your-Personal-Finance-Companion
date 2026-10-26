/**
 * @file emi.js
 * @description EMI Calculation engine with exact paise integer math, prepayment impact,
 * and full amortization schedule reconciliation.
 *
 * Formula: EMI = P * r * (1 + r)^n / ((1 + r)^n - 1)
 * Where:
 *  P = Effective Principal
 *  r = Annual Rate / 12 / 100 (Monthly Rate)
 *  n = Tenure in Months
 * If r = 0, EMI = P / n
 */

/**
 * Validates and sanitizes numeric inputs for EMI calculation
 * @param {Object} params
 * @returns {{principal: number, annualRate: number, tenureMonths: number, processingFee: number, feeType: string, financeFee: boolean}}
 */
function sanitizeEmiInputs(params = {}) {
  const {
    principal = 0,
    annualRate = 0,
    tenureMonths = 1,
    processingFee = 0,
    feeType = 'percent',
    financeFee = false
  } = params || {};
  const p = Math.max(0, Number(principal) || 0);
  const r = Math.max(0, Math.min(100, Number(annualRate) || 0));
  const n = Math.max(1, Math.round(Number(tenureMonths) || 1));
  const fee = Math.max(0, Number(processingFee) || 0);
  const fType = feeType === 'flat' ? 'flat' : 'percent';
  const finFee = Boolean(financeFee);

  return { principal: p, annualRate: r, tenureMonths: n, processingFee: fee, feeType: fType, financeFee: finFee };
}

/**
 * Calculates monthly EMI and high-level summary
 * @param {Object} params
 * @param {number} params.principal - Loan principal in INR
 * @param {number} params.annualRate - Annual interest rate in %
 * @param {number} params.tenureMonths - Loan tenure in months
 * @param {number} [params.processingFee=0] - Processing fee
 * @param {('percent'|'flat')} [params.feeType='percent'] - Fee type
 * @param {boolean} [params.financeFee=false] - Whether fee is financed into the loan
 * @returns {Object} Calculated EMI and totals
 */
export function calculateEMI(params) {
  const { principal, annualRate, tenureMonths, processingFee, feeType, financeFee } = sanitizeEmiInputs(params);

  // Calculate processing fee amount in INR
  let processingFeeAmount = 0;
  if (feeType === 'percent') {
    processingFeeAmount = (principal * processingFee) / 100;
  } else {
    processingFeeAmount = processingFee;
  }

  // Effective Principal (if fee is financed)
  const effectivePrincipal = financeFee ? principal + processingFeeAmount : principal;

  if (effectivePrincipal <= 0 || tenureMonths <= 0) {
    return {
      emi: 0,
      monthlyRate: 0,
      effectivePrincipal: 0,
      processingFeeAmount: Math.round(processingFeeAmount * 100) / 100,
      totalInterest: 0,
      totalPayment: 0,
      tenureMonths,
      annualRate
    };
  }

  const monthlyRate = annualRate / 12 / 100;
  let emi = 0;

  if (monthlyRate === 0) {
    emi = effectivePrincipal / tenureMonths;
  } else {
    const compoundFactor = Math.pow(1 + monthlyRate, tenureMonths);
    emi = (effectivePrincipal * monthlyRate * compoundFactor) / (compoundFactor - 1);
  }

  // Paise rounding for display
  const emiRounded = Math.round(emi * 100) / 100;
  const totalPaymentEst = Math.round(emi * tenureMonths * 100) / 100;
  const totalInterestEst = Math.round((totalPaymentEst - effectivePrincipal) * 100) / 100;

  return {
    emi: emiRounded,
    exactEmi: emi,
    monthlyRate,
    effectivePrincipal: Math.round(effectivePrincipal * 100) / 100,
    processingFeeAmount: Math.round(processingFeeAmount * 100) / 100,
    totalInterest: Math.max(0, totalInterestEst),
    totalPayment: totalPaymentEst,
    tenureMonths,
    annualRate
  };
}

/**
 * Generates exact month-by-month amortization schedule with prepayment impact
 * Rounding Rule: All calculations use integer paise (1 INR = 100 paise).
 * Monthly interest is rounded to nearest paise. The final month's payment is adjusted
 * so the final closing balance is precisely 0.00 paise.
 *
 * @param {Object} params
 * @param {number} params.principal - Loan principal in INR
 * @param {number} params.annualRate - Annual interest rate %
 * @param {number} params.tenureMonths - Total tenure in months
 * @param {number} [params.extraMonthlyPayment=0] - Recurring extra principal payment each month
 * @param {Array<{month: number, amount: number}>} [params.prepayments=[]] - Lump-sum prepayments
 * @param {number} [params.processingFee=0] - Processing fee
 * @param {('percent'|'flat')} [params.feeType='percent'] - Fee type
 * @param {boolean} [params.financeFee=false] - Whether fee is financed
 * @returns {Object} Complete amortization schedule, reconciliation flags, and prepayment savings
 */
export function generateAmortizationSchedule(params = {}) {
  const { principal, annualRate, tenureMonths, processingFee, feeType, financeFee } = sanitizeEmiInputs(params);
  const extraMonthlyPayment = Math.max(0, Number(params?.extraMonthlyPayment) || 0);
  const prepaymentsList = Array.isArray(params?.prepayments) ? params.prepayments : [];

  // Map lump sum prepayments by month
  const lumpSumsByMonth = new Map();
  for (const item of prepaymentsList) {
    const m = Math.round(Number(item.month));
    const amt = Math.max(0, Number(item.amount) || 0);
    if (m > 0 && amt > 0) {
      lumpSumsByMonth.set(m, (lumpSumsByMonth.get(m) || 0) + amt);
    }
  }

  // Base EMI without prepayments (for baseline comparison)
  const baseCalc = calculateEMI({ principal, annualRate, tenureMonths, processingFee, feeType, financeFee });
  const effectivePrincipalPaise = Math.round(baseCalc.effectivePrincipal * 100);

  if (effectivePrincipalPaise <= 0) {
    return {
      schedule: [],
      summary: {
        effectivePrincipal: 0,
        totalInterestPaid: 0,
        totalAmountPaid: 0,
        actualTenureMonths: 0,
        scheduledTenureMonths: tenureMonths,
        interestSaved: 0,
        monthsSaved: 0,
        isReconciled: true,
        roundingDifferencePaise: 0
      }
    };
  }

  const monthlyRate = annualRate / 12 / 100;
  const scheduledEmiPaise = Math.round(baseCalc.exactEmi * 100);

  let openingBalancePaise = effectivePrincipalPaise;
  const schedule = [];
  let totalInterestPaidPaise = 0;
  let totalPrincipalPaidPaise = 0;
  let totalPrepaymentsPaidPaise = 0;
  let totalAmountPaidPaise = 0;

  let month = 1;
  const maxIterations = tenureMonths + 24; // Safety ceiling

  while (openingBalancePaise > 0 && month <= maxIterations) {
    // Interest for this month in paise
    const interestPaise = monthlyRate === 0 ? 0 : Math.round(openingBalancePaise * monthlyRate);

    // Lump sum scheduled for this month
    const lumpSumINR = lumpSumsByMonth.get(month) || 0;
    const lumpSumPaise = Math.round(lumpSumINR * 100);
    const extraMonthlyPaise = Math.round(extraMonthlyPayment * 100);
    const totalExtraPrincipalPlannedPaise = lumpSumPaise + extraMonthlyPaise;

    let emiPaise = scheduledEmiPaise;
    let principalPaidFromEmiPaise = 0;
    let prepaymentAppliedPaise = 0;
    let closingBalancePaise = 0;

    // Check if loan is closing this month or reaching final scheduled tenure
    const payoffBalancePaise = openingBalancePaise + interestPaise;
    const isFinalScheduledMonth = month >= tenureMonths;

    if (payoffBalancePaise <= scheduledEmiPaise || isFinalScheduledMonth) {
      // Loan concludes with final adjusted EMI
      emiPaise = payoffBalancePaise;
      principalPaidFromEmiPaise = openingBalancePaise;
      prepaymentAppliedPaise = 0;
      closingBalancePaise = 0;
    } else {
      // Standard regular month
      principalPaidFromEmiPaise = emiPaise - interestPaise;

      // Ensure principal paid does not exceed opening balance
      if (principalPaidFromEmiPaise > openingBalancePaise) {
        principalPaidFromEmiPaise = openingBalancePaise;
        emiPaise = principalPaidFromEmiPaise + interestPaise;
      }

      const balanceAfterRegularEmi = openingBalancePaise - principalPaidFromEmiPaise;

      // Apply extra prepayments if any
      if (totalExtraPrincipalPlannedPaise > 0) {
        prepaymentAppliedPaise = Math.min(balanceAfterRegularEmi, totalExtraPrincipalPlannedPaise);
      }

      closingBalancePaise = balanceAfterRegularEmi - prepaymentAppliedPaise;
    }

    const totalPaidThisMonthPaise = emiPaise + prepaymentAppliedPaise;

    schedule.push({
      month,
      openingBalance: openingBalancePaise / 100,
      emi: emiPaise / 100,
      interest: interestPaise / 100,
      principalPaid: principalPaidFromEmiPaise / 100,
      prepayment: prepaymentAppliedPaise / 100,
      totalPayment: totalPaidThisMonthPaise / 100,
      closingBalance: closingBalancePaise / 100
    });

    totalInterestPaidPaise += interestPaise;
    totalPrincipalPaidPaise += principalPaidFromEmiPaise;
    totalPrepaymentsPaidPaise += prepaymentAppliedPaise;
    totalAmountPaidPaise += totalPaidThisMonthPaise;

    openingBalancePaise = closingBalancePaise;
    month++;
  }

  const actualTenureMonths = schedule.length;
  const monthsSaved = Math.max(0, tenureMonths - actualTenureMonths);

  // Calculate baseline interest (without prepayments) for exact savings calculation
  let baselineTotalInterestPaise = 0;
  if (extraMonthlyPayment > 0 || prepaymentsList.length > 0) {
    const baseSchedule = generateAmortizationSchedule({
      principal,
      annualRate,
      tenureMonths,
      extraMonthlyPayment: 0,
      prepayments: [],
      processingFee,
      feeType,
      financeFee
    });
    baselineTotalInterestPaise = Math.round(baseSchedule.summary.totalInterestPaid * 100);
  } else {
    baselineTotalInterestPaise = totalInterestPaidPaise;
  }

  const interestSavedPaise = Math.max(0, baselineTotalInterestPaise - totalInterestPaidPaise);

  // Reconciliation check
  const sumPrincipalPaidPaise = totalPrincipalPaidPaise + totalPrepaymentsPaidPaise;
  const roundingDifferencePaise = effectivePrincipalPaise - sumPrincipalPaidPaise;
  const isReconciled =
    Math.abs(roundingDifferencePaise) === 0 &&
    Math.abs(totalAmountPaidPaise - (effectivePrincipalPaise + totalInterestPaidPaise)) === 0;

  return {
    schedule,
    summary: {
      effectivePrincipal: effectivePrincipalPaise / 100,
      totalInterestPaid: totalInterestPaidPaise / 100,
      totalAmountPaid: totalAmountPaidPaise / 100,
      totalPrepaymentsPaid: totalPrepaymentsPaidPaise / 100,
      actualTenureMonths,
      scheduledTenureMonths: tenureMonths,
      interestSaved: interestSavedPaise / 100,
      monthsSaved,
      isReconciled,
      roundingDifferencePaise,
      roundingRule: 'All interest calculated in integer paise. Final installment adjusted to balance precisely at Rs 0.00.'
    }
  };
}

/**
 * Converts amortization schedule to CSV format for download / sharing
 * @param {Array<Object>} schedule
 * @returns {string} CSV formatted content
 */
export function exportAmortizationToCSV(schedule) {
  if (!Array.isArray(schedule) || schedule.length === 0) {
    return 'Month,Opening Balance (INR),EMI (INR),Interest (INR),Principal Paid (INR),Prepayment (INR),Total Payment (INR),Closing Balance (INR)\n';
  }

  const header = 'Month,Opening Balance (INR),EMI (INR),Interest (INR),Principal Paid (INR),Prepayment (INR),Total Payment (INR),Closing Balance (INR)\n';
  const rows = schedule.map(row => [
    row.month,
    row.openingBalance.toFixed(2),
    row.emi.toFixed(2),
    row.interest.toFixed(2),
    row.principalPaid.toFixed(2),
    row.prepayment.toFixed(2),
    row.totalPayment.toFixed(2),
    row.closingBalance.toFixed(2)
  ].join(','));

  return header + rows.join('\n') + '\n';
}
