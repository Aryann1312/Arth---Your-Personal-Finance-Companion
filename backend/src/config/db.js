
/**
 * @file db.js
 * @description MongoDB connection manager with reconnection logic
 */

import mongoose from 'mongoose';
import { ENV } from './env.js';

export async function connectDB(uri = ENV.MONGODB_URI) {
  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      autoIndex: true
    });
    console.log(`[Database] MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (err) {
    console.error(`[Database Error] Connection failed: ${err.message}`);
    if (ENV.NODE_ENV !== 'test') {
      console.warn('[Database] Running without active MongoDB connection or waiting for reconnect.');
    }
    throw err;
  }
}

export async function disconnectDB() {
  try {
    await mongoose.disconnect();
    console.log('[Database] MongoDB Disconnected.');
  } catch (err) {
    console.error(`[Database Error] Disconnection error: ${err.message}`);
  }
}
