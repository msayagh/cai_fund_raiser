'use strict';

// ─── Test Suite: auth.service ─────────────────────────────────────────────────
// Passwordless OTP-based auth:
//   Donor flows  : OTP login (send + verify), OTP registration
//   Admin flows  : OTP login (send + verify), bootstrap (first admin)
//   Shared flows : token refresh, logout

// ── Mocks ──────────────────────────────────────────────────────────────────
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
    updateMany: jest.fn(),
  },
  refreshToken: {
    create:     jest.fn(),
    findUnique: jest.fn(),
    delete:     jest.fn(),
    deleteMany: jest.fn(),
  },
  engagement: { create: jest.fn() },
  $transaction: jest.fn(),
  activityLog: { create: jest.fn() },
}));

jest.mock('../../../utils/email', () => ({ sendOtpEmail: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../../../modules/logs/logs.service', () => ({ createLog: jest.fn().mockResolvedValue(undefined) }));
jest.mock('bcryptjs', () => ({
  hash:    jest.fn().mockResolvedValue('$hashed'),
  compare: jest.fn(),
}));

const prisma = require('../../../db/client');
const {
  donorSendLoginOtp,
  donorVerifyLoginOtp,
  donorGoogleLogin,
  donorSendOtp,
  donorVerifyOtp,
  donorCompleteRegistration,
  bootstrapInitialAdmin,
  adminSendLoginOtp,
  adminVerifyLoginOtp,
  adminGoogleLogin,
  getAdminSetupStatus,
  refreshTokens,
  logout,
} = require('../../../modules/auth/auth.service');
const { hashOtp } = require('../../../utils/otp');
const { signRefreshToken } = require('../../../utils/jwt');

const stubDonor = (overrides = {}) => ({
  id: 'donor-1',
  name: 'Alice',
  email: 'alice@test.com',
  passwordHash: '$hashed',
  accountCreated: true,
  ...overrides,
});

const stubAdmin = (overrides = {}) => ({
  id: 'admin-1',
  name: 'Bob',
  email: 'bob@test.com',
  passwordHash: '$hashed',
  ...overrides,
});

// ─── donorSendLoginOtp ───────────────────────────────────────────────────────
describe('donorSendLoginOtp', () => {
  it('sends an OTP when a registered donor exists', async () => {
    const { sendOtpEmail } = require('../../../utils/email');
    prisma.donor.findUnique.mockResolvedValue(stubDonor());
    prisma.otpCode.updateMany.mockResolvedValue({});
    prisma.otpCode.create.mockResolvedValue({});

    await donorSendLoginOtp('alice@test.com');
    expect(sendOtpEmail).toHaveBeenCalledWith('alice@test.com', expect.any(String), 'login');
  });

  it('throws ACCOUNT_NOT_FOUND when donor does not exist', async () => {
    prisma.donor.findUnique.mockResolvedValue(null);
    await expect(donorSendLoginOtp('ghost@test.com')).rejects.toMatchObject({
      code: 'ACCOUNT_NOT_FOUND',
      statusCode: 404,
    });
  });

  it('throws ACCOUNT_NOT_FOUND for placeholder donor (accountCreated=false)', async () => {
    prisma.donor.findUnique.mockResolvedValue(stubDonor({ accountCreated: false }));
    await expect(donorSendLoginOtp('alice@test.com')).rejects.toMatchObject({
      code: 'ACCOUNT_NOT_FOUND',
    });
  });

  it('normalizes email to lowercase before lookup', async () => {
    prisma.donor.findUnique.mockResolvedValue(stubDonor());
    prisma.otpCode.updateMany.mockResolvedValue({});
    prisma.otpCode.create.mockResolvedValue({});

    await donorSendLoginOtp('ALICE@TEST.COM');
    expect(prisma.donor.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: 'alice@test.com' } })
    );
  });
});

// ─── donorVerifyLoginOtp ─────────────────────────────────────────────────────
describe('donorVerifyLoginOtp', () => {
  const code = '123456';

  beforeEach(() => {
    prisma.refreshToken.create.mockResolvedValue({});
  });

  it('returns tokens and donor (without passwordHash) on valid OTP', async () => {
    prisma.donor.findUnique.mockResolvedValue(stubDonor());
    prisma.otpCode.findFirst.mockResolvedValue({
      id: 'otp-1',
      codeHash: hashOtp(code),
      expiresAt: new Date(Date.now() + 60_000),
      used: false,
    });
    prisma.otpCode.update.mockResolvedValue({});

    const result = await donorVerifyLoginOtp('alice@test.com', code);
    expect(result).toHaveProperty('tokens.accessToken');
    expect(result).toHaveProperty('tokens.refreshToken');
    expect(result.donor).not.toHaveProperty('passwordHash');
    expect(result.donor.email).toBe('alice@test.com');
  });

  it('throws ACCOUNT_NOT_FOUND when donor missing', async () => {
    prisma.donor.findUnique.mockResolvedValue(null);
    await expect(donorVerifyLoginOtp('ghost@test.com', code)).rejects.toMatchObject({
      code: 'ACCOUNT_NOT_FOUND',
    });
  });

  it('throws INVALID_OTP when no OTP record found', async () => {
    prisma.donor.findUnique.mockResolvedValue(stubDonor());
    prisma.otpCode.findFirst.mockResolvedValue(null);
    await expect(donorVerifyLoginOtp('alice@test.com', code)).rejects.toMatchObject({
      code: 'INVALID_OTP',
    });
  });

  it('throws INVALID_OTP on wrong code', async () => {
    prisma.donor.findUnique.mockResolvedValue(stubDonor());
    prisma.otpCode.findFirst.mockResolvedValue({
      id: 'otp-2',
      codeHash: hashOtp('654321'),
      expiresAt: new Date(Date.now() + 60_000),
      used: false,
    });
    await expect(donorVerifyLoginOtp('alice@test.com', '000000')).rejects.toMatchObject({
      code: 'INVALID_OTP',
    });
  });
});

// ─── donorSendOtp (registration) ─────────────────────────────────────────────
describe('donorSendOtp', () => {
  it('sends OTP when no account exists', async () => {
    const { sendOtpEmail } = require('../../../utils/email');
    prisma.donor.findUnique.mockResolvedValue(null);
    prisma.otpCode.updateMany.mockResolvedValue({});
    prisma.otpCode.create.mockResolvedValue({});

    await donorSendOtp('new@test.com');
    expect(sendOtpEmail).toHaveBeenCalledWith('new@test.com', expect.any(String), 'verification');
    expect(prisma.otpCode.create).toHaveBeenCalledTimes(1);
  });

  it('throws EMAIL_TAKEN if an active account already exists', async () => {
    prisma.donor.findUnique.mockResolvedValue(stubDonor());
    await expect(donorSendOtp('alice@test.com')).rejects.toMatchObject({
      code: 'EMAIL_TAKEN',
      statusCode: 409,
    });
  });
});

// ─── donorVerifyOtp (registration) ───────────────────────────────────────────
describe('donorVerifyOtp', () => {
  const code = '123456';

  it('returns { verified: true } on valid OTP', async () => {
    prisma.otpCode.findFirst.mockResolvedValue({
      id: 'otp-1',
      email: 'new@test.com',
      codeHash: hashOtp(code),
      expiresAt: new Date(Date.now() + 60_000),
      used: false,
    });
    prisma.otpCode.update.mockResolvedValue({});

    const result = await donorVerifyOtp('new@test.com', code);
    expect(result).toEqual({ verified: true });
  });

  it('throws INVALID_OTP when no OTP record found', async () => {
    prisma.otpCode.findFirst.mockResolvedValue(null);
    await expect(donorVerifyOtp('none@test.com', code)).rejects.toMatchObject({
      code: 'INVALID_OTP',
    });
  });

  it('throws OTP_EXPIRED when the otp record is past its expiry', async () => {
    prisma.otpCode.findFirst.mockResolvedValue({
      id: 'otp-2',
      codeHash: hashOtp(code),
      expiresAt: new Date(Date.now() - 1000),
      used: false,
    });
    await expect(donorVerifyOtp('new@test.com', code)).rejects.toMatchObject({
      code: 'OTP_EXPIRED',
    });
  });
});

// ─── donorCompleteRegistration ───────────────────────────────────────────────
describe('donorCompleteRegistration', () => {
  it('throws EMAIL_NOT_VERIFIED when no OTP record exists', async () => {
    prisma.otpCode.findFirst.mockResolvedValue(null);
    await expect(
      donorCompleteRegistration({ email: 'new@test.com', name: 'New' })
    ).rejects.toMatchObject({ code: 'EMAIL_NOT_VERIFIED', statusCode: 400 });
  });

  it('throws EMAIL_NOT_VERIFIED when last OTP was not used', async () => {
    prisma.otpCode.findFirst.mockResolvedValue({ id: 'otp-1', used: false });
    await expect(
      donorCompleteRegistration({ email: 'new@test.com', name: 'New' })
    ).rejects.toMatchObject({ code: 'EMAIL_NOT_VERIFIED' });
  });

  it('throws EMAIL_TAKEN when account already exists', async () => {
    prisma.otpCode.findFirst.mockResolvedValue({ id: 'otp-1', used: true });
    prisma.donor.findUnique.mockResolvedValue(stubDonor({ accountCreated: true }));
    await expect(
      donorCompleteRegistration({ email: 'alice@test.com', name: 'Alice' })
    ).rejects.toMatchObject({ code: 'EMAIL_TAKEN', statusCode: 409 });
  });

  it('activates a placeholder donor (existing row, accountCreated=false)', async () => {
    prisma.otpCode.findFirst.mockResolvedValue({ id: 'otp-1', used: true });
    prisma.donor.findUnique.mockResolvedValue(stubDonor({ accountCreated: false, engagement: null }));
    prisma.$transaction.mockImplementation(async (fn) => fn(prisma));
    prisma.donor.update.mockResolvedValue(stubDonor({ accountCreated: true }));
    prisma.refreshToken.create.mockResolvedValue({});

    const result = await donorCompleteRegistration({
      email: 'alice@test.com',
      name:  'Alice',
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
      email:  'alice@test.com',
      name:   'Alice',
      pledge: { totalPledge: 5000, endDate: '2026-12-31' },
    });
    expect(prisma.engagement.create).toHaveBeenCalledTimes(1);
    expect(result).toHaveProperty('tokens');
  });

  it('creates a brand-new donor (no prior row) and returns tokens', async () => {
    prisma.otpCode.findFirst.mockResolvedValue({ used: true });
    prisma.donor.findUnique.mockResolvedValue(null);
    prisma.donor.create.mockResolvedValue(stubDonor({ email: 'brand@test.com' }));
    prisma.refreshToken.create.mockResolvedValue({});

    const result = await donorCompleteRegistration({
      email: 'brand@test.com',
      name:  'Brand',
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
      pledge:   { totalPledge: 1000, endDate: '2026-01-01' },
      payments: [{ amount: 100, date: '2025-01-01', method: 'cash', note: 'first' }],
    });
    const { data } = prisma.donor.create.mock.calls[0][0];
    expect(data).toHaveProperty('engagement.create');
    expect(data).toHaveProperty('payments.create');
  });

  it('sets engagement endDate to null when pledge has no endDate (placeholder path)', async () => {
    prisma.otpCode.findFirst.mockResolvedValue({ used: true });
    prisma.donor.findUnique.mockResolvedValue(stubDonor({ accountCreated: false, engagement: null }));
    prisma.$transaction.mockImplementation(async (fn) => fn(prisma));
    prisma.donor.update.mockResolvedValue(stubDonor({ accountCreated: true }));
    prisma.engagement.create.mockResolvedValue({});
    prisma.refreshToken.create.mockResolvedValue({});

    await donorCompleteRegistration({
      email:  'alice@test.com',
      name:   'Alice',
      pledge: { totalPledge: 3000 },
    });
    const createArg = prisma.engagement.create.mock.calls[0][0];
    expect(createArg.data.endDate).toBeNull();
  });

  it('sets engagement endDate to null for new donor when pledge has no endDate', async () => {
    prisma.otpCode.findFirst.mockResolvedValue({ used: true });
    prisma.donor.findUnique.mockResolvedValue(null);
    prisma.donor.create.mockResolvedValue(stubDonor());
    prisma.refreshToken.create.mockResolvedValue({});

    await donorCompleteRegistration({
      email:  'brand2@test.com',
      name:   'Brand2',
      pledge: { totalPledge: 1500 },
    });
    const { data } = prisma.donor.create.mock.calls[0][0];
    expect(data.engagement.create.endDate).toBeNull();
  });

  it('sets note to null when payment has no note', async () => {
    prisma.otpCode.findFirst.mockResolvedValue({ used: true });
    prisma.donor.findUnique.mockResolvedValue(null);
    prisma.donor.create.mockResolvedValue(stubDonor());
    prisma.refreshToken.create.mockResolvedValue({});

    await donorCompleteRegistration({
      email:    'brand3@test.com',
      name:     'Brand3',
      payments: [{ amount: 50, date: '2025-01-01', method: 'cash' }],
    });
    const { data } = prisma.donor.create.mock.calls[0][0];
    expect(data.payments.create[0].note).toBeNull();
  });
});

// ─── adminSendLoginOtp ───────────────────────────────────────────────────────
describe('adminSendLoginOtp', () => {
  it('sends an OTP when admin exists', async () => {
    const { sendOtpEmail } = require('../../../utils/email');
    prisma.admin.findUnique.mockResolvedValue(stubAdmin());
    prisma.otpCode.updateMany.mockResolvedValue({});
    prisma.otpCode.create.mockResolvedValue({});

    await adminSendLoginOtp('bob@test.com');
    expect(sendOtpEmail).toHaveBeenCalledWith('bob@test.com', expect.any(String), 'login');
  });

  it('throws ADMIN_ACCOUNT_NOT_FOUND when admin missing', async () => {
    prisma.admin.findUnique.mockResolvedValue(null);
    await expect(adminSendLoginOtp('ghost@test.com')).rejects.toMatchObject({
      code: 'ADMIN_ACCOUNT_NOT_FOUND',
      statusCode: 404,
    });
  });
});

// ─── adminVerifyLoginOtp ─────────────────────────────────────────────────────
describe('adminVerifyLoginOtp', () => {
  const code = '987654';

  beforeEach(() => {
    prisma.refreshToken.create.mockResolvedValue({});
  });

  it('returns tokens and admin (without passwordHash) on valid OTP', async () => {
    prisma.admin.findUnique.mockResolvedValue(stubAdmin());
    prisma.otpCode.findFirst.mockResolvedValue({
      id: 'otp-admin-1',
      codeHash: hashOtp(code),
      expiresAt: new Date(Date.now() + 60_000),
      used: false,
    });
    prisma.otpCode.update.mockResolvedValue({});

    const result = await adminVerifyLoginOtp('bob@test.com', code);
    expect(result).toHaveProperty('tokens.accessToken');
    expect(result.admin).not.toHaveProperty('passwordHash');
  });

  it('throws ADMIN_ACCOUNT_NOT_FOUND when admin missing', async () => {
    prisma.admin.findUnique.mockResolvedValue(null);
    await expect(adminVerifyLoginOtp('ghost@test.com', code)).rejects.toMatchObject({
      code: 'ADMIN_ACCOUNT_NOT_FOUND',
    });
  });

  it('throws INVALID_OTP on wrong code', async () => {
    prisma.admin.findUnique.mockResolvedValue(stubAdmin());
    prisma.otpCode.findFirst.mockResolvedValue({
      id: 'otp-admin-2',
      codeHash: hashOtp('111111'),
      expiresAt: new Date(Date.now() + 60_000),
      used: false,
    });
    await expect(adminVerifyLoginOtp('bob@test.com', code)).rejects.toMatchObject({
      code: 'INVALID_OTP',
    });
  });
});

// ─── getAdminSetupStatus ─────────────────────────────────────────────────────
describe('getAdminSetupStatus', () => {
  it('returns adminExists=false when count is 0', async () => {
    prisma.admin.count.mockResolvedValue(0);
    expect(await getAdminSetupStatus()).toEqual({ adminExists: false, adminCount: 0 });
  });

  it('returns adminExists=true when at least one admin exists', async () => {
    prisma.admin.count.mockResolvedValue(3);
    expect(await getAdminSetupStatus()).toEqual({ adminExists: true, adminCount: 3 });
  });
});

// ─── bootstrapInitialAdmin ───────────────────────────────────────────────────
describe('bootstrapInitialAdmin', () => {
  it('creates the first admin and returns tokens', async () => {
    prisma.admin.count.mockResolvedValue(0);
    prisma.admin.create.mockResolvedValue(stubAdmin());
    prisma.refreshToken.create.mockResolvedValue({});

    const result = await bootstrapInitialAdmin({
      name: 'Bob',
      email: 'bob@test.com',
      password: 'SuperSecret123!',
    });

    expect(result).toHaveProperty('tokens.accessToken');
    expect(result.admin).not.toHaveProperty('passwordHash');
  });

  it('throws BOOTSTRAP_CLOSED when admin already exists', async () => {
    prisma.admin.count.mockResolvedValue(1);
    await expect(
      bootstrapInitialAdmin({ name: 'Bob', email: 'bob@test.com', password: 'pw' })
    ).rejects.toMatchObject({ code: 'BOOTSTRAP_CLOSED', statusCode: 409 });
  });
});

// ─── refreshTokens ───────────────────────────────────────────────────────────
describe('refreshTokens', () => {
  it('rotates refresh token and returns new pair', async () => {
    const token = signRefreshToken({ sub: 'd1', type: 'donor' });
    const crypto = require('crypto');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    prisma.refreshToken.findUnique.mockResolvedValue({
      tokenHash,
      userType: 'donor',
      donorId: 'd1',
      expiresAt: new Date(Date.now() + 60_000),
    });
    prisma.refreshToken.delete.mockResolvedValue({});
    prisma.refreshToken.create.mockResolvedValue({});

    const result = await refreshTokens(token);
    expect(result).toHaveProperty('accessToken');
    expect(result).toHaveProperty('refreshToken');
    expect(result.refreshToken).not.toBe(token);
  });

  it('throws UNAUTHORIZED when token not found in DB', async () => {
    const token = signRefreshToken({ sub: 'd1', type: 'donor' });
    prisma.refreshToken.findUnique.mockResolvedValue(null);
    await expect(refreshTokens(token)).rejects.toMatchObject({
      statusCode: 401,
      code: 'UNAUTHORIZED',
    });
  });

  it('throws UNAUTHORIZED when stored token is expired', async () => {
    const token = signRefreshToken({ sub: 'd1', type: 'donor' });
    prisma.refreshToken.findUnique.mockResolvedValue({
      expiresAt: new Date(Date.now() - 1000),
    });
    await expect(refreshTokens(token)).rejects.toMatchObject({ statusCode: 401 });
  });
});

// ─── logout ──────────────────────────────────────────────────────────────────
describe('logout', () => {
  it('deletes the refresh token by hash', async () => {
    const token = signRefreshToken({ sub: 'd1', type: 'donor' });
    prisma.refreshToken.deleteMany.mockResolvedValue({ count: 1 });

    await logout(token);
    expect(prisma.refreshToken.deleteMany).toHaveBeenCalledTimes(1);
    const callArg = prisma.refreshToken.deleteMany.mock.calls[0][0];
    expect(callArg.where.tokenHash).toMatch(/^[0-9a-f]{64}$/);
  });
});

// ─── storeRefreshToken error edge cases (via donorVerifyLoginOtp) ────────────
describe('storeRefreshToken edge cases (via donorVerifyLoginOtp)', () => {
  const code = '202020';

  it('succeeds when prisma.refreshToken.create throws P2002 (duplicate token)', async () => {
    prisma.donor.findUnique.mockResolvedValue(stubDonor());
    prisma.otpCode.findFirst.mockResolvedValue({
      id: 'otp-x',
      codeHash: hashOtp(code),
      expiresAt: new Date(Date.now() + 60_000),
      used: false,
    });
    prisma.otpCode.update.mockResolvedValue({});
    prisma.refreshToken.create.mockRejectedValueOnce({ code: 'P2002' });

    const result = await donorVerifyLoginOtp('alice@test.com', code);
    expect(result).toHaveProperty('tokens');
  });

  it('propagates non-P2002 DB errors', async () => {
    prisma.donor.findUnique.mockResolvedValue(stubDonor());
    prisma.otpCode.findFirst.mockResolvedValue({
      id: 'otp-y',
      codeHash: hashOtp(code),
      expiresAt: new Date(Date.now() + 60_000),
      used: false,
    });
    prisma.otpCode.update.mockResolvedValue({});
    prisma.refreshToken.create.mockRejectedValueOnce(new Error('DB connection lost'));

    await expect(donorVerifyLoginOtp('alice@test.com', code)).rejects.toThrow('DB connection lost');
  });
});

// ─── Google sign-in (disabled) ───────────────────────────────────────────────
describe('donorGoogleLogin', () => {
  it('always throws GOOGLE_AUTH_DISABLED', async () => {
    await expect(donorGoogleLogin('any-credential')).rejects.toMatchObject({
      code: 'GOOGLE_AUTH_DISABLED',
      statusCode: 503,
    });
  });
});

describe('adminGoogleLogin', () => {
  it('always throws GOOGLE_AUTH_DISABLED', async () => {
    await expect(adminGoogleLogin('any-credential')).rejects.toMatchObject({
      code: 'GOOGLE_AUTH_DISABLED',
      statusCode: 503,
    });
  });
});

// ─── normalizeEmail — falsy input branch ─────────────────────────────────────
describe('normalizeEmail via donorSendLoginOtp — falsy email input', () => {
  it('treats null email as empty string', async () => {
    prisma.donor.findUnique.mockResolvedValue(null);
    await expect(donorSendLoginOtp(null)).rejects.toMatchObject({
      code: 'ACCOUNT_NOT_FOUND',
    });
  });
});
