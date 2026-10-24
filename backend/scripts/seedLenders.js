/**
 * @file seedLenders.js
 * @description Idempotent script to seed illustrative lender presets into MongoDB
 */

import { connectDB, disconnectDB } from '../src/config/db.js';
import { LenderReference } from '../src/models/LenderReference.js';
import { ILLUSTRATIVE_LENDER_PRESETS } from '../../lib/calc/config.js';

async function seedLenders() {
  try {
    await connectDB();

    for (const preset of ILLUSTRATIVE_LENDER_PRESETS) {
      await LenderReference.findOneAndUpdate(
        { lenderId: preset.id },
        {
          lenderId: preset.id,
          name: preset.name,
          category: preset.category,
          defaultAnnualRate: preset.defaultAnnualRate,
          minRate: preset.minRate,
          maxRate: preset.maxRate,
          maxLtvPercent: preset.maxLtvPercent,
          minLoanAmount: preset.minLoanAmount,
          maxLoanAmount: preset.maxLoanAmount,
          defaultTenureMonths: preset.defaultTenureMonths,
          minTenureMonths: preset.minTenureMonths,
          maxTenureMonths: preset.maxTenureMonths,
          processingFeePercent: preset.processingFeePercent,
          processingFeeFlat: preset.processingFeeFlat,
          feeType: preset.feeType,
          supportedRepayments: preset.supportedRepayments,
          sourceUrl: preset.sourceUrl,
          verifiedOn: new Date(preset.verifiedOn),
          expiryDate: new Date(preset.expiryDate),
          isIllustrative: true,
          notes: 'Clearly labelled illustrative assumptions for comparative testing.'
        },
        { upsert: true, new: true }
      );
      console.log(`[Seed Lenders] Seeded preset: ${preset.name}`);
    }

    console.log('[Seed Lenders] All illustrative presets seeded successfully.');
    await disconnectDB();
  } catch (err) {
    console.error('[Seed Lenders Error]:', err.message);
    process.exit(1);
  }
}

seedLenders();
