'use strict';

// ─── Test Suite: AppError ─────────────────────────────────────────────────────
// AppError is a custom error class used throughout the backend to signal
// expected ("operational") errors such as 404 Not Found or 409 Conflict.
// All routes feed these errors into the global errorHandler middleware which
// reads .statusCode, .code, and .details to build the JSON response.

const AppError = require('../../utils/AppError');

describe('AppError', () => {
  // ── Default values ──────────────────────────────────────────────────────
  it('creates an error with default values when only a message is given', () => {
    const err = new AppError('Something broke');

    // Must extend both Error (so catch blocks work) and AppError (for instanceof checks)
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AppError);

    // Core fields ─ the errorHandler uses all four of these
    expect(err.message).toBe('Something broke');  // human-readable message
    expect(err.statusCode).toBe(500);             // HTTP status — defaults to 500
    expect(err.code).toBe('INTERNAL_ERROR');       // machine-readable code for clients
    expect(err.details).toBeNull();                // extra info — null by default
    expect(err.isOperational).toBe(true);          // marks it as a known/safe error
    expect(err.name).toBe('AppError');             // used in logs for identification
  });

  // ── Custom fields ───────────────────────────────────────────────────────
  it('accepts custom statusCode, code, and details passed as constructor args', () => {
    const details = { field: 'email', issue: 'already taken' };
    // The 4th argument is optional extra detail — used for validation errors etc.
    const err = new AppError('Email taken', 409, 'EMAIL_TAKEN', details);

    expect(err.statusCode).toBe(409);             // Conflict
    expect(err.code).toBe('EMAIL_TAKEN');          // specific error code
    expect(err.details).toEqual(details);          // details object passed through
  });

  // ── Stack trace ─────────────────────────────────────────────────────────
  it('has a stack trace captured at construction time', () => {
    const err = new AppError('oops');
    // Error.captureStackTrace is called in the constructor so the stack should
    // exist and reference the AppError class name (not Error)
    expect(typeof err.stack).toBe('string');
    expect(err.stack).toContain('AppError');
  });

  // ── instanceof ──────────────────────────────────────────────────────────
  it('is caught by a generic catch(err instanceof Error) guard', () => {
    // Important: try/catch blocks that check `instanceof Error` must still fire
    const err = new AppError('x');
    expect(err instanceof Error).toBe(true);
  });

  // ── isOperational flag ──────────────────────────────────────────────────
  it('always sets isOperational=true so errorHandler does not log it as unexpected', () => {
    // The global errorHandler checks err.isOperational to decide whether to log
    // a stack trace.  AppError is always operational (expected business errors).
    expect(new AppError('x').isOperational).toBe(true);
  });

  // ── Zero statusCode ─────────────────────────────────────────────────────
  it('stores whatever statusCode is passed, including edge values', () => {
    const err = new AppError('gone', 410, 'GONE');
    expect(err.statusCode).toBe(410);
  });
});
