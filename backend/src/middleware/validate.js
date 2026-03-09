'use strict';

const AppError = require('../utils/AppError');

/**
 * Creates a Zod validation middleware for req.body.
 * @param {import('zod').ZodSchema} schema
 */
const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const err = new AppError('Validation failed', 400, 'VALIDATION_ERROR');
    err.details = result.error.flatten();
    return next(err);
  }
  req.body = result.data;
  next();
};

module.exports = validate;
