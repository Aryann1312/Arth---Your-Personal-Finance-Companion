/**
 * @file userController.js
 * @description User privacy rights: Cascade account deletion and complete data export (JSON)
 */

import { User } from '../models/User.js';
import { ActivityEvent } from '../models/ActivityEvent.js';
import { SavedCalculation } from '../models/SavedCalculation.js';

/**
 * Permanently deletes the user account, all saved calculations, and all activity events
 */
export async function deleteMyAccount(req, res, next) {
  try {
    const userId = req.user.id;

    // 1. Delete all saved calculations
    const deletedCalcs = await SavedCalculation.deleteMany({ userId });

    // 2. Delete all user activity events
    const deletedEvents = await ActivityEvent.deleteMany({ userId });

    // 3. Delete user document
    const deletedUser = await User.findByIdAndDelete(userId);

    if (!deletedUser) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    return res.status(200).json({
      success: true,
      message: 'Your account and all associated calculations and activity logs have been permanently deleted.',
      cascadeSummary: {
        calculationsDeleted: deletedCalcs.deletedCount,
        eventsDeleted: deletedEvents.deletedCount
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Exports all data associated with the user as a machine-readable JSON archive
 */
export async function exportMyData(req, res, next) {
  try {
    const userId = req.user.id;

    const [user, calculations, events] = await Promise.all([
      User.findById(userId).lean(),
      SavedCalculation.find({ userId }).sort({ createdAt: -1 }).lean(),
      ActivityEvent.find({ userId }).sort({ timestamp: -1 }).lean()
    ]);

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    const archive = {
      exportedAt: new Date().toISOString(),
      userProfile: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt
      },
      savedCalculations: calculations,
      activityHistory: events,
      retentionPolicy: 'Activity events are retained for 12 months in compliance with our data privacy guidelines.'
    };

    return res.status(200).json({
      success: true,
      archive
    });
  } catch (err) {
    next(err);
  }
}
