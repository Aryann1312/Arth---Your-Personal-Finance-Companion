/**
 * @file goldLoan.js
 * @description Gold Loan Calculation Engine: Pure weight conversion, assessed gold valuation,
 * regulatory tiered LTV (RBI Lending Against Gold Collateral Directions), non-circular eligibility,
 * collateral limit validation, and repayment method structures (Bullet, EMI, Maturity).
 */

import { REGULATORY_LTV_TIERS, COLLATERAL_LIMITS, PURITY_FACTORS } from './config.js';
import { calculateEMI } from './emi.js';

/**
 * Normalizes and resolves purity factor
 * @param {string|number} purity - Purity identifier ('24K', '22K', '18K' or numeric karat)
 * @returns {{karat: number, factor: number, label: string}}
 */
export function resolvePurity(purity) {
  if (typeof purity === 'string') {
    const key = purity.toUpperCase().trim();
    if (PURITY_FACTORS[key] !== undefined) {
      const karatNum = key === '24K' ? 24 : key === '22K' ? 22 : 18;
      return { karat: karatNum, factor: PURITY_FACTORS[key], label: key };
    }
  }

  const num = Number(purity);
  if (!isNaN(num) && num > 0) {
    if (num >= 23.5) return { karat: 24, factor: PURITY_FACTORS['24K'], label: '24K (99.9% Fine)' };
    if (num >= 21.5 && num <= 22.5) return { karat: 22, factor: PURITY_FACTORS['22K'], label: '22K (91.6% Hallmark)' };
    if (num >= 17.5 && num <= 18.5) return { karat: 18, factor: PURITY_FACTORS['18K'], label: '18K (75.0%)' };
    const factor = Math.min(1.0, (num / 24) * 0.999);
    return { karat: num, factor, label: `${num}K` };
  }

  // Default to 22K (standard Indian jewellery)
  return { karat: 22, factor: PURITY_FACTORS['22K'], label: '22K (91.6% Hallmark)' };
}

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
        error: `Gold coins are capped at ${COLLATERAL_LIMITS.coinMaxGrams} grams per borrower under regulatory directions. Current weight: ${w}g.`,
        maxPermissibleWeight: COLLATERAL_LIMITS.coinMaxGrams
      };
    }
    return { isValid: true, maxPermissibleWeight: COLLATERAL_LIMITS.coinMaxGrams };
  }

  // Ornament
  if (w > COLLATERAL_LIMITS.ornamentMaxGrams) {
    return {
      isValid: false,
      error: `Jewellery/ornaments are capped at 1,000 grams (1 kg) per individual borrower. Current weight: ${w}g.`,
      maxPermissibleWeight: COLLATERAL_LIMITS.ornamentMaxGrams
    };
  }

  return { isValid: true, maxPermissibleWeight: COLLATERAL_LIMITS.ornamentMaxGrams };
}

/**
 * Computes non-circular tiered LTV regulatory loan ceiling
 * Regulatory tiers:
 *  - Tier 1: Loan <= 250,000 -> 85% LTV
 *  - Tier 2: Loan > 250,000 and <= 500,000 -> 80% LTV
 *  - Tier 3: Loan > 500,000 -> 75% LTV
 *
 * @param {number} assessedValue - Assessed gold value in INR
 * @returns {{maxRegulatoryLoan: number, appliedTier: string, regulatoryLtvPercent: number}}
 */
export function calculateTieredLtvLoanCeiling(assessedValue) {
  const V = Math.max(0, Number(assessedValue) || 0);
  if (V <= 0) {
    return { maxRegulatoryLoan: 0, appliedTier: 'Tier 1 (Up to Rs 2.5 Lakh)', regulatoryLtvPercent: 85 };
  }

  // Tier 1 potential: 85% of V
  const tier1Potential = 0.85 * V;
  if (tier1Potential <= 250000) {
    return {
      maxRegulatoryLoan: Math.round(tier1Potential * 100) / 100,
      appliedTier: 'Tier 1 (Up to Rs 2.5 Lakh, 85% LTV)',
      regulatoryLtvPercent: 85
    };
  }

  // Value exceeds Tier 1 threshold. Check Tier 2 (80% of V)
  const tier2Potential = 0.80 * V;
  if (tier2Potential <= 250000) {
    // Value is between 250,000/0.85 (294,117.65) and 250,000/0.80 (312,500)
    // Capped at Rs 2,50,000 under Tier 1
    return {
      maxRegulatoryLoan: 250000,
      appliedTier: 'Tier 1 (Boundary capped at Rs 2.5 Lakh, 85% LTV)',
      regulatoryLtvPercent: Math.round((250000 / V) * 10000) / 100
    };
  }

  if (tier2Potential <= 500000) {
    return {
      maxRegulatoryLoan: Math.round(tier2Potential * 100) / 100,
      appliedTier: 'Tier 2 (Rs 2.5 Lakh to Rs 5 Lakh, 80% LTV)',
      regulatoryLtvPercent: 80
    };
  }

  // Value exceeds Tier 2 threshold. Check Tier 3 (75% of V)
  const tier3Potential = 0.75 * V;
  if (tier3Potential <= 500000) {
    // Value is between 500,000/0.80 (625,000) and 500,000/0.75 (666,666.67)
    // Capped at Rs 5,00,000 under Tier 2
    return {
      maxRegulatoryLoan: 500000,
      appliedTier: 'Tier 2 (Boundary capped at Rs 5 Lakh, 80% LTV)',
      regulatoryLtvPercent: Math.round((500000 / V) * 10000) / 100
    };
  }

  // Tier 3
  return {
    maxRegulatoryLoan: Math.round(tier3Potential * 100) / 100,
    appliedTier: 'Tier 3 (Above Rs 5 Lakh, 75% LTV)',
    regulatoryLtvPercent: 75
  };
}

/**
 * Calculates complete Gold Loan estimation
 * @param {Object} params
 * @param {number} params.weight - Gross gold weight in grams
 * @param {string|number} [params.purity='22K'] - Gold purity
 * @param {number} params.goldRatePerGram - Benchmark 24K gold rate per gram in INR
 * @param {number} [params.requestedLoanAmount] - Desired loan amount in INR (optional)
 * @param {number} [params.annualRate=10.5] - Annual interest rate in %
 * @param {number} [params.tenureMonths=12] - Loan tenure in months
 * @param {('bullet'|'emi'|'maturity')} [params.repaymentMethod='bullet'] - Repayment structure
 * @param {('ornament'|'coin')} [params.collateralType='ornament'] - Collateral type
 * @param {number} [params.processingFee=0] - Processing fee
 * @param {('percent'|'flat')} [params.feeType='percent'] - Processing fee type
 * @param {Object} [params.lenderPreset] - Lender preset constraints
 * @returns {Object} Comprehensive calculation result
 */
export function calculateGoldLoan({
  weight,
  purity = '22K',
  goldRatePerGram,
  ratePerGramSelectedPurity,
  isRateForSelectedPurity = false,
  requestedLoanAmount,
  annualRate,
  tenureMonths = 12,
  repaymentMethod = 'bullet',
  collateralType = 'ornament',
  processingFee = 0,
  feeType = 'percent',
  lenderPreset = null
}) {
  const w = Math.max(0, Number(weight) || 0);
  const tenure = Math.max(1, Math.round(Number(tenureMonths) || 12));

  // Rate resolution: Lender preset provides default if annualRate not passed
  const defaultRate = lenderPreset?.defaultAnnualRate !== undefined ? Number(lenderPreset.defaultAnnualRate) : 8.75;
  const rate = annualRate !== undefined && annualRate !== null && !isNaN(Number(annualRate))
    ? Math.max(0, Math.min(100, Number(annualRate)))
    : defaultRate;

  // Collateral Limits Check
  const collateralCheck = validateCollateralLimits({ weight: w, collateralType });

  // Purity conversion
  const resolvedPurity = resolvePurity(purity);
  const pureGoldEquivalentWeightGrams = Math.round(w * resolvedPurity.factor * 1000) / 1000;

  // Gold Rate for Selected Purity: Apply purity exactly ONCE
  let finalRatePerGramSelectedPurity = 0;
  let finalRatePerGram24K = 0;

  if (ratePerGramSelectedPurity !== undefined && Number(ratePerGramSelectedPurity) > 0) {
    finalRatePerGramSelectedPurity = Number(ratePerGramSelectedPurity);
    finalRatePerGram24K = resolvedPurity.factor > 0
      ? Math.round((finalRatePerGramSelectedPurity / resolvedPurity.factor) * 100) / 100
      : finalRatePerGramSelectedPurity;
  } else if (isRateForSelectedPurity) {
    finalRatePerGramSelectedPurity = Math.max(0, Number(goldRatePerGram) || 0);
    finalRatePerGram24K = resolvedPurity.factor > 0
      ? Math.round((finalRatePerGramSelectedPurity / resolvedPurity.factor) * 100) / 100
      : finalRatePerGramSelectedPurity;
  } else {
    // goldRatePerGram is base 24K rate
    finalRatePerGram24K = Math.max(0, Number(goldRatePerGram) || 0);
    finalRatePerGramSelectedPurity = Math.round(finalRatePerGram24K * resolvedPurity.factor * 100) / 100;
  }

  // Valuation: gross weight * rate-for-selected-purity (applies purity exactly once)
  const assessedGoldValue = Math.round(w * finalRatePerGramSelectedPurity * 100) / 100;

  // Tiered regulatory LTV ceiling
  const regulatoryCeiling = calculateTieredLtvLoanCeiling(assessedGoldValue);

  // Lender policy limits
  let lenderLtvCapPercent = 75; // Standard baseline
  let minLoanAllowed = 0;
  let maxLoanAllowed = Infinity;

  if (lenderPreset) {
    if (lenderPreset.maxLtvPercent) lenderLtvCapPercent = Number(lenderPreset.maxLtvPercent);
    if (lenderPreset.minLoanAmount) minLoanAllowed = Number(lenderPreset.minLoanAmount);
    if (lenderPreset.maxLoanAmount) maxLoanAllowed = Number(lenderPreset.maxLoanAmount);
  }

  // Effective LTV ceiling is min of regulatory tier cap and lender cap
  const effectiveMaxLtvPercent = Math.min(regulatoryCeiling.regulatoryLtvPercent, lenderLtvCapPercent);
  let maxEligibleLoan = Math.min(
    regulatoryCeiling.maxRegulatoryLoan,
    Math.round((assessedGoldValue * (effectiveMaxLtvPercent / 100)) * 100) / 100
  );

  // Cap with lender's absolute maximum
  if (maxEligibleLoan > maxLoanAllowed) {
    maxEligibleLoan = maxLoanAllowed;
  }

  // Requested loan resolution & Shortfall analysis
  const req = (requestedLoanAmount !== undefined && requestedLoanAmount !== null && Number(requestedLoanAmount) > 0)
    ? Number(requestedLoanAmount)
    : null;

  let approvedLoanAmount = maxEligibleLoan;
  let hasShortfall = false;
  let shortfallAmount = 0;
  let calculationBasis = 'Calculated on max eligible amount';

  if (req !== null) {
    if (req > maxEligibleLoan) {
      hasShortfall = true;
      shortfallAmount = Math.round((req - maxEligibleLoan) * 100) / 100;
      approvedLoanAmount = maxEligibleLoan;
      calculationBasis = 'Calculated on eligible amount';
    } else {
      approvedLoanAmount = req;
      calculationBasis = 'Calculated on requested amount';
    }
  }

  let additionalWeightNeededGrams = 0;
  if (hasShortfall && finalRatePerGramSelectedPurity > 0 && effectiveMaxLtvPercent > 0) {
    const effectivePledgedRate = finalRatePerGramSelectedPurity * (effectiveMaxLtvPercent / 100);
    additionalWeightNeededGrams = Math.ceil((shortfallAmount / effectivePledgedRate) * 10) / 10;
  }

  // Effective LTV of the approved loan
  const effectiveApprovedLtvPercent =
    assessedGoldValue > 0
      ? Math.round((approvedLoanAmount / assessedGoldValue) * 10000) / 100
      : 0;

  // Processing Fee Calculation
  let processingFeeAmount = 0;
  if (feeType === 'percent') {
    processingFeeAmount = Math.round((approvedLoanAmount * (Number(processingFee) || 0) / 100) * 100) / 100;
  } else {
    processingFeeAmount = Math.round((Number(processingFee) || 0) * 100) / 100;
  }
  const netDisbursalAmount = Math.max(0, approvedLoanAmount - processingFeeAmount);

  // Repayment Calculation
  let periodicPayment = 0;
  let totalInterest = 0;
  let totalRepayment = 0;
  let maturityAmount = 0;

  const validRepaymentMethod = ['bullet', 'emi', 'maturity'].includes(repaymentMethod)
    ? repaymentMethod
    : 'bullet';

  if (validRepaymentMethod === 'bullet') {
    // Monthly interest payment, principal returned at maturity
    const monthlyRate = rate / 12 / 100;
    const monthlyInterest = Math.round(approvedLoanAmount * monthlyRate * 100) / 100;
    periodicPayment = monthlyInterest;
    totalInterest = Math.round(monthlyInterest * tenure * 100) / 100;
    totalRepayment = approvedLoanAmount + totalInterest;
    maturityAmount = approvedLoanAmount + monthlyInterest; // Final month is principal + monthly interest
  } else if (validRepaymentMethod === 'emi') {
    // Equal monthly installment
    const emiResult = calculateEMI({
      principal: approvedLoanAmount,
      annualRate: rate,
      tenureMonths: tenure,
      processingFee: 0
    });
    periodicPayment = emiResult.emi;
    totalInterest = emiResult.totalInterest;
    totalRepayment = emiResult.totalPayment;
    maturityAmount = 0; // Settled completely in installments
  } else if (validRepaymentMethod === 'maturity') {
    // Interest and principal settled together at maturity (bullet interest)
    const annualFraction = tenure / 12;
    totalInterest = Math.round((approvedLoanAmount * (rate / 100) * annualFraction) * 100) / 100;
    periodicPayment = 0;
    totalRepayment = approvedLoanAmount + totalInterest;
    maturityAmount = totalRepayment;
  }

  return {
    collateral: {
      grossWeightGrams: w,
      pureGoldEquivalentWeightGrams,
      purityLabel: resolvedPurity.label,
      purityFactor: resolvedPurity.factor,
      collateralType,
      isCollateralValid: collateralCheck.isValid,
      collateralLimitError: collateralCheck.error || null,
      maxPermissibleWeightGrams: collateralCheck.maxPermissibleWeight
    },
    valuation: {
      goldRatePerGram24K: finalRatePerGram24K,
      ratePerGramSelectedPurity: finalRatePerGramSelectedPurity,
      purityLabel: resolvedPurity.label,
      purityFactor: resolvedPurity.factor,
      assessedGoldValue,
      valuationDisclaimer: 'Estimated gold value is the intrinsic bullion worth before stone deductions, melting loss, or lender-specific risk haircuts.'
    },
    ltv: {
      appliedTier: regulatoryCeiling.appliedTier,
      regulatoryLtvCapPercent: regulatoryCeiling.regulatoryLtvPercent,
      lenderLtvCapPercent,
      effectiveMaxLtvPercent,
      effectiveApprovedLtvPercent
    },
    loan: {
      maxEligibleLoan,
      approvedLoanAmount,
      requestedLoanAmount: req,
      hasShortfall,
      shortfallAmount,
      shortfallWarning: hasShortfall
        ? `Requested loan amount exceeds the maximum eligible loan of ₹${maxEligibleLoan.toLocaleString('en-IN')}. Shortfall: ₹${shortfallAmount.toLocaleString('en-IN')}. Consider pledging an additional ${additionalWeightNeededGrams}g of ${resolvedPurity.label} gold or reducing the requested amount.`
        : null,
      calculationBasis,
      additionalWeightNeededGrams,
      annualRate: rate,
      tenureMonths: tenure,
      repaymentMethod: validRepaymentMethod,
      processingFeeAmount,
      netDisbursalAmount,
      periodicPayment,
      totalInterest,
      totalRepayment,
      maturityAmount,
      approvalDisclaimer: 'Final approved loan amount is subject to physical verification, stone deduction, hallmarking authenticity, and individual credit risk assessment by the lender.'
    }
  };
}
