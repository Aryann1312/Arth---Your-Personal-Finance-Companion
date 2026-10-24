/**
 * @file LenderReference.js
 * @description Mongoose model for official verified and illustrative lender reference rates,
 * LTV caps, eligibility conditions, source URLs, and verification timestamps.
 */

import mongoose from 'mongoose';

const lenderReferenceSchema = new mongoose.Schema({
  lenderId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    enum: ['Public Sector Bank', 'Private Bank', 'Non-Banking Financial Company', 'Fintech / Digital NBFC'],
    required: true
  },
  defaultAnnualRate: {
    type: Number,
    required: true
  },
  minRate: {
    type: Number,
    required: true
  },
  maxRate: {
    type: Number,
    required: true
  },
  maxLtvPercent: {
    type: Number,
    default: 75
  },
  minLoanAmount: {
    type: Number,
    default: 5000
  },
  maxLoanAmount: {
    type: Number,
    default: 5000000
  },
  defaultTenureMonths: {
    type: Number,
    default: 12
  },
  minTenureMonths: {
    type: Number,
    default: 1
  },
  maxTenureMonths: {
    type: Number,
    default: 36
  },
  processingFeePercent: {
    type: Number,
    default: 0.5
  },
  processingFeeFlat: {
    type: Number,
    default: 0
  },
  feeType: {
    type: String,
    enum: ['percent', 'flat'],
    default: 'percent'
  },
  supportedRepayments: {
    type: [String],
    default: ['bullet', 'emi']
  },
  sourceUrl: {
    type: String,
    required: true
  },
  verifiedOn: {
    type: Date,
    required: true
  },
  expiryDate: {
    type: Date,
    required: true
  },
  isIllustrative: {
    type: Boolean,
    default: true
  },
  notes: {
    type: String,
    default: ''
  }
});

// Virtual to check if verification is still active or expired
lenderReferenceSchema.virtual('isExpired').get(function () {
  return new Date() > this.expiryDate;
});

export const LenderReference = mongoose.model('LenderReference', lenderReferenceSchema);
