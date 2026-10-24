/**
 * @file FetchLog.js
 * @description Ingestion traceability log for external gold API requests and backfill operations
 */

import mongoose from 'mongoose';

const fetchLogSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  provider: {
    type: String,
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['success', 'failed', 'cached', 'fallback'],
    required: true
  },
  recordsFetched: {
    type: Number,
    default: 0
  },
  error: {
    type: String,
    default: null
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
});

export const FetchLog = mongoose.model('FetchLog', fetchLogSchema);
