'use strict';

const crypto = require('crypto');
const prisma = require('../../db/client');
const AppError = require('../../utils/AppError');
const { createLog } = require('../logs/logs.service');

const SECRET_PREFIX = 'cza_';

const generateApiKeyValue = () => {
  const secret = crypto.randomBytes(24).toString('hex');
  return `${SECRET_PREFIX}${secret}`;
};

const hashApiKey = (value) => crypto.createHash('sha256').update(value).digest('hex');

const findActiveApiKeyByValue = async (value) => {
  const keyHash = hashApiKey(value);
  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash },
    include: {
      createdByAdmin: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  if (!apiKey || !apiKey.isActive) {
    return null;
  }

  await prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  });

  return apiKey;
};

const serializeApiKey = (apiKey) => ({
  id: apiKey.id,
  title: apiKey.title,
  keyPrefix: apiKey.keyPrefix,
  isActive: apiKey.isActive,
  lastUsedAt: apiKey.lastUsedAt,
  createdAt: apiKey.createdAt,
  updatedAt: apiKey.updatedAt,
  createdByAdminId: apiKey.createdByAdminId,
  createdByAdmin: apiKey.createdByAdmin ? {
    id: apiKey.createdByAdmin.id,
    name: apiKey.createdByAdmin.name,
    email: apiKey.createdByAdmin.email,
  } : null,
});

const listApiKeys = async () => {
  const items = await prisma.apiKey.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      createdByAdmin: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  return items.map(serializeApiKey);
};

const createApiKey = async (adminId, adminName, { title }) => {
  const value = generateApiKeyValue();
  const keyPrefix = `${value.slice(0, 12)}...`;
  const keyHash = hashApiKey(value);

  const apiKey = await prisma.apiKey.create({
    data: {
      title,
      keyPrefix,
      keyHash,
      createdByAdminId: adminId,
    },
    include: {
      createdByAdmin: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  await createLog({
    actor: `Admin: ${adminName}`,
    actorType: 'admin',
    actorId: adminId,
    action: 'api_key_created',
    details: `API key created: ${title} (${keyPrefix})`,
    adminId,
  });

  return {
    apiKey: serializeApiKey(apiKey),
    generatedKey: value,
  };
};

const updateApiKey = async (adminId, adminName, id, updates) => {
  const existing = await prisma.apiKey.findUnique({ where: { id } });
  if (!existing) throw new AppError('API key not found', 404, 'NOT_FOUND');

  const data = {};
  if (updates.title !== undefined) data.title = updates.title;
  if (updates.isActive !== undefined) data.isActive = updates.isActive;

  const updated = await prisma.apiKey.update({
    where: { id },
    data,
    include: {
      createdByAdmin: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  await createLog({
    actor: `Admin: ${adminName}`,
    actorType: 'admin',
    actorId: adminId,
    action: 'api_key_updated',
    details: `API key updated: ${updated.title} (${updated.keyPrefix})`,
    adminId,
  });

  return serializeApiKey(updated);
};

const deleteApiKey = async (adminId, adminName, id) => {
  const existing = await prisma.apiKey.findUnique({ where: { id } });
  if (!existing) throw new AppError('API key not found', 404, 'NOT_FOUND');

  await prisma.apiKey.delete({ where: { id } });

  await createLog({
    actor: `Admin: ${adminName}`,
    actorType: 'admin',
    actorId: adminId,
    action: 'api_key_deleted',
    details: `API key deleted: ${existing.title} (${existing.keyPrefix})`,
    adminId,
  });
};

module.exports = {
  findActiveApiKeyByValue,
  listApiKeys,
  createApiKey,
  updateApiKey,
  deleteApiKey,
};
