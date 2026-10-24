/**
 * @file GoldPriceContext.js
 * @description Canonical centralized app-side store & hook for gold price intelligence.
 * Guarantees every screen reads identical benchmark rates, purity derivations, and freshness state.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiRequest } from '../services/api.js';
import { PURITY_FACTORS } from '../lib/calc/config.js';
import { deriveINRPriceFromSpot, estimateIndianRetailPrice } from '../lib/calc/goldDerivation.js';

const GoldPriceContext = createContext(null);

export function GoldPriceProvider({ children }) {
  const [goldPrice, setGoldPrice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchLivePrice = useCallback(async () => {
    try {
      setError(null);
      const res = await apiRequest('/gold/live');
      if (res && res.data) {
        const raw = res.data;

        // Ensure canonical inrPerGram and inrPer10g exist for 24K, 22K, 18K
        const p24k = raw.inrPerGram?.['24K'] || raw.price24kPerGram || null;
        let inrPerGram = raw.inrPerGram;
        let inrPer10g = raw.inrPer10g;

        if (p24k) {
          if (!inrPerGram) {
            inrPerGram = {
              '24K': p24k,
              '22K': raw.price22kPerGram || Math.round(p24k * PURITY_FACTORS['22K'] * 100) / 100,
              '18K': raw.price18kPerGram || Math.round(p24k * PURITY_FACTORS['18K'] * 100) / 100
            };
          }
          if (!inrPer10g) {
            inrPer10g = {
              '24K': Math.round(inrPerGram['24K'] * 10 * 100) / 100,
              '22K': Math.round(inrPerGram['22K'] * 10 * 100) / 100,
              '18K': Math.round(inrPerGram['18K'] * 10 * 100) / 100
            };
          }
        }

        const canonical = {
          ...raw,
          asOf: raw.asOf || raw.updatedAt || new Date(),
          asOfIST: raw.asOfIST || (raw.updatedAt ? new Date(raw.updatedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST' : null),
          source: raw.source || raw.sourceName || 'World Gold Council (Goldhub) & LBMA',
          sourceName: raw.sourceName || 'World Gold Council (Goldhub) & LBMA',
          sourceUrl: raw.sourceUrl || 'https://www.gold.org/goldhub/data/gold-prices',
          basis: raw.basis || 'indicative_benchmark_ex_duty_gst',
          basisLabel: raw.basisLabel || 'Indicative benchmark, before duty and GST',
          retailBasisLabel: raw.retailBasisLabel || 'Indian retail estimate',
          currency: raw.currency || 'INR',
          inrPerGram,
          inrPer10g,
          price24kPerGram: inrPerGram ? inrPerGram['24K'] : null,
          price22kPerGram: inrPerGram ? inrPerGram['22K'] : null,
          price18kPerGram: inrPerGram ? inrPerGram['18K'] : null,
          price24kPer10g: inrPer10g ? inrPer10g['24K'] : null,
          price22kPer10g: inrPer10g ? inrPer10g['22K'] : null,
          price18kPer10g: inrPer10g ? inrPer10g['18K'] : null,
          isLive: raw.isLive !== false && !raw.isStale,
          isStale: Boolean(raw.isStale),
          statusLabel: raw.statusLabel || (raw.isStale ? 'Stale Benchmark' : 'LIVE')
        };

        setGoldPrice(canonical);
      }
    } catch (err) {
      console.warn('[GoldPriceContext] Live price fetch failed:', err.message);
      setError(err.message || 'Market data feed unavailable');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLivePrice();
    // Poll freshness window every 5 minutes
    const interval = setInterval(fetchLivePrice, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchLivePrice]);

  /**
   * Helper to derive benchmark rate for any purity using shared purity constants
   */
  const getRateForPurity = useCallback((purity = '24K') => {
    if (!goldPrice || !goldPrice.inrPerGram) return null;
    if (goldPrice.inrPerGram[purity] !== undefined) {
      return goldPrice.inrPerGram[purity];
    }
    const p24 = goldPrice.inrPerGram['24K'];
    const factor = PURITY_FACTORS[purity] || 1.0;
    return Math.round(p24 * factor * 100) / 100;
  }, [goldPrice]);

  /**
   * Helper to get retail estimate for any purity
   */
  const getRetailForPurity = useCallback((purity = '24K') => {
    if (!goldPrice) return null;
    if (goldPrice.retailEstimatePerGram?.[purity]) {
      return goldPrice.retailEstimatePerGram[purity];
    }
    const baseRate = getRateForPurity(purity);
    if (!baseRate) return null;
    return estimateIndianRetailPrice({ baseDerivedInrPerGram: baseRate }).estimatedRetailRatePerGram;
  }, [goldPrice, getRateForPurity]);

  return (
    <GoldPriceContext.Provider
      value={{
        goldPrice,
        loading,
        error,
        refreshGoldPrice: fetchLivePrice,
        getRateForPurity,
        getRetailForPurity
      }}
    >
      {children}
    </GoldPriceContext.Provider>
  );
}

export function useGoldPrice() {
  const context = useContext(GoldPriceContext);
  if (!context) {
    throw new Error('useGoldPrice must be used within a GoldPriceProvider');
  }
  return context;
}
