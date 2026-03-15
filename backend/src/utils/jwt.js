'use strict';

const jwt = require('jsonwebtoken');
const { randomUUID } = require('crypto');
const config = require('../config/env');
const AppError = require('./AppError');

/**
 * Signs an access token (15 min).
 * @param {{ sub: string, type: 'donor' | 'admin' }} payload
 */
const signAccessToken = (payload) =>
  jwt.sign(payload, config.JWT_ACCESS_SECRET, { expiresIn: '15m' });

/**
 * Signs a refresh token (7 days).
 * @param {{ sub: string, type: 'donor' | 'admin' }} payload
 */
const signRefreshToken = (payload) =>
  jwt.sign(payload, config.JWT_REFRESH_SECRET, { expiresIn: '7d', jwtid: randomUUID() });

/**
 * Verifies an access token. Throws AppError 401 on failure.
 */
const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, config.JWT_ACCESS_SECRET);
  } catch (err) {
    throw new AppError('Invalid or expired access token', 401, 'UNAUTHORIZED');
  }
};

/**
 * Verifies a refresh token. Throws AppError 401 on failure.
 */
const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, config.JWT_REFRESH_SECRET);
  } catch (err) {
    throw new AppError('Invalid or expired refresh token', 401, 'UNAUTHORIZED');
  }
};

module.exports = { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken };
