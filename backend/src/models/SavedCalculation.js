/**
 * @file SavedCalculation.js
 * @description Mongoose model for persisted user calculations (Gold Loan & EMI)
 */

import mongoose from 'mongoose';

const savedCalculationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['gold-loan', 'emi'],
    required: true,
    index: true
  },
  label: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120
  },
  inputs: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  results: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

savedCalculationSchema.index({ userId: 1, type: 1, createdAt: -1 });

export const SavedCalculation = mongoose.model('SavedCalculation', savedCalculationSchema);
