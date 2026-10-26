/**
 * @file apiSecurityAndCalculations.test.js
 * @description API endpoint testing for:
 * 1. POST /api/calc/emi calculation endpoints (standard, zero interest, boundary conditions)
 * 2. POST /api/calc/gold-loan endpoints (Section 4 realistic examples, LTV, shortfall, processing fees)
 * 3. GET /api/calc/lenders directory
 * 4. Security & error handling:
 *    - Malformed JSON handling (returns HTTP 400, not 500)
 *    - Unknown route handling (HTTP 404)
 *    - Unauthorized access (HTTP 401)
 *    - Forbidden access (HTTP 403 for non-admins)
 *    - Invalid ObjectId format handling (HTTP 400, not 500)
 *    - Regex search injection safety (no crash on special characters)
 *    - Date format validation on /api/gold/compare
 */

import request from 'supertest';
import app from '../src/app.js';
import { User } from '../src/models/User.js';
import { setupTestDB, teardownTestDB, clearTestDB } from './setup.js';

describe('API Calculations, Security & Error Handling Audit Suite', () => {
  let adminToken;
  let userToken;

  beforeAll(async () => {
    await setupTestDB();
  }, 60000);

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();

    // Create an admin user
    const adminHash = await User.hashPassword('AdminPass123!');
    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@fintech.test',
      passwordHash: adminHash,
      role: 'admin'
    });

    const adminLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@fintech.test', password: 'AdminPass123!' });
    adminToken = adminLoginRes.body.accessToken;

    // Create a regular user
    const userRes = await request(app)
      .post('/api/auth/signup')
      .send({
        name: 'Regular Customer',
        email: 'customer@fintech.test',
        password: 'Password123!',
        acceptTerms: true
      });
    userToken = userRes.body.accessToken;
  });

  describe('1. EMI API Endpoints (/api/calc/emi)', () => {
    test('POST /api/calc/emi: P=500000, 10%, 60 months returns accurate EMI (~10,623.52) and schedule', async () => {
      const res = await request(app)
        .post('/api/calc/emi')
        .send({
          principal: 500000,
          annualRate: 10,
          tenureMonths: 60
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.summary.emi).toBeCloseTo(10623.52, 1);
      expect(res.body.summary.totalPayment).toBeCloseTo(637411.20, 0);
      expect(res.body.summary.totalInterest).toBeCloseTo(137411.20, 0);
      expect(res.body.amortization.schedule.length).toBe(60);
      expect(res.body.amortization.summary.isReconciled).toBe(true);
      expect(res.body.amortization.summary.roundingDifferencePaise).toBe(0);
    });

    test('POST /api/calc/emi: Zero interest case (P=120000, 0%, 12 months)', async () => {
      const res = await request(app)
        .post('/api/calc/emi')
        .send({
          principal: 120000,
          annualRate: 0,
          tenureMonths: 12
        });

      expect(res.status).toBe(200);
      expect(res.body.summary.emi).toBe(10000);
      expect(res.body.summary.totalInterest).toBe(0);
      expect(res.body.summary.totalPayment).toBe(120000);
    });

    test('POST /api/calc/emi: Gracefully handles empty body or zero values without 500 crash', async () => {
      const res = await request(app)
        .post('/api/calc/emi')
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.summary.emi).toBe(0);
    });
  });

  describe('2. Gold Loan API Endpoints (/api/calc/gold-loan)', () => {
    test('POST /api/calc/gold-loan: Valuation ₹12,67,234 with Desired Loan ₹5,00,000 (39.46% LTV)', async () => {
      const res = await request(app)
        .post('/api/calc/gold-loan')
        .send({
          weight: 100,
          purity: '24K',
          goldRatePerGram: 12672.34,
          requestedLoanAmount: 500000,
          annualRate: 9.0,
          tenureMonths: 12,
          repaymentMethod: 'bullet',
          processingFee: 0.5,
          feeType: 'percent'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const { result } = res.body;

      expect(result.valuation.assessedGoldValue).toBe(1267234);
      expect(result.ltv.regulatoryLtvPercent).toBe(75);
      expect(result.loan.estimatedMaxLoanEligibility).toBe(950425.5);
      expect(result.loan.approvedLoanAmount).toBe(500000);
      expect(result.loan.hasShortfall).toBe(false);
      expect(result.ltv.effectiveApprovedLtvPercent).toBe(39.46);
      expect(result.loan.processingFeeAmount).toBe(2500); // 0.5% of 5,00,000
      expect(result.loan.netDisbursalAmount).toBe(497500);
    });

    test('POST /api/calc/gold-loan: Valuation ₹25,34,468 with Desired Loan ₹7,00,000 (27.62% LTV)', async () => {
      const res = await request(app)
        .post('/api/calc/gold-loan')
        .send({
          weight: 200,
          purity: '24K',
          goldRatePerGram: 12672.34,
          requestedLoanAmount: 700000,
          annualRate: 8.75,
          tenureMonths: 12,
          processingFee: 1.0,
          feeType: 'percent'
        });

      expect(res.status).toBe(200);
      const { result } = res.body;
      expect(result.valuation.assessedGoldValue).toBe(2534468);
      expect(result.loan.approvedLoanAmount).toBe(700000);
      expect(result.ltv.effectiveApprovedLtvPercent).toBe(27.62);
      expect(result.loan.processingFeeAmount).toBe(7000); // 1% of 7,00,000
      expect(result.loan.netDisbursalAmount).toBe(693000);
    });

    test('GET /api/calc/lenders: Returns illustrative lender presets', async () => {
      const res = await request(app).get('/api/calc/lenders');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.lenders)).toBe(true);
      expect(res.body.lenders.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('3. Security, Input Validation & HTTP Status Codes (Section 6 & 8)', () => {
    test('MALFORMED JSON: Sending invalid JSON syntax returns HTTP 400 Bad Request, NOT 500', async () => {
      const res = await request(app)
        .post('/api/calc/emi')
        .set('Content-Type', 'application/json')
        .send('{"invalid json: missing closing quote');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Malformed JSON');
    });

    test('ROUTE NOT FOUND: Requesting unregistered endpoint returns HTTP 404', async () => {
      const res = await request(app).get('/api/nonexistent-route-endpoint');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('not found');
    });

    test('UNAUTHORIZED: Accessing protected calculations without token returns HTTP 401', async () => {
      const res = await request(app).get('/api/calculations/my');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('token missing');
    });

    test('FORBIDDEN (RBAC): Regular customer accessing admin routes returns HTTP 403', async () => {
      const res = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain("Requires 'admin' privileges");
    });

    test('OBJECTID VALIDATION: Malformed ID in admin user detail returns HTTP 400, NOT 500', async () => {
      const res = await request(app)
        .get('/api/admin/users/not-a-valid-24-hex-id')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Invalid user ID format');
    });

    test('OBJECTID VALIDATION: Malformed ID in delete calculation returns HTTP 400, NOT 500', async () => {
      const res = await request(app)
        .delete('/api/calculations/invalid-calc-id-123')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Invalid calculation ID format');
    });

    test('REGEX INJECTION SAFETY: Special characters in admin search query execute safely without 500 crash', async () => {
      // Searching for string containing unescaped regex metacharacters: '('
      const res = await request(app)
        .get('/api/admin/users?search=user(test')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.users)).toBe(true);
    });

    test('DATE VALIDATION: Invalid date format on /api/gold/compare returns HTTP 400', async () => {
      const res = await request(app)
        .get('/api/gold/compare?date1=invalid-date&date2=2025-01-01');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('valid dates in YYYY-MM-DD format');
    });
  });
});
