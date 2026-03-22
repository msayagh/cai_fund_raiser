'use strict';

/**
 * Feature flags driven by environment variables.
 * Set FEATURE_VOLUNTEERING=true in .env to enable the volunteering module.
 */
const features = {
  VOLUNTEERING: process.env.FEATURE_VOLUNTEERING === 'true',
};

module.exports = features;
