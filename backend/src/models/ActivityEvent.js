/**
 * @file ActivityEvent.js
 * @description Mongoose model for User Activity & Interaction Logging.
 * Supports configurable TTL retention (default 12 months), admin audit trails,
 * and debounced client-side tracking.
 */

import mongoose from 'mongoose';
import { ENV } from '../config/env.js';

const activityEventSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false, // Null for anonymous landing interactions prior to login
    index: true
  },
  sessionId: {
    type: String,
    required: true,
    index: true,
    trim: true
  },
  module: {
    type: String,
    required: true,
    enum: ['gold_prices', 'gold_loan', 'emi', 'auth', 'profile', 'admin', 'landing'],
    index: true
  },
  action: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  screen: {
    type: String,
    required: true,
    trim: true
  },
  inputs: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  resultSummary: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  deviceInfo: {
    platform: { type: String, default: 'mobile' }, // 'android' | 'ios' | 'web'
    osVersion: { type: String, default: '' },
    deviceType: { type: String, default: 'phone' }, // 'phone' | 'tablet'
    screenDimensions: {
      width: { type: Number, default: 0 },
      height: { type: Number, default: 0 },
      isLandscape: { type: Boolean, default: false }
    }
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Compound indexes for admin auditing and pagination
activityEventSchema.index({ userId: 1, timestamp: -1 });
activityEventSchema.index({ module: 1, timestamp: -1 });
activityEventSchema.index({ action: 1, timestamp: -1 });

// TTL Index for automatic data retention enforcement (default 12 months / 365 days)
activityEventSchema.index(
  { timestamp: 1 },
  { expireAfterSeconds: ENV.ACTIVITY_RETENTION_SECONDS }
);

export const ActivityEvent = mongoose.model('ActivityEvent', activityEventSchema);
