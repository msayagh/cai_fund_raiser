'use strict';

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');

const config = require('./config/env');
const logger = require('./utils/logger');
const { generalLimiter } = require('./middleware/rateLimiter');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { sendSuccess } = require('./utils/response');
const prisma = require('./db/client');

// Route modules
const authRoutes = require('./modules/auth/auth.routes');
const donorRoutes = require('./modules/donors/donors.routes');
const { adminDonorRouter } = require('./modules/donors/donors.routes');
const adminRoutes = require('./modules/admins/admins.routes');
const requestRoutes = require('./modules/requests/requests.routes');
const { adminRequestRouter } = require('./modules/requests/requests.routes');
const logRoutes = require('./modules/logs/logs.routes');
const { requireAdmin } = require('./middleware/auth');

const app = express();

// ─── Security & Utility Middleware ────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: [config.LIVE_FRONTEND_URL, config.DEV_FRONTEND_URL],
  credentials: true,
}));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Rate Limiting ────────────────────────────────────────────────────────────
app.use(generalLimiter);

// ─── HTTP Request Logging ─────────────────────────────────────────────────────
app.use(morgan('combined', { stream: logger.stream }));

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
});

// ─── Service Index ────────────────────────────────────────────────────────────
app.get('/', (_req, res) => {
  res.json({
    success: true,
    data: {
      service: 'Mosque App API',
      docs: '/api',
      health: '/health',
    },
  });
});

app.get('/api', (_req, res) => {
  res.json({
    success: true,
    data: {
      message: 'API is running.',
      auth: '/api/auth',
      donors: '/api/donors',
      requests: '/api/requests',
      admin: {
        donors: '/api/admin/donors',
        admins: '/api/admin/admins',
        requests: '/api/admin/requests',
        logs: '/api/admin/logs',
        stats: '/api/admin/stats',
      },
    },
  });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/donors', donorRoutes);
app.use('/api/requests', requestRoutes);

// Admin sub-routes
app.use('/api/admin/donors', adminDonorRouter);
app.use('/api/admin/admins', adminRoutes);
app.use('/api/admin/requests', adminRequestRouter);
app.use('/api/admin/logs', logRoutes);

// Admin stats
app.get('/api/admin/stats', requireAdmin, async (req, res, next) => {
  try {
    const [totalDonors, totalPaymentsAgg, activeEngagements, pendingRequests] = await Promise.all([
      prisma.donor.count(),
      prisma.payment.aggregate({ _sum: { amount: true } }),
      prisma.engagement.count({ where: { endDate: null } }),
      prisma.request.count({ where: { status: 'pending' } }),
    ]);

    sendSuccess(res, {
      totalDonors,
      totalRaised: totalPaymentsAgg._sum.amount ?? 0,
      activeEngagements,
      pendingRequests,
    });
  } catch (err) {
    next(err);
  }
});

// ─── Error Handling ───────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

module.exports = app;
