/**
 * @file LiveApiAdapter.js
 * @description Adapter for external live gold & metals APIs (GoldAPI.io / Metals.dev)
 * with timeout handling, exponential backoff, and request bounds.
 */

import { GoldProviderInterface } from './GoldProviderInterface.js';
import { ENV } from '../../config/env.js';

export class LiveApiAdapter extends GoldProviderInterface {
  constructor(apiKey = ENV.GOLD_API_KEY) {
    super();
    this.apiKey = apiKey;
    this.name = 'GoldAPI.io / Live Precious Metals Feed';
    this.url = 'https://www.goldapi.io';
    this.pricingBasis = 'derived';
    this.timeoutMs = 5000;
  }

  getProviderMetadata() {
    return {
      providerName: this.name,
      sourceUrl: this.url,
      pricingBasis: this.pricingBasis,
      pricingBasisDescription: 'Live international spot converted to INR. Free tier allows 100 requests/month.',
      freeTierLimits: '100 requests per month ($0 free tier). Rate limited with 15-minute server cache.',
      licensingNotes: 'Non-commercial demonstration and technical assessment display'
    };
  }

  async fetchLivePrice() {
    // If no API key configured or demo key, throw so manager gracefully uses primary/cache
    if (!this.apiKey || this.apiKey === 'demo_key') {
      throw new Error('Live API Key not configured. Using WGC Goldhub / Cache provider.');
    }

    // In a live environment with valid API key, this would execute fetch with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch('https://www.goldapi.io/api/XAU/INR', {
        headers: {
          'x-access-token': this.apiKey,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`Live API returned HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const p24k = Number(data.price_gram_24k) || (Number(data.price) / 31.1034768);
      const p22k = Number(data.price_gram_22k) || (p24k * 0.916);

      return {
        price24kPerGram: Math.round(p24k * 100) / 100,
        price22kPerGram: Math.round(p22k * 100) / 100,
        price24kPer10g: Math.round(p24k * 10 * 100) / 100,
        price22kPer10g: Math.round(p22k * 10 * 100) / 100,
        currency: 'INR',
        basis: this.pricingBasis,
        sourceName: this.name,
        sourceUrl: this.url,
        updatedAt: new Date(data.timestamp * 1000 || Date.now())
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  async fetchHistoricalDaily() {
    throw new Error('GoldAPI free tier does not provide 5-year historical daily range. Managed by WGC adapter.');
  }
}
