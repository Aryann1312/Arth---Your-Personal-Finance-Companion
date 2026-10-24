/**
 * @file userRoutes.js
 * @description Routes for user rights: Account cascade deletion and machine-readable data export
 */

import express from 'express';
import { deleteMyAccount, exportMyData } from '../controllers/userController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.delete('/me', deleteMyAccount);
router.get('/export-my-data', exportMyData);

export default router;
