/**
 * @file eventController.js
 * @description Ingestion of batched client analytics events and user interaction history
 */

import { ActivityEvent } from '../models/ActivityEvent.js';

// Strip sensitive fields from inputs before persisting
function sanitizeInputs(inputs) {
  if (!inputs || typeof inputs !== 'object') return {};
  const sanitized = { ...inputs };
  delete sanitized.password;
  delete sanitized.confirmPassword;
  delete sanitized.token;
  delete sanitized.accessToken;
  delete sanitized.refreshToken;
  delete sanitized.card;
  delete sanitized.cvv;
  delete sanitized.aadhaar;
  delete sanitized.pan;
  return sanitized;
}

export async function logBatchEvents(req, res, next) {
  try {
    const { events } = req.body;

    if (!Array.isArray(events) || events.length === 0) {
      return res.status(400).json({ success: false, error: 'Events array is required.' });
    }

    const userId = req.user ? req.user.id : null;

    const formattedEvents = events.map(evt => ({
      userId: userId || evt.userId || null,
      sessionId: evt.sessionId || 'unknown_session',
      module: evt.module || 'gold_prices',
      action: evt.action || 'interaction',
      screen: evt.screen || 'unknown_screen',
      inputs: sanitizeInputs(evt.inputs),
      resultSummary: evt.resultSummary || {},
      deviceInfo: evt.deviceInfo || {},
      timestamp: evt.timestamp ? new Date(evt.timestamp) : new Date()
    }));

    await ActivityEvent.insertMany(formattedEvents, { ordered: false });

    return res.status(201).json({
      success: true,
      count: formattedEvents.length
    });
  } catch (err) {
    next(err);
  }
}

export async function getMyHistory(req, res, next) {
  try {
    const userId = req.user.id;
    const { module, limit = 50, page = 1 } = req.query;

    const query = { userId };
    if (module && module !== 'all') {
      query.module = module;
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [events, total] = await Promise.all([
      ActivityEvent.find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      ActivityEvent.countDocuments(query)
    ]);

    return res.status(200).json({
      success: true,
      events,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (err) {
    next(err);
  }
}
