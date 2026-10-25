/**
 * @file config.js
 * @description Regulatory LTV tiers, collateral limits, and lender presets.
 * Based on RBI Directions on Lending against Gold and Silver Collateral.
 */

/**
 * @typedef {Object} RegulatoryTier
 * @property {number} maxLoanAmount - Upper loan bound for this tier in INR
 * @property {number} maxLtvPercent - Maximum permissible LTV percentage
 * @property {string} label - Human-readable tier label
 * @property {string} description - Regulatory description
 */

/**
 * Regulatory LTV Tiers based on RBI Lending Against Gold and Silver Collateral Directions
 * Effective baseline (with upcoming directions applicable April 1, 2026).
 * Tier 1: Up to Rs 2.5 Lakh -> 85% LTV
 * Tier 2: Above Rs 2.5 Lakh up to Rs 5.0 Lakh -> 80% LTV
 * Tier 3: Above Rs 5.0 Lakh -> 75% LTV
 * @type {RegulatoryTier[]}
 */
export const REGULATORY_LTV_TIERS = [
  {
    tierNumber: 1,
    minLoanAmount: 0,
    maxLoanAmount: 250000,
    maxLtvPercent: 85,
    label: 'Tier 1 (Up to ₹2.5 Lakh, 85% LTV)',
    shortLabel: 'Tier 1 (Up to ₹2.5L)',
    description: 'Total borrowing up to ₹2,50,000 is eligible for up to 85% Loan-to-Value under RBI directions for gold consumption loans.'
  },
  {
    tierNumber: 2,
    minLoanAmount: 250000,
    maxLoanAmount: 500000,
    maxLtvPercent: 80,
    label: 'Tier 2 (₹2.5 Lakh to ₹5 Lakh, 80% LTV)',
    shortLabel: 'Tier 2 (₹2.5L - ₹5L)',
    description: 'Borrowing above ₹2,50,000 and up to ₹5,00,000 is eligible for up to 80% Loan-to-Value.'
  },
  {
    tierNumber: 3,
    minLoanAmount: 500000,
    maxLoanAmount: Infinity,
    maxLtvPercent: 75,
    label: 'Tier 3 (Above ₹5 Lakh, 75% LTV)',
    shortLabel: 'Tier 3 (> ₹5L)',
    description: 'Borrowing above ₹5,00,000 is capped at 75% Loan-to-Value.'
  }
];

/**
 * Bullet Repayment Regulatory Rules per RBI Master Directions
 * For loans where principal and interest are paid together at maturity:
 * The regulatory LTV ceiling must be maintained on the total amount payable at maturity (Principal + Interest).
 */
export const BULLET_REPAYMENT_RULES = {
  description: 'Under RBI Master Directions for bullet repayment gold loans, the LTV ratio must account for the total amount payable at maturity (Principal + Accrued Interest).',
  standardMaxTenureMonths: 12,
  interestCalculationMethod: 'simple'
};

/**
 * Collateral limits per RBI directions
 * - Gold jewellery/ornaments: up to 1,000 grams (1 kg) per individual borrower
 * - Gold coins minted by banks/MMTC: up to 50 grams per borrower
 */
export const COLLATERAL_LIMITS = {
  ornamentMaxGrams: 1000, // 1 kg
  coinMaxGrams: 50,        // 50 g
  minPurityKarat: 18,
  maxPurityKarat: 24
};

/**
 * Purity definitions and gold weight conversion factors
 */
export const PURITY_FACTORS = {
  '24K': 1.0,   // Standard 24K benchmark (100% fine basis, ratio 1.0)
  '22K': 0.916, // 91.6% standard Indian jewellery hallmark
  '18K': 0.750  // 75.0% jewellery hallmark
};

/**
 * @typedef {Object} LenderPreset
 * @property {string} id - Unique preset identifier
 * @property {string} name - Institution name
 * @property {string} category - Bank or NBFC or Fintech
 * @property {number} defaultAnnualRate - Annual interest rate %
 * @property {number} minRate - Min interest rate %
 * @property {number} maxRate - Max interest rate %
 * @property {number} maxLtvPercent - Lender specific LTV cap
 * @property {number} minLoanAmount - Min loan in INR
 * @property {number} maxLoanAmount - Max loan in INR
 * @property {number} defaultTenureMonths - Default tenure in months
 * @property {number} minTenureMonths - Min tenure in months
 * @property {number} maxTenureMonths - Max tenure in months
 * @property {number} processingFeePercent - Processing fee %
 * @property {number} processingFeeFlat - Processing fee flat in INR
 * @property {string} feeType - 'percent' | 'flat'
 * @property {string[]} supportedRepayments - Supported repayment methods: 'bullet' | 'emi' | 'maturity'
 * @property {string} sourceUrl - Official URL for verification
 * @property {string} verifiedOn - Verification timestamp (YYYY-MM-DD)
 * @property {string} expiryDate - Verification expiry timestamp
 * @property {boolean} isIllustrative - Flag indicating if this is an illustrative preset
 */

/**
 * 3 Clearly Labelled Illustrative Lender Presets
 * Marked as illustrative assumptions, not official offers.
 * @type {LenderPreset[]}
 */
export const ILLUSTRATIVE_LENDER_PRESETS = [
  {
    id: 'psu-bank-standard',
    name: 'Public Sector Bank Standard',
    category: 'Public Sector Bank',
    defaultAnnualRate: 8.75,
    minRate: 8.50,
    maxRate: 9.75,
    maxLtvPercent: 75,
    minLoanAmount: 20000,
    maxLoanAmount: 5000000,
    defaultTenureMonths: 12,
    minTenureMonths: 3,
    maxTenureMonths: 36,
    processingFeePercent: 0.50,
    processingFeeFlat: 0,
    feeType: 'percent',
    supportedRepayments: ['bullet', 'emi'],
    sourceUrl: 'https://sbi.co.in/web/personal-banking/loans/gold-loan',
    verifiedOn: '2026-01-15',
    expiryDate: '2026-12-31',
    isIllustrative: true
  },
  {
    id: 'nbfc-fast-track',
    name: 'NBFC Quick Disbursal Gold Loan',
    category: 'Non-Banking Financial Company',
    defaultAnnualRate: 11.50,
    minRate: 10.50,
    maxRate: 15.00,
    maxLtvPercent: 75,
    minLoanAmount: 5000,
    maxLoanAmount: 2500000,
    defaultTenureMonths: 12,
    minTenureMonths: 1,
    maxTenureMonths: 24,
    processingFeePercent: 1.00,
    processingFeeFlat: 0,
    feeType: 'percent',
    supportedRepayments: ['bullet', 'maturity', 'emi'],
    sourceUrl: 'https://www.muthootfinance.com/gold-loan',
    verifiedOn: '2026-01-15',
    expiryDate: '2026-12-31',
    isIllustrative: true
  },
  {
    id: 'fintech-gold-overdraft',
    name: 'Fintech Gold Overdraft / Flexi',
    category: 'Fintech / Digital NBFC',
    defaultAnnualRate: 10.25,
    minRate: 9.99,
    maxRate: 13.50,
    maxLtvPercent: 75,
    minLoanAmount: 25000,
    maxLoanAmount: 1000000,
    defaultTenureMonths: 6,
    minTenureMonths: 1,
    maxTenureMonths: 18,
    processingFeePercent: 0,
    processingFeeFlat: 500,
    feeType: 'flat',
    supportedRepayments: ['bullet', 'emi'],
    sourceUrl: 'https://rupeek.com/gold-loan',
    verifiedOn: '2026-01-15',
    expiryDate: '2026-12-31',
    isIllustrative: true
  }
];

export const TROY_OUNCE_TO_GRAMS = 31.1034768;
export const TOLA_TO_GRAMS = 11.6638;
