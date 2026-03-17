'use strict';

const prisma = require('../db/client');
const { verifyAccessToken } = require('../utils/jwt');
const AppError = require('../utils/AppError');
const { findActiveApiKeyByValue } = require('../modules/apiKeys/apiKeys.service');

const extractBearer = (req) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    throw new AppError('No token provided', 401, 'UNAUTHORIZED');
  }
  return auth.slice(7);
};

const extractApiKey = (req) => {
  const headerKey = req.headers['x-api-key'];
  if (headerKey) {
    return String(headerKey).trim();
  }

  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return null;
  }

  const token = auth.slice(7).trim();
  return token.startsWith('cza_') ? token : null;
};

const requireDonor = async (req, res, next) => {
  try {
    const token = extractBearer(req);
    const payload = verifyAccessToken(token);

    if (payload.type !== 'donor') {
      throw new AppError('Access denied', 403, 'FORBIDDEN');
    }

    const donor = await prisma.donor.findUnique({ where: { id: payload.sub } });
    if (!donor) throw new AppError('Donor not found', 401, 'UNAUTHORIZED');
    if (!donor.accountCreated) throw new AppError('Donor not found', 401, 'UNAUTHORIZED');

    req.donor = donor;
    next();
  } catch (err) {
    next(err);
  }
};

const requireAdmin = async (req, res, next) => {
  try {
    const token = extractBearer(req);
    const payload = verifyAccessToken(token);

    if (payload.type !== 'admin') {
      throw new AppError('Access denied', 403, 'FORBIDDEN');
    }

    const admin = await prisma.admin.findUnique({ where: { id: payload.sub } });
    if (!admin) throw new AppError('Admin not found', 401, 'UNAUTHORIZED');

    req.admin = admin;
    next();
  } catch (err) {
    next(err);
  }
};

const requireApiKey = async (req, res, next) => {
  try {
    const token = extractApiKey(req);
    if (!token) {
      throw new AppError('No API key provided', 401, 'UNAUTHORIZED');
    }

    const apiKey = await findActiveApiKeyByValue(token);
    if (!apiKey) {
      throw new AppError('Invalid API key', 401, 'UNAUTHORIZED');
    }

    req.apiKey = apiKey;
    next();
  } catch (err) {
    next(err);
  }
};

const requireAdminOrApiKey = async (req, res, next) => {
  const apiKey = extractApiKey(req);
  if (apiKey) {
    return requireApiKey(req, res, next);
  }

  return requireAdmin(req, res, next);
};

module.exports = { requireDonor, requireAdmin, requireApiKey, requireAdminOrApiKey };
