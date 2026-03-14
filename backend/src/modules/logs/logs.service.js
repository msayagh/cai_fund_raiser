'use strict';

const prisma = require('../../db/client');

const createLog = async ({
  actor,
  actorType,
  actorId = null,
  action,
  details,
  donorId = null,
  adminId = null,
}) => {
  return prisma.activityLog.create({
    data: {
      actor,
      actorType,
      actorId,
      action,
      details,
      donorId,
      adminId,
    },
  });
};

const listLogs = async ({ actorType, action, page = 1, limit = 50 } = {}) => {
  const safeLimit = Math.min(Number(limit) || 50, 100);
  const safePage = Math.max(Number(page) || 1, 1);
  const skip = (safePage - 1) * safeLimit;

  const where = {
    ...(actorType ? { actorType } : {}),
    ...(action ? { action } : {}),
  };

  const [total, items] = await Promise.all([
    prisma.activityLog.count({ where }),
    prisma.activityLog.findMany({
      where,
      skip,
      take: safeLimit,
      orderBy: { timestamp: 'desc' },
      include: {
        donorRef: { select: { id: true, name: true, email: true } },
        adminRef: { select: { id: true, name: true, email: true } },
      },
    }),
  ]);

  return {
    total,
    page: safePage,
    limit: safeLimit,
    items,
  };
};

module.exports = {
  createLog,
  listLogs,
};
