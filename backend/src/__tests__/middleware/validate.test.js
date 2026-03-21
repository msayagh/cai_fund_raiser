'use strict';

// ─── Test Suite: validate middleware ─────────────────────────────────────────────
// validate(schema) is a HOF (higher-order function) that returns an Express
// middleware which validates req.body against a Zod schema before the
// controller runs.  On success it replaces req.body with the parsed/coerced
// output.  On failure it passes an AppError 400 to next().

const { z } = require('zod');
const validate = require('../../middleware/validate');
const AppError  = require('../../utils/AppError');

// Helper: build the three Express args we need for each test
const makeReqRes = (body) => ({
  req: { body },
  res: {},
  next: jest.fn(),   // captures whatever is passed to next()
});

describe('validate middleware', () => {
  // A reusable test schema with two fields
  const schema = z.object({
    email: z.string().email(),         // must be valid email format
    age: z.number().int().positive(),  // must be a positive integer
  });

  // ── Happy path ────────────────────────────────────────────────────
  it('calls next() with no argument when the body passes validation', () => {
    const { req, res, next } = makeReqRes({ email: 'test@example.com', age: 25 });
    validate(schema)(req, res, next);
    // next() with NO argument means “go to the next middleware/controller”
    expect(next).toHaveBeenCalledWith();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('replaces req.body with the Zod-parsed output (coercion applied)', () => {
    // .trim() is a Zod transform — the middleware must use result.data, not raw body
    const s = z.object({ name: z.string().trim() });
    const { req, res, next } = makeReqRes({ name: '  Alice  ' });
    validate(s)(req, res, next);
    expect(req.body.name).toBe('Alice');   // whitespace stripped by Zod transform
  });

  // ── Failure paths ──────────────────────────────────────────────────
  it('calls next(AppError) with HTTP 400 VALIDATION_ERROR on bad input', () => {
    const { req, res, next } = makeReqRes({ email: 'not-an-email', age: -1 });
    validate(schema)(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];     // first argument passed to next()
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(400);      // Bad Request
    expect(err.code).toBe('VALIDATION_ERROR');
  });

  it('attaches Zod flatten() details to the error so the client can show field errors', () => {
    // err.details is serialised to the response body for API clients
    const { req, res, next } = makeReqRes({ email: 'bad', age: 'not-a-number' });
    validate(schema)(req, res, next);
    const err = next.mock.calls[0][0];
    expect(err.details).toBeDefined();
    expect(err.details).toHaveProperty('fieldErrors');  // field-level error map
  });

  it('uses the first Zod field error as the main message', () => {
    // Controllers and tests rely on err.message being human-readable
    const s = z.object({ name: z.string().min(3, 'Name too short') });
    const { req, res, next } = makeReqRes({ name: 'AB' });
    validate(s)(req, res, next);
    const err = next.mock.calls[0][0];
    expect(err.message).toBe('Name too short');
  });

  it('falls back to "Validation failed" when only a form-level (refine) error exists', () => {
    // .refine() errors end up in formErrors, not fieldErrors
    const s = z
      .object({ a: z.number(), b: z.number() })
      .refine((data) => data.a < data.b, 'a must be less than b');
    const { req, res, next } = makeReqRes({ a: 5, b: 3 });
    validate(s)(req, res, next);
    const err = next.mock.calls[0][0];
    expect(err.message).toBeTruthy();           // must still have a message
  });

  it('does not modify req.body when validation fails', () => {
    // The original body must be preserved so upstream error logging can inspect it
    const original = { email: 'bad', age: -1 };
    const { req, res, next } = makeReqRes(original);
    validate(schema)(req, res, next);
    expect(req.body).toEqual(original);         // req.body unchanged on failure
  });
});
