/**
 * @file calculationRoutes.js
 * @description Routes for persisting and managing user calculations
 */

import express from 'express';
import { saveCalculation, getMyCalculations, deleteCalculation } from '../controllers/calculationController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate); // All saved calculation operations require authentication

router.post('/save', saveCalculation);
router.get('/my', getMyCalculations);
router.delete('/:id', deleteCalculation);

export default router;
