'use strict';

const prisma = require('../../db/client');
const logger = require('../../utils/logger');

/**
 * Creates an activity log entry. Never throws — failures are logged to Winston.
 */
const createLog = async ({ actor, actorType, actorId, action, details, donorId, adminId }) => {
  try {
    return await prisma.activityLog.create({
      data: {
        actor,
        actorType,
        actorId: actorId ?? null,
        action,
        details: typeof details === 'string' ? details : JSON.stringify(details),
        donorId: donorId ?? null,
        adminId: adminId ?? null,
      },
    });
  } catch (err) {
    logger.error('Failed to create activity log', { error: err.message, action, actor });
    return null;
  }
};

/**
 * Queries activity logs with optional filters and pagination.
 */
const getLogs = async ({ donorId, action, dateFrom, dateTo, page = 1, limit = 20 } = {}) => {
  const safeLimit = Math.min(Number(limit) || 20, 100);
  const safePage = Math.max(Number(page) || 1, 1);
  const skip = (safePage - 1) * safeLimit;

  const where = {};
  if (donorId) where.donorId = donorId;
  if (action) where.action = action;
  if (dateFrom || dateTo) {
    where.timestamp = {};
    if (dateFrom) where.timestamp.gte = new Date(dateFrom);
    if (dateTo) where.timestamp.lte = new Date(dateTo);
  }

  const [total, items] = await Promise.all([
    prisma.activityLog.count({ where }),
    prisma.activityLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      skip,
      take: safeLimit,
    }),
  ]);

  return { total, page: safePage, limit: safeLimit, items };
};

module.exports = { createLog, getLogs };
