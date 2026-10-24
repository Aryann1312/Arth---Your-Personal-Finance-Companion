/**
 * @file error.js
 * @description Centralized error handler preventing stack traces in production
 */

import { ENV } from '../config/env.js';

export function errorHandler(err, req, res, next) {
  const statusCode = res.statusCode !== 200 ? res.statusCode : 500;

  console.error(`[API Error] ${req.method} ${req.originalUrl}:`, err.message);

  res.status(statusCode).json({
    success: false,
    error: err.message || 'Internal Server Error',
    stack: ENV.NODE_ENV === 'development' ? err.stack : undefined
  });
}
