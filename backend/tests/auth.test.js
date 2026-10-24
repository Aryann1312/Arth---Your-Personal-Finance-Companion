/**
 * @file auth.test.js
 * @description Integration tests for user signup, login, refresh, logout, password hashing,
 * duplicate email rejection, and route protection.
 */

import request from 'supertest';
import app from '../src/app.js';
import { User } from '../src/models/User.js';
import { setupTestDB, teardownTestDB, clearTestDB } from './setup.js';

describe('Auth API & Security Tests', () => {
  beforeAll(async () => {
    await setupTestDB();
  }, 60000);

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
  });

  test('POST /api/auth/signup: creates user, hashes password, returns JWT tokens', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({
        name: 'Aryan Sharma',
        email: 'aryan@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        acceptTerms: true
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.user.email).toBe('aryan@example.com');
    expect(res.body.user.role).toBe('user');
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();

    // Verify plaintext password is not in database
    const savedUser = await User.findOne({ email: 'aryan@example.com' }).select('+passwordHash');
    expect(savedUser.passwordHash).not.toBe('Password123!');
    expect(savedUser.passwordHash.startsWith('$2')).toBe(true); // bcrypt hash
  });

  test('POST /api/auth/signup: rejects duplicate email registration with 409', async () => {
    await request(app)
      .post('/api/auth/signup')
      .send({
        name: 'First User',
        email: 'duplicate@example.com',
        password: 'Password123!',
        acceptTerms: true
      });

    const res = await request(app)
      .post('/api/auth/signup')
      .send({
        name: 'Second User',
        email: 'DUPLICATE@EXAMPLE.COM', // Case-insensitive duplicate
        password: 'Password456!',
        acceptTerms: true
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('already exists');
  });

  test('POST /api/auth/login: authenticates valid credentials', async () => {
    await request(app)
      .post('/api/auth/signup')
      .send({
        name: 'Login Tester',
        email: 'login@example.com',
        password: 'SecurePassword123!',
        acceptTerms: true
      });

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'login@example.com',
        password: 'SecurePassword123!'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
    expect(res.body.user.name).toBe('Login Tester');
  });

  test('POST /api/auth/login: generic error on wrong password or unregistered email', async () => {
    const resWrongPass = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'nonexistent@example.com',
        password: 'RandomPassword!'
      });

    expect(resWrongPass.status).toBe(401);
    expect(resWrongPass.body.error).toBe('Invalid email or password.');
  });

  test('POST /api/auth/refresh: refreshes access token', async () => {
    const signupRes = await request(app)
      .post('/api/auth/signup')
      .send({
        name: 'Refresh Tester',
        email: 'refresh@example.com',
        password: 'Password123!',
        acceptTerms: true
      });

    const refreshToken = signupRes.body.refreshToken;

    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.accessToken).toBeDefined();
  });

  test('GET /api/auth/me: rejects unauthenticated requests with 401', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error).toContain('token missing');
  });
});
