/**
 * @file calcController.js
 * @description Calculation endpoint handlers delegating to pure /lib/calc engine
 * and serving verified/illustrative lender presets.
 */

import { calculateEMI, generateAmortizationSchedule } from '../../../lib/calc/emi.js';
import { calculateGoldLoan } from '../../../lib/calc/goldLoan.js';
import { ILLUSTRATIVE_LENDER_PRESETS } from '../../../lib/calc/config.js';
import { LenderReference } from '../models/LenderReference.js';

export async function computeEmi(req, res, next) {
  try {
    const {
      principal,
      annualRate,
      tenureMonths,
      extraMonthlyPayment,
      prepayments,
      processingFee,
      feeType,
      financeFee
    } = req.body;

    const baseSummary = calculateEMI({
      principal,
      annualRate,
      tenureMonths,
      processingFee,
      feeType,
      financeFee
    });

    const scheduleData = generateAmortizationSchedule({
      principal,
      annualRate,
      tenureMonths,
      extraMonthlyPayment,
      prepayments,
      processingFee,
      feeType,
      financeFee
    });

    return res.status(200).json({
      success: true,
      summary: baseSummary,
      amortization: scheduleData
    });
  } catch (err) {
    next(err);
  }
}

export async function computeGoldLoan(req, res, next) {
  try {
    const {
      weight,
      purity,
      goldRatePerGram,
      requestedLoanAmount,
      annualRate,
      tenureMonths,
      repaymentMethod,
      collateralType,
      processingFee,
      feeType,
      lenderPreset
    } = req.body;

    const result = calculateGoldLoan({
      weight,
      purity,
      goldRatePerGram,
      requestedLoanAmount,
      annualRate,
      tenureMonths,
      repaymentMethod,
      collateralType,
      processingFee,
      feeType,
      lenderPreset
    });

    return res.status(200).json({
      success: true,
      result
    });
  } catch (err) {
    next(err);
  }
}

export async function getLenders(req, res, next) {
  try {
    let lenders = await LenderReference.find().lean();

    // Fallback to illustrative presets if database not yet seeded
    if (!lenders || lenders.length === 0) {
      lenders = ILLUSTRATIVE_LENDER_PRESETS.map(p => ({
        ...p,
        isExpired: false
      }));
    } else {
      const now = new Date();
      lenders = lenders.map(l => ({
        ...l,
        isExpired: l.expiryDate ? new Date(l.expiryDate) < now : false
      }));
    }

    return res.status(200).json({
      success: true,
      lenders
    });
  } catch (err) {
    next(err);
  }
}
