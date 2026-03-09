'use strict';

const bcrypt = require('bcryptjs');
const prisma = require('../../db/client');
const AppError = require('../../utils/AppError');
const { createLog } = require('../logs/logs.service');

const BCRYPT_ROUNDS = 12;
const stripPassword = ({ passwordHash, ...rest }) => rest;

const listAdmins = async () => {
  const admins = await prisma.admin.findMany({
    orderBy: { createdAt: 'asc' },
    include: { addedBy: { select: { id: true, name: true } } },
  });
  return admins.map(stripPassword);
};

const createAdmin = async (requestingAdminId, requestingAdminName, { name, email, password }) => {
  const existing = await prisma.admin.findUnique({ where: { email } });
  if (existing) throw new AppError('Email already in use', 409, 'EMAIL_TAKEN');

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const admin = await prisma.admin.create({
    data: { name, email, passwordHash, addedById: requestingAdminId },
  });

  await createLog({
    actor: `Admin: ${requestingAdminName}`,
    actorType: 'admin',
    actorId: requestingAdminId,
    action: 'admin_created',
    details: `Admin account created for ${email}`,
    adminId: requestingAdminId,
  });

  return stripPassword(admin);
};

const updateAdmin = async (requestingAdminId, requestingAdminName, id, { name, email, password }) => {
  const admin = await prisma.admin.findUnique({ where: { id } });
  if (!admin) throw new AppError('Admin not found', 404, 'NOT_FOUND');

  if (email && email !== admin.email) {
    const conflict = await prisma.admin.findFirst({ where: { email, NOT: { id } } });
    if (conflict) throw new AppError('Email already in use', 409, 'EMAIL_TAKEN');
  }

  const updateData = {};
  if (name) updateData.name = name;
  if (email) updateData.email = email;
  if (password) updateData.passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const updated = await prisma.admin.update({ where: { id }, data: updateData });

  await createLog({
    actor: `Admin: ${requestingAdminName}`,
    actorType: 'admin',
    actorId: requestingAdminId,
    action: 'admin_updated',
    details: `Admin profile updated for ${updated.email}`,
    adminId: requestingAdminId,
  });

  return stripPassword(updated);
};

const deleteAdmin = async (requestingAdminId, requestingAdminName, id) => {
  if (requestingAdminId === id) {
    throw new AppError('You cannot delete your own account', 400, 'SELF_DELETE');
  }
  const admin = await prisma.admin.findUnique({ where: { id } });
  if (!admin) throw new AppError('Admin not found', 404, 'NOT_FOUND');

  await prisma.admin.delete({ where: { id } });

  await createLog({
    actor: `Admin: ${requestingAdminName}`,
    actorType: 'admin',
    actorId: requestingAdminId,
    action: 'admin_deleted',
    details: `Admin account deleted: ${admin.email}`,
    adminId: requestingAdminId,
  });
};

module.exports = { listAdmins, createAdmin, updateAdmin, deleteAdmin };
