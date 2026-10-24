/**
 * @file server.js
 * @description HTTP Server entry point connecting to MongoDB and launching Express listener
 */

import app from './app.js';
import { connectDB } from './config/db.js';
import { ENV } from './config/env.js';

async function startServer() {
  try {
    // Attempt MongoDB connection
    try {
      await connectDB();
    } catch (dbErr) {
      console.warn('[Server Warning] Database connection failed on start. Server will run with in-memory or fallback handlers.');
    }

    const server = app.listen(ENV.PORT, '0.0.0.0', () => {
      console.log(`=======================================================`);
      console.log(`🚀 Gold & Loan Calculator Backend API Active`);
      console.log(`📡 Local Address:   http://localhost:${ENV.PORT}`);
      console.log(`🛡️  Environment:     ${ENV.NODE_ENV}`);
      console.log(`👑 Admin Raw Inputs: ${ENV.ADMIN_VIEW_RAW_INPUTS}`);
      console.log(`⏱️  Activity TTL:    ${ENV.ACTIVITY_RETENTION_SECONDS} seconds`);
      console.log(`=======================================================`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('[Server] SIGTERM received. Closing HTTP server gracefully.');
      server.close(() => {
        console.log('[Server] HTTP server closed.');
        process.exit(0);
      });
    });
  } catch (err) {
    console.error('[Server Error] Startup failed:', err.message);
    process.exit(1);
  }
}

startServer();
