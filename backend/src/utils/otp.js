'use strict';

const crypto = require('crypto');

const OTP_EXPIRY_MINUTES = 10;

/** Generates a random 6-digit OTP string. */
const generateOtp = () => String(crypto.randomInt(100000, 999999));

/** Returns SHA-256 hex hash of the OTP code. */
const hashOtp = (code) => crypto.createHash('sha256').update(code).digest('hex');

/**
 * Constant-time comparison of an OTP code against its stored hash.
 * Returns true if they match.
 */
const verifyOtp = (code, storedHash) => {
  const inputHash = hashOtp(code);
  const a = Buffer.from(inputHash, 'hex');
  const b = Buffer.from(storedHash, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
};

/** Returns a Date that is OTP_EXPIRY_MINUTES from now. */
const otpExpiresAt = () => new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

module.exports = { generateOtp, hashOtp, verifyOtp, otpExpiresAt };
