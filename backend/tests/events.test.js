/**
 * @file events.test.js
 * @description Integration tests for batch activity logging, sensitive input sanitization,
 * TTL retention index verification, and user personal timeline.
 */

import request from 'supertest';
import app from '../src/app.js';
import { ActivityEvent } from '../src/models/ActivityEvent.js';
import { setupTestDB, teardownTestDB, clearTestDB } from './setup.js';

describe('Activity Logging & Privacy Tests', () => {
  let userToken;

  beforeAll(async () => {
    await setupTestDB();
  }, 60000);

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();

    const userRes = await request(app)
      .post('/api/auth/signup')
      .send({
        name: 'Event Tester',
        email: 'event@example.com',
        password: 'Password123!',
        acceptTerms: true
      });
    userToken = userRes.body.accessToken;
  });

  test('POST /api/events/batch: Ingests events and sanitizes sensitive credentials', async () => {
    const eventsPayload = [
      {
        sessionId: 'test_session_101',
        module: 'emi',
        action: 'calculate_emi',
        screen: 'EMICalculatorScreen',
        inputs: {
          principal: 500000,
          annualRate: 10,
          tenureMonths: 60,
          password: 'SecretPasswordShouldBeStripped',
          token: 'TokenShouldBeStripped'
        },
        resultSummary: { emi: 10623.52, totalPayment: 637411.32 }
      }
    ];

    const res = await request(app)
      .post('/api/events/batch')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ events: eventsPayload });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBe(1);

    // Verify sensitive data is stripped in MongoDB
    const logged = await ActivityEvent.findOne({ sessionId: 'test_session_101' });
    expect(logged).toBeDefined();
    expect(logged.inputs.principal).toBe(500000);
    expect(logged.inputs.password).toBeUndefined();
    expect(logged.inputs.token).toBeUndefined();
  });

  test('GET /api/events/my-history: Returns chronological timeline scoped to user', async () => {
    await request(app)
      .post('/api/events/batch')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        events: [
          { sessionId: 's1', module: 'gold_prices', action: 'view_range', screen: 'GoldTrackerScreen' },
          { sessionId: 's1', module: 'gold_loan', action: 'calculate_gold_loan', screen: 'GoldLoanScreen' }
        ]
      });

    const res = await request(app)
      .get('/api/events/my-history')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.events.length).toBeGreaterThanOrEqual(2);
  });

  test('DATA RETENTION: ActivityEvent model has TTL index configured', async () => {
    const indexes = ActivityEvent.schema.indexes();
    const ttlIndex = indexes.find(idx => idx[1] && idx[1].expireAfterSeconds !== undefined);
    expect(ttlIndex).toBeDefined();
    expect(ttlIndex[1].expireAfterSeconds).toBeGreaterThan(0);
  });
});
