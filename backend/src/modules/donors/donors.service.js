'use strict';

const bcrypt = require('bcryptjs');
const prisma = require('../../db/client');
const AppError = require('../../utils/AppError');
const { createLog } = require('../logs/logs.service');

const BCRYPT_ROUNDS = 12;

const stripPassword = ({ passwordHash, ...rest }) => rest;

// ─── Self-service ─────────────────────────────────────────────────────────────

const getMe = async (donorId) => {
  const donor = await prisma.donor.findUnique({
    where: { id: donorId },
    include: { engagement: true },
  });
  return stripPassword(donor);
};

const updateMe = async (donorId, { name, email }) => {
  if (email) {
    const existing = await prisma.donor.findFirst({ where: { email, NOT: { id: donorId } } });
    if (existing) throw new AppError('Email already in use', 409, 'EMAIL_TAKEN');
  }
  const donor = await prisma.donor.update({
    where: { id: donorId },
    data: { ...(name && { name }), ...(email && { email }) },
  });

  await createLog({
    actor: `Donor: ${donor.name}`,
    actorType: 'donor',
    actorId: donorId,
    action: 'donor_profile_updated',
    details: `Profile updated`,
    donorId,
  });

  return stripPassword(donor);
};

const updateMyPassword = async (donorId, { currentPassword, newPassword }) => {
  const donor = await prisma.donor.findUnique({ where: { id: donorId } });
  const valid = await bcrypt.compare(currentPassword, donor.passwordHash);
  if (!valid) throw new AppError('Current password is incorrect', 400, 'INVALID_PASSWORD');

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await prisma.donor.update({ where: { id: donorId }, data: { passwordHash } });

  await createLog({
    actor: `Donor: ${donor.name}`,
    actorType: 'donor',
    actorId: donorId,
    action: 'donor_password_changed',
    details: 'Password changed',
    donorId,
  });
};

const getMyEngagement = async (donorId) => {
  const engagement = await prisma.engagement.findUnique({ where: { donorId } });
  if (!engagement) throw new AppError('No engagement found', 404, 'NOT_FOUND');
  return engagement;
};

const createEngagement = async (donorId, { totalPledge, startDate, endDate }) => {
  const existing = await prisma.engagement.findUnique({ where: { donorId } });
  if (existing) throw new AppError('Engagement already exists. Use PUT to update.', 409, 'CONFLICT');

  const engagement = await prisma.engagement.create({
    data: {
      donorId,
      totalPledge,
      startDate: startDate ? new Date(startDate) : new Date(),
      endDate: endDate ? new Date(endDate) : null,
    },
  });

  const donor = await prisma.donor.findUnique({ where: { id: donorId } });
  await createLog({
    actor: `Donor: ${donor.name}`,
    actorType: 'donor',
    actorId: donorId,
    action: 'engagement_created',
    details: `Engagement created with pledge $${totalPledge}`,
    donorId,
  });

  return engagement;
};

const updateEngagement = async (donorId, { totalPledge, endDate }) => {
  const existing = await prisma.engagement.findUnique({ where: { donorId } });
  if (!existing) throw new AppError('No engagement found', 404, 'NOT_FOUND');

  const updated = await prisma.engagement.update({
    where: { donorId },
    data: {
      ...(totalPledge !== undefined && { totalPledge }),
      ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
    },
  });

  const donor = await prisma.donor.findUnique({ where: { id: donorId } });
  await createLog({
    actor: `Donor: ${donor.name}`,
    actorType: 'donor',
    actorId: donorId,
    action: 'engagement_updated',
    details: 'Engagement updated',
    donorId,
  });

  return updated;
};

const getMyPayments = async (donorId) => {
  return prisma.payment.findMany({
    where: { donorId },
    orderBy: { date: 'desc' },
    include: { recordedByAdmin: { select: { id: true, name: true } } },
  });
};

const getMyRequests = async (donorId) => {
  return prisma.request.findMany({
    where: { donorId },
    orderBy: { createdAt: 'desc' },
    include: { attachments: true },
  });
};

// ─── Admin donor management ───────────────────────────────────────────────────

const listDonors = async ({ search, sortBy = 'createdAt', sortDir = 'desc', page = 1, limit = 20 } = {}) => {
  const safeLimit = Math.min(Number(limit) || 20, 100);
  const safePage = Math.max(Number(page) || 1, 1);
  const skip = (safePage - 1) * safeLimit;

  const allowedSort = ['name', 'email', 'createdAt'];
  const orderField = allowedSort.includes(sortBy) ? sortBy : 'createdAt';
  const orderDir = sortDir === 'asc' ? 'asc' : 'desc';

  const where = search
    ? { OR: [{ name: { contains: search } }, { email: { contains: search } }] }
    : {};

  const [total, donors] = await Promise.all([
    prisma.donor.count({ where }),
    prisma.donor.findMany({
      where,
      orderBy: { [orderField]: orderDir },
      skip,
      take: safeLimit,
      include: {
        engagement: true,
        payments: { select: { amount: true } },
        _count: { select: { payments: true } },
      },
    }),
  ]);

  return {
    total,
    page: safePage,
    limit: safeLimit,
    items: donors.map(({ passwordHash, payments, ...d }) => ({
      ...d,
      paidAmount: payments.reduce((s, p) => s + p.amount, 0),
    })),
  };
};

const getDonorById = async (id) => {
  const donor = await prisma.donor.findUnique({
    where: { id },
    include: {
      engagement: true,
      payments: {
        orderBy: { date: 'desc' },
        include: { recordedByAdmin: { select: { id: true, name: true } } },
      },
      requests: { orderBy: { createdAt: 'desc' }, include: { attachments: true } },
      _count: { select: { payments: true } },
    },
  });
  if (!donor) throw new AppError('Donor not found', 404, 'NOT_FOUND');
  const { passwordHash, ...rest } = donor;
  return rest;
};

const adminUpdateDonor = async (adminId, adminName, id, { name, email }) => {
  const donor = await prisma.donor.findUnique({ where: { id } });
  if (!donor) throw new AppError('Donor not found', 404, 'NOT_FOUND');

  if (email && email !== donor.email) {
    const conflict = await prisma.donor.findFirst({ where: { email, NOT: { id } } });
    if (conflict) throw new AppError('Email already in use', 409, 'EMAIL_TAKEN');
  }

  const updated = await prisma.donor.update({
    where: { id },
    data: { ...(name && { name }), ...(email && { email }) },
  });

  await createLog({
    actor: `Admin: ${adminName}`,
    actorType: 'admin',
    actorId: adminId,
    action: 'admin_donor_updated',
    details: `Admin updated donor profile for ${updated.email}`,
    donorId: id,
    adminId,
  });

  return stripPassword(updated);
};

const adminDeleteDonor = async (adminId, adminName, id) => {
  const donor = await prisma.donor.findUnique({ where: { id } });
  if (!donor) throw new AppError('Donor not found', 404, 'NOT_FOUND');

  await prisma.donor.delete({ where: { id } });

  await createLog({
    actor: `Admin: ${adminName}`,
    actorType: 'admin',
    actorId: adminId,
    action: 'admin_donor_deleted',
    details: `Admin deleted donor: ${donor.email}`,
    adminId,
  });
};

const adminUpdateDonorPassword = async (adminId, adminName, donorId, newPassword) => {
  const donor = await prisma.donor.findUnique({ where: { id: donorId } });
  if (!donor) throw new AppError('Donor not found', 404, 'NOT_FOUND');

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await prisma.donor.update({ where: { id: donorId }, data: { passwordHash } });

  await createLog({
    actor: `Admin: ${adminName}`,
    actorType: 'admin',
    actorId: adminId,
    action: 'admin_donor_password_changed',
    details: `Admin changed password for donor: ${donor.email}`,
    donorId,
    adminId,
  });
};

const adminAddPayment = async (adminId, adminName, donorId, { amount, date, method, note }) => {
  const donor = await prisma.donor.findUnique({ where: { id: donorId } });
  if (!donor) throw new AppError('Donor not found', 404, 'NOT_FOUND');

  const payment = await prisma.payment.create({
    data: {
      donorId,
      amount,
      date: new Date(date),
      method,
      note: note ?? null,
      recordedByAdminId: adminId,
    },
    include: { recordedByAdmin: { select: { id: true, name: true } } },
  });

  await createLog({
    actor: `Admin: ${adminName}`,
    actorType: 'admin',
    actorId: adminId,
    action: 'payment_recorded',
    details: `Payment of $${amount} recorded for donor: ${donor.email} via ${method}`,
    donorId,
    adminId,
  });

  return payment;
};

const adminCreateDonor = async (adminId, adminName, { name, email, password, pledgeAmount }) => {
  const existing = await prisma.donor.findUnique({ where: { email } });
  if (existing) throw new AppError('Email already in use', 409, 'EMAIL_TAKEN');

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const donor = await prisma.donor.create({
    data: {
      name,
      email,
      passwordHash,
      ...(pledgeAmount && {
        engagement: {
          create: {
            totalPledge: pledgeAmount,
            startDate: new Date(),
          },
        },
      }),
    },
    include: { engagement: true },
  });

  await createLog({
    actor: `Admin: ${adminName}`,
    actorType: 'admin',
    actorId: adminId,
    action: 'admin_donor_created',
    details: `Admin created donor account for ${email}`,
    donorId: donor.id,
    adminId,
  });

  return stripPassword(donor);
};

module.exports = {
  getMe,
  updateMe,
  updateMyPassword,
  getMyEngagement,
  createEngagement,
  updateEngagement,
  getMyPayments,
  getMyRequests,
  listDonors,
  getDonorById,
  adminUpdateDonor,
  adminDeleteDonor,
  adminUpdateDonorPassword,
  adminAddPayment,
  adminCreateDonor,
};
