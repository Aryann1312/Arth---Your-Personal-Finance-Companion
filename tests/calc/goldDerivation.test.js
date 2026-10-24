/**
 * @file goldDerivation.test.js
 * @description Unit tests for gold unit conversions, international XAU/USD to INR derivation,
 * and domestic tariff & GST retail estimation.
 */

import {
  convertGoldWeight,
  deriveINRPriceFromSpot,
  estimateIndianRetailPrice
} from '../../lib/calc/goldDerivation.js';
import { TROY_OUNCE_TO_GRAMS, TOLA_TO_GRAMS } from '../../lib/calc/config.js';

describe('Gold Derivation & Domestic Retail Tariff Engine', () => {
  test('Weight Unit Conversions: Grams, Troy Ounces, Tolas, 10g Units', () => {
    // 1 Troy Ounce to Grams
    expect(convertGoldWeight(1, 'ounce', 'gram')).toBeCloseTo(TROY_OUNCE_TO_GRAMS, 4);
    // 1 Tola to Grams
    expect(convertGoldWeight(1, 'tola', 'gram')).toBeCloseTo(TOLA_TO_GRAMS, 4);
    // 10 grams to 10g unit
    expect(convertGoldWeight(10, 'gram', '10g')).toBe(1);
    // 1 Ounce to 10g unit
    expect(convertGoldWeight(1, 'ounce', '10g')).toBeCloseTo(TROY_OUNCE_TO_GRAMS / 10, 4);
  });

  test('Derive INR/gram from International Spot (XAU/USD) & FX (USD/INR)', () => {
    const xauUsd = 2700; // $2,700 per oz
    const usdInr = 84.00; // Rs 84 per USD

    // 24K derivation
    const derived24K = deriveINRPriceFromSpot({ xauUsd, usdInr, purity: '24K' });
    const expectedPerGramFine = (2700 / TROY_OUNCE_TO_GRAMS) * 84;
    const expected24K = Math.round(expectedPerGramFine * 0.999 * 100) / 100;

    expect(derived24K.pricePerGram).toBeCloseTo(expected24K, 1);
    expect(derived24K.pricePer10Gram).toBeCloseTo(expected24K * 10, 1);
    expect(derived24K.basis).toBe('indicative_derived_spot');
    expect(derived24K.dutyAndTaxIncluded).toBe(false);
    expect(derived24K.disclaimer).toContain('excludes Indian Basic Customs Duty');

    // 22K derivation
    const derived22K = deriveINRPriceFromSpot({ xauUsd, usdInr, purity: '22K' });
    const expected22K = Math.round(expectedPerGramFine * 0.916 * 100) / 100;
    expect(derived22K.pricePerGram).toBeCloseTo(expected22K, 1);
    expect(derived22K.pricePerGram).toBeLessThan(derived24K.pricePerGram);
  });

  test('Domestic Indian Retail Estimate: Breakdown with 6% Customs Duty & 3% GST', () => {
    const basePrice = 7285.00; // Base spot INR/gram
    const retail = estimateIndianRetailPrice({
      baseDerivedInrPerGram: basePrice,
      customsDutyPercent: 6.0,
      aidcPercent: 0,
      localBullionPremiumPercent: 1.0,
      gstPercent: 3.0
    });

    // 6% duty
    expect(retail.dutyAmountPerGram).toBeCloseTo(437.10, 1);
    // Landed cost = 7285 + 437.10 = 7722.10
    // 1% premium = 77.22
    // Domestic wholesale = 7799.32
    // 3% GST = 233.98
    // Total retail = 8033.30
    expect(retail.estimatedRetailRatePerGram).toBeGreaterThan(basePrice);
    expect(retail.dutyAndTaxIncluded).toBe(true);
    expect(retail.basis).toBe('estimated_domestic_retail');
    expect(retail.estimatedRetailRatePer10Gram).toBe(Math.round(retail.estimatedRetailRatePerGram * 10 * 100) / 100);
  });
});
