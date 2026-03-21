'use strict';

// ─── Test Suite: auth middleware ──────────────────────────────────────────────
// The auth middleware file exports four guard functions:
//
//   requireDonor       — routes accessible only by registered donors
//   requireAdmin       — routes accessible only by admin users
//   requireApiKey      — routes accessible via x-api-key header
//   requireAdminOrApiKey — accepts either a Bearer admin JWT or an API key
//
// All four read the token/key from the request headers, validate it, look up
// the actor in the database, and then attach the actor object to the request
// (req.donor, req.admin, req.apiKey) so controllers can use it downstream.
//
// The database and apiKeys.service are fully mocked here so no real DB queries
// run during the tests.

// Mock Prisma so no real DB calls occur
jest.mock('../../db/client', () => ({
  donor: { findUnique: jest.fn() },
  admin: { findUnique: jest.fn() },
}));

// Mock apiKeys.service so we don't hit the DB for key lookups
jest.mock('../../modules/apiKeys/apiKeys.service', () => ({
  findActiveApiKeyByValue: jest.fn(),
}));

const prisma = require('../../db/client');
const { findActiveApiKeyByValue } = require('../../modules/apiKeys/apiKeys.service');
// signAccessToken is the real JWT signing util — we use it to produce valid tokens for tests
const { signAccessToken } = require('../../utils/jwt');
const { requireDonor, requireAdmin, requireApiKey, requireAdminOrApiKey } = require('../../middleware/auth');
const AppError = require('../../utils/AppError');

// next() captures whatever is passed (or nothing) when the middleware is done
const makeNext = () => jest.fn();
// Minimal res object — these middleware functions don't call res directly
const makeRes = () => ({ status: jest.fn(), json: jest.fn() });

// Build a request with a Bearer Authorization header (JWT style)
const bearerReq = (token) => ({
  headers: { authorization: `Bearer ${token}` },
});

// Build a request with the custom API key header used by external integrations
const apiKeyReq = (key) => ({
  headers: { 'x-api-key': key },
});

// ─── requireDonor ────────────────────────────────────────────────────────────
// This guard is used on all donor-facing protected endpoints.
// It verifies the JWT is a donor-type token AND that the donor has a full
// account (accountCreated=true), protecting against placeholder accounts.

describe('requireDonor', () => {
  it('attaches donor to req and calls next() for a valid donor token', async () => {
    const donorRecord = { id: 'd1', name: 'Alice', email: 'alice@test.com', accountCreated: true };
    // Create a real signed JWT with sub=donor ID and type=donor
    const token = signAccessToken({ sub: 'd1', type: 'donor' });
    // Simulate the DB returning the donor row
    prisma.donor.findUnique.mockResolvedValue(donorRecord);

    const req = bearerReq(token);
    const next = makeNext();
    await requireDonor(req, makeRes(), next);

    // The donor must be attached to req so controllers can use req.donor
    expect(req.donor).toEqual(donorRecord);
    // next() called with no args means "proceed to the controller"
    expect(next).toHaveBeenCalledWith();
  });

  it('calls next(AppError 401) when no Authorization header', async () => {
    const req = { headers: {} };   // no Bearer header at all
    const next = makeNext();
    await requireDonor(req, makeRes(), next);
    expect(next.mock.calls[0][0]).toBeInstanceOf(AppError);
    expect(next.mock.calls[0][0].statusCode).toBe(401);
  });

  it('calls next(AppError 403) when token type is admin, not donor', async () => {
    // An admin JWT should not be accepted on donor-only routes
    const token = signAccessToken({ sub: 'a1', type: 'admin' });
    const next = makeNext();
    await requireDonor(bearerReq(token), makeRes(), next);
    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(403);      // Forbidden, not just Unauthorized
    expect(err.code).toBe('FORBIDDEN');
  });

  it('calls next(AppError 401) when donor record does not exist', async () => {
    // Token is valid but DB has no such donor — could mean account was deleted
    const token = signAccessToken({ sub: 'missing', type: 'donor' });
    prisma.donor.findUnique.mockResolvedValue(null);
    const next = makeNext();
    await requireDonor(bearerReq(token), makeRes(), next);
    expect(next.mock.calls[0][0].statusCode).toBe(401);
  });

  it('calls next(AppError 401) when donor.accountCreated is false', async () => {
    // placeholder donors (created during payment_upload requests) have accountCreated=false
    // and must not be allowed to log in via the donor portal
    const token = signAccessToken({ sub: 'd2', type: 'donor' });
    prisma.donor.findUnique.mockResolvedValue({ id: 'd2', accountCreated: false });
    const next = makeNext();
    await requireDonor(bearerReq(token), makeRes(), next);
    expect(next.mock.calls[0][0].statusCode).toBe(401);
  });
});

// ─── requireAdmin ─────────────────────────────────────────────────────────────
// Guards admin-only routes (dashboard, donor management, settings, etc.).
// Reads the Bearer token, verifies it has type=admin, then loads the admin row.

describe('requireAdmin', () => {
  it('attaches admin to req and calls next() for a valid admin token', async () => {
    const adminRecord = { id: 'a1', name: 'Bob', email: 'bob@test.com' };
    const token = signAccessToken({ sub: 'a1', type: 'admin' });
    prisma.admin.findUnique.mockResolvedValue(adminRecord);

    const req = bearerReq(token);
    const next = makeNext();
    await requireAdmin(req, makeRes(), next);

    // req.admin is used by controllers to know who the logged-in admin is
    expect(req.admin).toEqual(adminRecord);
    expect(next).toHaveBeenCalledWith();
  });

  it('calls next(AppError 403) when type is donor', async () => {
    // Donor tokens must not pass admin routes — separate accounts
    const token = signAccessToken({ sub: 'd1', type: 'donor' });
    const next = makeNext();
    await requireAdmin(bearerReq(token), makeRes(), next);
    expect(next.mock.calls[0][0].statusCode).toBe(403);
  });

  it('calls next(AppError 401) when admin record is not found', async () => {
    const token = signAccessToken({ sub: 'ghost', type: 'admin' });
    prisma.admin.findUnique.mockResolvedValue(null);
    const next = makeNext();
    await requireAdmin(bearerReq(token), makeRes(), next);
    expect(next.mock.calls[0][0].statusCode).toBe(401);
  });

  it('calls next(AppError 401) when no Authorization header', async () => {
    const next = makeNext();
    await requireAdmin({ headers: {} }, makeRes(), next);
    expect(next.mock.calls[0][0].statusCode).toBe(401);
  });
});

// ─── requireApiKey ────────────────────────────────────────────────────────────
// API keys allow third-party systems (e.g. embedded donation widgets) to call
// admin-level write endpoints without administrator credentials.
// Keys are prefixed with "cza_", stored as SHA-256 hashes in the DB, and
// carry the creating admin's identity so audit logs still have an actor.

describe('requireApiKey', () => {
  const fakeApiKey = {
    id: 'key1',
    title: 'Test Key',
    isActive: true,
    createdByAdminId: 'a1',
    // The creating admin's details travel with the key for audit purposes
    createdByAdmin: { id: 'a1', name: 'Bob', email: 'bob@test.com' },
  };

  it('attaches apiKey and synthesized admin to req on success', async () => {
    findActiveApiKeyByValue.mockResolvedValue(fakeApiKey);
    const req = apiKeyReq('cza_validkey');
    const next = makeNext();
    await requireApiKey(req, makeRes(), next);

    // req.apiKey carries the full key record
    expect(req.apiKey).toEqual(fakeApiKey);
    // req.admin is also populated (from createdByAdmin) so controllers work
    // uniformly — they always read req.admin regardless of auth method
    expect(req.admin.isApiKey).toBe(true);
    expect(next).toHaveBeenCalledWith();
  });

  it('calls next(AppError 401) when no API key header', async () => {
    const next = makeNext();
    await requireApiKey({ headers: {} }, makeRes(), next);
    expect(next.mock.calls[0][0].statusCode).toBe(401);
  });

  it('calls next(AppError 401) when API key is invalid', async () => {
    // findActiveApiKeyByValue returns null for unknown or revoked keys
    findActiveApiKeyByValue.mockResolvedValue(null);
    const next = makeNext();
    await requireApiKey(apiKeyReq('cza_badkey'), makeRes(), next);
    expect(next.mock.calls[0][0].statusCode).toBe(401);
    expect(next.mock.calls[0][0].code).toBe('UNAUTHORIZED');
  });
});

// ─── requireAdminOrApiKey ─────────────────────────────────────────────────────
// Used on routes that should accept EITHER a logged-in admin (JWT Bearer) OR a
// third-party caller with an API key. The middleware checks whether the request
// includes an x-api-key header and routes accordingly.

describe('requireAdminOrApiKey', () => {
  it('falls back to requireAdmin path when no API key is present', async () => {
    const token = signAccessToken({ sub: 'a1', type: 'admin' });
    const adminRecord = { id: 'a1', name: 'Bob', email: 'bob@test.com' };
    prisma.admin.findUnique.mockResolvedValue(adminRecord);

    const req = bearerReq(token);   // only Bearer header, no x-api-key
    const next = makeNext();
    await requireAdminOrApiKey(req, makeRes(), next);
    // Normal admin path: req.admin set from DB
    expect(req.admin).toEqual(adminRecord);
    expect(next).toHaveBeenCalledWith();
  });

  it('uses requireApiKey path when x-api-key header is present', async () => {
    const fakeApiKey = {
      id: 'k1',
      title: 'T',
      isActive: true,
      createdByAdminId: 'a1',
      createdByAdmin: { id: 'a1', name: 'Bob', email: 'bob@test.com' },
    };
    findActiveApiKeyByValue.mockResolvedValue(fakeApiKey);

    const req = apiKeyReq('cza_somekey');   // x-api-key header present
    const next = makeNext();
    await requireAdminOrApiKey(req, makeRes(), next);
    // API key path: req.apiKey set, req.admin synthesized from createdByAdmin
    expect(req.apiKey).toBeDefined();
    expect(next).toHaveBeenCalledWith();
  });
});
