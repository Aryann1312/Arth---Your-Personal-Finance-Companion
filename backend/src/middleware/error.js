/**
 * @file error.js
 * @description Centralized error handler preventing stack traces in production
 */

import { ENV } from '../config/env.js';

export function errorHandler(err, req, res, next) {
  let statusCode = 500;

  if (err.status && typeof err.status === 'number') {
    statusCode = err.status;
  } else if (err.statusCode && typeof err.statusCode === 'number') {
    statusCode = err.statusCode;
  } else if (err.name === 'ValidationError' || err.name === 'CastError' || err.type === 'entity.parse.failed') {
    statusCode = 400;
  } else if (err.code === 11000) {
    statusCode = 409;
  } else if (res.statusCode && res.statusCode !== 200) {
    statusCode = res.statusCode;
  }

  const errorMessage = err.type === 'entity.parse.failed'
    ? 'Malformed JSON in request body.'
    : (err.message || 'Internal Server Error');

  if (statusCode >= 500) {
    console.error(`[API Error] ${req.method} ${req.originalUrl}:`, err.message);
  }

  res.status(statusCode).json({
    success: false,
    error: errorMessage,
    stack: ENV.NODE_ENV === 'development' ? err.stack : undefined
  });
}

