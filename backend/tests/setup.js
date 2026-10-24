/**
 * @file setup.js
 * @description Isolated test database setup using local MongoDB or in-memory fallback
 */

import mongoose from 'mongoose';

const TEST_DB_URI = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/gold_emi_test_db';

export async function setupTestDB() {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(TEST_DB_URI, {
      serverSelectionTimeoutMS: 5000,
      autoIndex: true
    });
  }
}

export async function teardownTestDB() {
  if (mongoose.connection.readyState !== 0) {
    // Drop test database so tests leave zero residual artifacts
    try {
      await mongoose.connection.dropDatabase();
    } catch (e) {
      // Ignore
    }
    await mongoose.disconnect();
  }
}

export async function clearTestDB() {
  if (mongoose.connection.readyState !== 0) {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  }
}
