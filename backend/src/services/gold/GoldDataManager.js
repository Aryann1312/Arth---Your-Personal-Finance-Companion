/**
 * @file GoldDataManager.js
 * @description Central manager orchestrating gold data providers, MongoDB-backed cache (15m TTL),
 * retry with exponential backoff, graceful fallback to stale records, and fetch audit logs.
 */

import { WgcGoldhubAdapter } from './WgcGoldhubAdapter.js';
import { LiveApiAdapter } from './LiveApiAdapter.js';
import { LivePriceCache } from '../../models/LivePriceCache.js';
import { GoldPrice } from '../../models/GoldPrice.js';
import { FetchLog } from '../../models/FetchLog.js';
import { ENV } from '../../config/env.js';

export class GoldDataManager {
  constructor() {
    this.wgcAdapter = new WgcGoldhubAdapter();
    this.liveApiAdapter = new LiveApiAdapter(ENV.GOLD_API_KEY);
    this.cacheTtlMs = 15 * 60 * 1000; // 15-minute live cache TTL
  }

  /**
   * Returns live gold price with 15-minute cache and stale-data fallback
   */
  async getLivePrice() {
    // 1. Check MongoDB cache first
    try {
      const cached = await LivePriceCache.findOne({ cacheKey: 'live_gold_india' }).lean();
      if (cached) {
        const age = Date.now() - new Date(cached.updatedAt).getTime();
        const isFresh = age < this.cacheTtlMs;
        if (isFresh) {
          return {
            ...cached,
            isLive: true,
            isStale: false,
            statusLabel: 'LIVE',
            isCached: true
          };
        }
      }
    } catch (cacheReadErr) {
      console.warn('[GoldDataManager] Cache read error:', cacheReadErr.message);
    }

    // 2. Fetch fresh price with retry and fallback
    let freshData = null;
    let providerUsed = 'wgc_lbma';

    try {
      // Try live API first if key configured, otherwise use WGC
      if (ENV.GOLD_API_KEY && ENV.GOLD_API_KEY !== 'demo_key') {
        try {
          freshData = await this._fetchWithRetry(() => this.liveApiAdapter.fetchLivePrice(), 2);
          providerUsed = this.liveApiAdapter.name;
        } catch (liveErr) {
          console.warn('[GoldDataManager] Live API failed, falling back to WGC adapter:', liveErr.message);
        }
      }

      if (!freshData) {
        freshData = await this._fetchWithRetry(() => this.wgcAdapter.fetchLivePrice(), 2);
        providerUsed = this.wgcAdapter.name;
      }

      // Update cache
      await LivePriceCache.findOneAndUpdate(
        { cacheKey: 'live_gold_india' },
        {
          cacheKey: 'live_gold_india',
          price24kPerGram: freshData.price24kPerGram,
          price22kPerGram: freshData.price22kPerGram,
          price18kPerGram: freshData.price18kPerGram,
          price24kPer10g: freshData.price24kPer10g,
          price22kPer10g: freshData.price22kPer10g,
          price18kPer10g: freshData.price18kPer10g,
          inrPerGram: freshData.inrPerGram,
          inrPer10g: freshData.inrPer10g,
          retailEstimatePerGram: freshData.retailEstimatePerGram,
          currency: freshData.currency,
          basis: freshData.basis,
          basisLabel: freshData.basisLabel,
          retailBasisLabel: freshData.retailBasisLabel,
          source: freshData.source || freshData.sourceName,
          sourceName: freshData.sourceName,
          sourceUrl: freshData.sourceUrl,
          asOf: freshData.asOf || new Date(),
          asOfIST: freshData.asOfIST,
          updatedAt: freshData.updatedAt || new Date(),
          isLive: true,
          isStale: false,
          statusLabel: 'LIVE'
        },
        { upsert: true, new: true }
      );

      // Log success
      FetchLog.create({
        provider: providerUsed,
        status: 'success',
        recordsFetched: 1,
        metadata: { price24k: freshData.price24kPerGram }
      }).catch(e => console.error('[FetchLog Error]', e.message));

      return {
        ...freshData,
        isLive: true,
        isStale: false,
        statusLabel: 'LIVE',
        isCached: false
      };
    } catch (fetchErr) {
      console.error('[GoldDataManager Error] Live fetch failed:', fetchErr.message);

      // 3. Fallback to last known stored value in cache
      FetchLog.create({
        provider: providerUsed,
        status: 'fallback',
        error: fetchErr.message
      }).catch(e => console.error('[FetchLog Error]', e.message));

      const fallbackCache = await LivePriceCache.findOne({ cacheKey: 'live_gold_india' }).lean();
      if (fallbackCache) {
        const formattedIST = fallbackCache.asOfIST || new Date(fallbackCache.updatedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST';
        return {
          ...fallbackCache,
          isLive: false,
          isStale: true,
          statusLabel: `Last updated ${formattedIST}`,
          staleWarning: `Live market feed temporarily unavailable. Displaying last verified settlement from ${formattedIST}.`
        };
      }

      // Honest unavailable state - NEVER FABRICATE DATA
      return {
        isAvailable: false,
        price24kPerGram: null,
        price22kPerGram: null,
        price18kPerGram: null,
        price24kPer10g: null,
        price22kPer10g: null,
        price18kPer10g: null,
        inrPerGram: null,
        inrPer10g: null,
        retailEstimatePerGram: null,
        currency: 'INR',
        basis: 'indicative_benchmark_ex_duty_gst',
        basisLabel: 'Indicative benchmark, before duty and GST',
        sourceName: 'Market Data Feed',
        sourceUrl: 'https://www.gold.org/goldhub/data/gold-prices',
        asOf: null,
        asOfIST: null,
        updatedAt: null,
        isLive: false,
        isStale: true,
        statusLabel: 'Market Data Unavailable'
      };
    }
  }

  /**
   * Helper executing async function with retry and exponential backoff
   */
  async _fetchWithRetry(fn, retries = 2, delayMs = 500) {
    let attempt = 0;
    while (attempt <= retries) {
      try {
        return await fn();
      } catch (err) {
        attempt++;
        if (attempt > retries) throw err;
        await new Promise(res => setTimeout(res, delayMs * Math.pow(2, attempt - 1)));
      }
    }
  }

  /**
   * Returns metadata for all available providers
   */
  getProvidersInfo() {
    return [
      this.wgcAdapter.getProviderMetadata(),
      this.liveApiAdapter.getProviderMetadata()
    ];
  }
}

export const goldDataManager = new GoldDataManager();
