'use strict';

// ─── Test Suite: OTP utilities ─────────────────────────────────────────────────
// The OTP (One-Time Password) module handles the email-based verification flow
// used for: donor registration, forgot-password, and admin password-reset.
// It has ZERO external dependencies — pure Node.js crypto — so no mocking needed.

const { generateOtp, hashOtp, verifyOtp, otpExpiresAt } = require('../../utils/otp');

// ─── generateOtp ──────────────────────────────────────────────────────────
// generateOtp() wraps crypto.randomInt to create a 6-digit numeric string.
describe('generateOtp', () => {
  it('returns a 6-digit string (no letters, no signs)', () => {
    const otp = generateOtp();
    expect(typeof otp).toBe('string');       // must be a string, not a number
    expect(otp).toMatch(/^\d{6}$/);          // exactly six decimal digits
  });

  it('produces values in the range [100000, 999999] (never leading-zero shortfall)', () => {
    // crypto.randomInt(100000, 999999) ensures we always have exactly 6 digits
    for (let i = 0; i < 20; i++) {
      const n = parseInt(generateOtp(), 10);
      expect(n).toBeGreaterThanOrEqual(100000);
      expect(n).toBeLessThanOrEqual(999999);
    }
  });

  it('generates different values on repeated calls (not a constant)', () => {
    // Generates 10 OTPs and checks they are not all the same value.
    // Statistically impossible to fail unless the RNG is broken.
    const values = new Set(Array.from({ length: 10 }, generateOtp));
    expect(values.size).toBeGreaterThan(1);
  });
});

// ─── hashOtp ────────────────────────────────────────────────────────────────
// hashOtp() creates a SHA-256 digest of the plain-text code so we never store
// the raw OTP in the database.
describe('hashOtp', () => {
  it('returns a 64-character lowercase hex string (SHA-256 output)', () => {
    const hash = hashOtp('123456');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);  // SHA-256 = 32 bytes = 64 hex chars
  });

  it('is deterministic — same input always produces same hash', () => {
    // The DB stores codeHash; verify() must re-hash the submitted code and compare.
    expect(hashOtp('999999')).toBe(hashOtp('999999'));
  });

  it('produces completely different hashes for different codes (avalanche effect)', () => {
    expect(hashOtp('111111')).not.toBe(hashOtp('222222'));
  });
});

// ─── verifyOtp ────────────────────────────────────────────────────────────────
// verifyOtp() uses crypto.timingSafeEqual to prevent timing-oracle attacks.
// It hashes the submitted code and compares byte-by-byte in constant time.
describe('verifyOtp', () => {
  it('returns true when submitted code matches the stored hash', () => {
    const code = '654321';
    const stored = hashOtp(code);             // simulate what was saved to DB
    expect(verifyOtp(code, stored)).toBe(true);
  });

  it('returns false when the submitted code is wrong', () => {
    const stored = hashOtp('654321');
    expect(verifyOtp('999999', stored)).toBe(false); // different code → wrong hash
  });

  it('returns false when the stored hash has unexpected length (tampered DB value)', () => {
    // Buffer.from(shortHex, 'hex') produces fewer bytes → length mismatch guard fires
    expect(verifyOtp('123456', 'abcd')).toBe(false);
  });
});

// ─── otpExpiresAt ────────────────────────────────────────────────────────────
// otpExpiresAt() simply adds OTP_EXPIRY_MINUTES (10) to the current time.
// The result is stored in otpCode.expiresAt and checked before comparing codes.
describe('otpExpiresAt', () => {
  it('returns a Date approximately 10 minutes in the future', () => {
    const before = Date.now();     // capture time before call
    const expiry = otpExpiresAt();
    const after = Date.now();      // capture time after call

    expect(expiry).toBeInstanceOf(Date);
    const ms = expiry.getTime();

    // Allow a 5-second window to avoid flakiness on slow CI machines
    expect(ms).toBeGreaterThanOrEqual(before + 9 * 60 * 1000 + 55_000);
    expect(ms).toBeLessThanOrEqual(after  + 10 * 60 * 1000 + 5_000);
  });
});
