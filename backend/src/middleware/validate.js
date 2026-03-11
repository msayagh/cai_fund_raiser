'use strict';

const AppError = require('../utils/AppError');

/**
 * Creates a Zod validation middleware for req.body.
 * @param {import('zod').ZodSchema} schema
 */
const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const details = result.error.flatten();
    const firstFieldError = Object.values(details.fieldErrors).find((messages) => Array.isArray(messages) && messages.length > 0);
    const firstFormError = details.formErrors?.[0];
    const message = firstFieldError?.[0] || firstFormError || 'Validation failed';

    const err = new AppError(message, 400, 'VALIDATION_ERROR');
    err.details = details;
    return next(err);
  }
  req.body = result.data;
  next();
};

module.exports = validate;
