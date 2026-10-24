/**
 * @file goldDerivation.js
 * @description Pure functions for gold unit conversion, international XAU/USD to INR derivation,
 * domestic Indian tariff and GST estimation, and purity calculations.
 */

import { TROY_OUNCE_TO_GRAMS, TOLA_TO_GRAMS, PURITY_FACTORS } from './config.js';

/**
 * Converts weights between units (grams, troy ounces, tolas, 10g units)
 * @param {number} value - Numeric quantity
 * @param {('gram'|'ounce'|'tola'|'10g')} fromUnit
 * @param {('gram'|'ounce'|'tola'|'10g')} toUnit
 * @returns {number} Converted weight
 */
export function convertGoldWeight(value, fromUnit = 'gram', toUnit = 'gram') {
  const val = Number(value) || 0;
  if (val <= 0) return 0;
  if (fromUnit === toUnit) return val;

  // Convert to grams first
  let grams = 0;
  switch (fromUnit) {
    case 'gram':
      grams = val;
      break;
    case 'ounce':
      grams = val * TROY_OUNCE_TO_GRAMS;
      break;
    case 'tola':
      grams = val * TOLA_TO_GRAMS;
      break;
    case '10g':
      grams = val * 10;
      break;
    default:
      grams = val;
  }

  // Convert grams to target unit
  switch (toUnit) {
    case 'gram':
      return Math.round(grams * 10000) / 10000;
    case 'ounce':
      return Math.round((grams / TROY_OUNCE_TO_GRAMS) * 10000) / 10000;
    case 'tola':
      return Math.round((grams / TOLA_TO_GRAMS) * 10000) / 10000;
    case '10g':
      return Math.round((grams / 10) * 10000) / 10000;
    default:
      return grams;
  }
}

/**
 * Derives INR price per gram from international spot (XAU/USD) and FX rate (USD/INR)
 * Formula: INR/gram = (XAU_USD / 31.1034768) * USD_INR * purityFactor
 *
 * @param {Object} params
 * @param {number} params.xauUsd - Price of 1 troy ounce of gold in USD
 * @param {number} params.usdInr - Exchange rate (1 USD in INR)
 * @param {string|number} [params.purity='24K'] - Target purity ('24K', '22K', '18K')
 * @returns {Object} Derived prices and provenance metadata
 */
export function deriveINRPriceFromSpot({ xauUsd, usdInr, purity = '24K' }) {
  const spotUsd = Number(xauUsd) || 0;
  const fxRate = Number(usdInr) || 0;

  if (spotUsd <= 0 || fxRate <= 0) {
    return {
      pricePerGram: 0,
      pricePer10Gram: 0,
      pricePerOunce: 0,
      currency: 'INR',
      purity: String(purity),
      basis: 'indicative_derived_spot',
      label: 'Indicative International Spot Converted to INR (Ex-Duty & Ex-GST)',
      dutyAndTaxIncluded: false
    };
  }

  // Factor
  const factor = PURITY_FACTORS[purity] || (purity === '22K' ? 0.916 : purity === '18K' ? 0.75 : 0.999);

  // Spot USD per gram fine gold
  const spotUsdPerGramFine = spotUsd / TROY_OUNCE_TO_GRAMS;
  const priceInrPerGramFine = spotUsdPerGramFine * fxRate;
  const derivedPricePerGram = Math.round(priceInrPerGramFine * factor * 100) / 100;
  const derivedPricePer10Gram = Math.round(derivedPricePerGram * 10 * 100) / 100;
  const derivedPricePerOunce = Math.round(spotUsd * fxRate * 100) / 100;

  return {
    pricePerGram: derivedPricePerGram,
    pricePer10Gram: derivedPricePer10Gram,
    pricePerOunce: derivedPricePerOunce,
    currency: 'INR',
    purity: String(purity),
    purityFactor: factor,
    basis: 'indicative_derived_spot',
    label: 'Indicative Derived Spot Price (Ex-Duty & Ex-GST)',
    dutyAndTaxIncluded: false,
    disclaimer: 'This price represents international London/COMEX spot converted directly to INR. It excludes Indian Basic Customs Duty (6%), AIDC, local premium, and 3% domestic GST.'
  };
}

/**
 * Calculates estimated Indian domestic retail jeweller price by adding Customs Duty and GST
 *
 * @param {Object} params
 * @param {number} params.baseDerivedInrPerGram - Base spot price in INR per gram (ex-duty)
 * @param {number} [params.customsDutyPercent=6.0] - Basic Customs Duty % (post-July 2024 budget = 6%)
 * @param {number} [params.aidcPercent=0] - Agriculture Infrastructure Cess %
 * @param {number} [params.localBullionPremiumPercent=1.0] - Domestic vaulting/freight/refinery premium %
 * @param {number} [params.gstPercent=3.0] - Indian Goods and Services Tax %
 * @returns {Object} Estimated domestic retail breakdown
 */
export function estimateIndianRetailPrice({
  baseDerivedInrPerGram,
  customsDutyPercent = 6.0,
  aidcPercent = 0,
  localBullionPremiumPercent = 1.0,
  gstPercent = 3.0
}) {
  const baseRate = Math.max(0, Number(baseDerivedInrPerGram) || 0);

  // Import Tariffs
  const dutyAmountPerGram = (baseRate * customsDutyPercent) / 100;
  const aidcAmountPerGram = (baseRate * aidcPercent) / 100;
  const landedCostPerGram = baseRate + dutyAmountPerGram + aidcAmountPerGram;

  // Bullion association premium (IBJA benchmark markup)
  const premiumAmountPerGram = (landedCostPerGram * localBullionPremiumPercent) / 100;
  const domesticBullionRateExGstPerGram = landedCostPerGram + premiumAmountPerGram;

  // 3% GST on retail gold
  const gstAmountPerGram = (domesticBullionRateExGstPerGram * gstPercent) / 100;
  const estimatedRetailRatePerGram = Math.round((domesticBullionRateExGstPerGram + gstAmountPerGram) * 100) / 100;

  return {
    baseDerivedInrPerGram: Math.round(baseRate * 100) / 100,
    customsDutyPercent,
    dutyAmountPerGram: Math.round(dutyAmountPerGram * 100) / 100,
    aidcPercent,
    aidcAmountPerGram: Math.round(aidcAmountPerGram * 100) / 100,
    localBullionPremiumPercent,
    premiumAmountPerGram: Math.round(premiumAmountPerGram * 100) / 100,
    domesticBullionRateExGstPerGram: Math.round(domesticBullionRateExGstPerGram * 100) / 100,
    gstPercent,
    gstAmountPerGram: Math.round(gstAmountPerGram * 100) / 100,
    estimatedRetailRatePerGram,
    estimatedRetailRatePer10Gram: Math.round(estimatedRetailRatePerGram * 10 * 100) / 100,
    basis: 'estimated_domestic_retail',
    label: 'Estimated Domestic Retail Price (Inc. 6% Duty + 3% GST)',
    dutyAndTaxIncluded: true
  };
}
