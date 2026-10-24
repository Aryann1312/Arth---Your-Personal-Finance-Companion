/**
 * @file goldRoutes.js
 * @description Routes for live gold prices, historical charts, date comparison, and methodology
 */

import express from 'express';
import {
  getLiveGoldPrice,
  getGoldHistory,
  compareDates,
  getSourceInfo
} from '../controllers/goldController.js';

const router = express.Router();

router.get('/live', getLiveGoldPrice);
router.get('/history', getGoldHistory);
router.get('/compare', compareDates);
router.get('/source-info', getSourceInfo);

export default router;
