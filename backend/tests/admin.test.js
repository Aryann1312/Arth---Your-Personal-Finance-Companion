/**
 * @file admin.test.js
 * @description Integration tests for role-based access control (403 on unauthorized users),
 * admin queries, user inspection, analytics, and CSV export.
 */

import request from 'supertest';
import app from '../src/app.js';
import { User } from '../src/models/User.js';
import { setupTestDB, teardownTestDB, clearTestDB } from './setup.js';

describe('Admin Portal API & Role Enforcement', () => {
  let userToken;
  let adminToken;
  let testUserId;

  beforeAll(async () => {
    await setupTestDB();
  }, 60000);

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();

    // 1. Create standard user
    const userRes = await request(app)
      .post('/api/auth/signup')
      .send({
        name: 'Regular Customer',
        email: 'customer@example.com',
        password: 'CustomerPass123!',
        acceptTerms: true
      });
    userToken = userRes.body.accessToken;
    testUserId = userRes.body.user.id;

    // 2. Create admin user
    const passwordHash = await User.hashPassword('AdminPass123!');
    const adminUser = await User.create({
      name: 'System Admin',
      email: 'admin@system.internal',
      passwordHash,
      role: 'admin'
    });

    const adminLoginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@system.internal',
        password: 'AdminPass123!'
      });
    adminToken = adminLoginRes.body.accessToken;
  });

  test('ROLE CHECK: Regular user receives 403 Forbidden on /api/admin/users', async () => {
    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Forbidden');
  });

  test('ROLE CHECK: Admin user receives 200 OK on /api/admin/users', async () => {
    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.users)).toBe(true);
    expect(res.body.users.length).toBeGreaterThanOrEqual(2);
  });

  test('GET /api/admin/users/:id: Inspects user detail and activity history', async () => {
    const res = await request(app)
      .get(`/api/admin/users/${testUserId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.email).toBe('customer@example.com');
    expect(Array.isArray(res.body.activityTimeline)).toBe(true);
  });

  test('GET /api/admin/analytics: Returns user aggregates and module statistics', async () => {
    const res = await request(app)
      .get('/api/admin/analytics')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.analytics.totalUsers).toBeGreaterThanOrEqual(2);
    expect(Array.isArray(res.body.analytics.moduleBreakdown)).toBe(true);
  });

  test('GET /api/admin/export-csv: Exports activity events as CSV', async () => {
    const res = await request(app)
      .get('/api/admin/export-csv')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.text).toContain('Timestamp,Event ID,User Email,Session ID,Module,Action,Screen');
  });
});
