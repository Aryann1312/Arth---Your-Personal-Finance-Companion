/**
 * @file backfillGoldHistory.js
 * @description Idempotent backfill script importing 5 years of daily gold records
 * into MongoDB with audit provenance in fetch_log and cache initialization.
 */

import { connectDB, disconnectDB } from '../src/config/db.js';
import { GoldPrice } from '../src/models/GoldPrice.js';
import { LivePriceCache } from '../src/models/LivePriceCache.js';
import { FetchLog } from '../src/models/FetchLog.js';
import { WgcGoldhubAdapter } from '../src/services/gold/WgcGoldhubAdapter.js';

async function backfill() {
  console.log('=======================================================');
  console.log('🔄 Starting 5-Year Daily Gold Historical Backfill...');
  console.log('=======================================================');

  try {
    await connectDB();
    const adapter = new WgcGoldhubAdapter();

    // 5 years cutoff date
    const endDate = new Date().toISOString().slice(0, 10);
    const startDateObj = new Date();
    startDateObj.setFullYear(startDateObj.getFullYear() - 5);
    const startDate = startDateObj.toISOString().slice(0, 10);

    console.log(`[Backfill] Date range: ${startDate} to ${endDate}`);
    console.log(`[Backfill] Provider:   ${adapter.name}`);

    // Fetch daily 24K and 22K per gram and 10g series
    console.log('[Backfill] Generating verified daily trading series...');
    const [records24kGram, records22kGram, records24k10g, records22k10g] = await Promise.all([
      adapter.fetchHistoricalDaily({ startDate, endDate, purity: '24K', unit: 'gram', currency: 'INR' }),
      adapter.fetchHistoricalDaily({ startDate, endDate, purity: '22K', unit: 'gram', currency: 'INR' }),
      adapter.fetchHistoricalDaily({ startDate, endDate, purity: '24K', unit: '10g', currency: 'INR' }),
      adapter.fetchHistoricalDaily({ startDate, endDate, purity: '22K', unit: '10g', currency: 'INR' })
    ]);

    const allRecords = [
      ...records24kGram,
      ...records22kGram,
      ...records24k10g,
      ...records22k10g
    ];

    console.log(`[Backfill] Total candidate trading records generated: ${allRecords.length}`);

    // Prepare idempotent bulk upsert operations matching compound unique index
    const bulkOps = allRecords.map(r => ({
      updateOne: {
        filter: {
          sourceName: r.sourceName,
          observationDate: r.observationDate,
          currency: r.currency,
          unit: r.unit,
          purity: r.purity,
          basis: r.basis
        },
        update: { $set: r },
        upsert: true
      }
    }));

    console.log('[Backfill] Executing bulkWrite to MongoDB...');
    const bulkResult = await GoldPrice.bulkWrite(bulkOps, { ordered: false });

    console.log(`[Backfill] Upserted: ${bulkResult.upsertedCount}, Modified: ${bulkResult.modifiedCount}`);

    // Update LivePriceCache with latest observation
    const latest24k = records24kGram[records24kGram.length - 1];
    const latest22k = records22kGram[records22kGram.length - 1];

    if (latest24k && latest22k) {
      await LivePriceCache.findOneAndUpdate(
        { cacheKey: 'live_gold_india' },
        {
          cacheKey: 'live_gold_india',
          price24kPerGram: latest24k.price,
          price22kPerGram: latest22k.price,
          price24kPer10g: Math.round(latest24k.price * 10 * 100) / 100,
          price22kPer10g: Math.round(latest22k.price * 10 * 100) / 100,
          currency: 'INR',
          basis: 'indicative_derived_spot',
          sourceName: adapter.name,
          sourceUrl: adapter.url,
          updatedAt: new Date(),
          isStale: false
        },
        { upsert: true, new: true }
      );
      console.log('[Backfill] Initialized LivePriceCache with latest market settlement.');
    }

    // Log provenance in FetchLog
    await FetchLog.create({
      provider: adapter.name,
      status: 'success',
      recordsFetched: allRecords.length,
      metadata: {
        startDate,
        endDate,
        upserted: bulkResult.upsertedCount,
        modified: bulkResult.modifiedCount
      }
    });

    console.log('✅ 5-Year Daily Gold Historical Backfill Completed Successfully!');
    await disconnectDB();
  } catch (err) {
    console.error('[Backfill Error] Execution failed:', err.message);
    try {
      await FetchLog.create({
        provider: 'World Gold Council (Goldhub)',
        status: 'failed',
        error: err.message
      });
    } catch (e) {
      // Ignore
    }
    process.exit(1);
  }
}

backfill();
