'use strict';

// ─── Test Suite: apiKeys.service ──────────────────────────────────────────────
// API keys allow third-party integrations (e.g. embedded donation widgets,
// Google Sheets export scripts) to make admin-level API calls without needing a
// real admin account.
//
// Key design details:
//   - Every key is prefixed with "cza_" so it's easy to identify in logs/code
//   - The raw key value is NEVER stored in the DB — only its SHA-256 hash is stored
//   - keyPrefix (first ~12 chars) is stored for display; the full value is shown
//     only once at creation time
//   - findActiveApiKeyByValue compares the SHA-256 hash and updates lastUsedAt

// Mock the Prisma client
jest.mock('../../../db/client', () => ({
  apiKey: {
    findUnique: jest.fn(),
    findMany:   jest.fn(),
    create:     jest.fn(),
    update:     jest.fn(),
    delete:     jest.fn(),
  },
  activityLog: { create: jest.fn() },
}));

// Mock audit log calls
jest.mock('../../../modules/logs/logs.service', () => ({
  createLog: jest.fn().mockResolvedValue(undefined),
}));

const prisma   = require('../../../db/client');
const AppError = require('../../../utils/AppError');
const {
  findActiveApiKeyByValue,
  listApiKeys,
  createApiKey,
  updateApiKey,
  deleteApiKey,
} = require('../../../modules/apiKeys/apiKeys.service');
const crypto = require('crypto');

// Utility to compute the same SHA-256 hash the service uses
const hashKey = (v) => crypto.createHash('sha256').update(v).digest('hex');

// Minimal API key DB record
const stubApiKey = (overrides = {}) => ({
  id:               'key-1',
  title:            'My Key',
  keyPrefix:        'cza_abc123abc...',
  keyHash:          hashKey('cza_testvalue'),  // hash of 'cza_testvalue'
  isActive:         true,
  lastUsedAt:       null,
  createdAt:        new Date(),
  updatedAt:        new Date(),
  createdByAdminId: 'admin-1',
  createdByAdmin:   { id: 'admin-1', name: 'Alice', email: 'alice@test.com' },
  ...overrides,
});

// ─── findActiveApiKeyByValue ──────────────────────────────────────────────────
// findActiveApiKeyByValue(plainValue) → apiKey | null
// Hashes the input and looks it up.  Also updates lastUsedAt on a hit.

describe('findActiveApiKeyByValue', () => {
  it('returns the api key and updates lastUsedAt when active and found', async () => {
    const key = stubApiKey();
    prisma.apiKey.findUnique.mockResolvedValue(key);
    prisma.apiKey.update.mockResolvedValue(key);

    const result = await findActiveApiKeyByValue('cza_testvalue');
    expect(result).toEqual(key);
    // lastUsedAt must be refreshed on every successful lookup (for auditing)
    expect(prisma.apiKey.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'key-1' } })
    );
  });

  it('returns null when key not found', async () => {
    // Hash didn't match any record
    prisma.apiKey.findUnique.mockResolvedValue(null);
    const result = await findActiveApiKeyByValue('cza_unknown');
    expect(result).toBeNull();
  });

  it('returns null when key is inactive', async () => {
    // Key exists in DB but has been revoked (isActive=false)
    prisma.apiKey.findUnique.mockResolvedValue(stubApiKey({ isActive: false }));
    const result = await findActiveApiKeyByValue('cza_inactive');
    expect(result).toBeNull();
  });
});

// ─── listApiKeys ─────────────────────────────────────────────────────────────
// listApiKeys() → serialized apiKey[] (keyHash stripped for security)

describe('listApiKeys', () => {
  it('returns serialized api keys without raw keyHash', async () => {
    prisma.apiKey.findMany.mockResolvedValue([stubApiKey()]);
    const result = await listApiKeys();
    expect(result).toHaveLength(1);
    // keyHash must never leave the server — it's equivalent to the secret key value
    expect(result[0]).not.toHaveProperty('keyHash');
    expect(result[0]).toHaveProperty('id');
    expect(result[0]).toHaveProperty('title');
    // keyPrefix is safe to show (it's just the first ~12 chars, not enough to reconstruct)
    expect(result[0]).toHaveProperty('keyPrefix');
  });

  it('returns an empty array when no keys exist', async () => {
    prisma.apiKey.findMany.mockResolvedValue([]);
    expect(await listApiKeys()).toEqual([]);
  });
});

// ─── createApiKey ─────────────────────────────────────────────────────────────
// createApiKey(adminId, adminName, data) → { apiKey, generatedKey }
// generatedKey is the ONLY time the raw value is available — it must be shown to
// the user immediately and will never be retrievable again.

describe('createApiKey', () => {
  it('creates a key and returns both the serialized record and the plain-text value', async () => {
    prisma.apiKey.create.mockImplementation(({ data }) =>
      Promise.resolve({
        ...stubApiKey(),
        title:     data.title,
        keyPrefix: data.keyPrefix,
        keyHash:   data.keyHash,
      })
    );

    const result = await createApiKey('admin-1', 'Alice', { title: 'Integration Key' });
    // The plain-text key is returned exactly once so the user can copy it
    expect(result).toHaveProperty('generatedKey');
    expect(result.generatedKey).toMatch(/^cza_/);  // must have the cza_ prefix
    // The serialized record (for display) must not include the hash
    expect(result.apiKey).not.toHaveProperty('keyHash');
    expect(result.apiKey.title).toBe('Integration Key');
  });

  it('generates unique keys on every call', async () => {
    // Crypto.randomBytes used under the hood → each call produces a different key
    prisma.apiKey.create.mockResolvedValue(stubApiKey());
    const r1 = await createApiKey('admin-1', 'Alice', { title: 'A' });
    const r2 = await createApiKey('admin-1', 'Alice', { title: 'B' });
    expect(r1.generatedKey).not.toBe(r2.generatedKey);
  });
});

// ─── updateApiKey ─────────────────────────────────────────────────────────────
// updateApiKey(adminId, adminName, keyId, data) → serialized apiKey
// Updatable fields: title, isActive (activate/deactivate without deleting).

describe('updateApiKey', () => {
  it('updates title and isActive, returns serialized record', async () => {
    const existing = stubApiKey();
    prisma.apiKey.findUnique.mockResolvedValue(existing);
    // Return the updated values from DB
    prisma.apiKey.update.mockResolvedValue({ ...existing, title: 'Renamed', isActive: false });

    const result = await updateApiKey('admin-1', 'Alice', 'key-1', {
      title:    'Renamed',
      isActive: false,
    });
    expect(result.title).toBe('Renamed');
    expect(result.isActive).toBe(false);
    // keyHash must still not be in the returned object
    expect(result).not.toHaveProperty('keyHash');
  });

  it('throws NOT_FOUND when key does not exist', async () => {
    prisma.apiKey.findUnique.mockResolvedValue(null);
    await expect(
      updateApiKey('admin-1', 'Alice', 'ghost-key', { title: 'X' })
    ).rejects.toMatchObject({ code: 'NOT_FOUND', statusCode: 404 });
  });
});

// ─── deleteApiKey ─────────────────────────────────────────────────────────────
// deleteApiKey(adminId, adminName, keyId) → void
// Hard-deletes the key; any subsequent requests using this key will get 401.

describe('deleteApiKey', () => {
  it('deletes the key when it exists', async () => {
    prisma.apiKey.findUnique.mockResolvedValue(stubApiKey());
    prisma.apiKey.delete.mockResolvedValue({});

    await deleteApiKey('admin-1', 'Alice', 'key-1');
    // Must call delete with exact ID — not a soft delete
    expect(prisma.apiKey.delete).toHaveBeenCalledWith({ where: { id: 'key-1' } });
  });

  it('throws NOT_FOUND when key does not exist', async () => {
    prisma.apiKey.findUnique.mockResolvedValue(null);
    await expect(
      deleteApiKey('admin-1', 'Alice', 'ghost')
    ).rejects.toMatchObject({ code: 'NOT_FOUND', statusCode: 404 });
  });
});


// ─── findActiveApiKeyByValue ──────────────────────────────────────────────────

describe('findActiveApiKeyByValue', () => {
  it('returns the api key and updates lastUsedAt when active and found', async () => {
    const key = stubApiKey();
    prisma.apiKey.findUnique.mockResolvedValue(key);
    prisma.apiKey.update.mockResolvedValue(key);

    const result = await findActiveApiKeyByValue('cza_testvalue');
    expect(result).toEqual(key);
    expect(prisma.apiKey.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'key-1' } })
    );
  });

  it('returns null when key not found', async () => {
    prisma.apiKey.findUnique.mockResolvedValue(null);
    const result = await findActiveApiKeyByValue('cza_unknown');
    expect(result).toBeNull();
  });

  it('returns null when key is inactive', async () => {
    prisma.apiKey.findUnique.mockResolvedValue(stubApiKey({ isActive: false }));
    const result = await findActiveApiKeyByValue('cza_inactive');
    expect(result).toBeNull();
  });
});

// ─── listApiKeys ─────────────────────────────────────────────────────────────

describe('listApiKeys', () => {
  it('returns serialized api keys without raw keyHash', async () => {
    prisma.apiKey.findMany.mockResolvedValue([stubApiKey()]);
    const result = await listApiKeys();
    expect(result).toHaveLength(1);
    expect(result[0]).not.toHaveProperty('keyHash');
    expect(result[0]).toHaveProperty('id');
    expect(result[0]).toHaveProperty('title');
    expect(result[0]).toHaveProperty('keyPrefix');
  });

  it('returns an empty array when no keys exist', async () => {
    prisma.apiKey.findMany.mockResolvedValue([]);
    expect(await listApiKeys()).toEqual([]);
  });
});

// ─── createApiKey ─────────────────────────────────────────────────────────────

describe('createApiKey', () => {
  it('creates a key and returns both the serialized record and the plain-text value', async () => {
    prisma.apiKey.create.mockImplementation(({ data }) =>
      Promise.resolve({
        ...stubApiKey(),
        title: data.title,
        keyPrefix: data.keyPrefix,
        keyHash: data.keyHash,
      })
    );

    const result = await createApiKey('admin-1', 'Alice', { title: 'Integration Key' });
    expect(result).toHaveProperty('generatedKey');
    expect(result.generatedKey).toMatch(/^cza_/);
    expect(result.apiKey).not.toHaveProperty('keyHash');
    expect(result.apiKey.title).toBe('Integration Key');
  });

  it('generates unique keys on every call', async () => {
    prisma.apiKey.create.mockResolvedValue(stubApiKey());
    const r1 = await createApiKey('admin-1', 'Alice', { title: 'A' });
    const r2 = await createApiKey('admin-1', 'Alice', { title: 'B' });
    expect(r1.generatedKey).not.toBe(r2.generatedKey);
  });
});

// ─── updateApiKey ─────────────────────────────────────────────────────────────

describe('updateApiKey', () => {
  it('updates title and isActive, returns serialized record', async () => {
    const existing = stubApiKey();
    prisma.apiKey.findUnique.mockResolvedValue(existing);
    prisma.apiKey.update.mockResolvedValue({ ...existing, title: 'Renamed', isActive: false });

    const result = await updateApiKey('admin-1', 'Alice', 'key-1', {
      title: 'Renamed',
      isActive: false,
    });
    expect(result.title).toBe('Renamed');
    expect(result.isActive).toBe(false);
    expect(result).not.toHaveProperty('keyHash');
  });

  it('throws NOT_FOUND when key does not exist', async () => {
    prisma.apiKey.findUnique.mockResolvedValue(null);
    await expect(
      updateApiKey('admin-1', 'Alice', 'ghost-key', { title: 'X' })
    ).rejects.toMatchObject({ code: 'NOT_FOUND', statusCode: 404 });
  });
});

// ─── deleteApiKey ─────────────────────────────────────────────────────────────

describe('deleteApiKey', () => {
  it('deletes the key when it exists', async () => {
    prisma.apiKey.findUnique.mockResolvedValue(stubApiKey());
    prisma.apiKey.delete.mockResolvedValue({});

    await deleteApiKey('admin-1', 'Alice', 'key-1');
    expect(prisma.apiKey.delete).toHaveBeenCalledWith({ where: { id: 'key-1' } });
  });

  it('throws NOT_FOUND when key does not exist', async () => {
    prisma.apiKey.findUnique.mockResolvedValue(null);
    await expect(
      deleteApiKey('admin-1', 'Alice', 'ghost')
    ).rejects.toMatchObject({ code: 'NOT_FOUND', statusCode: 404 });
  });
});

// ─── serializeApiKey / updateApiKey — branch coverage ────────────────────────

describe('updateApiKey — branch coverage', () => {
  it('returns null for createdByAdmin when the stored key has no admin reference', async () => {
    const keyWithoutAdmin = { ...stubApiKey(), createdByAdmin: null, createdByAdminId: null };
    prisma.apiKey.findUnique.mockResolvedValue(stubApiKey());
    prisma.apiKey.update.mockResolvedValue(keyWithoutAdmin);

    const result = await updateApiKey('admin-1', 'Alice', 'key-1', { isActive: true });
    expect(result.createdByAdmin).toBeNull();
  });

  it('does not add title or isActive to data when neither is provided in updates', async () => {
    const existing = stubApiKey();
    prisma.apiKey.findUnique.mockResolvedValue(existing);
    prisma.apiKey.update.mockResolvedValue(existing);

    await updateApiKey('admin-1', 'Alice', 'key-1', {});
    const updateArg = prisma.apiKey.update.mock.calls[0][0];
    expect(updateArg.data).not.toHaveProperty('title');
    expect(updateArg.data).not.toHaveProperty('isActive');
  });
});
