/**
 * @file eventLogger.js
 * @description Client-side analytics and interaction logger with debouncing (1.5s),
 * offline queueing, and non-blocking background batch transmission.
 */

import { apiRequest } from './api.js';
import { Platform } from 'react-native';

class EventLogger {
  constructor() {
    this.queue = [];
    this.debounceTimers = new Map();
    this.batchIntervalMs = 5000;
    this.sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    this.isFlushing = false;

    // Periodic flush timer
    setInterval(() => this.flush(), this.batchIntervalMs);
  }

  /**
   * Logs an immediate discrete action (e.g. screen view, button click, CSV export, save calculation)
   */
  logAction({ module, action, screen, inputs = {}, resultSummary = {} }) {
    this.queue.push({
      sessionId: this.sessionId,
      module,
      action,
      screen,
      inputs: this._sanitize(inputs),
      resultSummary,
      deviceInfo: {
        platform: Platform.OS,
        osVersion: String(Platform.Version),
        deviceType: Platform.isPad ? 'tablet' : 'phone'
      },
      timestamp: new Date().toISOString()
    });

    if (this.queue.length >= 10) {
      this.flush();
    }
  }

  /**
   * Logs a calculation event debounced by 1.5 seconds so rapid slider / typing adjustments
   * only record the final settled values.
   */
  logDebouncedCalculation({ module, action, screen, inputs = {}, resultSummary = {} }) {
    const key = `${module}_${action}`;

    if (this.debounceTimers.has(key)) {
      clearTimeout(this.debounceTimers.get(key));
    }

    const timer = setTimeout(() => {
      this.logAction({ module, action, screen, inputs, resultSummary });
      this.debounceTimers.delete(key);
    }, 1500);

    this.debounceTimers.set(key, timer);
  }

  /**
   * Flushes queued events to the backend in the background
   */
  async flush() {
    if (this.queue.length === 0 || this.isFlushing) return;

    this.isFlushing = true;
    const batch = [...this.queue];
    this.queue = [];

    try {
      await apiRequest('/events/batch', {
        method: 'POST',
        body: JSON.stringify({ events: batch })
      });
    } catch {
      // Re-queue events on network failure to ensure no data loss
      this.queue = [...batch, ...this.queue].slice(0, 200); // Bound memory
    } finally {
      this.isFlushing = false;
    }
  }

  _sanitize(inputs) {
    if (!inputs || typeof inputs !== 'object') return {};
    const sanitized = { ...inputs };
    delete sanitized.password;
    delete sanitized.confirmPassword;
    delete sanitized.token;
    return sanitized;
  }
}

export const logger = new EventLogger();
