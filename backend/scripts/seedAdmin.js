/**
 * @file seedAdmin.js
 * @description Idempotent script to seed initial admin user from environment variables
 */

import { connectDB, disconnectDB } from '../src/config/db.js';
import { User } from '../src/models/User.js';
import { ENV } from '../src/config/env.js';

async function seedAdmin() {
  try {
    await connectDB();

    const existingAdmin = await User.findOne({ email: ENV.ADMIN_EMAIL });
    if (existingAdmin) {
      console.log(`[Seed Admin] Admin account (${ENV.ADMIN_EMAIL}) already exists. Updating role to admin.`);
      existingAdmin.role = 'admin';
      await existingAdmin.save();
      console.log('[Seed Admin] Admin status confirmed.');
      await disconnectDB();
      return;
    }

    const passwordHash = await User.hashPassword(ENV.ADMIN_PASSWORD);
    await User.create({
      name: ENV.ADMIN_NAME,
      email: ENV.ADMIN_EMAIL,
      passwordHash,
      role: 'admin',
      lastLoginAt: new Date()
    });

    console.log(`[Seed Admin] Admin user created successfully: ${ENV.ADMIN_EMAIL}`);
    await disconnectDB();
  } catch (err) {
    console.error('[Seed Admin Error]:', err.message);
    process.exit(1);
  }
}

seedAdmin();
