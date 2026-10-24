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
  price24kPer10g: {
    type: Number,
    required: true
  },
  price22kPer10g: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'INR'
  },
  basis: {
    type: String,
    default: 'indicative_derived_spot'
  },
  sourceName: {
    type: String,
    required: true
  },
  sourceUrl: {
    type: String,
    required: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  isStale: {
    type: Boolean,
    default: false
  }
});

export const LivePriceCache = mongoose.model('LivePriceCache', livePriceCacheSchema);
