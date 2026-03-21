'use strict';

const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const config = require('../../config/env');
const prisma = require('../../db/client');
const AppError = require('../../utils/AppError');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../../utils/jwt');
const { generateOtp, hashOtp, verifyOtp, otpExpiresAt } = require('../../utils/otp');
const { sendOtpEmail } = require('../../utils/email');
const { createLog } = require('../logs/logs.service');

const BCRYPT_ROUNDS = 12;

// ─── Token Helpers ───────────────────────────────────────────────────────────

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const storeRefreshToken = async (token, userType, userId) => {
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  try {
    await prisma.refreshToken.create({
      data: {
        tokenHash,
        userType,
        donorId: userType === 'donor' ? userId : null,
        adminId: userType === 'admin' ? userId : null,
        expiresAt,
      },
    });
  } catch (err) {
    // Rare collision: if exactly the same refresh token was already stored,
    // keep flow successful instead of failing auth/register UX.
    if (err?.code === 'P2002') return;
    throw err;
  }
};

const buildTokenPair = (userId, type) => ({
  accessToken: signAccessToken({ sub: userId, type }),
  refreshToken: signRefreshToken({ sub: userId, type }),
});

const sanitizeNameFromEmail = (email) => email.split('@')[0].replace(/[._-]+/g, ' ').trim();
const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

/* istanbul ignore next — verifyGoogleCredential is reserved for when Google OAuth
   is re-enabled; both google login endpoints currently short-circuit before calling it */
const verifyGoogleCredential = async (credential) => {
  if (!config.GOOGLE_CLIENT_ID) {
    throw new AppError(
      'Google sign-in is not configured on the server',
      503,
      'GOOGLE_AUTH_NOT_CONFIGURED'
    );
  }

  let payload;
  try {
    const url = new URL('https://oauth2.googleapis.com/tokeninfo');
    url.searchParams.set('id_token', credential);

    const res = await fetch(url);
    payload = await res.json();

    if (!res.ok) {
      throw new AppError('Invalid Google credential', 401, 'GOOGLE_TOKEN_INVALID');
    }
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError('Failed to validate Google credential', 502, 'GOOGLE_VALIDATION_FAILED');
  }

  if (payload.aud !== config.GOOGLE_CLIENT_ID) {
    throw new AppError('Google credential audience mismatch', 401, 'GOOGLE_AUDIENCE_MISMATCH');
  }

  if (!payload.exp || Number(payload.exp) * 1000 <= Date.now()) {
    throw new AppError('Google credential has expired', 401, 'GOOGLE_TOKEN_EXPIRED');
  }

  if (payload.email_verified !== 'true' || !payload.email) {
    throw new AppError('Google account email is not verified', 401, 'GOOGLE_EMAIL_NOT_VERIFIED');
  }

  const name = payload.name?.trim() || payload.given_name?.trim() || sanitizeNameFromEmail(payload.email);
  return { email: payload.email.toLowerCase(), name };
};

// ─── OTP Helpers ──────────────────────────────────────────────────────────────

const invalidatePreviousOtps = async (email) => {
  await prisma.otpCode.updateMany({
    where: { email, used: false },
    data: { used: true },
  });
};

const sendAndStoreOtp = async (email, purpose) => {
  const otp = generateOtp();
  const codeHash = hashOtp(otp);
  const expiresAt = otpExpiresAt();

  await invalidatePreviousOtps(email);
  await prisma.otpCode.create({ data: { email, codeHash, expiresAt } });
  await sendOtpEmail(email, otp, purpose);
};

const validateOtp = async (email, code) => {
  const record = await prisma.otpCode.findFirst({
    where: { email, used: false },
    orderBy: { createdAt: 'desc' },
  });

  if (!record) throw new AppError('No OTP found for this email', 400, 'INVALID_OTP');
  if (record.expiresAt < new Date()) throw new AppError('OTP has expired', 400, 'OTP_EXPIRED');
  if (!verifyOtp(code, record.codeHash)) throw new AppError('Invalid OTP code', 400, 'INVALID_OTP');

  await prisma.otpCode.update({ where: { id: record.id }, data: { used: true } });
  return record;
};

// ─── Donor Auth ───────────────────────────────────────────────────────────────

const donorLogin = async (email, password) => {
  const normalizedEmail = normalizeEmail(email);
  const donor = await prisma.donor.findUnique({ where: { email: normalizedEmail } });
  if (!donor) throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  if (!donor.accountCreated) {
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  const valid = await bcrypt.compare(password, donor.passwordHash);
  if (!valid) throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');

  const tokens = buildTokenPair(donor.id, 'donor');
  await storeRefreshToken(tokens.refreshToken, 'donor', donor.id);

  await createLog({
    actor: `Donor: ${donor.name}`,
    actorType: 'donor',
    actorId: donor.id,
    action: 'donor_login',
    details: `Donor logged in`,
    donorId: donor.id,
  });

  const { passwordHash, ...safedonor } = donor;
  return { tokens, donor: safedonor };
};

const donorGoogleLogin = async (credential) => {
  void credential;
  throw new AppError('Google sign-in is disabled', 503, 'GOOGLE_AUTH_DISABLED');
};

const donorSendOtp = async (email) => {
  const normalizedEmail = normalizeEmail(email);
  const existing = await prisma.donor.findUnique({ where: { email: normalizedEmail } });
  if (existing?.accountCreated) {
    throw new AppError('An account with this email already exists', 409, 'EMAIL_TAKEN');
  }
  await sendAndStoreOtp(normalizedEmail, 'verification');
};

const donorVerifyOtp = async (email, code) => {
  const normalizedEmail = normalizeEmail(email);
  await validateOtp(normalizedEmail, code);
  return { verified: true };
};

const donorCompleteRegistration = async ({ email, name, password, pledge, payments }) => {
  const normalizedEmail = normalizeEmail(email);

  // Ensure OTP was verified (last OTP for email must be used=true)
  const lastOtp = await prisma.otpCode.findFirst({
    where: { email: normalizedEmail },
    orderBy: { createdAt: 'desc' },
  });
  if (!lastOtp || !lastOtp.used) {
    throw new AppError('Email not verified. Please complete OTP verification first.', 400, 'EMAIL_NOT_VERIFIED');
  }

  const existing = await prisma.donor.findUnique({
    where: { email: normalizedEmail },
    include: { engagement: true },
  });
  if (existing?.accountCreated) {
    throw new AppError('An account with this email already exists', 409, 'EMAIL_TAKEN');
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  if (existing) {
    const donor = await prisma.$transaction(async (tx) => {
      const updatedDonor = await tx.donor.update({
        where: { id: existing.id },
        data: {
          name,
          passwordHash,
          accountCreated: true,
        },
      });

      if (pledge && !existing.engagement) {
        await tx.engagement.create({
          data: {
            donorId: existing.id,
            totalPledge: pledge.totalPledge,
            startDate: new Date(),
            endDate: pledge.endDate ? new Date(pledge.endDate) : null,
          },
        });
      }

      return updatedDonor;
    });

    const tokens = buildTokenPair(donor.id, 'donor');
    await storeRefreshToken(tokens.refreshToken, 'donor', donor.id);

    await createLog({
      actor: `Donor: ${donor.name}`,
      actorType: 'donor',
      actorId: donor.id,
      action: 'donor_account_activated',
      details: `Placeholder donor account activated: ${donor.email}`,
      donorId: donor.id,
    });

    const { passwordHash: _ph, ...safeDonor } = donor;
    return { tokens, donor: safeDonor };
  }

  const donor = await prisma.donor.create({
    data: {
      name,
      email: normalizedEmail,
      passwordHash,
      accountCreated: true,
      ...(pledge && {
        engagement: {
          create: {
            totalPledge: pledge.totalPledge,
            startDate: new Date(),
            endDate: pledge.endDate ? new Date(pledge.endDate) : null,
          },
        },
      }),
      ...(payments?.length && {
        payments: {
          create: payments.map((p) => ({
            amount: p.amount,
            date: new Date(p.date),
            method: p.method,
            note: p.note ?? null,
          })),
        },
      }),
    },
  });

  const tokens = buildTokenPair(donor.id, 'donor');
  await storeRefreshToken(tokens.refreshToken, 'donor', donor.id);

  await createLog({
    actor: `Donor: ${donor.name}`,
    actorType: 'donor',
    actorId: donor.id,
    action: 'donor_registered',
    details: `New donor registered: ${donor.email}`,
    donorId: donor.id,
  });

  const { passwordHash: _ph, ...safeDonor } = donor;
  return { tokens, donor: safeDonor };
};

const donorSendForgotOtp = async (email) => {
  const normalizedEmail = normalizeEmail(email);
  const donor = await prisma.donor.findUnique({ where: { email: normalizedEmail } });
  if (!donor || !donor.accountCreated) {
    throw new AppError('No account exists with this email', 404, 'ACCOUNT_NOT_FOUND');
  }
  await sendAndStoreOtp(normalizedEmail, 'reset');
};

const donorVerifyForgotOtp = async (email, code) => {
  const normalizedEmail = normalizeEmail(email);
  const donor = await prisma.donor.findUnique({ where: { email: normalizedEmail } });
  if (!donor || !donor.accountCreated) {
    throw new AppError('No account exists with this email', 404, 'ACCOUNT_NOT_FOUND');
  }
  await validateOtp(normalizedEmail, code);
  return { verified: true };
};

const donorResetPassword = async (email, code, newPassword) => {
  const normalizedEmail = normalizeEmail(email);
  const donor = await prisma.donor.findUnique({ where: { email: normalizedEmail } });
  if (!donor || !donor.accountCreated) {
    throw new AppError('No account exists with this email', 404, 'ACCOUNT_NOT_FOUND');
  }

  // Re-validate the exact OTP code used in the previous step.
  const lastOtp = await prisma.otpCode.findFirst({
    where: { email: normalizedEmail, used: true },
    orderBy: { createdAt: 'desc' },
  });
  if (!lastOtp || !verifyOtp(code, lastOtp.codeHash)) {
    throw new AppError('OTP not verified', 400, 'OTP_NOT_VERIFIED');
  }

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await prisma.donor.update({ where: { email: normalizedEmail }, data: { passwordHash } });

  await createLog({
    actor: `Donor: ${donor.name}`,
    actorType: 'donor',
    actorId: donor.id,
    action: 'donor_password_reset',
    details: `Password reset for ${normalizedEmail}`,
    donorId: donor.id,
  });
};

// ─── Admin Auth ───────────────────────────────────────────────────────────────

const getAdminSetupStatus = async () => {
  const adminCount = await prisma.admin.count();
  return {
    adminExists: adminCount > 0,
    adminCount,
  };
};

const bootstrapInitialAdmin = async ({ name, email, password }) => {
  const normalizedEmail = normalizeEmail(email);
  const adminCount = await prisma.admin.count();
  if (adminCount > 0) {
    throw new AppError('Initial admin setup is already completed', 409, 'BOOTSTRAP_CLOSED');
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const admin = await prisma.admin.create({
    data: {
      name,
      email: normalizedEmail,
      passwordHash,
    },
  });

  const tokens = buildTokenPair(admin.id, 'admin');
  await storeRefreshToken(tokens.refreshToken, 'admin', admin.id);

  await createLog({
    actor: 'System',
    actorType: 'system',
    action: 'admin_bootstrap',
    details: `Initial admin account created: ${normalizedEmail}`,
    adminId: admin.id,
  });

  const { passwordHash: _ph, ...safeAdmin } = admin;
  return { tokens, admin: safeAdmin };
};

const adminLogin = async (email, password) => {
  const normalizedEmail = normalizeEmail(email);
  const admin = await prisma.admin.findUnique({ where: { email: normalizedEmail } });
  if (!admin) throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');

  const valid = await bcrypt.compare(password, admin.passwordHash);
  if (!valid) throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');

  const tokens = buildTokenPair(admin.id, 'admin');
  await storeRefreshToken(tokens.refreshToken, 'admin', admin.id);

  await createLog({
    actor: `Admin: ${admin.name}`,
    actorType: 'admin',
    actorId: admin.id,
    action: 'admin_login',
    details: `Admin logged in`,
    adminId: admin.id,
  });

  const { passwordHash, ...safeAdmin } = admin;
  return { tokens, admin: safeAdmin };
};

const adminGoogleLogin = async (credential) => {
  void credential;
  throw new AppError('Google sign-in is disabled', 503, 'GOOGLE_AUTH_DISABLED');
};

const adminSendForgotOtp = async (email) => {
  const normalizedEmail = normalizeEmail(email);
  const admin = await prisma.admin.findUnique({ where: { email: normalizedEmail } });
  if (!admin) {
    throw new AppError('No admin account exists with this email address', 404, 'ADMIN_ACCOUNT_NOT_FOUND');
  }
  await sendAndStoreOtp(normalizedEmail, 'reset');
};

const adminVerifyForgotOtp = async (email, code) => {
  const normalizedEmail = normalizeEmail(email);
  const admin = await prisma.admin.findUnique({ where: { email: normalizedEmail } });
  if (!admin) throw new AppError('Invalid email', 400, 'INVALID_EMAIL');
  await validateOtp(normalizedEmail, code);
  return { verified: true };
};

const adminResetPassword = async (email, code, newPassword) => {
  const normalizedEmail = normalizeEmail(email);
  const admin = await prisma.admin.findUnique({ where: { email: normalizedEmail } });
  if (!admin) throw new AppError('Invalid email', 400, 'INVALID_EMAIL');

  const lastOtp = await prisma.otpCode.findFirst({
    where: { email: normalizedEmail, used: true },
    orderBy: { createdAt: 'desc' },
  });
  if (!lastOtp || !verifyOtp(code, lastOtp.codeHash)) {
    throw new AppError('OTP not verified', 400, 'OTP_NOT_VERIFIED');
  }

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await prisma.admin.update({ where: { email: normalizedEmail }, data: { passwordHash } });

  await createLog({
    actor: `Admin: ${admin.name}`,
    actorType: 'admin',
    actorId: admin.id,
    action: 'admin_password_reset',
    details: `Password reset for ${normalizedEmail}`,
    adminId: admin.id,
  });
};

// ─── Token Rotation ───────────────────────────────────────────────────────────

const refreshTokens = async (token) => {
  const payload = verifyRefreshToken(token);
  const tokenHash = hashToken(token);

  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });
  if (!stored || stored.expiresAt < new Date()) {
    throw new AppError('Refresh token invalid or expired', 401, 'UNAUTHORIZED');
  }

  // Delete used token
  await prisma.refreshToken.delete({ where: { tokenHash } });

  const newTokens = buildTokenPair(payload.sub, payload.type);
  await storeRefreshToken(newTokens.refreshToken, payload.type, payload.sub);

  return newTokens;
};

const logout = async (token) => {
  const tokenHash = hashToken(token);
  await prisma.refreshToken.deleteMany({ where: { tokenHash } });
};

module.exports = {
  donorLogin,
  donorGoogleLogin,
  donorSendOtp,
  donorVerifyOtp,
  donorCompleteRegistration,
  donorSendForgotOtp,
  donorVerifyForgotOtp,
  donorResetPassword,
  getAdminSetupStatus,
  bootstrapInitialAdmin,
  adminLogin,
  adminGoogleLogin,
  adminSendForgotOtp,
  adminVerifyForgotOtp,
  adminResetPassword,
  refreshTokens,
  logout,
};
