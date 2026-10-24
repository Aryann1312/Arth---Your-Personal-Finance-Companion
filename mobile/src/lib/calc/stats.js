/**
 * @file stats.js
 * @description Statistical calculations for gold price historical ranges,
 * date-to-date comparisons, high/low tracking, and data gap reporting.
 */

/**
 * Computes high, low, absolute and percentage change over a range of price records.
 * Non-trading days (weekends, holidays) are handled gracefully without synthetic data interpolation.
 *
 * @param {Array<{date: string, price: number}>} records - Chronological or un-ordered array of records
 * @returns {Object} Comprehensive range statistics
 */
export function calculateRangeStats(records) {
  if (!Array.isArray(records) || records.length === 0) {
    return {
      count: 0,
      startDate: null,
      endDate: null,
      startPrice: 0,
      endPrice: 0,
      absoluteChange: 0,
      percentageChange: 0,
      highestPrice: 0,
      highestDate: null,
      lowestPrice: 0,
      lowestDate: null,
      averagePrice: 0,
      isPositive: false
    };
  }

  // Filter and validate records
  const validRecords = records
    .filter(r => r && r.date && typeof r.price === 'number' && !isNaN(r.price) && r.price > 0)
    .map(r => ({ date: String(r.date).slice(0, 10), price: Number(r.price) }))
    .sort((a, b) => (a.date > b.date ? 1 : a.date < b.date ? -1 : 0));

  if (validRecords.length === 0) {
    return {
      count: 0,
      startDate: null,
      endDate: null,
      startPrice: 0,
      endPrice: 0,
      absoluteChange: 0,
      percentageChange: 0,
      highestPrice: 0,
      highestDate: null,
      lowestPrice: 0,
      lowestDate: null,
      averagePrice: 0,
      isPositive: false
    };
  }

  const count = validRecords.length;
  const first = validRecords[0];
  const last = validRecords[count - 1];

  let highestPrice = -Infinity;
  let highestDate = null;
  let lowestPrice = Infinity;
  let lowestDate = null;
  let sum = 0;

  for (const r of validRecords) {
    sum += r.price;
    if (r.price > highestPrice) {
      highestPrice = r.price;
      highestDate = r.date;
    }
    if (r.price < lowestPrice) {
      lowestPrice = r.price;
      lowestDate = r.date;
    }
  }

  const startPrice = first.price;
  const endPrice = last.price;
  const absoluteChange = Math.round((endPrice - startPrice) * 100) / 100;
  const percentageChange = startPrice > 0
    ? Math.round(((endPrice - startPrice) / startPrice) * 10000) / 100
    : 0;
  const averagePrice = Math.round((sum / count) * 100) / 100;

  return {
    count,
    startDate: first.date,
    endDate: last.date,
    startPrice,
    endPrice,
    absoluteChange,
    percentageChange,
    highestPrice,
    highestDate,
    lowestPrice,
    lowestDate,
    averagePrice,
    isPositive: absoluteChange >= 0
  };
}

/**
 * Compares prices between two distinct dates from a historical dataset.
 * If a target date is a weekend/holiday, resolves to the nearest prior trading day with full disclosure.
 *
 * @param {Array<{date: string, price: number}>} records
 * @param {string} date1 - Earlier date 'YYYY-MM-DD'
 * @param {string} date2 - Later date 'YYYY-MM-DD'
 * @returns {Object} Comparison result
 */
export function compareTwoDates(records, date1, date2) {
  if (!Array.isArray(records) || records.length === 0 || !date1 || !date2) {
    return {
      success: false,
      error: 'Missing records or date parameters.'
    };
  }

  const validRecords = records
    .filter(r => r && r.date && typeof r.price === 'number' && !isNaN(r.price) && r.price > 0)
    .map(r => ({ date: String(r.date).slice(0, 10), price: Number(r.price) }))
    .sort((a, b) => (a.date > b.date ? 1 : a.date < b.date ? -1 : 0));

  const d1Target = String(date1).slice(0, 10);
  const d2Target = String(date2).slice(0, 10);

  // Helper to find exact or latest prior record
  function findRecordForDate(targetDate) {
    const exact = validRecords.find(r => r.date === targetDate);
    if (exact) {
      return { record: exact, isExact: true, settledDate: exact.date };
    }
    // Search latest prior
    const priors = validRecords.filter(r => r.date <= targetDate);
    if (priors.length > 0) {
      const prior = priors[priors.length - 1];
      return { record: prior, isExact: false, settledDate: prior.date };
    }
    // Fallback to earliest available if target is before earliest
    return { record: validRecords[0], isExact: false, settledDate: validRecords[0].date };
  }

  const res1 = findRecordForDate(d1Target);
  const res2 = findRecordForDate(d2Target);

  const price1 = res1.record.price;
  const price2 = res2.record.price;
  const absoluteChange = Math.round((price2 - price1) * 100) / 100;
  const percentageChange = price1 > 0
    ? Math.round(((price2 - price1) / price1) * 10000) / 100
    : 0;

  // Sub-range stats between the two dates
  const minDate = d1Target < d2Target ? d1Target : d2Target;
  const maxDate = d1Target < d2Target ? d2Target : d1Target;
  const subRecords = validRecords.filter(r => r.date >= minDate && r.date <= maxDate);
  const rangeStats = calculateRangeStats(subRecords);

  return {
    success: true,
    date1: {
      requestedDate: d1Target,
      settledDate: res1.settledDate,
      isExactTradingDay: res1.isExact,
      price: price1
    },
    date2: {
      requestedDate: d2Target,
      settledDate: res2.settledDate,
      isExactTradingDay: res2.isExact,
      price: price2
    },
    comparison: {
      absoluteChange,
      percentageChange,
      isIncrease: absoluteChange >= 0,
      rangeHighest: rangeStats.highestPrice,
      rangeHighestDate: rangeStats.highestDate,
      rangeLowest: rangeStats.lowestPrice,
      rangeLowestDate: rangeStats.lowestDate,
      tradingDaysCount: subRecords.length
    }
  };
}
