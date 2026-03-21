'use strict';

// ─── Test Suite: auth.service ─────────────────────────────────────────────────
// auth.service covers every authentication flow in the application:
//   Donor flows  : login, OTP registration, forgot-password OTP, reset password
//   Admin flows  : bootstrap (first admin), login
//   Shared flows : token refresh, logout
//
// All external dependencies are mocked:
//   - prisma     → no real DB queries
//   - email util → no actual emails sent
//   - bcryptjs   → always returns a fixed hash so tests are deterministic
//   - logs.service → audit log calls are tracked but do nothing

// ── Mocks ──────────────────────────────────────────────────────────────────
// Mock every Prisma model the auth service touches
jest.mock('../../../db/client', () => ({
  donor: {
    findUnique: jest.fn(),
    create:     jest.fn(),
    update:     jest.fn(),
    count:      jest.fn(),
  },
  admin: {
    findUnique: jest.fn(),
    create:     jest.fn(),
    update:     jest.fn(),
    count:      jest.fn(),
  },
  otpCode: {
    findFirst:  jest.fn(),
    create:     jest.fn(),
    update:     jest.fn(),
    updateMany: jest.fn(),  // used to invalidate old OTPs before issuing a new one
  },
  refreshToken: {
    create:     jest.fn(),
    findUnique: jest.fn(),
    delete:     jest.fn(),
    deleteMany: jest.fn(),  // used by logout to remove all tokens for a session
  },
  engagement: { create: jest.fn() },   // used in donorCompleteRegistration
  $transaction: jest.fn(),              // prisma transaction for placeholder-to-account upgrade
  activityLog: { create: jest.fn() },
}));

// Prevent real OTP emails from being sent during tests
jest.mock('../../../utils/email', () => ({ sendOtpEmail: jest.fn().mockResolvedValue(undefined) }));
// Prevent audit log DB writes
jest.mock('../../../modules/logs/logs.service', () => ({ createLog: jest.fn().mockResolvedValue(undefined) }));
// bcrypt.hash always returns '$hashed'; bcrypt.compare returns whatever the test sets
jest.mock('bcryptjs', () => ({
  hash:    jest.fn().mockResolvedValue('$hashed'),
  compare: jest.fn(),
}));

// ── Imports ────────────────────────────────────────────────────────────────
const bcrypt = require('bcryptjs');
const prisma = require('../../../db/client');
const AppError = require('../../../utils/AppError');
const {
  donorLogin,
  donorGoogleLogin,
  donorSendOtp,
  donorVerifyOtp,
  donorCompleteRegistration,
  donorSendForgotOtp,
  donorVerifyForgotOtp,
  donorResetPassword,
  bootstrapInitialAdmin,
  adminLogin,
  adminGoogleLogin,
  adminSendForgotOtp,
  adminVerifyForgotOtp,
  adminResetPassword,
  getAdminSetupStatus,
  refreshTokens,
  logout,
} = require('../../../modules/auth/auth.service');
const { hashOtp } = require('../../../utils/otp');        // SHA-256 hash of 6-digit OTP
const { signRefreshToken } = require('../../../utils/jwt'); // for refresh-token rotation tests

// ─── Helpers ─────────────────────────────────────────────────────────────────
// Factory that builds a minimal donor DB row — tests override only what they need
const stubDonor = (overrides = {}) => ({
  id: 'donor-1',
  name: 'Alice',
  email: 'alice@test.com',
  passwordHash: '$hashed',
  accountCreated: true,   // true = full portal account, false = placeholder
  ...overrides,
});

// Factory for a minimal admin DB row
const stubAdmin = (overrides = {}) => ({
  id: 'admin-1',
  name: 'Bob',
  email: 'bob@test.com',
  passwordHash: '$hashed',
  ...overrides,
});

// ─── donorLogin ──────────────────────────────────────────────────────────────
// donorLogin(email, password) → { tokens: { accessToken, refreshToken }, donor }
// The returned donor must NOT include passwordHash (security: never expose hashes)

describe('donorLogin', () => {
  beforeEach(() => {
    // Every login creates a refresh token DB row and an audit log entry
    prisma.refreshToken.create.mockResolvedValue({});
    prisma.activityLog.create.mockResolvedValue({});
  });

  it('returns tokens and donor (without passwordHash) on success', async () => {
    prisma.donor.findUnique.mockResolvedValue(stubDonor());
    bcrypt.compare.mockResolvedValue(true);  // password matches

    const result = await donorLogin('alice@test.com', 'correctPassword');

    expect(result).toHaveProperty('tokens.accessToken');
    expect(result).toHaveProperty('tokens.refreshToken');
    // passwordHash must be stripped before returning — never expose it to clients
    expect(result.donor).not.toHaveProperty('passwordHash');
    expect(result.donor.email).toBe('alice@test.com');
  });

  it('normalizes email to lowercase before lookup', async () => {
    // Emails are case-insensitive; we normalize before querying so "ALICE@" finds "alice@"
    prisma.donor.findUnique.mockResolvedValue(stubDonor());
    bcrypt.compare.mockResolvedValue(true);

    await donorLogin('ALICE@TEST.COM', 'pw');
    expect(prisma.donor.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: 'alice@test.com' } })
    );
  });

  it('throws INVALID_CREDENTIALS when donor not found', async () => {
    // We return the same error code for "not found" and "wrong password" on purpose
    // (avoids user enumeration — attacker can't tell if the email exists)
    prisma.donor.findUnique.mockResolvedValue(null);
    await expect(donorLogin('none@test.com', 'pw')).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
      statusCode: 401,
    });
  });

  it('throws INVALID_CREDENTIALS when accountCreated is false', async () => {
    // Placeholder donors don't have a portal password — treat as non-existent
    prisma.donor.findUnique.mockResolvedValue(stubDonor({ accountCreated: false }));
    await expect(donorLogin('alice@test.com', 'pw')).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
    });
  });

  it('throws INVALID_CREDENTIALS on wrong password', async () => {
    prisma.donor.findUnique.mockResolvedValue(stubDonor());
    bcrypt.compare.mockResolvedValue(false); // bcrypt says passwords don't match
    await expect(donorLogin('alice@test.com', 'wrong')).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
      statusCode: 401,
    });
  });
});

// ─── donorSendOtp ─────────────────────────────────────────────────────────────
// donorSendOtp(email) — Step 1 of registration: send a 6-digit OTP to the email.
// Invalidates any previous pending OTPs for the same email before creating a new one.

describe('donorSendOtp', () => {
  it('calls sendOtpEmail and stores the OTP when no account exists', async () => {
    const { sendOtpEmail } = require('../../../utils/email');
    prisma.donor.findUnique.mockResolvedValue(null); // no existing account
    prisma.otpCode.updateMany.mockResolvedValue({});  // old OTPs invalidated
    prisma.otpCode.create.mockResolvedValue({});      // new OTP stored

    await donorSendOtp('new@test.com');
    // Email must be sent with the OTP value and 'verification' purpose label
    expect(sendOtpEmail).toHaveBeenCalledWith('new@test.com', expect.any(String), 'verification');
    // The hashed OTP must be stored in the DB (we never store plain OTPs)
    expect(prisma.otpCode.create).toHaveBeenCalledTimes(1);
  });

  it('throws EMAIL_TAKEN if an active account already exists', async () => {
    // Prevent duplicate registrations — a fully created account means the email is taken
    prisma.donor.findUnique.mockResolvedValue(stubDonor());
    await expect(donorSendOtp('alice@test.com')).rejects.toMatchObject({
      code: 'EMAIL_TAKEN',
      statusCode: 409,
    });
  });
});

// ─── donorVerifyOtp ───────────────────────────────────────────────────────────
// donorVerifyOtp(email, code) — Step 2 of registration: verify the 6-digit code.
// The OTP is stored as a SHA-256 hash so we hash the input to compare.

describe('donorVerifyOtp', () => {
  const code = '123456';

  it('returns { verified: true } on a valid, non-expired OTP', async () => {
    // The stored codeHash must equal hashOtp(code) — same SHA-256 function
    prisma.otpCode.findFirst.mockResolvedValue({
      id: 'otp-1',
      email: 'new@test.com',
      codeHash: hashOtp(code),
      expiresAt: new Date(Date.now() + 60_000), // 1 minute in the future
      used: false,
    });
    prisma.otpCode.update.mockResolvedValue({}); // mark OTP as used

    const result = await donorVerifyOtp('new@test.com', code);
    expect(result).toEqual({ verified: true });
  });

  it('throws INVALID_OTP when no OTP record found', async () => {
    // No OTP row means the user never requested one (or it was already consumed)
    prisma.otpCode.findFirst.mockResolvedValue(null);
    await expect(donorVerifyOtp('none@test.com', code)).rejects.toMatchObject({
      code: 'INVALID_OTP',
    });
  });

  it('throws OTP_EXPIRED when the otp record is past its expiry', async () => {
    prisma.otpCode.findFirst.mockResolvedValue({
      id: 'otp-2',
      codeHash: hashOtp(code),
      expiresAt: new Date(Date.now() - 1000), // 1 second in the past = expired
      used: false,
    });
    await expect(donorVerifyOtp('new@test.com', code)).rejects.toMatchObject({
      code: 'OTP_EXPIRED',
    });
  });

  it('throws INVALID_OTP when the code is wrong', async () => {
    // Hash mismatch: stored code was '654321', user submitted '000000'
    prisma.otpCode.findFirst.mockResolvedValue({
      id: 'otp-3',
      codeHash: hashOtp('654321'),
      expiresAt: new Date(Date.now() + 60_000),
      used: false,
    });
    await expect(donorVerifyOtp('new@test.com', '000000')).rejects.toMatchObject({
      code: 'INVALID_OTP',
    });
  });
});

// ─── donorSendForgotOtp ───────────────────────────────────────────────────────
// donorSendForgotOtp(email) — Step 1 of password reset: send OTP to the email.
// Unlike registration, the account MUST exist before we send a reset OTP.

describe('donorSendForgotOtp', () => {
  it('sends OTP when donor exists and accountCreated=true', async () => {
    const { sendOtpEmail } = require('../../../utils/email');
    prisma.donor.findUnique.mockResolvedValue(stubDonor());
    prisma.otpCode.updateMany.mockResolvedValue({});
    prisma.otpCode.create.mockResolvedValue({});

    await donorSendForgotOtp('alice@test.com');
    // 'reset' distinguishes password-reset emails from registration verification emails
    expect(sendOtpEmail).toHaveBeenCalledWith('alice@test.com', expect.any(String), 'reset');
  });

  it('throws ACCOUNT_NOT_FOUND when donor does not exist', async () => {
    // Don't reveal whether an email exists — return NOT_FOUND not EMAIL_NOT_TAKEN
    prisma.donor.findUnique.mockResolvedValue(null);
    await expect(donorSendForgotOtp('ghost@test.com')).rejects.toMatchObject({
      code: 'ACCOUNT_NOT_FOUND',
      statusCode: 404,
    });
  });
});

// ─── donorVerifyForgotOtp ─────────────────────────────────────────────────────
// donorVerifyForgotOtp(email, code) — Step 2 of password reset: verify the OTP.
// After verification succeeds, the OTP stays in the DB with used=true so the
// next step (donorResetPassword) can confirm the code was verified.

describe('donorVerifyForgotOtp', () => {
  const code = '987654';

  it('returns { verified: true } on valid reset OTP', async () => {
    prisma.donor.findUnique.mockResolvedValue(stubDonor());
    prisma.otpCode.findFirst.mockResolvedValue({
      id: 'otp-5',
      codeHash: hashOtp(code),
      expiresAt: new Date(Date.now() + 60_000),
      used: false,
    });
    prisma.otpCode.update.mockResolvedValue({});

    const result = await donorVerifyForgotOtp('alice@test.com', code);
    expect(result).toEqual({ verified: true });
  });

  it('throws ACCOUNT_NOT_FOUND when donor is missing', async () => {
    // Must check account exists first — prevents OTP oracle attacks on unregistered emails
    prisma.donor.findUnique.mockResolvedValue(null);
    await expect(donorVerifyForgotOtp('ghost@test.com', code)).rejects.toMatchObject({
      code: 'ACCOUNT_NOT_FOUND',
    });
  });
});

// ─── donorResetPassword ───────────────────────────────────────────────────────
// donorResetPassword(email, code, newPassword) — Step 3 of password reset.
// Confirms the OTP was actually verified (used=true and hash matches), then
// overwrites the password hash in the DB.

describe('donorResetPassword', () => {
  const code = '111222';

  it('updates the password hash when OTP is valid', async () => {
    prisma.donor.findUnique.mockResolvedValue(stubDonor());
    // The OTP row found must have used=true (set by donorVerifyForgotOtp)
    // and match the code hash so nobody skips the verify step
    prisma.otpCode.findFirst.mockResolvedValue({
      id: 'otp-6',
      codeHash: hashOtp(code),
      used: true,   // ← must be true, i.e. verify step was completed
    });
    prisma.donor.update.mockResolvedValue({});

    await donorResetPassword('alice@test.com', code, 'newPassword123');
    // The new password must be stored as a bcrypt hash, not plain text
    expect(prisma.donor.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { passwordHash: '$hashed' } })
    );
  });

  it('throws OTP_NOT_VERIFIED when last OTP does not match', async () => {
    // Prevents attackers from submitting a different code in the reset step
    prisma.donor.findUnique.mockResolvedValue(stubDonor());
    prisma.otpCode.findFirst.mockResolvedValue({
      id: 'otp-7',
      codeHash: hashOtp('999999'), // hash is for a different code
      used: true,
    });
    await expect(donorResetPassword('alice@test.com', code, 'newPass')).rejects.toMatchObject({
      code: 'OTP_NOT_VERIFIED',
    });
  });

  it('throws ACCOUNT_NOT_FOUND when donor missing', async () => {
    prisma.donor.findUnique.mockResolvedValue(null);
    await expect(donorResetPassword('none@test.com', code, 'pw')).rejects.toMatchObject({
      code: 'ACCOUNT_NOT_FOUND',
    });
  });
});

// ─── getAdminSetupStatus ──────────────────────────────────────────────────────
// Returns whether the initial admin setup step has been completed.
// The frontend uses this to decide whether to show the bootstrap screen.

describe('getAdminSetupStatus', () => {
  it('returns adminExists=false when count is 0', async () => {
    prisma.admin.count.mockResolvedValue(0);
    const result = await getAdminSetupStatus();
    expect(result).toEqual({ adminExists: false, adminCount: 0 });
  });

  it('returns adminExists=true when at least one admin exists', async () => {
    prisma.admin.count.mockResolvedValue(3);
    const result = await getAdminSetupStatus();
    expect(result).toEqual({ adminExists: true, adminCount: 3 });
  });
});

// ─── bootstrapInitialAdmin ────────────────────────────────────────────────────
// bootstrapInitialAdmin(data) — One-time endpoint to create the first admin.
// After this, the endpoint is "closed" and returns BOOTSTRAP_CLOSED for any
// subsequent call (even if called again with a different email, there's one admin).

describe('bootstrapInitialAdmin', () => {
  it('creates the first admin and returns tokens', async () => {
    // Zero admins in DB → bootstrap allowed
    prisma.admin.count.mockResolvedValue(0);
    prisma.admin.create.mockResolvedValue(stubAdmin());
    prisma.refreshToken.create.mockResolvedValue({});

    const result = await bootstrapInitialAdmin({
      name: 'Bob',
      email: 'bob@test.com',
      password: 'SuperSecret123!',
    });

    expect(result).toHaveProperty('tokens.accessToken');
    // Admin's password hash must never be returned to the caller
    expect(result.admin).not.toHaveProperty('passwordHash');
  });

  it('throws BOOTSTRAP_CLOSED when admin already exists', async () => {
    // At least 1 admin exists → the setup window is permanently closed
    prisma.admin.count.mockResolvedValue(1);
    await expect(
      bootstrapInitialAdmin({ name: 'Bob', email: 'bob@test.com', password: 'pw' })
    ).rejects.toMatchObject({ code: 'BOOTSTRAP_CLOSED', statusCode: 409 });
  });
});

// ─── adminLogin ───────────────────────────────────────────────────────────────
// adminLogin(email, password) → { tokens, admin }
// Identical flow to donorLogin but queries the admin table.

describe('adminLogin', () => {
  it('returns tokens and admin on success', async () => {
    prisma.admin.findUnique.mockResolvedValue(stubAdmin());
    bcrypt.compare.mockResolvedValue(true);  // correct password
    prisma.refreshToken.create.mockResolvedValue({});

    const result = await adminLogin('bob@test.com', 'goodPass');
    expect(result).toHaveProperty('tokens');
    // Admin passwordHash stripped from returned object
    expect(result.admin).not.toHaveProperty('passwordHash');
  });

  it('throws INVALID_CREDENTIALS when admin not found', async () => {
    prisma.admin.findUnique.mockResolvedValue(null);
    await expect(adminLogin('nobody@test.com', 'pw')).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
    });
  });

  it('throws INVALID_CREDENTIALS on wrong password', async () => {
    prisma.admin.findUnique.mockResolvedValue(stubAdmin());
    bcrypt.compare.mockResolvedValue(false);  // bcrypt says wrong
    await expect(adminLogin('bob@test.com', 'wrong')).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
    });
  });
});

// ─── refreshTokens ────────────────────────────────────────────────────────────
// refreshTokens(oldRefreshToken) → { accessToken, refreshToken }
// Implements token rotation: the old refresh token is deleted and a fresh pair
// is issued.  This limits the damage if a refresh token is intercepted.

describe('refreshTokens', () => {
  it('rotates refresh token and returns new pair', async () => {
    const token = signRefreshToken({ sub: 'd1', type: 'donor' });
    const crypto = require('crypto');
    // The DB stores tokens as SHA-256 hashes for security
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    prisma.refreshToken.findUnique.mockResolvedValue({
      tokenHash,
      userType: 'donor',
      donorId: 'd1',
      expiresAt: new Date(Date.now() + 60_000), // still valid
    });
    prisma.refreshToken.delete.mockResolvedValue({});  // old token removed
    prisma.refreshToken.create.mockResolvedValue({});  // new token stored

    const result = await refreshTokens(token);
    expect(result).toHaveProperty('accessToken');
    expect(result).toHaveProperty('refreshToken');
    // The new refresh token must be different from the old one (rotation)
    expect(result.refreshToken).not.toBe(token);
  });

  it('throws UNAUTHORIZED when token not found in DB', async () => {
    // Token may have been revoked (e.g. logout) or never existed
    const token = signRefreshToken({ sub: 'd1', type: 'donor' });
    prisma.refreshToken.findUnique.mockResolvedValue(null);
    await expect(refreshTokens(token)).rejects.toMatchObject({
      statusCode: 401,
      code: 'UNAUTHORIZED',
    });
  });

  it('throws UNAUTHORIZED when stored token is expired', async () => {
    // DB record exists but past its expiresAt timestamp
    const token = signRefreshToken({ sub: 'd1', type: 'donor' });
    prisma.refreshToken.findUnique.mockResolvedValue({
      expiresAt: new Date(Date.now() - 1000), // 1 second ago = expired
    });
    await expect(refreshTokens(token)).rejects.toMatchObject({ statusCode: 401 });
  });
});

// ─── logout ───────────────────────────────────────────────────────────────────
// logout(refreshToken) — removes the token from the DB so it can no longer be
// used to issue new access tokens. The token is looked up by its SHA-256 hash.

describe('logout', () => {
  it('deletes the refresh token by hash', async () => {
    const token = signRefreshToken({ sub: 'd1', type: 'donor' });
    prisma.refreshToken.deleteMany.mockResolvedValue({ count: 1 });

    await logout(token);
    expect(prisma.refreshToken.deleteMany).toHaveBeenCalledTimes(1);
    // Verify it's using the SHA-256 hash, not the raw token value (which would be unsafe)
    const callArg = prisma.refreshToken.deleteMany.mock.calls[0][0];
    expect(callArg.where.tokenHash).toMatch(/^[0-9a-f]{64}$/); // 64 hex chars = 256 bits
  });
});

// ─── storeRefreshToken error handling ────────────────────────────────────────
// storeRefreshToken is called internally by donorLogin, bootstrapInitialAdmin, etc.
// A Prisma P2002 duplicate-key error must be swallowed (same token stored twice is OK).
// Any other DB error must propagate.

describe('storeRefreshToken — error edge cases (via donorLogin)', () => {
  it('succeeds when prisma.refreshToken.create throws P2002 (duplicate token)', async () => {
    // P2002 = unique constraint violation; the same refresh token was somehow
    // stored twice.  This is harmless: the first write succeeded, so we ignore it.
    prisma.donor.findUnique.mockResolvedValue(stubDonor());
    bcrypt.compare.mockResolvedValue(true);
    prisma.refreshToken.create.mockRejectedValueOnce({ code: 'P2002' });

    const result = await donorLogin('alice@test.com', 'pw');
    expect(result).toHaveProperty('tokens');
  });

  it('propagates non-P2002 DB errors', async () => {
    // Any other error (network, constraint other than P2002) must not be swallowed
    prisma.donor.findUnique.mockResolvedValue(stubDonor());
    bcrypt.compare.mockResolvedValue(true);
    prisma.refreshToken.create.mockRejectedValueOnce(new Error('DB connection lost'));

    await expect(donorLogin('alice@test.com', 'pw')).rejects.toThrow('DB connection lost');
  });
});

// ─── donorGoogleLogin ─────────────────────────────────────────────────────────
// Google sign-in is disabled; the function always throws regardless of credential.

describe('donorGoogleLogin', () => {
  it('always throws GOOGLE_AUTH_DISABLED', async () => {
    await expect(donorGoogleLogin('any-credential')).rejects.toMatchObject({
      code: 'GOOGLE_AUTH_DISABLED',
      statusCode: 503,
    });
  });
});

// ─── donorCompleteRegistration ───────────────────────────────────────────────
// Step 3 of the OTP register flow: submit name+password and receive tokens.
// Two paths: (A) no existing donor row → create fresh; (B) placeholder row → activate.

describe('donorCompleteRegistration', () => {
  it('throws EMAIL_NOT_VERIFIED when no OTP record exists for the email', async () => {
    // OTP must have been completed before registration can proceed
    prisma.otpCode.findFirst.mockResolvedValue(null);
    await expect(
      donorCompleteRegistration({ email: 'new@test.com', name: 'New', password: 'Pass123!' })
    ).rejects.toMatchObject({ code: 'EMAIL_NOT_VERIFIED', statusCode: 400 });
  });

  it('throws EMAIL_NOT_VERIFIED when the last OTP was not used (verify step skipped)', async () => {
    prisma.otpCode.findFirst.mockResolvedValue({ id: 'otp-1', used: false });
    await expect(
      donorCompleteRegistration({ email: 'new@test.com', name: 'New', password: 'Pass123!' })
    ).rejects.toMatchObject({ code: 'EMAIL_NOT_VERIFIED' });
  });

  it('throws EMAIL_TAKEN when a full account already exists for this email', async () => {
    prisma.otpCode.findFirst.mockResolvedValue({ id: 'otp-1', used: true });
    // findUnique finds an existing full account (accountCreated=true)
    prisma.donor.findUnique.mockResolvedValue(stubDonor({ accountCreated: true }));
    await expect(
      donorCompleteRegistration({ email: 'alice@test.com', name: 'Alice', password: 'Pass123!' })
    ).rejects.toMatchObject({ code: 'EMAIL_TAKEN', statusCode: 409 });
  });

  it('activates a placeholder donor (existing row, accountCreated=false)', async () => {
    // A placeholder was created by an admin; now the donor completes self-registration
    prisma.otpCode.findFirst.mockResolvedValue({ id: 'otp-1', used: true });
    prisma.donor.findUnique.mockResolvedValue(stubDonor({ accountCreated: false, engagement: null }));
    // $transaction must invoke the callback with prisma as the tx argument
    prisma.$transaction.mockImplementation(async (fn) => fn(prisma));
    prisma.donor.update.mockResolvedValue(stubDonor({ accountCreated: true }));
    prisma.refreshToken.create.mockResolvedValue({});

    const result = await donorCompleteRegistration({
      email: 'alice@test.com',
      name:  'Alice',
      password: 'Pass123!',
    });
    expect(result).toHaveProperty('tokens.accessToken');
    expect(result.donor).not.toHaveProperty('passwordHash');
  });

  it('creates engagement inside $transaction when pledge provided for placeholder donor', async () => {
    prisma.otpCode.findFirst.mockResolvedValue({ used: true });
    prisma.donor.findUnique.mockResolvedValue(stubDonor({ accountCreated: false, engagement: null }));
    prisma.$transaction.mockImplementation(async (fn) => fn(prisma));
    prisma.donor.update.mockResolvedValue(stubDonor({ id: 'donor-1', name: 'Alice', accountCreated: true }));
    prisma.engagement.create.mockResolvedValue({});
    prisma.refreshToken.create.mockResolvedValue({});

    const result = await donorCompleteRegistration({
      email:   'alice@test.com',
      name:    'Alice',
      password: 'Pass123!',
      pledge:  { totalPledge: 5000, endDate: '2026-12-31' },
    });
    // Engagement should have been created inside the transaction
    expect(prisma.engagement.create).toHaveBeenCalledTimes(1);
    expect(result).toHaveProperty('tokens');
  });

  it('creates a brand-new donor (no prior row) and returns tokens', async () => {
    prisma.otpCode.findFirst.mockResolvedValue({ used: true });
    prisma.donor.findUnique.mockResolvedValue(null); // no prior row
    prisma.donor.create.mockResolvedValue(stubDonor({ email: 'brand@test.com' }));
    prisma.refreshToken.create.mockResolvedValue({});

    const result = await donorCompleteRegistration({
      email:    'brand@test.com',
      name:     'Brand',
      password: 'Pass123!',
    });
    expect(result).toHaveProperty('tokens');
    expect(prisma.donor.create).toHaveBeenCalledTimes(1);
  });

  it('includes pledge and payments in new donor creation when provided', async () => {
    prisma.otpCode.findFirst.mockResolvedValue({ used: true });
    prisma.donor.findUnique.mockResolvedValue(null);
    prisma.donor.create.mockResolvedValue(stubDonor());
    prisma.refreshToken.create.mockResolvedValue({});

    await donorCompleteRegistration({
      email:    'new2@test.com',
      name:     'New2',
      password: 'Pass123!',
      pledge:   { totalPledge: 1000, endDate: '2026-01-01' },
      payments: [{ amount: 100, date: '2025-01-01', method: 'cash', note: 'first' }],
    });
    // donor.create must include the engagement and payments nested creates
    const { data } = prisma.donor.create.mock.calls[0][0];
    expect(data).toHaveProperty('engagement.create');
    expect(data).toHaveProperty('payments.create');
  });
});

// ─── adminGoogleLogin ─────────────────────────────────────────────────────────
// Mirrors donorGoogleLogin — always disabled.

describe('adminGoogleLogin', () => {
  it('always throws GOOGLE_AUTH_DISABLED', async () => {
    await expect(adminGoogleLogin('any-credential')).rejects.toMatchObject({
      code: 'GOOGLE_AUTH_DISABLED',
      statusCode: 503,
    });
  });
});

// ─── adminSendForgotOtp ────────────────────────────────────────────────────────
// Sends a password-reset OTP email to the given admin email.
// The admin account must exist in the DB.

describe('adminSendForgotOtp', () => {
  it('sends OTP when admin exists', async () => {
    const { sendOtpEmail } = require('../../../utils/email');
    prisma.admin.findUnique.mockResolvedValue(stubAdmin());
    prisma.otpCode.updateMany.mockResolvedValue({});
    prisma.otpCode.create.mockResolvedValue({});

    await adminSendForgotOtp('bob@test.com');
    // Purpose must be 'reset' so the email template shows the correct message
    expect(sendOtpEmail).toHaveBeenCalledWith('bob@test.com', expect.any(String), 'reset');
  });

  it('throws ADMIN_ACCOUNT_NOT_FOUND when admin does not exist', async () => {
    prisma.admin.findUnique.mockResolvedValue(null);
    await expect(adminSendForgotOtp('ghost@test.com')).rejects.toMatchObject({
      code: 'ADMIN_ACCOUNT_NOT_FOUND',
      statusCode: 404,
    });
  });
});

// ─── adminVerifyForgotOtp ─────────────────────────────────────────────────────
// Confirms the OTP code that was sent by adminSendForgotOtp.

describe('adminVerifyForgotOtp', () => {
  const code = '123456';

  it('returns { verified: true } when admin exists and OTP matches', async () => {
    prisma.admin.findUnique.mockResolvedValue(stubAdmin());
    prisma.otpCode.findFirst.mockResolvedValue({
      id: 'otp-admin-1',
      codeHash: hashOtp(code),
      expiresAt: new Date(Date.now() + 60_000),
      used: false,
    });
    prisma.otpCode.update.mockResolvedValue({});

    const result = await adminVerifyForgotOtp('bob@test.com', code);
    expect(result).toEqual({ verified: true });
  });

  it('throws INVALID_EMAIL when admin does not exist', async () => {
    prisma.admin.findUnique.mockResolvedValue(null);
    await expect(adminVerifyForgotOtp('ghost@test.com', code)).rejects.toMatchObject({
      code: 'INVALID_EMAIL',
      statusCode: 400,
    });
  });
});

// ─── adminResetPassword ───────────────────────────────────────────────────────
// Step 3 of admin password reset: validate the OTP was verified, then update hash.

describe('adminResetPassword', () => {
  const code = '654321';

  it('updates the admin password hash when OTP is valid', async () => {
    prisma.admin.findUnique.mockResolvedValue(stubAdmin());
    prisma.otpCode.findFirst.mockResolvedValue({
      id:       'otp-admin-2',
      codeHash: hashOtp(code),
      used:     true,  // verify step was completed
    });
    prisma.admin.update.mockResolvedValue({});

    await adminResetPassword('bob@test.com', code, 'NewAdminPass!');
    expect(prisma.admin.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { passwordHash: '$hashed' } })
    );
  });

  it('throws INVALID_EMAIL when admin does not exist', async () => {
    prisma.admin.findUnique.mockResolvedValue(null);
    await expect(adminResetPassword('ghost@test.com', code, 'pass')).rejects.toMatchObject({
      code: 'INVALID_EMAIL',
      statusCode: 400,
    });
  });

  it('throws OTP_NOT_VERIFIED when stored OTP code does not match', async () => {
    prisma.admin.findUnique.mockResolvedValue(stubAdmin());
    // codeHash is for '000000', but we submit '654321' → mismatch
    prisma.otpCode.findFirst.mockResolvedValue({
      id:       'otp-admin-3',
      codeHash: hashOtp('000000'),
      used:     true,
    });
    await expect(adminResetPassword('bob@test.com', code, 'pass')).rejects.toMatchObject({
      code: 'OTP_NOT_VERIFIED',
      statusCode: 400,
    });
  });

  it('throws OTP_NOT_VERIFIED when no used OTP record is found', async () => {
    // OTP record is null — the verify step was never completed
    prisma.admin.findUnique.mockResolvedValue(stubAdmin());
    prisma.otpCode.findFirst.mockResolvedValue(null);
    await expect(adminResetPassword('bob@test.com', code, 'pass')).rejects.toMatchObject({
      code: 'OTP_NOT_VERIFIED',
    });
  });
});

// ─── normalizeEmail — falsy input branch ──────────────────────────────────────

describe('normalizeEmail via donorLogin — falsy email input', () => {
  it('treats null email as empty string (covers email || "" false branch)', async () => {
    // normalizeEmail(null) → String(null || '') → '' (covers the || '' false branch)
    prisma.donor.findUnique.mockResolvedValue(null);
    await expect(donorLogin(null, 'anypass')).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
    });
  });
});

// ─── donorCompleteRegistration — pledge.endDate null branches ─────────────────

describe('donorCompleteRegistration — pledge endDate null branch', () => {
  it('sets engagement endDate to null when pledge has no endDate (placeholder path)', async () => {
    prisma.otpCode.findFirst.mockResolvedValue({ used: true });
    prisma.donor.findUnique.mockResolvedValue(stubDonor({ accountCreated: false, engagement: null }));
    prisma.$transaction.mockImplementation(async (fn) => fn(prisma));
    prisma.donor.update.mockResolvedValue(stubDonor({ accountCreated: true }));
    prisma.engagement.create.mockResolvedValue({});
    prisma.refreshToken.create.mockResolvedValue({});

    await donorCompleteRegistration({
      email:    'alice@test.com',
      name:     'Alice',
      password: 'Pass123!',
      pledge:   { totalPledge: 3000 }, // no endDate → ternary resolves to null (line 212)
    });
    const createArg = prisma.engagement.create.mock.calls[0][0];
    expect(createArg.data.endDate).toBeNull();
  });

  it('sets engagement endDate to null for new donor when pledge has no endDate', async () => {
    prisma.otpCode.findFirst.mockResolvedValue({ used: true });
    prisma.donor.findUnique.mockResolvedValue(null); // no prior row
    prisma.donor.create.mockResolvedValue(stubDonor());
    prisma.refreshToken.create.mockResolvedValue({});

    await donorCompleteRegistration({
      email:    'brand2@test.com',
      name:     'Brand2',
      password: 'Pass123!',
      pledge:   { totalPledge: 1500 }, // no endDate → line 247 covers `: null`
    });
    const { data } = prisma.donor.create.mock.calls[0][0];
    expect(data.engagement.create.endDate).toBeNull();
  });

  it('sets note to null when payment has no note (covers note ?? null right branch)', async () => {
    prisma.otpCode.findFirst.mockResolvedValue({ used: true });
    prisma.donor.findUnique.mockResolvedValue(null);
    prisma.donor.create.mockResolvedValue(stubDonor());
    prisma.refreshToken.create.mockResolvedValue({});

    await donorCompleteRegistration({
      email:    'brand3@test.com',
      name:     'Brand3',
      password: 'Pass123!',
      payments: [{ amount: 50, date: '2025-01-01', method: 'cash' }], // no note → undefined ?? null = null
    });
    const { data } = prisma.donor.create.mock.calls[0][0];
    expect(data.payments.create[0].note).toBeNull();
  });
});
