/**
 * @file calcRoutes.js
 * @description Routes for backend-assisted calculations and lender directory
 */

import express from 'express';
import { computeEmi, computeGoldLoan, getLenders } from '../controllers/calcController.js';

const router = express.Router();

router.post('/emi', computeEmi);
router.post('/gold-loan', computeGoldLoan);
router.get('/lenders', getLenders);

export default router;
