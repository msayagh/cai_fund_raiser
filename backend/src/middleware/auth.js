'use strict';

const prisma = require('../db/client');
const { verifyAccessToken } = require('../utils/jwt');
const AppError = require('../utils/AppError');

const extractBearer = (req) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    throw new AppError('No token provided', 401, 'UNAUTHORIZED');
  }
  return auth.slice(7);
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

module.exports = { requireDonor, requireAdmin };
