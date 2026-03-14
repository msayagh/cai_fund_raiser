'use strict';

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('dotenv');

const projectRoot = path.resolve(__dirname, '..');
dotenv.config({ path: path.resolve(projectRoot, '.env') });

const { resolveDatabaseConfig } = require('../src/config/database');

let dbConfig;
try {
  dbConfig = resolveDatabaseConfig(process.env);
} catch (error) {
  console.error('❌  Invalid database environment variables:');
  console.error(error.message);
  process.exit(1);
}

process.env.DB_PROVIDER = dbConfig.dbProvider;
process.env.DATABASE_URL = dbConfig.databaseUrl;

const sourceSchemaPath = path.resolve(projectRoot, 'prisma', 'schema.prisma');
if (!fs.existsSync(sourceSchemaPath)) {
  console.error(`❌  Prisma schema not found: ${sourceSchemaPath}`);
  process.exit(1);
}

const runtimeSchemaPath = path.resolve(projectRoot, 'prisma', 'schema.runtime.prisma');
const sourceSchema = fs.readFileSync(sourceSchemaPath, 'utf8');
const datasourceProviderPattern = /(datasource\s+db\s*\{[\s\S]*?provider\s*=\s*")[^"]+(")/m;
if (!datasourceProviderPattern.test(sourceSchema)) {
  console.error('❌  Could not locate `provider = \"...\"` in datasource `db` block.');
  process.exit(1);
}

const runtimeSchema = sourceSchema.replace(
  datasourceProviderPattern,
  `$1${dbConfig.dbProvider}$2`,
);

fs.writeFileSync(runtimeSchemaPath, runtimeSchema, 'utf8');

const prismaArgs = [...process.argv.slice(2), '--schema', runtimeSchemaPath];
const runner = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const result = spawnSync(runner, ['prisma', ...prismaArgs], {
  stdio: 'inherit',
  env: process.env,
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
