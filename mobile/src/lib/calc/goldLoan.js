/**
 * @file goldLoan.js
 * @description Gold Loan Calculation Engine:
 * - RBI-compliant collateral valuation (excluding stones & non-gold materials)
 * - RBI tiered Loan-to-Value (LTV) regulatory ceilings (85% up to ₹2.5L, 80% ₹2.5L to ₹5L, 75% > ₹5L)
 * - Accounts for total amount payable at maturity for bullet repayment loans
 * - Strict separation of user's Requested Loan Amount from Estimated Maximum Loan Eligibility
 * - Compliant alternative calculation when requested amount exceeds regulatory eligibility
 * - Exact reducing-balance EMI, monthly interest, and bullet repayment schedules
 * - Processing fee upfront deductions and net disbursal computation
 */

import { REGULATORY_LTV_TIERS, COLLATERAL_LIMITS, PURITY_FACTORS, BULLET_REPAYMENT_RULES } from './config.js';
import { calculateEMI } from './emi.js';
import { evaluateGoldCollateral, resolvePurity } from './goldValuation.js';

export { resolvePurity } from './goldValuation.js';

/**
 * Validates collateral limits against regulatory ceilings
 * @param {Object} params
 * @param {number} params.weight - Weight in grams
 * @param {('ornament'|'coin')} [params.collateralType='ornament'] - Collateral classification
 * @returns {{isValid: boolean, error?: string, maxPermissibleWeight: number}}
 */
export function validateCollateralLimits({ weight, collateralType = 'ornament' }) {
  const w = Number(weight) || 0;
  if (w <= 0) {
    return { isValid: false, error: 'Weight must be greater than 0 grams.', maxPermissibleWeight: 0 };
  }

  if (collateralType === 'coin') {
    if (w > COLLATERAL_LIMITS.coinMaxGrams) {
      return {
        isValid: false,
        error: `Gold coins are capped at ${COLLATERAL_LIMITS.coinMaxGrams} grams per borrower under RBI directions. Current weight: ${w}g.`,
        maxPermissibleWeight: COLLATERAL_LIMITS.coinMaxGrams
      };
    }
    return { isValid: true, maxPermissibleWeight: COLLATERAL_LIMITS.coinMaxGrams };
  }

  // Ornament
  if (w > COLLATERAL_LIMITS.ornamentMaxGrams) {
    return {
      isValid: false,
      error: `Jewellery/ornaments are capped at 1,000 grams (1 kg) per individual borrower under RBI directions. Current weight: ${w}g.`,
      maxPermissibleWeight: COLLATERAL_LIMITS.ornamentMaxGrams
    };
  }

  return { isValid: true, maxPermissibleWeight: COLLATERAL_LIMITS.ornamentMaxGrams };
}

/**
 * Computes non-circular tiered LTV regulatory loan ceiling.
 * Applicable RBI LTV Tiers for eligible gold-collateral consumption loans:
 *  - Tier 1: Total loan amount up to ₹2.5 lakh -> maximum 85% LTV
 *  - Tier 2: Above ₹2.5 lakh and up to ₹5 lakh -> maximum 80% LTV
 *  - Tier 3: Above ₹5 lakh -> maximum 75% LTV
 *
 * Accounts for the applicable regulatory definition of the loan amount when selecting the tier,
 * including the total amount payable at maturity for bullet repayment loans.
 *
 * @param {Object} params
 * @param {number} params.assessedValue - Assessed gold collateral value in INR
 * @param {string} [params.repaymentMethod='bullet'] - 'bullet' | 'emi' | 'maturity'
 * @param {number} [params.annualRate=10.5] - Annual interest rate in %
 * @param {number} [params.tenureMonths=12] - Tenure in months
 * @returns {{maxRegulatoryLoan: number, appliedTier: string, tierNumber: number, regulatoryLtvPercent: number, maturityMultiplier: number, isBulletMaturity: boolean, explanation: string}}
 */
export function calculateTieredLtvLoanCeiling(input) {
  let assessedValue;
  let repaymentMethod = 'bullet';
  let annualRate = 10.5;
  let tenureMonths = 12;

  if (typeof input === 'number') {
    assessedValue = input;
  } else if (input && typeof input === 'object') {
    assessedValue = input.assessedValue;
    if (input.repaymentMethod !== undefined) repaymentMethod = input.repaymentMethod;
    if (input.annualRate !== undefined) annualRate = input.annualRate;
    if (input.tenureMonths !== undefined) tenureMonths = input.tenureMonths;
  }

  const V = Math.max(0, Number(assessedValue) || 0);
  const isBulletMaturity = repaymentMethod === 'maturity';
  const rate = Math.max(0, Number(annualRate) || 0);
  const tenure = Math.max(1, Math.round(Number(tenureMonths) || 12));

  // For bullet repayment where interest is payable at maturity alongside principal:
  // RBI Master Directions mandate that the LTV cap applies to total amount payable at maturity (P + I).
  // Maturity multiplier: M = 1 + (rate * tenure / 12 / 100)
  const maturityMultiplier = isBulletMaturity
    ? 1 + ((rate / 100) * (tenure / 12))
    : 1;

  if (V <= 0) {
    return {
      maxRegulatoryLoan: 0,
      appliedTier: 'Tier 1 (Up to Rs 2.5 Lakh, 85% LTV)',
      tierNumber: 1,
      regulatoryLtvPercent: 85,
      regulatoryLtvCapPercent: 85,
      maturityMultiplier,
      isBulletMaturity,
      explanation: 'No collateral value assessed.'
    };
  }

  // Tier 1 Potential: 85% of collateral value
  const tier1ExposureCap = 0.85 * V;
  if (tier1ExposureCap <= 250000) {
    const maxPrincipal = Math.round((tier1ExposureCap / maturityMultiplier) * 100) / 100;
    return {
      maxRegulatoryLoan: maxPrincipal,
      appliedTier: 'Tier 1 (Up to Rs 2.5 Lakh, 85% LTV)',
      tierNumber: 1,
      regulatoryLtvPercent: 85,
      regulatoryLtvCapPercent: 85,
      maturityMultiplier,
      isBulletMaturity,
      explanation: isBulletMaturity
        ? `Eligible for Tier 1 (85% LTV). Maturity obligation capped at ₹${tier1ExposureCap.toLocaleString('en-IN')}; maximum principal ₹${maxPrincipal.toLocaleString('en-IN')}.`
        : `Eligible for Tier 1 (up to ₹2.5 Lakh) with up to 85% Loan-to-Value.`
    };
  }

  // Boundary between Tier 1 and Tier 2:
  // If 80% of V <= 250,000, borrowing above 250k drops to 80%, so it cannot exceed 250k.
  const tier2Exposure = 0.80 * V;
  if (tier2Exposure <= 250000) {
    const maxPrincipal = Math.round((250000 / maturityMultiplier) * 100) / 100;
    const effLtv = Math.round((250000 / V) * 10000) / 100;
    return {
      maxRegulatoryLoan: maxPrincipal,
      appliedTier: 'Tier 1 (Boundary capped at Rs 2.5 Lakh, 85% LTV)',
      tierNumber: 1,
      regulatoryLtvPercent: effLtv,
      regulatoryLtvCapPercent: 85,
      maturityMultiplier,
      isBulletMaturity,
      explanation: `Collateral value of ₹${V.toLocaleString('en-IN')} is capped at the Tier 1 boundary of ₹2,50,000.`
    };
  }

  // Tier 2 Potential: 80% of collateral value (up to ₹5,00,000)
  if (tier2Exposure <= 500000) {
    const maxPrincipal = Math.round((tier2Exposure / maturityMultiplier) * 100) / 100;
    return {
      maxRegulatoryLoan: maxPrincipal,
      appliedTier: 'Tier 2 (Rs 2.5 Lakh to Rs 5 Lakh, 80% LTV)',
      tierNumber: 2,
      regulatoryLtvPercent: 80,
      regulatoryLtvCapPercent: 80,
      maturityMultiplier,
      isBulletMaturity,
      explanation: isBulletMaturity
        ? `Eligible for Tier 2 (80% LTV). Maturity obligation capped at ₹${tier2Exposure.toLocaleString('en-IN')}; maximum principal ₹${maxPrincipal.toLocaleString('en-IN')}.`
        : `Eligible for Tier 2 (₹2.5 Lakh to ₹5 Lakh) with up to 80% Loan-to-Value.`
    };
  }

  // Boundary between Tier 2 and Tier 3:
  // If 75% of V <= 500,000, borrowing above 500k drops to 75%, so it cannot exceed 500k.
  const tier3Exposure = 0.75 * V;
  if (tier3Exposure <= 500000) {
    const maxPrincipal = Math.round((500000 / maturityMultiplier) * 100) / 100;
    const effLtv = Math.round((500000 / V) * 10000) / 100;
    return {
      maxRegulatoryLoan: maxPrincipal,
      appliedTier: 'Tier 2 (Boundary capped at Rs 5 Lakh, 80% LTV)',
      tierNumber: 2,
      regulatoryLtvPercent: effLtv,
      regulatoryLtvCapPercent: 80,
      maturityMultiplier,
      isBulletMaturity,
      explanation: `Collateral value of ₹${V.toLocaleString('en-IN')} is capped at the Tier 2 boundary of ₹5,00,000.`
    };
  }

  // Tier 3: Above ₹5 Lakh (75% LTV)
  const maxPrincipal = Math.round((tier3Exposure / maturityMultiplier) * 100) / 100;
  return {
    maxRegulatoryLoan: maxPrincipal,
    appliedTier: 'Tier 3 (Above Rs 5 Lakh, 75% LTV)',
    tierNumber: 3,
    regulatoryLtvPercent: 75,
    regulatoryLtvCapPercent: 75,
    maturityMultiplier,
    isBulletMaturity,
    explanation: isBulletMaturity
      ? `Eligible for Tier 3 (75% LTV). Maturity obligation capped at ₹${tier3Exposure.toLocaleString('en-IN')}; maximum principal ₹${maxPrincipal.toLocaleString('en-IN')}.`
      : `Eligible for Tier 3 (Above ₹5 Lakh) capped at 75% Loan-to-Value.`
  };
}

/**
 * Calculates complete Gold Loan estimation adhering to RBI directions,
 * separate requested amount vs maximum eligibility, and repayment mechanics.
 *
 * @param {Object} params
 * @param {number} params.weight - Gross gold weight in grams
 * @param {number} [params.stoneDeductions=0] - Stone and non-gold deductions in grams
 * @param {string|number} [params.purity='22K'] - Gold purity
 * @param {number} params.goldRatePerGram - Benchmark 24K gold rate per gram in INR
 * @param {number} [params.ratePerGramSelectedPurity] - Direct rate for selected purity
 * @param {number} [params.preceding30DayAvg24K] - 30-day average closing price of 24K
 * @param {number} [params.precedingDayClosing24K] - Preceding business day closing price of 24K
 * @param {number} [params.requestedLoanAmount] - Desired borrowing amount in INR (optional)
 * @param {number} [params.annualRate=8.75] - Annual interest rate in %
 * @param {number} [params.tenureMonths=12] - Loan tenure in months
 * @param {('bullet'|'emi'|'maturity')} [params.repaymentMethod='bullet'] - Repayment structure
 * @param {('ornament'|'coin')} [params.collateralType='ornament'] - Collateral classification
 * @param {number} [params.processingFee=0] - Processing fee value
 * @param {('percent'|'flat')} [params.feeType='percent'] - Fee type
 * @param {Object} [params.lenderPreset] - Lender preset constraints
 * @param {string} [params.sourceName] - Data source name
 * @param {boolean} [params.isManualOverride=false] - Whether rate was manually entered
 * @param {boolean} [params.isLiveMarket=true] - Whether rate is live
 * @returns {Object} Comprehensive calculation result
 */
export function calculateGoldLoan({
  weight,
  stoneDeductions = 0,
  purity = '22K',
  goldRatePerGram = 0,
  ratePerGramSelectedPurity = null,
  isRateForSelectedPurity = false,
  preceding30DayAvg24K = null,
  precedingDayClosing24K = null,
  requestedLoanAmount = null,
  annualRate = null,
  tenureMonths = 12,
  repaymentMethod = 'bullet',
  collateralType = 'ornament',
  processingFee = 0,
  feeType = 'percent',
  lenderPreset = null,
  sourceName = 'World Gold Council (Goldhub) & LBMA',
  isManualOverride = false,
  isLiveMarket = true
}) {
  const grossW = Math.max(0, Number(weight) || 0);
  const tenure = Math.max(1, Math.round(Number(tenureMonths) || 12));

  // Rate resolution
  const defaultRate = lenderPreset?.defaultAnnualRate !== undefined ? Number(lenderPreset.defaultAnnualRate) : 8.75;
  const rate = annualRate !== undefined && annualRate !== null && !isNaN(Number(annualRate))
    ? Math.max(0, Math.min(100, Number(annualRate)))
    : defaultRate;

  // Processing fee resolution
  const effectiveFee = processingFee !== undefined && processingFee !== null && !isNaN(Number(processingFee))
    ? Number(processingFee)
    : (lenderPreset?.processingFeePercent ?? (lenderPreset?.processingFeeFlat ?? 0));
  const effectiveFeeType = feeType || lenderPreset?.feeType || 'percent';

  // Repayment method resolution
  const validRepaymentMethod = ['bullet', 'emi', 'maturity'].includes(repaymentMethod)
    ? repaymentMethod
    : 'bullet';

  // 1. Regulatory Collateral Limits Check
  const collateralCheck = validateCollateralLimits({ weight: grossW, collateralType });

  // 2. RBI-Compliant Gold Collateral Valuation
  // If isRateForSelectedPurity is true and goldRatePerGram passed, treat as rateForSelectedPurity
  const directPurityRate = ratePerGramSelectedPurity !== null && Number(ratePerGramSelectedPurity) > 0
    ? Number(ratePerGramSelectedPurity)
    : isRateForSelectedPurity
      ? Number(goldRatePerGram)
      : null;

  const collateralReport = evaluateGoldCollateral({
    grossWeight: grossW,
    stoneDeductions: collateralType === 'coin' ? 0 : stoneDeductions, // Coins do not have stones
    purity,
    goldRate24K: goldRatePerGram,
    rateForSelectedPurity: directPurityRate,
    preceding30DayAvg24K,
    precedingDayClosing24K,
    sourceName: lenderPreset?.name ? `${lenderPreset.name} / ${sourceName}` : sourceName,
    isManualOverride,
    isLiveMarket
  });

  const assessedGoldValue = collateralReport.valuation.assessedGoldValue;

  // 3. Tiered Regulatory LTV Ceiling (accounts for bullet maturity obligation)
  const regulatoryCeiling = calculateTieredLtvLoanCeiling({
    assessedValue: assessedGoldValue,
    repaymentMethod: validRepaymentMethod,
    annualRate: rate,
    tenureMonths: tenure
  });

  // 4. Lender Policy Constraints
  let lenderLtvCapPercent = regulatoryCeiling.regulatoryLtvPercent; // Default to regulatory maximum ceiling; never hardcode 75%
  let minLoanAllowed = 0;
  let maxLoanAllowed = Infinity;

  if (lenderPreset) {
    if (lenderPreset.minLoanAmount) minLoanAllowed = Number(lenderPreset.minLoanAmount);
    if (lenderPreset.maxLoanAmount) maxLoanAllowed = Number(lenderPreset.maxLoanAmount);
    // Illustrative presets follow RBI regulatory tiers. Custom presets can declare a lower policy cap.
    if (lenderPreset.maxLtvPercent && !lenderPreset.isIllustrative) {
      lenderLtvCapPercent = Number(lenderPreset.maxLtvPercent);
    } else {
      lenderLtvCapPercent = regulatoryCeiling.regulatoryLtvPercent;
    }
  }

  // Effective maximum LTV is the lower of regulatory cap and lender policy cap
  const effectiveMaxLtvPercent = Math.min(regulatoryCeiling.regulatoryLtvPercent, lenderLtvCapPercent);

  // Estimated Maximum Loan Eligibility against collateral
  let estimatedMaxLoanEligibility = Math.min(
    regulatoryCeiling.maxRegulatoryLoan,
    validRepaymentMethod === 'maturity'
      ? Math.round(((assessedGoldValue * (effectiveMaxLtvPercent / 100)) / regulatoryCeiling.maturityMultiplier) * 100) / 100
      : Math.round((assessedGoldValue * (effectiveMaxLtvPercent / 100)) * 100) / 100
  );

  // Apply lender absolute upper cap
  if (estimatedMaxLoanEligibility > maxLoanAllowed) {
    estimatedMaxLoanEligibility = maxLoanAllowed;
  }

  // 5. Separate Requested Loan Amount from Estimated Maximum Eligibility
  const reqAmount = (requestedLoanAmount !== undefined && requestedLoanAmount !== null && Number(requestedLoanAmount) > 0)
    ? Math.round(Number(requestedLoanAmount) * 100) / 100
    : null;

  const isRequestedSpecified = reqAmount !== null;
  let hasExceededEligibility = false;
  let shortfallAmount = 0;
  let finalEstimatedLoanAmount = estimatedMaxLoanEligibility;
  let calculationBasis = 'Calculated on max eligible amount';
  let cappingExplanation = null;

  if (isRequestedSpecified) {
    if (reqAmount > estimatedMaxLoanEligibility) {
      hasExceededEligibility = true;
      shortfallAmount = Math.round((reqAmount - estimatedMaxLoanEligibility) * 100) / 100;
      // DO NOT silently replace requested amount: retain reqAmount, but compute compliant alternative capped at max eligibility
      finalEstimatedLoanAmount = estimatedMaxLoanEligibility;
      calculationBasis = 'Calculated on eligible amount';
      cappingExplanation = `Requested borrowing of ₹${reqAmount.toLocaleString('en-IN')} exceeds the regulatory ceiling of ₹${estimatedMaxLoanEligibility.toLocaleString('en-IN')}. Showing compliant repayment schedule calculated at the maximum permissible limit.`;
    } else {
      hasExceededEligibility = false;
      shortfallAmount = 0;
      finalEstimatedLoanAmount = reqAmount;
      calculationBasis = 'Calculated on requested amount';
    }
  } else {
    finalEstimatedLoanAmount = estimatedMaxLoanEligibility;
    calculationBasis = 'Calculated on max eligible amount';
  }

  // Additional gold grams required to bridge shortfall if requested loan exceeds ceiling
  let additionalWeightNeededGrams = 0;
  const rateForPurity = collateralReport.rate.ratePerGramSelectedPurity;
  if (hasExceededEligibility && rateForPurity > 0 && effectiveMaxLtvPercent > 0) {
    const effectiveLtvFactor = (effectiveMaxLtvPercent / 100) / regulatoryCeiling.maturityMultiplier;
    const pledgeRatePerGram = rateForPurity * effectiveLtvFactor;
    additionalWeightNeededGrams = pledgeRatePerGram > 0
      ? Math.ceil((shortfallAmount / pledgeRatePerGram) * 10) / 10
      : 0;
  }

  // Effective LTV of the final estimated loan amount against collateral value
  const finalMaturityObligation = validRepaymentMethod === 'maturity'
    ? Math.round(finalEstimatedLoanAmount * regulatoryCeiling.maturityMultiplier * 100) / 100
    : finalEstimatedLoanAmount;

  const effectiveApprovedLtvPercent = assessedGoldValue > 0
    ? Math.round((finalMaturityObligation / assessedGoldValue) * 10000) / 100
    : 0;

  const requestedLtvPercent = isRequestedSpecified && assessedGoldValue > 0
    ? Math.round(((reqAmount * regulatoryCeiling.maturityMultiplier) / assessedGoldValue) * 10000) / 100
    : null;

  // 6. Processing Fee & Net Disbursal
  let processingFeeAmount = 0;
  if (effectiveFeeType === 'percent') {
    processingFeeAmount = Math.round((finalEstimatedLoanAmount * (effectiveFee / 100)) * 100) / 100;
  } else {
    processingFeeAmount = Math.round(effectiveFee * 100) / 100;
  }
  const netDisbursalAmount = Math.max(0, Math.round((finalEstimatedLoanAmount - processingFeeAmount) * 100) / 100);

  // 7. Repayment Schedules (Reducing EMI, Monthly Interest, Bullet Maturity)
  let periodicPayment = 0;
  let totalInterest = 0;
  let totalRepayment = 0;
  let maturityAmount = 0;
  let repaymentStructureDescription = '';

  if (validRepaymentMethod === 'bullet') {
    // Monthly Interest: Interest serviced every month, principal returned at maturity
    const monthlyRate = rate / 12 / 100;
    const monthlyInterest = Math.round(finalEstimatedLoanAmount * monthlyRate * 100) / 100;
    periodicPayment = monthlyInterest;
    totalInterest = Math.round(monthlyInterest * tenure * 100) / 100;
    totalRepayment = Math.round((finalEstimatedLoanAmount + totalInterest) * 100) / 100;
    maturityAmount = Math.round((finalEstimatedLoanAmount + monthlyInterest) * 100) / 100; // Final month: principal + last monthly interest
    repaymentStructureDescription = 'Interest serviced monthly; full principal repaid at maturity.';
  } else if (validRepaymentMethod === 'emi') {
    // Reducing-balance regular EMI
    const emiResult = calculateEMI({
      principal: finalEstimatedLoanAmount,
      annualRate: rate,
      tenureMonths: tenure,
      processingFee: 0
    });
    periodicPayment = emiResult.emi;
    totalInterest = emiResult.totalInterest;
    totalRepayment = emiResult.totalPayment;
    maturityAmount = 0; // Settled completely in installments
    repaymentStructureDescription = 'Reducing-balance equal monthly installments covering principal and interest.';
  } else if (validRepaymentMethod === 'maturity') {
    // Bullet Repayment: Principal and interest both settled together at maturity
    const annualFraction = tenure / 12;
    totalInterest = Math.round((finalEstimatedLoanAmount * (rate / 100) * annualFraction) * 100) / 100;
    periodicPayment = 0;
    totalRepayment = Math.round((finalEstimatedLoanAmount + totalInterest) * 100) / 100;
    maturityAmount = totalRepayment;
    repaymentStructureDescription = 'Principal and accumulated interest settled together in a single bullet payment at maturity.';
  }

  return {
    collateral: {
      grossWeightGrams: collateralReport.weight.grossWeightGrams,
      stoneDeductionGrams: collateralReport.weight.stoneDeductionGrams,
      eligibleNetWeightGrams: collateralReport.weight.eligibleNetWeightGrams,
      stoneDeductionPercent: collateralReport.weight.stoneDeductionPercent,
      pureGoldEquivalentWeightGrams: collateralReport.weight.pureGoldEquivalentWeightGrams,
      purityLabel: collateralReport.weight.purityLabel,
      purityFactor: collateralReport.weight.purityFactor,
      karat: collateralReport.weight.karat,
      collateralType,
      isCollateralValid: collateralCheck.isValid,
      collateralLimitError: collateralCheck.error || null,
      maxPermissibleWeightGrams: collateralCheck.maxPermissibleWeight
    },
    valuation: {
      goldRatePerGram24K: collateralReport.rate.goldRatePerGram24K,
      ratePerGramSelectedPurity: collateralReport.rate.ratePerGramSelectedPurity,
      purityUnit: collateralReport.rate.purityUnit,
      benchmarkPurity: collateralReport.rate.benchmarkPurity,
      assessedGoldValue,
      lenderAssessedValue: collateralReport.valuation.lenderAssessedValue,
      sourceName: collateralReport.rate.sourceName,
      statusLabel: collateralReport.rate.statusLabel,
      isLive: collateralReport.rate.isLive,
      isManualOverride: collateralReport.rate.isManualOverride,
      methodologyDescription: collateralReport.rate.methodologyDescription,
      hasHistoricalComparison: collateralReport.rate.hasHistoricalComparison,
      valuationDisclaimer: 'Estimated collateral gold value represents the intrinsic bullion worth of eligible net gold weight.'
    },
    ltv: {
      appliedTier: regulatoryCeiling.appliedTier,
      tierNumber: regulatoryCeiling.tierNumber,
      regulatoryLtvPercent: regulatoryCeiling.regulatoryLtvPercent,
      regulatoryLtvCapPercent: regulatoryCeiling.regulatoryLtvPercent,
      lenderLtvCapPercent,
      effectiveMaxLtvPercent,
      effectiveApprovedLtvPercent,
      requestedLtvPercent,
      isBulletMaturity: regulatoryCeiling.isBulletMaturity,
      tierExplanation: regulatoryCeiling.explanation
    },
    loan: {
      estimatedMaxLoanEligibility,
      // Backward-compatible alias for existing consumers
      maxEligibleLoan: estimatedMaxLoanEligibility,
      approvedLoanAmount: finalEstimatedLoanAmount,
      finalEstimatedLoanAmount,
      requestedLoanAmount: reqAmount,
      isRequestedSpecified,
      hasShortfall: hasExceededEligibility,
      hasExceededEligibility,
      shortfallAmount,
      cappingExplanation,
      shortfallWarning: hasExceededEligibility
        ? `Requested loan amount exceeds the maximum eligible loan of ₹${estimatedMaxLoanEligibility.toLocaleString('en-IN')}. Shortfall: ₹${shortfallAmount.toLocaleString('en-IN')}. Consider pledging an additional ${additionalWeightNeededGrams}g of ${collateralReport.weight.purityLabel} gold or reducing the requested amount.`
        : null,
      calculationBasis,
      additionalWeightNeededGrams,
      annualRate: rate,
      tenureMonths: tenure,
      repaymentMethod: validRepaymentMethod,
      repaymentStructureDescription,
      processingFeeAmount,
      netDisbursalAmount,
      periodicPayment,
      totalInterest,
      totalRepayment,
      maturityAmount,
      approvalDisclaimer: 'Final approved loan amount is subject to physical verification, stone deduction, hallmarking authenticity, and individual credit risk assessment by the lender.',
      disclaimer: 'Estimated Maximum Loan Eligibility is an indicative regulatory ceiling. Actual loan sanction, valuation, stone deductions, and final terms depend on physical verification and lender credit policy.'
    }
  };
}
