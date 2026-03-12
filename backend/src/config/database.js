'use strict';

const SUPPORTED_DB_PROVIDERS = ['mysql', 'sqlite'];
const DEFAULT_SQLITE_DATABASE_URL = 'file:./dev.db';

function getUrlProvider(databaseUrl) {
  if (!databaseUrl) return null;

  if (databaseUrl.startsWith('mysql://')) return 'mysql';
  if (databaseUrl.startsWith('file:')) return 'sqlite';

  return null;
}

function resolveDbProvider(env) {
  const rawProvider = (env.DB_PROVIDER || '').trim().toLowerCase();

  if (rawProvider) {
    if (!SUPPORTED_DB_PROVIDERS.includes(rawProvider)) {
      throw new Error(`DB_PROVIDER must be one of: ${SUPPORTED_DB_PROVIDERS.join(', ')}`);
    }

    return rawProvider;
  }

  const providerFromUrl = getUrlProvider((env.DATABASE_URL || '').trim());
  return providerFromUrl || 'sqlite';
}

function buildMysqlUrl(env) {
  const host = (env.DB_HOST || '').trim();
  const port = (env.DB_PORT || '3306').trim();
  const database = (env.MYSQL_DATABASE || '').trim();
  const user = (env.MYSQL_USER || '').trim();
  const password = (env.MYSQL_PASSWORD || '').trim();

  const missing = [];
  if (!host) missing.push('DB_HOST');
  if (!port) missing.push('DB_PORT');
  if (!database) missing.push('MYSQL_DATABASE');
  if (!user) missing.push('MYSQL_USER');
  if (!password) missing.push('MYSQL_PASSWORD');

  if (missing.length > 0) {
    throw new Error(`Missing MySQL env vars: ${missing.join(', ')}`);
  }

  return `mysql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
}

function resolveDatabaseConfig(env) {
  const dbProvider = resolveDbProvider(env);
  const rawDatabaseUrl = (env.DATABASE_URL || '').trim();

  if (rawDatabaseUrl) {
    const urlProvider = getUrlProvider(rawDatabaseUrl);
    if (urlProvider && urlProvider !== dbProvider) {
      throw new Error(`DATABASE_URL (${urlProvider}) does not match DB_PROVIDER (${dbProvider})`);
    }

    return { dbProvider, databaseUrl: rawDatabaseUrl };
  }

  if (dbProvider === 'mysql') {
    return { dbProvider, databaseUrl: buildMysqlUrl(env) };
  }

  return {
    dbProvider,
    databaseUrl: (env.SQLITE_DATABASE_URL || DEFAULT_SQLITE_DATABASE_URL).trim() || DEFAULT_SQLITE_DATABASE_URL,
  };
}

module.exports = {
  DEFAULT_SQLITE_DATABASE_URL,
  SUPPORTED_DB_PROVIDERS,
  resolveDatabaseConfig,
};
