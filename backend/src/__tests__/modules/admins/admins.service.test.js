'use strict';

// ─── Test Suite: admins.service ───────────────────────────────────────────────
// Covers the four admin management operations:
//   listAdmins  — return all admins (stripped of passwordHash)
//   createAdmin — create a new admin; generates a temp password if none provided
//   updateAdmin — update name/email/password; guards against EMAIL_TAKEN
//   deleteAdmin — delete an admin; prevents self-deletion
//
// All Prisma calls and side-effect services are mocked.

// Mock the Prisma client — no real DB queries in unit tests
jest.mock('../../../db/client', () => ({
  admin: {
    findUnique: jest.fn(),
    findFirst:  jest.fn(),
    findMany:   jest.fn(),
    create:     jest.fn(),
    update:     jest.fn(),
    delete:     jest.fn(),
  },
  activityLog: { create: jest.fn() },
}));

// Mock audit logging — we just verify it doesn't throw
jest.mock('../../../modules/logs/logs.service', () => ({
  createLog: jest.fn().mockResolvedValue(undefined),
}));

// Mock the welcome-email so no SMTP calls occur during tests
jest.mock('../../../modules/mail/mail.service', () => ({
  sendAdminAccountCreation: jest.fn().mockResolvedValue(undefined),
}));

// bcrypt.hash always returns '$hashed' so assertions are deterministic
jest.mock('bcryptjs', () => ({
  hash:    jest.fn().mockResolvedValue('$hashed'),
  compare: jest.fn(),
}));

const prisma   = require('../../../db/client');
const AppError = require('../../../utils/AppError');
const { createAdmin, listAdmins, updateAdmin, deleteAdmin } = require('../../../modules/admins/admins.service');

// Minimal admin DB row — override only fields relevant to each test
const stubAdmin = (overrides = {}) => ({
  id:           'admin-1',
  name:         'Alice',
  email:        'alice@test.com',
  passwordHash: '$hashed',
  addedById:    null,
  createdAt:    new Date(),
  updatedAt:    new Date(),
  ...overrides,
});

// ─── listAdmins ───────────────────────────────────────────────────────────────
// listAdmins() → admin[] (each without passwordHash)

describe('listAdmins', () => {
  it('returns all admins without passwordHash', async () => {
    const records = [
      { ...stubAdmin(), addedBy: null },
      { ...stubAdmin({ id: 'admin-2', email: 'bob@test.com' }), addedBy: null },
    ];
    prisma.admin.findMany.mockResolvedValue(records);

    const result = await listAdmins();
    expect(result).toHaveLength(2);
    // passwordHash must be stripped before returning — security requirement
    result.forEach((a) => expect(a).not.toHaveProperty('passwordHash'));
  });

  it('returns an empty array when no admins exist', async () => {
    prisma.admin.findMany.mockResolvedValue([]);
    const result = await listAdmins();
    expect(result).toEqual([]);
  });
});

// ─── createAdmin ──────────────────────────────────────────────────────────────
// createAdmin(requestingAdminId, requestingAdminName, data) → admin (no hash)
// Behavior when password is missing or too short: a secure temp password is
// auto-generated and emailed to the new admin.

describe('createAdmin', () => {
  it('creates admin and returns record without passwordHash', async () => {
    prisma.admin.findUnique.mockResolvedValue(null); // email not in use
    prisma.admin.create.mockResolvedValue(stubAdmin());

    const result = await createAdmin('req-admin', 'Requester', {
      name:     'Alice',
      email:    'alice@test.com',
      password: 'SecurePass123!',
    });

    expect(result).not.toHaveProperty('passwordHash');
    expect(prisma.admin.create).toHaveBeenCalledTimes(1);
  });

  it('generates a temporary password when none provided', async () => {
    // If no password field at all, a random secure pass is generated and
    // emailed to the admin
    prisma.admin.findUnique.mockResolvedValue(null);
    prisma.admin.create.mockResolvedValue(stubAdmin());

    await createAdmin('req-admin', 'Requester', {
      name:  'Alice',
      email: 'alice@test.com',
      // no password field
    });

    // Verify that the record was created (the temp password path still runs create)
    expect(prisma.admin.create).toHaveBeenCalledTimes(1);
  });

  it('generates a temporary password when password is too short', async () => {
    // A password shorter than 8 characters is treated the same as no password
    prisma.admin.findUnique.mockResolvedValue(null);
    prisma.admin.create.mockResolvedValue(stubAdmin());

    await createAdmin('req-admin', 'Requester', {
      name:     'Alice',
      email:    'alice@test.com',
      password: 'short', // only 5 chars — triggers temp password generation
    });

    expect(prisma.admin.create).toHaveBeenCalledTimes(1);
  });

  it('throws EMAIL_TAKEN when email already in use', async () => {
    // An existing admin with the same email was found
    prisma.admin.findUnique.mockResolvedValue(stubAdmin());
    await expect(
      createAdmin('req-admin', 'Requester', { name: 'Alice', email: 'alice@test.com', password: 'pw' })
    ).rejects.toMatchObject({ code: 'EMAIL_TAKEN', statusCode: 409 });
  });

  it('still succeeds when the welcome email send fails', async () => {
    // The catch block in createAdmin swallows mail errors — the admin row was created
    // successfully so the operation must not throw even if SMTP is unreachable.
    const mailService = require('../../../modules/mail/mail.service');
    prisma.admin.findUnique.mockResolvedValue(null);
    prisma.admin.create.mockResolvedValue(stubAdmin());
    mailService.sendAdminAccountCreation.mockRejectedValueOnce(new Error('SMTP timeout'));

    // Should NOT throw despite the mail failure
    const result = await createAdmin('req-admin', 'Requester', { name: 'Alice', email: 'alice@test.com', password: 'SecurePass!' });
    expect(result).not.toHaveProperty('passwordHash');
  });
});

// ─── updateAdmin ──────────────────────────────────────────────────────────────
// updateAdmin(requestingAdminId, requestingAdminName, targetId, data) → admin
// Fields that can be updated: name, email, password.
// Guards: NOT_FOUND if target doesn't exist; EMAIL_TAKEN if new email conflicts.

describe('updateAdmin', () => {
  it('updates admin fields and returns record without passwordHash', async () => {
    const admin = stubAdmin();
    prisma.admin.findUnique.mockResolvedValue(admin);
    prisma.admin.findFirst.mockResolvedValue(null);  // no email conflict
    prisma.admin.update.mockResolvedValue({ ...admin, name: 'Updated Alice' });

    const result = await updateAdmin('req-admin', 'Requester', 'admin-1', { name: 'Updated Alice' });
    expect(result.name).toBe('Updated Alice');
    // Still must not expose the hash
    expect(result).not.toHaveProperty('passwordHash');
  });

  it('throws NOT_FOUND when admin does not exist', async () => {
    prisma.admin.findUnique.mockResolvedValue(null); // target admin missing
    await expect(
      updateAdmin('req-admin', 'Requester', 'ghost', { name: 'X' })
    ).rejects.toMatchObject({ code: 'NOT_FOUND', statusCode: 404 });
  });

  it('throws EMAIL_TAKEN when new email is already taken by another admin', async () => {
    // findUnique finds the target admin; findFirst finds a DIFFERENT admin with the same email
    prisma.admin.findUnique.mockResolvedValue(stubAdmin());
    prisma.admin.findFirst.mockResolvedValue(stubAdmin({ id: 'admin-99', email: 'taken@test.com' }));
    await expect(
      updateAdmin('req', 'Req', 'admin-1', { email: 'taken@test.com' })
    ).rejects.toMatchObject({ code: 'EMAIL_TAKEN' });
  });
});

// ─── deleteAdmin ──────────────────────────────────────────────────────────────
// deleteAdmin(requestingAdminId, requestingAdminName, targetId)
// Guards: SELF_DELETE — admin cannot delete themselves; NOT_FOUND if target missing.

describe('deleteAdmin', () => {
  it('deletes admin when requestingAdmin is different', async () => {
    // 'admin-1' is deleting 'admin-2' — allowed
    prisma.admin.findUnique.mockResolvedValue(stubAdmin({ id: 'admin-2' }));
    prisma.admin.delete.mockResolvedValue({});

    await deleteAdmin('admin-1', 'Alice', 'admin-2');
    expect(prisma.admin.delete).toHaveBeenCalledWith({ where: { id: 'admin-2' } });
  });

  it('throws SELF_DELETE when admin tries to delete themselves', async () => {
    // Same ID for requester and target — prevented before any DB call
    await expect(
      deleteAdmin('admin-1', 'Alice', 'admin-1')
    ).rejects.toMatchObject({ code: 'SELF_DELETE', statusCode: 400 });
  });

  it('throws NOT_FOUND when target admin does not exist', async () => {
    prisma.admin.findUnique.mockResolvedValue(null);
    await expect(
      deleteAdmin('admin-1', 'Alice', 'admin-99')
    ).rejects.toMatchObject({ code: 'NOT_FOUND', statusCode: 404 });
  });
});


// ─── listAdmins ───────────────────────────────────────────────────────────────

describe('listAdmins', () => {
  it('returns all admins without passwordHash', async () => {
    const records = [
      { ...stubAdmin(), addedBy: null },
      { ...stubAdmin({ id: 'admin-2', email: 'bob@test.com' }), addedBy: null },
    ];
    prisma.admin.findMany.mockResolvedValue(records);

    const result = await listAdmins();
    expect(result).toHaveLength(2);
    result.forEach((a) => expect(a).not.toHaveProperty('passwordHash'));
  });

  it('returns an empty array when no admins exist', async () => {
    prisma.admin.findMany.mockResolvedValue([]);
    const result = await listAdmins();
    expect(result).toEqual([]);
  });
});

// ─── createAdmin ──────────────────────────────────────────────────────────────

describe('createAdmin', () => {
  it('creates admin and returns record without passwordHash', async () => {
    prisma.admin.findUnique.mockResolvedValue(null); // no conflict
    prisma.admin.create.mockResolvedValue(stubAdmin());

    const result = await createAdmin('req-admin', 'Requester', {
      name: 'Alice',
      email: 'alice@test.com',
      password: 'SecurePass123!',
    });

    expect(result).not.toHaveProperty('passwordHash');
    expect(prisma.admin.create).toHaveBeenCalledTimes(1);
  });

  it('generates a temporary password when none provided', async () => {
    prisma.admin.findUnique.mockResolvedValue(null);
    prisma.admin.create.mockResolvedValue(stubAdmin());

    await createAdmin('req-admin', 'Requester', {
      name: 'Alice',
      email: 'alice@test.com',
      // no password field
    });

    expect(prisma.admin.create).toHaveBeenCalledTimes(1);
  });

  it('generates a temporary password when password is too short', async () => {
    prisma.admin.findUnique.mockResolvedValue(null);
    prisma.admin.create.mockResolvedValue(stubAdmin());

    await createAdmin('req-admin', 'Requester', {
      name: 'Alice',
      email: 'alice@test.com',
      password: 'short', // < 8 chars
    });

    expect(prisma.admin.create).toHaveBeenCalledTimes(1);
  });

  it('throws EMAIL_TAKEN when email already in use', async () => {
    prisma.admin.findUnique.mockResolvedValue(stubAdmin());
    await expect(
      createAdmin('req-admin', 'Requester', { name: 'Alice', email: 'alice@test.com', password: 'pw' })
    ).rejects.toMatchObject({ code: 'EMAIL_TAKEN', statusCode: 409 });
  });
});

// ─── updateAdmin ──────────────────────────────────────────────────────────────

describe('updateAdmin', () => {
  it('updates admin fields and returns record without passwordHash', async () => {
    const admin = stubAdmin();
    prisma.admin.findUnique.mockResolvedValue(admin);
    prisma.admin.findFirst.mockResolvedValue(null); // no email conflict
    prisma.admin.update.mockResolvedValue({ ...admin, name: 'Updated Alice' });

    const result = await updateAdmin('req-admin', 'Requester', 'admin-1', { name: 'Updated Alice' });
    expect(result.name).toBe('Updated Alice');
    expect(result).not.toHaveProperty('passwordHash');
  });

  it('throws NOT_FOUND when admin does not exist', async () => {
    prisma.admin.findUnique.mockResolvedValue(null);
    await expect(
      updateAdmin('req-admin', 'Requester', 'ghost', { name: 'X' })
    ).rejects.toMatchObject({ code: 'NOT_FOUND', statusCode: 404 });
  });

  it('throws EMAIL_TAKEN when new email is already taken by another admin', async () => {
    prisma.admin.findUnique.mockResolvedValue(stubAdmin());
    prisma.admin.findFirst.mockResolvedValue(stubAdmin({ id: 'admin-99', email: 'taken@test.com' }));
    await expect(
      updateAdmin('req', 'Req', 'admin-1', { email: 'taken@test.com' })
    ).rejects.toMatchObject({ code: 'EMAIL_TAKEN' });
  });
});

// ─── deleteAdmin ──────────────────────────────────────────────────────────────

describe('deleteAdmin', () => {
  it('deletes admin when requestingAdmin is different', async () => {
    prisma.admin.findUnique.mockResolvedValue(stubAdmin({ id: 'admin-2' }));
    prisma.admin.delete.mockResolvedValue({});

    await deleteAdmin('admin-1', 'Alice', 'admin-2');
    expect(prisma.admin.delete).toHaveBeenCalledWith({ where: { id: 'admin-2' } });
  });

  it('throws SELF_DELETE when admin tries to delete themselves', async () => {
    await expect(
      deleteAdmin('admin-1', 'Alice', 'admin-1')
    ).rejects.toMatchObject({ code: 'SELF_DELETE', statusCode: 400 });
  });

  it('throws NOT_FOUND when target admin does not exist', async () => {
    prisma.admin.findUnique.mockResolvedValue(null);
    await expect(
      deleteAdmin('admin-1', 'Alice', 'admin-99')
    ).rejects.toMatchObject({ code: 'NOT_FOUND', statusCode: 404 });
  });
});

// ─── updateAdmin — email and password update paths ────────────────────────────

describe('updateAdmin — email and password update', () => {
  it('updates email successfully when new email has no conflict', async () => {
    const admin = stubAdmin({ email: 'alice@test.com' });
    prisma.admin.findUnique.mockResolvedValue(admin);
    // findFirst returns null → no conflict
    prisma.admin.findFirst.mockResolvedValue(null);
    prisma.admin.update.mockResolvedValue({ ...admin, email: 'newalice@test.com' });

    const result = await updateAdmin('req-admin', 'Requester', 'admin-1', {
      email: 'newalice@test.com',
    });
    expect(result.email).toBe('newalice@test.com');
  });

  it('updates password (bcrypt hash) without touching name or email', async () => {
    const admin = stubAdmin();
    prisma.admin.findUnique.mockResolvedValue(admin);
    prisma.admin.update.mockResolvedValue(admin);

    await updateAdmin('req-admin', 'Requester', 'admin-1', {
      password: 'BrandNewPass!1',
    });
    // update must have been called with a passwordHash field
    const updateArg = prisma.admin.update.mock.calls[0][0];
    expect(updateArg.data).toHaveProperty('passwordHash');
  });
});
