/**
 * @file goldValuation.js
 * @description RBI-compliant gold collateral valuation engine.
 * Computes eligible net gold weight (excluding stones and non-gold materials),
 * applies RBI regulatory benchmark comparison (min of preceding 30-day average closing and preceding day closing),
 * converts to pure 24K fine-gold equivalent using hallmark factors, and evaluates intrinsic collateral worth.
 */

import { PURITY_FACTORS } from './config.js';

/**
 * Normalizes and resolves gold purity factor and hallmark label
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
    if (num >= 17.5 && num <= 18.5) return { karat: 18, factor: PURITY_FACTORS['18K'], label: '18K (75.0% Hallmark)' };
    const factor = Math.min(1.0, (num / 24) * 0.999);
    return { karat: num, factor: Math.round(factor * 1000) / 1000, label: `${num}K` };
  }

  // Default to 22K (standard Indian jewellery hallmark)
  return { karat: 22, factor: PURITY_FACTORS['22K'], label: '22K (91.6% Hallmark)' };
}

/**
 * Calculates net eligible gold weight after excluding stones and non-gold materials
 * @param {number} grossWeight - Total gross weight in grams
 * @param {number} [stoneDeductions=0] - Weight of stones, wax, enamel in grams
 * @returns {{grossWeightGrams: number, stoneDeductionGrams: number, eligibleNetWeightGrams: number, stoneDeductionPercent: number}}
 */
export function calculateNetWeight(grossWeight, stoneDeductions = 0) {
  const gross = Math.max(0, Number(grossWeight) || 0);
  const deduction = Math.max(0, Math.min(gross, Number(stoneDeductions) || 0));
  const net = Math.round(Math.max(0, gross - deduction) * 1000) / 1000;
  const deductionPercent = gross > 0 ? Math.round((deduction / gross) * 10000) / 100 : 0;

  return {
    grossWeightGrams: gross,
    stoneDeductionGrams: deduction,
    eligibleNetWeightGrams: net,
    stoneDeductionPercent: deductionPercent
  };
}

/**
 * Computes RBI regulatory gold valuation rate per gram
 * Under RBI Directions on Lending against Gold Jewellery:
 * Gold collateral shall be valued at the lower of:
 *  (a) Average of the closing price of 24K gold for the preceding 30 days, and
 *  (b) Closing price of 24K gold on the preceding business day.
 *
 * @param {Object} params
 * @param {number} [params.goldRate24K] - Benchmark 24K gold rate per gram
 * @param {number} [params.preceding30DayAvg24K] - 30-day average closing rate for 24K
 * @param {number} [params.precedingDayClosing24K] - Preceding day closing rate for 24K
 * @returns {{valuationRate24K: number, methodology: string, hasHistoricalComparison: boolean, description: string}}
 */
export function determineRbiBenchmarkRate({
  goldRate24K = 0,
  preceding30DayAvg24K = null,
  precedingDayClosing24K = null
}) {
  const baseRate = Math.max(0, Number(goldRate24K) || 0);
  const avg30 = preceding30DayAvg24K !== null && !isNaN(Number(preceding30DayAvg24K)) && Number(preceding30DayAvg24K) > 0
    ? Number(preceding30DayAvg24K)
    : null;
  const day1 = precedingDayClosing24K !== null && !isNaN(Number(precedingDayClosing24K)) && Number(precedingDayClosing24K) > 0
    ? Number(precedingDayClosing24K)
    : null;

  if (avg30 !== null && day1 !== null) {
    const minRate = Math.min(avg30, day1);
    return {
      valuationRate24K: minRate,
      methodology: 'rbi_30day_vs_1day_min',
      hasHistoricalComparison: true,
      description: `Valued at the lower of preceding 30-day average (₹${avg30.toLocaleString('en-IN')}) and preceding day closing (₹${day1.toLocaleString('en-IN')}) per RBI directions.`
    };
  }

  return {
    valuationRate24K: baseRate,
    methodology: 'indicative_benchmark',
    hasHistoricalComparison: false,
    description: `Valued using indicative benchmark rate of ₹${baseRate.toLocaleString('en-IN')}/g. Full 30-day historical closing series unavailable; limitation disclosed per RBI guidelines.`
  };
}

/**
 * Comprehensive RBI-compliant Gold Collateral Valuation
 *
 * @param {Object} params
 * @param {number} params.grossWeight - Gross weight of collateral in grams
 * @param {number} [params.stoneDeductions=0] - Non-gold/stone weight in grams
 * @param {string|number} [params.purity='22K'] - Gold purity identifier
 * @param {number} [params.goldRate24K] - Base 24K benchmark rate per gram in INR
 * @param {number} [params.rateForSelectedPurity] - Direct rate for selected purity (e.g. user override)
 * @param {number} [params.preceding30DayAvg24K] - 30-day avg closing rate for 24K
 * @param {number} [params.precedingDayClosing24K] - Preceding day closing rate for 24K
 * @param {string} [params.sourceName='World Gold Council (Goldhub) & LBMA'] - Data source
 * @param {string} [params.asOfTimestamp] - Timestamp of rate
 * @param {boolean} [params.isManualOverride=false] - Whether rate was manually entered
 * @param {boolean} [params.isLiveMarket=true] - Whether rate is from live feed
 * @param {number} [params.lenderHaircutPercent=0] - Optional lender risk haircut percentage
 * @returns {Object} Comprehensive collateral valuation report
 */
export function evaluateGoldCollateral({
  grossWeight,
  stoneDeductions = 0,
  purity = '22K',
  goldRate24K = 0,
  rateForSelectedPurity = null,
  preceding30DayAvg24K = null,
  precedingDayClosing24K = null,
  sourceName = 'World Gold Council (Goldhub) & LBMA',
  asOfTimestamp = null,
  isManualOverride = false,
  isLiveMarket = true,
  lenderHaircutPercent = 0
}) {
  // 1. Net weight determination (exclude stones & non-gold materials)
  const weightInfo = calculateNetWeight(grossWeight, stoneDeductions);
  const netGrams = weightInfo.eligibleNetWeightGrams;

  // 2. Purity factor & 24K fine equivalent
  const resolvedPurity = resolvePurity(purity);
  const pureGoldEquivalentWeightGrams = Math.round(netGrams * resolvedPurity.factor * 1000) / 1000;

  // 3. RBI Benchmark rate per gram determination
  let finalRate24K = 0;
  let finalRateSelectedPurity = 0;
  let rateMethodology = 'indicative_benchmark';
  let methodologyDescription = '';
  let hasComparison = false;

  if (rateForSelectedPurity !== null && Number(rateForSelectedPurity) > 0) {
    // Direct rate entered or overridden for the selected purity
    finalRateSelectedPurity = Number(rateForSelectedPurity);
    finalRate24K = resolvedPurity.factor > 0
      ? Math.round((finalRateSelectedPurity / resolvedPurity.factor) * 100) / 100
      : finalRateSelectedPurity;
    rateMethodology = isManualOverride ? 'manual_override' : 'direct_purity_rate';
    methodologyDescription = isManualOverride
      ? `User-entered custom rate of ₹${finalRateSelectedPurity.toLocaleString('en-IN')}/g for ${resolvedPurity.label}.`
      : `Benchmark rate of ₹${finalRateSelectedPurity.toLocaleString('en-IN')}/g for ${resolvedPurity.label}.`;
  } else {
    // 24K rate resolution with RBI 30-day vs 1-day check
    const rbiCheck = determineRbiBenchmarkRate({
      goldRate24K,
      preceding30DayAvg24K,
      precedingDayClosing24K
    });
    finalRate24K = rbiCheck.valuationRate24K;
    rateMethodology = rbiCheck.methodology;
    methodologyDescription = rbiCheck.description;
    hasComparison = rbiCheck.hasHistoricalComparison;

    // Convert 24K to selected purity rate (apply factor exactly ONCE)
    finalRateSelectedPurity = Math.round(finalRate24K * resolvedPurity.factor * 100) / 100;
  }

  // 4. Intrinsic Collateral Valuation
  // Evaluated on net eligible weight and purity rate (guarantees zero double counting)
  const assessedGoldValue = Math.round(netGrams * finalRateSelectedPurity * 100) / 100;

  // 5. Lender-assessed value (after lender risk haircut if configured)
  const haircutPct = Math.max(0, Math.min(50, Number(lenderHaircutPercent) || 0));
  const lenderAssessedValue = haircutPct > 0
    ? Math.round(assessedGoldValue * (1 - haircutPct / 100) * 100) / 100
    : assessedGoldValue;

  // 6. Provenance & Freshness Status Labeling (never claim "Live" for manual or stale)
  let statusLabel = 'INDICATIVE BENCHMARK';
  if (isManualOverride) {
    statusLabel = 'MANUAL OVERRIDE';
  } else if (isLiveMarket && finalRate24K > 0) {
    statusLabel = 'LIVE BENCHMARK';
  } else if (!isLiveMarket && finalRate24K > 0) {
    statusLabel = 'INDICATIVE BENCHMARK';
  } else {
    statusLabel = 'MARKET RATE UNAVAILABLE';
  }

  return {
    weight: {
      grossWeightGrams: weightInfo.grossWeightGrams,
      stoneDeductionGrams: weightInfo.stoneDeductionGrams,
      eligibleNetWeightGrams: netGrams,
      stoneDeductionPercent: weightInfo.stoneDeductionPercent,
      pureGoldEquivalentWeightGrams,
      purityLabel: resolvedPurity.label,
      purityFactor: resolvedPurity.factor,
      karat: resolvedPurity.karat
    },
    rate: {
      goldRatePerGram24K: finalRate24K,
      ratePerGramSelectedPurity: finalRateSelectedPurity,
      purityUnit: '₹ per gram',
      benchmarkPurity: '24K fine basis',
      sourceName,
      asOfTimestamp,
      statusLabel,
      isLive: isLiveMarket && !isManualOverride,
      isManualOverride,
      methodology: rateMethodology,
      methodologyDescription,
      hasHistoricalComparison: hasComparison
    },
    valuation: {
      assessedGoldValue,
      lenderAssessedValue,
      lenderHaircutPercent: haircutPct,
      valuationDisclaimer: 'Estimated gold value represents the intrinsic bullion value of eligible net gold weight before melting loss or lender risk haircuts.'
    }
  };
}
