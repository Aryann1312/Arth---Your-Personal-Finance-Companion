/**
 * @file eventRoutes.js
 * @description Routes for batch event logging and personal interaction timeline
 */

import express from 'express';
import { logBatchEvents, getMyHistory } from '../controllers/eventController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Batch logging allows optional auth (landing interactions prior to login)
router.post('/batch', (req, res, next) => {
  // If Bearer token is provided, attempt authenticate, otherwise proceed as anonymous
  if (req.headers.authorization) {
    return authenticate(req, res, () => logBatchEvents(req, res, next));
  }
  return logBatchEvents(req, res, next);
});

router.get('/my-history', authenticate, getMyHistory);

export default router;
