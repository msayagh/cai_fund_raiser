'use strict';

const AppError = require('../utils/AppError');
const features = require('../config/features');

/**
 * Returns middleware that 404s if the named feature flag is disabled.
 * Usage: router.use(featureFlag('VOLUNTEERING'))
 * @param {string} flagName
 */
const featureFlag = (flagName) => (_req, _res, next) => {
  if (!features[flagName]) {
    return next(new AppError('Not found', 404, 'NOT_FOUND'));
  }
  next();
};

module.exports = featureFlag;
