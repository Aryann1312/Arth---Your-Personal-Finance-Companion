/**
 * @file app.js
 * @description Express application setup, security middleware, and route mounting
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { globalLimiter } from './middleware/rateLimit.js';
import { errorHandler } from './middleware/error.js';

import authRoutes from './routes/authRoutes.js';
import eventRoutes from './routes/eventRoutes.js';
import calculationRoutes from './routes/calculationRoutes.js';
import userRoutes from './routes/userRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import calcRoutes from './routes/calcRoutes.js';
import goldRoutes from './routes/goldRoutes.js';

const app = express();

// Security Headers
app.use(helmet());

// CORS configuration (allow requests from mobile devices and web previews)
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body Parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Global Rate Limiting
app.use('/api', globalLimiter);

// Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'Gold & Loan Calculator API',
    timestamp: new Date().toISOString()
  });
});

// Route Mounts
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/calculations', calculationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/calc', calcRoutes);
app.use('/api/gold', goldRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: `Route ${req.method} ${req.originalUrl} not found.` });
});

// Global Error Handler
app.use(errorHandler);

export default app;
