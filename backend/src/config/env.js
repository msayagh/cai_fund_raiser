'use strict';

const { z } = require('zod');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { resolveDatabaseConfig } = require('./database');

let dbConfig;
try {
  dbConfig = resolveDatabaseConfig(process.env);
  process.env.DB_PROVIDER = dbConfig.dbProvider;
  process.env.DATABASE_URL = dbConfig.databaseUrl;
} catch (error) {
  console.error('❌  Invalid database environment variables:');
  console.error(error.message);
  process.exit(1);
}

const envSchema = z.object({
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DB_PROVIDER: z.enum(['mysql', 'sqlite']).default('sqlite'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  SQLITE_DATABASE_URL: z.string().optional(),
  DB_HOST: z.string().optional(),
  DB_PORT: z.string().optional(),
  MYSQL_DATABASE: z.string().optional(),
  MYSQL_USER: z.string().optional(),
  MYSQL_PASSWORD: z.string().optional(),
  MYSQL_ROOT_PASSWORD: z.string().optional(),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 chars'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 chars'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().default('Masjid Al-Noor <noreply@masjid.com>'),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
  GOOGLE_CLIENT_ID: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌  Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

module.exports = parsed.data;
