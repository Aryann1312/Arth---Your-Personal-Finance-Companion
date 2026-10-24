/**
 * @file GoldPrice.js
 * @description Mongoose model for genuine, traceable historical gold prices.
 * Strictly prevents duplicate records through unique compound indexing.
 */

import mongoose from 'mongoose';

const goldPriceSchema = new mongoose.Schema({
  observationDate: {
    type: String,
    required: true,
    match: [/^\d{4}-\d{2}-\d{2}$/, 'Observation date must be in YYYY-MM-DD format'],
    index: true
  },
  price: {
    type: Number,
    required: true,
    min: [0, 'Price must be non-negative']
  },
  currency: {
    type: String,
    required: true,
    enum: ['INR', 'USD'],
    default: 'INR'
  },
  unit: {
    type: String,
    required: true,
    enum: ['gram', '10g', 'ounce', 'tola'],
    default: 'gram'
  },
  purity: {
    type: String,
    required: true,
    enum: ['24K', '22K', '18K'],
    default: '24K'
  },
  basis: {
    type: String,
    required: true,
    enum: ['observed', 'derived'],
    default: 'derived'
  },
  sourceName: {
    type: String,
    required: true,
    trim: true
  },
  sourceUrl: {
    type: String,
    required: true,
    trim: true
  },
  usdInrSource: {
    type: String,
    default: null
  },
  retrievalTimestamp: {
    type: Date,
    default: Date.now
  }
});

// Compound unique index ensuring idempotent backfills and zero duplicates
goldPriceSchema.index(
  {
    sourceName: 1,
    observationDate: 1,
    currency: 1,
    unit: 1,
    purity: 1,
    basis: 1
  },
  { unique: true }
);

export const GoldPrice = mongoose.model('GoldPrice', goldPriceSchema);
