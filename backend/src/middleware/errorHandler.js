'use strict';

const logger = require('../utils/logger');
const AppError = require('../utils/AppError');
const config = require('../config/env');

const notFound = (req, res, next) => {
  next(new AppError(`Route ${req.method} ${req.originalUrl} not found`, 404, 'NOT_FOUND'));
};

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  // Prisma unique constraint violation
  if (err.code === 'P2002') {
    const field = err.meta?.target ?? 'field';
    return res.status(409).json({
      success: false,
      error: { code: 'CONFLICT', message: `A record with that ${field} already exists.` },
    });
  }

  // Prisma record not found
  if (err.code === 'P2025') {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Record not found.' },
    });
  }

  // Multer file size error
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      error: { code: 'FILE_TOO_LARGE', message: 'File exceeds 5 MB limit.' },
    });
  }

  if (err.isOperational) {
    const body = {
      success: false,
      error: { code: err.code, message: err.message },
    };
    if (err.details) body.error.details = err.details;
    return res.status(err.statusCode).json(body);
  }

  logger.error('Unhandled error', {
    message: err.message,
    stack: config.NODE_ENV !== 'production' ? err.stack : undefined,
    path: req.originalUrl,
    method: req.method,
  });

  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: config.NODE_ENV === 'production' ? 'An unexpected error occurred.' : err.message,
    },
  });
};

module.exports = { notFound, errorHandler };
