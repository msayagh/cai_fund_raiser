'use strict';

module.exports = {
  testEnvironment: 'node',
  setupFiles: ['./src/__tests__/setup.env.js'],
  testMatch: ['**/src/__tests__/**/*.test.js'],
  clearMocks: true,
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/__tests__/**',
    '!src/config/env.js',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  testTimeout: 10000,
};
