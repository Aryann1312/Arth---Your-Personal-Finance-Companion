/**
 * @file goldController.js
 * @description Gold price controller serving live prices, historical series, date comparisons,
 * and data provenance methodology.
 */

import { GoldPrice } from '../models/GoldPrice.js';
import { LivePriceCache } from '../models/LivePriceCache.js';
import { calculateRangeStats, compareTwoDates } from '../../../lib/calc/stats.js';
import { goldDataManager } from '../services/gold/GoldDataManager.js';

export async function getLiveGoldPrice(req, res, next) {
  try {
    const livePrice = await goldDataManager.getLivePrice();

    return res.status(200).json({
      success: true,
      data: livePrice
    });
  } catch (err) {
    next(err);
  }
}

export async function getGoldHistory(req, res, next) {
  try {
    const { range = '1Y', purity = '24K' } = req.query;

    const daysMap = {
      '1M': 30,
      '3M': 90,
      '6M': 180,
      '1Y': 365,
      '3Y': 1095,
      '5Y': 1825
    };

    const days = daysMap[range] || 365;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffStr = cutoffDate.toISOString().slice(0, 10);

    const records = await GoldPrice.find({
      purity,
      unit: 'gram',
      currency: 'INR',
      observationDate: { $gte: cutoffStr }
    })
      .sort({ observationDate: 1 })
      .lean();

    const formattedRecords = records.map(r => ({
      date: r.observationDate,
      price: r.price,
      currency: r.currency,
      purity: r.purity,
      basis: r.basis,
      sourceName: r.sourceName
    }));

    const stats = calculateRangeStats(formattedRecords);

    return res.status(200).json({
      success: true,
      range,
      purity,
      records: formattedRecords,
      stats,
      dataCoverage: {
        hasData: formattedRecords.length > 0,
        availablePoints: formattedRecords.length,
        startDate: stats.startDate,
        endDate: stats.endDate,
        isVerifiedHistorical: true
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function compareDates(req, res, next) {
  try {
    const { date1, date2, purity = '24K' } = req.query;

    if (!date1 || !date2) {
      return res.status(400).json({ success: false, error: 'Both date1 and date2 are required in YYYY-MM-DD format.' });
    }

    const records = await GoldPrice.find({
      purity,
      unit: 'gram',
      currency: 'INR'
    })
      .sort({ observationDate: 1 })
      .lean();

    const comparison = compareTwoDates(
      records.map(r => ({ date: r.observationDate, price: r.price })),
      date1,
      date2
    );

    return res.status(200).json({
      success: true,
      comparison
    });
  } catch (err) {
    next(err);
  }
}

export async function getSourceInfo(req, res) {
  res.status(200).json({
    success: true,
    sources: [
      {
        provider: 'World Gold Council (Goldhub) & LBMA',
        type: 'Primary Daily Historical Dataset & Fixing Reference',
        frequency: 'Daily (London PM Fix / Mumbai Settlement)',
        coverage: '5+ Years verified daily records',
        licensing: 'Public reference with proper attribution under WGC Terms of Use',
        pricingBasis: 'Indicative international spot converted to INR (Ex-Duty & Ex-GST)',
        url: 'https://www.gold.org/goldhub/data/gold-prices'
      },
      {
        provider: 'Reserve Bank of India (DBIE)',
        type: 'Domestic Reference and Tariff Comparison',
        frequency: 'Daily/Weekly reference rates',
        url: 'https://dbie.rbihub.in'
      }
    ],
    derivationMethodology: {
      formula: 'INR/gram = (XAU_USD / 31.1034768) * USD_INR * purityFactor',
      troyOunceGrams: 31.1034768,
      purityFactors: {
        '24K': 1.0,
        '22K': 0.916,
        '18K': 0.750
      },
      tariffNote: 'International spot converted to INR reflects global bullion value before Indian Basic Customs Duty (~6%), AIDC, local bullion freight premiums, and 3% domestic GST.'
    }
  });
}
