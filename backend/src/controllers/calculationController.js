/**
 * @file calculationController.js
 * @description Controller for saving, listing, and managing user Gold Loan and EMI calculations
 */

import { SavedCalculation } from '../models/SavedCalculation.js';
import { ActivityEvent } from '../models/ActivityEvent.js';

export async function saveCalculation(req, res, next) {
  try {
    const { type, label, inputs, results, sessionId } = req.body;

    if (!type || !label || !inputs || !results) {
      return res.status(400).json({
        success: false,
        error: 'Calculation type, label, inputs, and results are required.'
      });
    }

    if (!['gold-loan', 'emi'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Calculation type must be either gold-loan or emi.'
      });
    }

    const saved = await SavedCalculation.create({
      userId: req.user.id,
      type,
      label: label.trim(),
      inputs,
      results
    });

    // Asynchronously log save event
    ActivityEvent.create({
      userId: req.user.id,
      sessionId: sessionId || `sess_${Date.now()}`,
      module: type === 'gold-loan' ? 'gold_loan' : 'emi',
      action: 'save_calculation',
      screen: type === 'gold-loan' ? 'GoldLoanResultScreen' : 'EMIResultScreen',
      inputs: { calculationId: saved._id, type, label },
      resultSummary: { saved: true }
    }).catch(err => console.error('[Event Log Error] Save calculation event failed:', err.message));

    return res.status(201).json({
      success: true,
      message: 'Calculation saved successfully.',
      calculation: saved
    });
  } catch (err) {
    next(err);
  }
}

export async function getMyCalculations(req, res, next) {
  try {
    const { type } = req.query;
    const query = { userId: req.user.id };

    if (type && ['gold-loan', 'emi'].includes(type)) {
      query.type = type;
    }

    const calculations = await SavedCalculation.find(query)
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      calculations
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteCalculation(req, res, next) {
  try {
    const { id } = req.params;
    const deleted = await SavedCalculation.findOneAndDelete({
      _id: id,
      userId: req.user.id
    });

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Calculation not found or not owned by the authenticated user.'
      });
    }

    // Log deletion event
    ActivityEvent.create({
      userId: req.user.id,
      sessionId: `sess_${Date.now()}`,
      module: deleted.type === 'gold-loan' ? 'gold_loan' : 'emi',
      action: 'delete_calculation',
      screen: 'MyHistoryScreen',
      inputs: { calculationId: id },
      resultSummary: { deleted: true }
    }).catch(err => console.error('[Event Log Error] Delete calculation event failed:', err.message));

    return res.status(200).json({
      success: true,
      message: 'Calculation deleted successfully.'
    });
  } catch (err) {
    next(err);
  }
}
