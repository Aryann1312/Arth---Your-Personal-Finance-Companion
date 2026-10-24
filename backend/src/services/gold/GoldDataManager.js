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
      if (cached && (Date.now() - new Date(cached.updatedAt).getTime()) < this.cacheTtlMs) {
        return {
          ...cached,
          isStale: false,
          isCached: true
        };
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
          price24kPer10g: freshData.price24kPer10g,
          price22kPer10g: freshData.price22kPer10g,
          currency: freshData.currency,
          basis: freshData.basis,
          sourceName: freshData.sourceName,
          sourceUrl: freshData.sourceUrl,
          updatedAt: freshData.updatedAt || new Date(),
          isStale: false
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
        isStale: false,
        isCached: false
      };
    } catch (fetchErr) {
      console.error('[GoldDataManager Error] Live fetch failed:', fetchErr.message);

      // 3. Fallback to last known stored value in cache or GoldPrice collection
      FetchLog.create({
        provider: providerUsed,
        status: 'fallback',
        error: fetchErr.message
      }).catch(e => console.error('[FetchLog Error]', e.message));

      const fallbackCache = await LivePriceCache.findOne({ cacheKey: 'live_gold_india' }).lean();
      if (fallbackCache) {
        return {
          ...fallbackCache,
          isStale: true,
          statusLabel: 'Stale Data (Offline Fallback - Showing last verified market price)',
          staleWarning: `Live market feed temporarily unavailable. Displaying last verified settlement from ${new Date(fallbackCache.updatedAt).toLocaleDateString('en-IN')}.`
        };
      }

      // Final safety fallback
      return {
        price24kPerGram: 7850,
        price22kPerGram: 7190,
        price24kPer10g: 78500,
        price22kPer10g: 71900,
        currency: 'INR',
        basis: 'indicative_derived_spot',
        sourceName: 'WGC Benchmark Fallback',
        sourceUrl: 'https://www.gold.org/goldhub/data/gold-prices',
        updatedAt: new Date(),
        isStale: true,
        statusLabel: 'Default Benchmark Reference'
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
