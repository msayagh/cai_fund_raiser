'use strict';

// ─── Test Suite: Database configuration resolver ───────────────────────────
// resolveDatabaseConfig() reads raw environment variables and returns
// { dbProvider: 'sqlite'|'mysql', databaseUrl: string }.
// It supports two DB backends and several ways to specify the connection:
//   1. Explicit sqlite URL (file:...)        → sqlite
//   2. Explicit mysql URL (mysql://...)      → mysql
//   3. Individual MySQL env vars              → builds a mysql:// URL
//   4. Nothing at all                         → defaults to SQLite dev.db

const { resolveDatabaseConfig, DEFAULT_SQLITE_DATABASE_URL } = require('../../config/database');

describe('resolveDatabaseConfig', () => {

  // ── SQLite — defaults ────────────────────────────────────────────────
  describe('SQLite — default path', () => {
    it('defaults to sqlite provider and file:./dev.db when no env vars are set', () => {
      // An empty env object simulates a freshly cloned repo with no .env file
      const result = resolveDatabaseConfig({});
      expect(result.dbProvider).toBe('sqlite');
      expect(result.databaseUrl).toBe(DEFAULT_SQLITE_DATABASE_URL); // 'file:./dev.db'
    });

    it('uses SQLITE_DATABASE_URL when provided instead of the default path', () => {
      // Allows developers to use a custom SQLite file path
      const result = resolveDatabaseConfig({ SQLITE_DATABASE_URL: 'file:./custom.db' });
      expect(result.dbProvider).toBe('sqlite');
      expect(result.databaseUrl).toBe('file:./custom.db');
    });

    it('accepts DB_PROVIDER=sqlite to be explicit', () => {
      const result = resolveDatabaseConfig({ DB_PROVIDER: 'sqlite' });
      expect(result.dbProvider).toBe('sqlite');
    });
  });

  // ── SQLite — via DATABASE_URL ─────────────────────────────────────────
  describe('SQLite — via DATABASE_URL', () => {
    it('infers sqlite provider from a file: DATABASE_URL automatically', () => {
      // Many hosting platforms set DATABASE_URL directly
      const result = resolveDatabaseConfig({ DATABASE_URL: 'file:./prod.db' });
      expect(result.dbProvider).toBe('sqlite');
      expect(result.databaseUrl).toBe('file:./prod.db');
    });
  });

  // ── MySQL — via DATABASE_URL ─────────────────────────────────────────
  describe('MySQL — via DATABASE_URL', () => {
    it('infers mysql provider from a mysql:// DATABASE_URL automatically', () => {
      const url = 'mysql://user:pass@localhost:3306/mydb';
      const result = resolveDatabaseConfig({ DATABASE_URL: url });
      expect(result.dbProvider).toBe('mysql');
      expect(result.databaseUrl).toBe(url);   // URL passed through unchanged
    });
  });

  // ── MySQL — via individual env vars ──────────────────────────────────
  describe('MySQL — via individual env vars', () => {
    // This is the docker-compose.yml style where each DB var is separate
    const mysqlEnv = {
      DB_PROVIDER: 'mysql',
      DB_HOST: 'db.example.com',
      DB_PORT: '3306',
      MYSQL_DATABASE: 'mosque',
      MYSQL_USER: 'admin',
      MYSQL_PASSWORD: 'secret',
    };

    it('builds a valid mysql:// URL from the individual host/port/db/user/pass vars', () => {
      const result = resolveDatabaseConfig(mysqlEnv);
      expect(result.dbProvider).toBe('mysql');
      expect(result.databaseUrl).toMatch(/^mysql:\/\//);         // proper scheme
      expect(result.databaseUrl).toContain('db.example.com:3306'); // host:port
      expect(result.databaseUrl).toContain('mosque');               // database name
    });

    it('URL-encodes special characters in credentials to prevent injection', () => {
      // Special chars in user/password must be percent-encoded in the connection URL
      const result = resolveDatabaseConfig({
        ...mysqlEnv,
        MYSQL_USER: 'admin@org',
        MYSQL_PASSWORD: 'p@$$word',
      });
      expect(result.databaseUrl).toContain(encodeURIComponent('admin@org'));
      expect(result.databaseUrl).toContain(encodeURIComponent('p@$$word'));
    });

    it('throws with the missing var name when DB_HOST is absent', () => {
      const { DB_HOST, ...rest } = mysqlEnv;
      expect(() => resolveDatabaseConfig(rest)).toThrow('DB_HOST');
    });

    it('throws with the missing var name when MYSQL_DATABASE is absent', () => {
      const { MYSQL_DATABASE, ...rest } = mysqlEnv;
      expect(() => resolveDatabaseConfig(rest)).toThrow('MYSQL_DATABASE');
    });

    it('throws with the missing var name when MYSQL_USER is absent', () => {
      const { MYSQL_USER, ...rest } = mysqlEnv;
      expect(() => resolveDatabaseConfig(rest)).toThrow('MYSQL_USER');
    });

    it('throws with the missing var name when MYSQL_PASSWORD is absent', () => {
      const { MYSQL_PASSWORD, ...rest } = mysqlEnv;
      expect(() => resolveDatabaseConfig(rest)).toThrow('MYSQL_PASSWORD');
    });
  });

  // ── Validation errors ─────────────────────────────────────────────────
  describe('Validation errors', () => {
    it('throws when DB_PROVIDER is set to an unsupported value (e.g. postgres)', () => {
      // Currently only sqlite and mysql are supported
      expect(() => resolveDatabaseConfig({ DB_PROVIDER: 'postgres' })).toThrow(
        'DB_PROVIDER must be one of'
      );
    });

    it('throws when DATABASE_URL scheme does not match DB_PROVIDER', () => {
      // Prevents confusing misconfigurations: mysql provider + sqlite URL
      expect(() =>
        resolveDatabaseConfig({
          DB_PROVIDER: 'mysql',
          DATABASE_URL: 'file:./dev.db', // sqlite URL with mysql provider
        })
      ).toThrow(/does not match/);
    });
  });
});

// ─── DEFAULT_SQLITE_DATABASE_URL constant ────────────────────────────────
describe('DEFAULT_SQLITE_DATABASE_URL', () => {
  it('is a file: URL (not a raw path)', () => {
    // Prisma requires the file: scheme; a bare path would fail
    expect(DEFAULT_SQLITE_DATABASE_URL).toMatch(/^file:/);
  });
});


describe('resolveDatabaseConfig', () => {
  describe('SQLite — default path', () => {
    it('defaults to sqlite with file:./dev.db when no env vars set', () => {
      const result = resolveDatabaseConfig({});
      expect(result.dbProvider).toBe('sqlite');
      expect(result.databaseUrl).toBe(DEFAULT_SQLITE_DATABASE_URL);
    });

    it('uses SQLITE_DATABASE_URL when provided', () => {
      const result = resolveDatabaseConfig({ SQLITE_DATABASE_URL: 'file:./custom.db' });
      expect(result.dbProvider).toBe('sqlite');
      expect(result.databaseUrl).toBe('file:./custom.db');
    });

    it('accepts explicit DB_PROVIDER=sqlite', () => {
      const result = resolveDatabaseConfig({ DB_PROVIDER: 'sqlite' });
      expect(result.dbProvider).toBe('sqlite');
    });
  });

  describe('SQLite — via DATABASE_URL', () => {
    it('infers sqlite from a file: DATABASE_URL', () => {
      const result = resolveDatabaseConfig({ DATABASE_URL: 'file:./prod.db' });
      expect(result.dbProvider).toBe('sqlite');
      expect(result.databaseUrl).toBe('file:./prod.db');
    });
  });

  describe('MySQL — via DATABASE_URL', () => {
    it('infers mysql from a mysql:// DATABASE_URL', () => {
      const url = 'mysql://user:pass@localhost:3306/mydb';
      const result = resolveDatabaseConfig({ DATABASE_URL: url });
      expect(result.dbProvider).toBe('mysql');
      expect(result.databaseUrl).toBe(url);
    });
  });

  describe('MySQL — via individual env vars', () => {
    const mysqlEnv = {
      DB_PROVIDER: 'mysql',
      DB_HOST: 'db.example.com',
      DB_PORT: '3306',
      MYSQL_DATABASE: 'mosque',
      MYSQL_USER: 'admin',
      MYSQL_PASSWORD: 'secret',
    };

    it('builds a mysql:// URL from individual vars', () => {
      const result = resolveDatabaseConfig(mysqlEnv);
      expect(result.dbProvider).toBe('mysql');
      expect(result.databaseUrl).toMatch(/^mysql:\/\//);
      expect(result.databaseUrl).toContain('db.example.com:3306');
      expect(result.databaseUrl).toContain('mosque');
    });

    it('encodes special characters in credentials', () => {
      const result = resolveDatabaseConfig({
        ...mysqlEnv,
        MYSQL_USER: 'admin@org',
        MYSQL_PASSWORD: 'p@$$word',
      });
      expect(result.databaseUrl).toContain(encodeURIComponent('admin@org'));
      expect(result.databaseUrl).toContain(encodeURIComponent('p@$$word'));
    });

    it('throws when DB_HOST is missing', () => {
      const { DB_HOST, ...rest } = mysqlEnv;
      expect(() => resolveDatabaseConfig(rest)).toThrow('DB_HOST');
    });

    it('throws when MYSQL_DATABASE is missing', () => {
      const { MYSQL_DATABASE, ...rest } = mysqlEnv;
      expect(() => resolveDatabaseConfig(rest)).toThrow('MYSQL_DATABASE');
    });

    it('throws when MYSQL_USER is missing', () => {
      const { MYSQL_USER, ...rest } = mysqlEnv;
      expect(() => resolveDatabaseConfig(rest)).toThrow('MYSQL_USER');
    });

    it('throws when MYSQL_PASSWORD is missing', () => {
      const { MYSQL_PASSWORD, ...rest } = mysqlEnv;
      expect(() => resolveDatabaseConfig(rest)).toThrow('MYSQL_PASSWORD');
    });
  });

  describe('Validation errors', () => {
    it('throws for an unsupported DB_PROVIDER', () => {
      expect(() => resolveDatabaseConfig({ DB_PROVIDER: 'postgres' })).toThrow(
        'DB_PROVIDER must be one of'
      );
    });

    it('throws when DATABASE_URL provider mismatches DB_PROVIDER', () => {
      expect(() =>
        resolveDatabaseConfig({
          DB_PROVIDER: 'mysql',
          DATABASE_URL: 'file:./dev.db', // sqlite URL but mysql provider
        })
      ).toThrow(/does not match/);
    });
  });
});

describe('DEFAULT_SQLITE_DATABASE_URL', () => {
  it('is a file: URL', () => {
    expect(DEFAULT_SQLITE_DATABASE_URL).toMatch(/^file:/);
  });
});
