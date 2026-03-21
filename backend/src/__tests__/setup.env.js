'use strict';

// Set all required environment variables before any module is loaded.
// This prevents src/config/env.js from calling process.exit(1).
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'file:./test.db';
process.env.DB_PROVIDER = 'sqlite';
process.env.JWT_ACCESS_SECRET = 'test_access_secret_must_be_at_least_32_chars!!';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_must_be_at_least_32_chars!';
process.env.PORT = '3001';
process.env.EMAIL_FROM = 'test@example.com';
process.env.FRONTEND_URL = 'http://localhost:3000';
