/**
 * @file calculations.test.js
 * @description Integration tests for saving calculations, owner-scoping,
 * and user privacy cascade deletion.
 */

import request from 'supertest';
import app from '../src/app.js';
import { User } from '../src/models/User.js';
import { SavedCalculation } from '../src/models/SavedCalculation.js';
import { ActivityEvent } from '../src/models/ActivityEvent.js';
import { setupTestDB, teardownTestDB, clearTestDB } from './setup.js';

describe('Saved Calculations & Privacy Cascade Deletion', () => {
  let userAToken;
  let userBToken;
  let userAId;

  beforeAll(async () => {
    await setupTestDB();
  }, 60000);

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();

    const userARes = await request(app)
      .post('/api/auth/signup')
      .send({
        name: 'User Alpha',
        email: 'alpha@example.com',
        password: 'Password123!',
        acceptTerms: true
      });
    userAToken = userARes.body.accessToken;
    userAId = userARes.body.user.id;

    const userBRes = await request(app)
      .post('/api/auth/signup')
      .send({
        name: 'User Beta',
        email: 'beta@example.com',
        password: 'Password123!',
        acceptTerms: true
      });
    userBToken = userBRes.body.accessToken;
  });

  test('POST /api/calculations/save: Saves Gold Loan and EMI calculations', async () => {
    const res = await request(app)
      .post('/api/calculations/save')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        type: 'emi',
        label: 'Home Renovation Loan',
        inputs: { principal: 500000, annualRate: 10, tenureMonths: 60 },
        results: { emi: 10623.52, totalPayment: 637411.32 }
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.calculation.label).toBe('Home Renovation Loan');
  });

  test('OWNER SCOPING: User B cannot view User A calculations', async () => {
    // User A saves calculation
    await request(app)
      .post('/api/calculations/save')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        type: 'gold-loan',
        label: 'Alpha Wedding Jewellery Loan',
        inputs: { weight: 50, purity: '22K' },
        results: { assessedGoldValue: 343500 }
      });

    // User B queries calculations
    const resB = await request(app)
      .get('/api/calculations/my')
      .set('Authorization', `Bearer ${userBToken}`);

    expect(resB.status).toBe(200);
    expect(resB.body.calculations.length).toBe(0); // Scoped to User B
  });

  test('CASCADE DELETION: DELETE /api/users/me removes user, saved calculations, and activity logs', async () => {
    // User A creates saved calculation and activity log
    await request(app)
      .post('/api/calculations/save')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        type: 'emi',
        label: 'To Be Deleted',
        inputs: { principal: 100000 },
        results: { emi: 8791 }
      });

    await request(app)
      .post('/api/events/batch')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        events: [{ sessionId: 's_del', module: 'emi', action: 'calc', screen: 'Screen' }]
      });

    // User A deletes account
    const deleteRes = await request(app)
      .delete('/api/users/me')
      .set('Authorization', `Bearer ${userAToken}`);

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.success).toBe(true);

    // Verify User A is deleted
    const userInDb = await User.findById(userAId);
    expect(userInDb).toBeNull();

    // Verify calculations are cascaded and deleted
    const calcsInDb = await SavedCalculation.find({ userId: userAId });
    expect(calcsInDb.length).toBe(0);

    // Verify activity events are cascaded and deleted
    const eventsInDb = await ActivityEvent.find({ userId: userAId });
    expect(eventsInDb.length).toBe(0);
  });
});
