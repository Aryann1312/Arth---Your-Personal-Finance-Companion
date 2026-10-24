/**
 * @file LivePriceCache.js
 * @description Mongoose model for caching last-known-good live gold prices
 * and serving as an offline/failure fallback.
 */

import mongoose from 'mongoose';

const livePriceCacheSchema = new mongoose.Schema({
  cacheKey: {
    type: String,
    required: true,
    unique: true,
    default: 'live_gold_india'
  },
  price24kPerGram: {
    type: Number,
    required: true
  },
  price22kPerGram: {
    type: Number,
    required: true
  },
  price18kPerGram: {
    type: Number,
    default: null
  },
  price24kPer10g: {
    type: Number,
    required: true
  },
  price22kPer10g: {
    type: Number,
    required: true
  },
  price18kPer10g: {
    type: Number,
    default: null
  },
  inrPerGram: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  inrPer10g: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  retailEstimatePerGram: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  currency: {
    type: String,
    default: 'INR'
  },
  basis: {
    type: String,
    default: 'indicative_benchmark_ex_duty_gst'
  },
  basisLabel: {
    type: String,
    default: 'Indicative benchmark, before duty and GST'
  },
  retailBasisLabel: {
    type: String,
    default: 'Indian retail estimate'
  },
  source: {
    type: String,
    default: 'World Gold Council (Goldhub) & LBMA'
  },
  sourceName: {
    type: String,
    required: true
  },
  sourceUrl: {
    type: String,
    required: true
  },
  asOf: {
    type: Date,
    default: Date.now
  },
  asOfIST: {
    type: String,
    default: null
  },
  statusLabel: {
    type: String,
    default: 'LIVE'
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  isLive: {
    type: Boolean,
    default: true
  },
  isStale: {
    type: Boolean,
    default: false
  }
});

export const LivePriceCache = mongoose.model('LivePriceCache', livePriceCacheSchema);
