
/**
 * @file gold.test.js
 * @description Integration tests for Gold API endpoints: Live prices, 5-year historical charts,
 * date-to-date comparisons, weekend/holiday gap handling, and stale-data fallback.
 */

import request from 'supertest';
import { jest } from '@jest/globals';
import app from '../src/app.js';
import { GoldPrice } from '../src/models/GoldPrice.js';
import { LivePriceCache } from '../src/models/LivePriceCache.js';
import { setupTestDB, teardownTestDB, clearTestDB } from './setup.js';
import { WgcGoldhubAdapter } from '../src/services/gold/WgcGoldhubAdapter.js';

describe('Gold Data API & Provider Integration Tests', () => {
  beforeAll(async () => {
    await setupTestDB();
    await clearTestDB();

    // Populate test DB with sample historical records up to today
    const adapter = new WgcGoldhubAdapter();
    const todayStr = new Date().toISOString().slice(0, 10);
    const twoYearsAgoStr = new Date(Date.now() - (2 * 365 * 24 * 60 * 60 * 1000)).toISOString().slice(0, 10);

    const records = await adapter.fetchHistoricalDaily({
      startDate: twoYearsAgoStr,
      endDate: todayStr,
      purity: '24K',
      unit: 'gram',
      currency: 'INR'
    });

    await GoldPrice.insertMany(records);

    // Initialize cache using genuine adapter settlement
    const liveSettlement = await adapter.fetchLivePrice();
    await LivePriceCache.create({
      cacheKey: 'live_gold_india',
      ...liveSettlement,
      updatedAt: new Date(),
      isStale: false
    });
  }, 60000);

  afterAll(async () => {
    await teardownTestDB();
  });

  test('GET /api/gold/live: Returns genuine live price with 24K, 22K and 18K canonical rates', async () => {
    const res = await request(app).get('/api/gold/live');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.price24kPerGram).toBeGreaterThan(0);
    expect(res.body.data.price22kPerGram).toBeGreaterThan(0);
    expect(res.body.data.price18kPerGram).toBeGreaterThan(0);
    expect(res.body.data.inrPerGram).toBeDefined();
    expect(res.body.data.inrPerGram['24K']).toBeGreaterThan(0);
    expect(res.body.data.inrPerGram['22K']).toBeGreaterThan(0);
    expect(res.body.data.inrPerGram['18K']).toBeGreaterThan(0);
    expect(res.body.data.price24kPer10g).toBe(res.body.data.price24kPerGram * 10);
    expect(res.body.data.basis).toBeDefined();
    expect(res.body.data.sourceName).toBeDefined();
  });

  test('GET /api/gold/history: Returns date-wise daily records with calculated stats', async () => {
    const res = await request(app).get('/api/gold/history?range=1Y&purity=24K');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.records)).toBe(true);
    expect(res.body.records.length).toBeGreaterThan(0);
    expect(res.body.stats).toBeDefined();
    expect(res.body.stats.highestPrice).toBeGreaterThan(0);
    expect(res.body.stats.lowestPrice).toBeGreaterThan(0);
  });

  test('GET /api/gold/compare: Compares two trading dates with percentage change', async () => {
    const res = await request(app).get('/api/gold/compare?date1=2025-01-03&date2=2025-06-02&purity=24K');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.comparison.date1).toBeDefined();
    expect(res.body.comparison.date2).toBeDefined();
    expect(res.body.comparison.comparison.absoluteChange).toBeDefined();
    expect(res.body.comparison.comparison.percentageChange).toBeDefined();
  });

  test('GET /api/gold/source-info: Returns data transparency disclaimers and methodology', async () => {
    const res = await request(app).get('/api/gold/source-info');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.sources)).toBe(true);
    expect(res.body.derivationMethodology.formula).toContain('INR/gram');
    expect(res.body.derivationMethodology.tariffNote).toContain('Basic Customs Duty');
  });

  test('STALE DATA FALLBACK: Marks price as stale when live provider fails', async () => {
    // Import goldDataManager and mock provider failure across all retries
    const { goldDataManager } = await import('../src/services/gold/GoldDataManager.js');
    const spy = jest.spyOn(goldDataManager.wgcAdapter, 'fetchLivePrice').mockRejectedValue(new Error('Network timeout'));

    // Set cache older than TTL
    await LivePriceCache.findOneAndUpdate(
      { cacheKey: 'live_gold_india' },
      { updatedAt: new Date(Date.now() - (2 * 60 * 60 * 1000)) }
    );

    const res = await request(app).get('/api/gold/live');
    spy.mockRestore();

    expect(res.status).toBe(200);
    expect(res.body.data.isStale).toBe(true);
    expect(res.body.data.statusLabel).toContain('Last updated');
  });
});
