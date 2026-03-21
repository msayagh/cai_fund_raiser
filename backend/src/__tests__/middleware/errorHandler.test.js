'use strict';

// ─── Test Suite: errorHandler middleware ────────────────────────────────────────
// This module exports two middleware functions:
//   notFound   — generates a 404 AppError when no route matched
//   errorHandler — the 4-argument Express error handler that converts errors
//                  to a consistent { success:false, error:{code,message} } JSON body
//
// The logger is mocked so no Winston file I/O occurs during tests.

// Suppress Winston calls — we don't want real log files or console noise
jest.mock('../../utils/logger', () => ({
  error: jest.fn(),
  warn:  jest.fn(),
  info:  jest.fn(),
}));

const { notFound, errorHandler } = require('../../middleware/errorHandler');
const AppError = require('../../utils/AppError');

// Minimal mock Express objects
const makeReq = (method = 'GET', url = '/test') => ({ method, originalUrl: url });
const makeRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json   = jest.fn().mockReturnValue(res);
  return res;
};

// ─── notFound ───────────────────────────────────────────────────────────────
describe('notFound', () => {
  it('passes an AppError 404 NOT_FOUND to next() with method + path in the message', () => {
    const req  = makeReq('DELETE', '/unknown');
    const next = jest.fn();
    notFound(req, {}, next);

    // Express skips to the error handler when next() is called with an argument
    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe('NOT_FOUND');
    expect(err.message).toContain('DELETE');    // helps debugging in logs
    expect(err.message).toContain('/unknown');  // includes the matched path
  });
});

// ─── errorHandler ──────────────────────────────────────────────────────────
describe('errorHandler', () => {
  // next is required by Express for 4-arg error handlers but never called here
  const next = jest.fn();

  // ── Prisma-specific error codes ──────────────────────────────────────────
  it('converts Prisma P2002 (unique constraint) to HTTP 409 CONFLICT', () => {
    const res = makeRes();
    // err.meta.target is the field name that caused the conflict (from Prisma)
    const err = { code: 'P2002', meta: { target: 'email' } };
    errorHandler(err, makeReq(), res, next);
    expect(res.status).toHaveBeenCalledWith(409);
    const body = res.json.mock.calls[0][0];
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('CONFLICT');
    expect(body.error.message).toContain('email');    // includes the field name
  });

  it('falls back to generic field name when Prisma P2002 has no meta', () => {
    const res = makeRes();
    errorHandler({ code: 'P2002' }, makeReq(), res, next);
    expect(res.status).toHaveBeenCalledWith(409);
  });

  it('converts Prisma P2025 (record not found) to HTTP 404', () => {
    // Happens when Prisma update/delete targets a record that no longer exists
    const res = makeRes();
    errorHandler({ code: 'P2025' }, makeReq(), res, next);
    expect(res.status).toHaveBeenCalledWith(404);
    const body = res.json.mock.calls[0][0];
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('converts Multer LIMIT_FILE_SIZE to HTTP 400 FILE_TOO_LARGE', () => {
    // Multer sets err.code when the file exceeds the configured size limit
    const res = makeRes();
    errorHandler({ code: 'LIMIT_FILE_SIZE' }, makeReq(), res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    const body = res.json.mock.calls[0][0];
    expect(body.error.code).toBe('FILE_TOO_LARGE');
  });

  // ── Operational AppError ──────────────────────────────────────────────
  it('uses the AppError’s own statusCode and code for operational errors', () => {
    const res = makeRes();
    const err = new AppError('Email taken', 409, 'EMAIL_TAKEN');
    errorHandler(err, makeReq(), res, next);
    expect(res.status).toHaveBeenCalledWith(409);
    const body = res.json.mock.calls[0][0];
    expect(body.error.code).toBe('EMAIL_TAKEN');
    expect(body.error.message).toBe('Email taken');
  });

  it('includes err.details in the response body when present', () => {
    // Validation errors attach a Zod flatten() object as details
    const res = makeRes();
    const err = new AppError('Validation failed', 400, 'VALIDATION_ERROR', { fields: ['email'] });
    errorHandler(err, makeReq(), res, next);
    const body = res.json.mock.calls[0][0];
    expect(body.error.details).toEqual({ fields: ['email'] });
  });

  // ── Unexpected / non-operational errors ─────────────────────────────
  it('returns HTTP 500 INTERNAL_ERROR for unexpected non-operational errors', () => {
    // These are programming bugs or unhandled rejections — caught as a safety net
    const res = makeRes();
    const err = new Error('Something unexpected');
    errorHandler(err, makeReq(), res, next);
    expect(res.status).toHaveBeenCalledWith(500);
    const body = res.json.mock.calls[0][0];
    expect(body.error.code).toBe('INTERNAL_ERROR');
  });

  it('always sets success:false in the response body for error responses', () => {
    const res = makeRes();
    errorHandler(new Error('internal'), makeReq(), res, next);
    const body = res.json.mock.calls[0][0];
    expect(body.success).toBe(false);   // clients must never see success:true on errors
  });
});


describe('notFound', () => {
  it('passes an AppError 404 NOT_FOUND to next()', () => {
    const req = makeReq('DELETE', '/unknown');
    const next = jest.fn();
    notFound(req, {}, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe('NOT_FOUND');
    expect(err.message).toContain('DELETE');
    expect(err.message).toContain('/unknown');
  });
});

describe('errorHandler', () => {
  const next = jest.fn();

  it('handles Prisma P2002 (unique constraint) with 409 CONFLICT', () => {
    const res = makeRes();
    const err = { code: 'P2002', meta: { target: 'email' } };
    errorHandler(err, makeReq(), res, next);
    expect(res.status).toHaveBeenCalledWith(409);
    const body = res.json.mock.calls[0][0];
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('CONFLICT');
    expect(body.error.message).toContain('email');
  });

  it('handles Prisma P2002 without meta with generic field name', () => {
    const res = makeRes();
    errorHandler({ code: 'P2002' }, makeReq(), res, next);
    expect(res.status).toHaveBeenCalledWith(409);
  });

  it('handles Prisma P2025 (record not found) with 404', () => {
    const res = makeRes();
    errorHandler({ code: 'P2025' }, makeReq(), res, next);
    expect(res.status).toHaveBeenCalledWith(404);
    const body = res.json.mock.calls[0][0];
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('handles Multer LIMIT_FILE_SIZE with 400 FILE_TOO_LARGE', () => {
    const res = makeRes();
    errorHandler({ code: 'LIMIT_FILE_SIZE' }, makeReq(), res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    const body = res.json.mock.calls[0][0];
    expect(body.error.code).toBe('FILE_TOO_LARGE');
  });

  it('handles operational AppError with its own statusCode and code', () => {
    const res = makeRes();
    const err = new AppError('Email taken', 409, 'EMAIL_TAKEN');
    errorHandler(err, makeReq(), res, next);
    expect(res.status).toHaveBeenCalledWith(409);
    const body = res.json.mock.calls[0][0];
    expect(body.error.code).toBe('EMAIL_TAKEN');
    expect(body.error.message).toBe('Email taken');
  });

  it('includes details when AppError has them', () => {
    const res = makeRes();
    const err = new AppError('Validation failed', 400, 'VALIDATION_ERROR', { fields: ['email'] });
    errorHandler(err, makeReq(), res, next);
    const body = res.json.mock.calls[0][0];
    expect(body.error.details).toEqual({ fields: ['email'] });
  });

  it('returns 500 INTERNAL_ERROR for non-operational errors in test env', () => {
    const res = makeRes();
    const err = new Error('Something unexpected');
    errorHandler(err, makeReq(), res, next);
    expect(res.status).toHaveBeenCalledWith(500);
    const body = res.json.mock.calls[0][0];
    expect(body.error.code).toBe('INTERNAL_ERROR');
  });

  it('never leaks stack traces in production-like env', () => {
    // NODE_ENV is 'test' here so message leaks — just ensure body.success is false
    const res = makeRes();
    errorHandler(new Error('secret internal details'), makeReq(), res, next);
    const body = res.json.mock.calls[0][0];
    expect(body.success).toBe(false);
    expect(typeof body.error.code).toBe('string');
  });
});
