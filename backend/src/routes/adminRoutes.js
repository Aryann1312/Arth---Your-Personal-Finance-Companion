/**
 * @file adminRoutes.js
 * @description Routes for Admin Portal - restricted exclusively to role='admin'
 */

import express from 'express';
import {
  listUsers,
  getUserDetail,
  getActivityFeed,
  getAnalyticsSummary,
  exportActivityCSV
} from '../controllers/adminController.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/role.js';

const router = express.Router();

// Enforce both authentication AND admin role for every single admin route
router.use(authenticate, requireRole('admin'));

router.get('/users', listUsers);
router.get('/users/:id', getUserDetail);
router.get('/activity', getActivityFeed);
router.get('/analytics', getAnalyticsSummary);
router.get('/export-csv', exportActivityCSV);

export default router;
