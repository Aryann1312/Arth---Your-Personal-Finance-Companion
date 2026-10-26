/**
 * @file adminController.js
 * @description Admin portal controller for stakeholder visibility, user management,
 * analytics aggregations, and CSV activity export.
 */

import { User } from '../models/User.js';
import { ActivityEvent } from '../models/ActivityEvent.js';
import { SavedCalculation } from '../models/SavedCalculation.js';
import { ENV } from '../config/env.js';

export async function listUsers(req, res, next) {
  try {
    const { search, role, sortBy = 'createdAt', sortOrder = 'desc', page = 1, limit = 20 } = req.query;

    const query = {};
    if (search) {
      const escapedSearch = String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { name: { $regex: escapedSearch, $options: 'i' } },
        { email: { $regex: escapedSearch, $options: 'i' } }
      ];
    }
    if (role && ['user', 'admin'].includes(role)) {
      query.role = role;
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const sortOption = {};
    sortOption[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [users, total] = await Promise.all([
      User.find(query).sort(sortOption).skip(skip).limit(limitNum).lean(),
      User.countDocuments(query)
    ]);

    // Attach saved calculation count for each user
    const usersWithStats = await Promise.all(
      users.map(async u => {
        const calcCount = await SavedCalculation.countDocuments({ userId: u._id });
        const eventCount = await ActivityEvent.countDocuments({ userId: u._id });
        return {
          id: u._id,
          name: u.name,
          email: u.email,
          role: u.role,
          createdAt: u.createdAt,
          lastLoginAt: u.lastLoginAt,
          savedCalculationsCount: calcCount,
          totalActivityEventsCount: eventCount
        };
      })
    );

    return res.status(200).json({
      success: true,
      users: usersWithStats,
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

export async function getUserDetail(req, res, next) {
  try {
    const { id } = req.params;
    if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({ success: false, error: 'Invalid user ID format.' });
    }
    const user = await User.findById(id).lean();

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    const [calculations, recentEvents] = await Promise.all([
      SavedCalculation.find({ userId: id }).sort({ createdAt: -1 }).lean(),
      ActivityEvent.find({ userId: id }).sort({ timestamp: -1 }).limit(100).lean()
    ]);

    // Respect ADMIN_VIEW_RAW_INPUTS flag
    const processedEvents = recentEvents.map(evt => ({
      id: evt._id,
      sessionId: evt.sessionId,
      module: evt.module,
      action: evt.action,
      screen: evt.screen,
      inputs: ENV.ADMIN_VIEW_RAW_INPUTS ? evt.inputs : '[HIDDEN_BY_POLICY]',
      resultSummary: evt.resultSummary,
      deviceInfo: evt.deviceInfo,
      timestamp: evt.timestamp
    }));

    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt
      },
      savedCalculations: calculations,
      activityTimeline: processedEvents
    });
  } catch (err) {
    next(err);
  }
}

export async function getActivityFeed(req, res, next) {
  try {
    const { userId, module, action, startDate, endDate, page = 1, limit = 50 } = req.query;

    const query = {};
    if (userId) query.userId = userId;
    if (module && module !== 'all') query.module = module;
    if (action) query.action = action;
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [events, total] = await Promise.all([
      ActivityEvent.find(query)
        .populate('userId', 'name email role')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      ActivityEvent.countDocuments(query)
    ]);

    const formattedEvents = events.map(evt => ({
      id: evt._id,
      user: evt.userId ? { id: evt.userId._id, name: evt.userId.name, email: evt.userId.email } : null,
      sessionId: evt.sessionId,
      module: evt.module,
      action: evt.action,
      screen: evt.screen,
      inputs: ENV.ADMIN_VIEW_RAW_INPUTS ? evt.inputs : '[HIDDEN_BY_POLICY]',
      resultSummary: evt.resultSummary,
      deviceInfo: evt.deviceInfo,
      timestamp: evt.timestamp
    }));

    return res.status(200).json({
      success: true,
      events: formattedEvents,
      rawInputsVisible: ENV.ADMIN_VIEW_RAW_INPUTS,
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

export async function getAnalyticsSummary(req, res, next) {
  try {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      dauLast24h,
      totalCalculationsSaved,
      moduleUsageStats,
      dailyCalculations
    ] = await Promise.all([
      User.countDocuments(),
      ActivityEvent.distinct('userId', { timestamp: { $gte: oneDayAgo }, userId: { $ne: null } }),
      SavedCalculation.countDocuments(),
      ActivityEvent.aggregate([
        { $match: { module: { $in: ['gold_prices', 'gold_loan', 'emi'] } } },
        { $group: { _id: '$module', count: { $sum: 1 } } }
      ]),
      ActivityEvent.aggregate([
        {
          $match: {
            action: { $in: ['calculate_emi', 'calculate_gold_loan'] },
            timestamp: { $gte: sevenDaysAgo }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ])
    ]);

    // Format module usage percentages
    const totalModuleEvents = moduleUsageStats.reduce((sum, item) => sum + item.count, 0);
    const moduleBreakdown = moduleUsageStats.map(item => ({
      module: item._id,
      count: item.count,
      percentage: totalModuleEvents > 0 ? Math.round((item.count / totalModuleEvents) * 100) : 0
    }));

    return res.status(200).json({
      success: true,
      analytics: {
        totalUsers,
        dailyActiveUsers: dauLast24h.length,
        totalCalculationsSaved,
        moduleBreakdown,
        dailyCalculationsTimeSeries: dailyCalculations.map(d => ({ date: d._id, count: d.count }))
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function exportActivityCSV(req, res, next) {
  try {
    const { module, startDate, endDate } = req.query;

    const query = {};
    if (module && module !== 'all') query.module = module;
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const events = await ActivityEvent.find(query)
      .populate('userId', 'email')
      .sort({ timestamp: -1 })
      .limit(5000)
      .lean();

    const header = 'Timestamp,Event ID,User Email,Session ID,Module,Action,Screen,Result Summary\n';
    const rows = events.map(evt => {
      const email = evt.userId ? evt.userId.email : 'Anonymous';
      const summary = JSON.stringify(evt.resultSummary || {}).replace(/"/g, '""');
      return `"${evt.timestamp.toISOString()}","${evt._id}","${email}","${evt.sessionId}","${evt.module}","${evt.action}","${evt.screen}","${summary}"`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="activity_export.csv"');
    return res.status(200).send(header + rows.join('\n'));
  } catch (err) {
    next(err);
  }
}
