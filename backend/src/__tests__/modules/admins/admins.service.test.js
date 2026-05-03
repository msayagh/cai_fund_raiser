'use strict';

// ─── Test Suite: admins.service ───────────────────────────────────────────────
// Covers the four admin management operations:
//   listAdmins  — return all admins
//   createAdmin — create a new admin (passwordless OTP login)
//   updateAdmin — update name/email; guards against EMAIL_TAKEN
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

const prisma   = require('../../../db/client');
const AppError = require('../../../utils/AppError');
const { createAdmin, listAdmins, updateAdmin, deleteAdmin } = require('../../../modules/admins/admins.service');

// Minimal admin DB row — override only fields relevant to each test
const stubAdmin = (overrides = {}) => ({
  id:           'admin-1',
  name:         'Alice',
  email:        'alice@test.com',
  addedById:    null,
  createdAt:    new Date(),
  updatedAt:    new Date(),
  ...overrides,
});

// ─── listAdmins ───────────────────────────────────────────────────────────────
// listAdmins() → admin[]

describe('listAdmins', () => {
  it('returns all admins', async () => {
    const records = [
      { ...stubAdmin(), addedBy: null },
      { ...stubAdmin({ id: 'admin-2', email: 'bob@test.com' }), addedBy: null },
    ];
    prisma.admin.findMany.mockResolvedValue(records);

    const result = await listAdmins();
    expect(result).toHaveLength(2);
  });

  it('returns an empty array when no admins exist', async () => {
    prisma.admin.findMany.mockResolvedValue([]);
    const result = await listAdmins();
    expect(result).toEqual([]);
  });
});

// ─── createAdmin ──────────────────────────────────────────────────────────────
// createAdmin(requestingAdminId, requestingAdminName, { name, email }) → admin
// Login is now passwordless (OTP) — no password is accepted or required.

describe('createAdmin', () => {
  it('creates admin and returns the record', async () => {
    prisma.admin.findUnique.mockResolvedValue(null); // email not in use
    prisma.admin.create.mockResolvedValue(stubAdmin());

    const result = await createAdmin('req-admin', 'Requester', {
      name:  'Alice',
      email: 'alice@test.com',
    });

    expect(result.email).toBe('alice@test.com');
    expect(prisma.admin.create).toHaveBeenCalledTimes(1);
  });

  it('throws EMAIL_TAKEN when email already in use', async () => {
    // An existing admin with the same email was found
    prisma.admin.findUnique.mockResolvedValue(stubAdmin());
    await expect(
      createAdmin('req-admin', 'Requester', { name: 'Alice', email: 'alice@test.com' })
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
    const result = await createAdmin('req-admin', 'Requester', { name: 'Alice', email: 'alice@test.com' });
    expect(result.email).toBe('alice@test.com');
  });

  it('calls sendAdminAccountCreation with (email, name) only', async () => {
    const mailService = require('../../../modules/mail/mail.service');
    mailService.sendAdminAccountCreation.mockClear();
    prisma.admin.findUnique.mockResolvedValue(null);
    prisma.admin.create.mockResolvedValue(stubAdmin());

    await createAdmin('req-admin', 'Requester', { name: 'Alice', email: 'alice@test.com' });

    expect(mailService.sendAdminAccountCreation).toHaveBeenCalledWith('alice@test.com', 'Alice');
  });
});

// ─── updateAdmin ──────────────────────────────────────────────────────────────
// updateAdmin(requestingAdminId, requestingAdminName, targetId, { name, email }) → admin
// Fields that can be updated: name, email (passwords are no longer settable here).
// Guards: NOT_FOUND if target doesn't exist; EMAIL_TAKEN if new email conflicts.

describe('updateAdmin', () => {
  it('updates admin fields and returns the record', async () => {
    const admin = stubAdmin();
    prisma.admin.findUnique.mockResolvedValue(admin);
    prisma.admin.findFirst.mockResolvedValue(null);  // no email conflict
    prisma.admin.update.mockResolvedValue({ ...admin, name: 'Updated Alice' });

    const result = await updateAdmin('req-admin', 'Requester', 'admin-1', { name: 'Updated Alice' });
    expect(result.name).toBe('Updated Alice');
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
