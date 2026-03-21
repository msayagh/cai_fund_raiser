'use strict';

// ─── Test Suite: JWT utilities ──────────────────────────────────────────────────
// The JWT module wraps the jsonwebtoken library to issue two token types:
//   • Access Token  — short-lived (15 m), carries { sub, type } as payload
//   • Refresh Token — long-lived (7 d), includes a unique jti to enable rotation
// Both types use different secrets, so one cannot be substituted for the other.
// The secrets are read from src/config/env.js which reads from process.env;
// setup.env.js sets test values before any module is loaded.

const { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken } = require('../../utils/jwt');
const AppError = require('../../utils/AppError');

// Reusable payloads — same shape the auth.service passes when issuing tokens
const DONOR_PAYLOAD = { sub: 'donor-123', type: 'donor' };
const ADMIN_PAYLOAD = { sub: 'admin-456', type: 'admin' };

// ─── signAccessToken / verifyAccessToken ──────────────────────────────────
// Access tokens are Bearer tokens sent in the Authorization header.
// verifyAccessToken() is called by requireDonor / requireAdmin middleware.
describe('signAccessToken / verifyAccessToken', () => {
  it('signs a donor token and decodes the same sub + type back out', () => {
    const token = signAccessToken(DONOR_PAYLOAD);
    expect(typeof token).toBe('string');        // opaque JWT string

    const decoded = verifyAccessToken(token);
    expect(decoded.sub).toBe('donor-123');       // original subject (user id)
    expect(decoded.type).toBe('donor');          // tells middleware which model to look up
  });

  it('signs an admin token and decodes sub + type correctly', () => {
    const token = signAccessToken(ADMIN_PAYLOAD);
    const decoded = verifyAccessToken(token);
    expect(decoded.sub).toBe('admin-456');
    expect(decoded.type).toBe('admin');
  });

  it('throws AppError 401 when the signature is tampered', () => {
    const token = signAccessToken(DONOR_PAYLOAD);
    // Flip last 5 chars to invalidate the signature
    const tampered = token.slice(0, -5) + 'XXXXX';
    expect(() => verifyAccessToken(tampered)).toThrow(AppError);
    expect(() => verifyAccessToken(tampered)).toThrow('Invalid or expired access token');
  });

  it('throws AppError 401 for a completely invalid string', () => {
    // Any non-JWT string should be rejected
    expect(() => verifyAccessToken('not.a.jwt')).toThrow(AppError);
  });

  it('throws with statusCode 401 and code UNAUTHORIZED on failure', () => {
    // The errorHandler reads these fields to build the 401 JSON response
    try {
      verifyAccessToken('bad');
    } catch (err) {
      expect(err.code).toBe('UNAUTHORIZED');
      expect(err.statusCode).toBe(401);
    }
  });

  it('rejects a refresh token passed to verifyAccessToken (wrong secret)', () => {
    // Access and refresh tokens use different secrets by design
    const rt = signRefreshToken(DONOR_PAYLOAD);
    expect(() => verifyAccessToken(rt)).toThrow(AppError);
  });
});

// ─── signRefreshToken / verifyRefreshToken ────────────────────────────────
// Refresh tokens are stored (hashed) in the DB and are single-use.
// Each token includes a jti claim so that two tokens issued in the same second
// still hash to different values — this prevents replay collisions.
describe('signRefreshToken / verifyRefreshToken', () => {
  it('signs a refresh token and decodes sub + type back out', () => {
    const token = signRefreshToken(DONOR_PAYLOAD);
    expect(typeof token).toBe('string');

    const decoded = verifyRefreshToken(token);
    expect(decoded.sub).toBe('donor-123');
    expect(decoded.type).toBe('donor');
  });

  it('includes a unique jti claim so that each token has a distinct DB hash', () => {
    const t1 = signRefreshToken(DONOR_PAYLOAD);
    const t2 = signRefreshToken(DONOR_PAYLOAD);
    const d1 = verifyRefreshToken(t1);
    const d2 = verifyRefreshToken(t2);

    expect(d1.jti).toBeDefined();              // jti must exist
    expect(d2.jti).toBeDefined();
    expect(d1.jti).not.toBe(d2.jti);          // and must differ between tokens
  });

  it('throws AppError 401 when refresh token signature is tampered', () => {
    const token = signRefreshToken(ADMIN_PAYLOAD);
    const bad = token.slice(0, -3) + 'ZZZ';   // corrupt last 3 chars
    expect(() => verifyRefreshToken(bad)).toThrow(AppError);
  });

  it('rejects an access token passed to verifyRefreshToken (wrong secret)', () => {
    const at = signAccessToken(DONOR_PAYLOAD);
    expect(() => verifyRefreshToken(at)).toThrow(AppError);
  });
});
