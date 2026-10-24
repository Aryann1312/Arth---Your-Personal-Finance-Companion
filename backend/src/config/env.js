/**
 * @file env.js
 * @description Centralized environment variable validator and accessor
 */

import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/gold_emi_db',
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'fallback_access_secret_for_local_testing_123',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret_for_local_testing_456',
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  ADMIN_NAME: process.env.ADMIN_NAME || 'Fintech Administrator',
  ADMIN_EMAIL: (process.env.ADMIN_EMAIL || 'admin@goldloan.internal').toLowerCase().trim(),
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'AdminSecurePassword123!',
  ADMIN_VIEW_RAW_INPUTS: process.env.ADMIN_VIEW_RAW_INPUTS !== 'false', // Default true per stakeholder requirements
  ACTIVITY_RETENTION_SECONDS: parseInt(process.env.ACTIVITY_RETENTION_SECONDS || '31536000', 10), // 365 days default
  GOLD_API_KEY: process.env.GOLD_API_KEY || '',
  GOLD_API_PROVIDER: process.env.GOLD_API_PROVIDER || 'wgc_lbma_official'
};
