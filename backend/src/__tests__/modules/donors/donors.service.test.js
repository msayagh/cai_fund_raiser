'use strict';

// ─── Test Suite: donors.service ───────────────────────────────────────────────
// donors.service is the largest service in the app and covers:
//
// Pure utility functions (no DB calls):
//   parseCsvLine          — CSV tokenizer with quoted-field support
//   parseCsvContent       — parses full CSV string into header + rows
//   parseAmount           — converts string amounts to positive numbers
//   normalizePaymentMethod — validates and normalises payment method strings
//
// Donor self-service (requires donor to be logged in):
//   getMe                 — returns own profile without passwordHash
//   updateMe              — updates profile; guards EMAIL_TAKEN
//   updateMyPassword      — verifies current password before setting new one
//   getMyEngagement       — returns engagement or throws NOT_FOUND
//   createEngagement      — throws CONFLICT if one already exists
//   updateEngagement      — updates pledge/dates
//
// Admin donor management:
//   listDonors            — paginated list with search
//   getDonorById          — full donor record or NOT_FOUND
//   adminUpdateDonor      — update profile; EMAIL_TAKEN guard
//   adminDeleteDonor      — hard delete
//   adminAddPayment       — add a payment for a donor; NOT_FOUND guard
//   adminUpdatePayment    — update payment; PAYMENT_NOT_FOUND guard
//   adminDeletePayment    — delete payment; PAYMENT_NOT_FOUND guard
//   adminImportPaymentsCsv — batch import from CSV buffer

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('../../../db/client', () => ({
  donor: {
    findUnique: jest.fn(),
    findFirst:  jest.fn(),
    findMany:   jest.fn(),
    create:     jest.fn(),
    update:     jest.fn(),
    delete:     jest.fn(),
    count:      jest.fn(),
  },
  engagement: {
    findUnique: jest.fn(),
    create:     jest.fn(),
    update:     jest.fn(),
  },
  payment: {
    findFirst:  jest.fn(),
    findUnique: jest.fn(),
    findMany:   jest.fn(),
    create:     jest.fn(),
    update:     jest.fn(),
    delete:     jest.fn(),
  },
  request: { findMany: jest.fn() },
  activityLog: { create: jest.fn() },
}));

jest.mock('../../../modules/logs/logs.service', () => ({
  createLog: jest.fn().mockResolvedValue(undefined),
}));

// Mock every mail method the service may call; failures must not break tests
jest.mock('../../../modules/mail/mail.service', () => ({
  sendPaymentConfirmation:      jest.fn().mockResolvedValue(undefined),
  sendEngagementConfirmation:   jest.fn().mockResolvedValue(undefined),
  sendDonorDeactivationNotice:  jest.fn().mockResolvedValue(undefined),
  sendDonorAccountCreation:     jest.fn().mockResolvedValue(undefined),
}));

jest.mock('bcryptjs', () => ({
  hash:    jest.fn().mockResolvedValue('$hashed'),
  compare: jest.fn(),
}));

// Mock pdfkit so PDF generation does not touch the file system during tests
jest.mock('pdfkit', () => {
  const mockDoc = {
    fontSize:  jest.fn().mockReturnThis(),
    font:      jest.fn().mockReturnThis(),
    text:      jest.fn().mockReturnThis(),
    moveDown:  jest.fn().mockReturnThis(),
    pipe:      jest.fn().mockReturnThis(),
    end:       jest.fn(),
  };
  return jest.fn(() => mockDoc);
});

// ── Imports ──────────────────────────────────────────────────────────────────

const bcrypt = require('bcryptjs');
const prisma  = require('../../../db/client');
const AppError = require('../../../utils/AppError');

const {
  getMe, updateMe, updateMyPassword,
  getMyEngagement, createEngagement, updateEngagement,
  getMyPayments, getMyRequests,
  listDonors, getDonorById,
  adminUpdateDonor, adminDeleteDonor,
  adminUpdateDonorPassword, adminGetDonorPayments, adminSetEngagement,
  adminAddPayment, adminUpdatePayment, adminDeletePayment,
  adminImportPaymentsCsv, adminCreateDonor, adminUpsertDonorPayment,
  generatePaymentConfirmation, uploadPaymentReceipt, downloadPaymentConfirmation,
} = require('../../../modules/donors/donors.service');

// ── Stubs ────────────────────────────────────────────────────────────────────

const stubDonor = (overrides = {}) => ({
  id:             'donor-1',
  name:           'Alice',
  email:          'alice@test.com',
  passwordHash:   '$hashed',
  accountCreated: true,
  isActive:       true,
  engagement:     null,
  ...overrides,
});

const stubPayment = (overrides = {}) => ({
  id:      'pay-1',
  donorId: 'donor-1',
  amount:  100,
  date:    new Date('2025-01-15'),
  method:  'cash',
  note:    null,
  ...overrides,
});

// ─── getMe ─────────────────────────────────────────────────────────────────
// getMe(donorId) → donor without passwordHash

describe('getMe', () => {
  it('returns the donor row without passwordHash', async () => {
    prisma.donor.findUnique.mockResolvedValue(stubDonor());

    const result = await getMe('donor-1');
    expect(result.id).toBe('donor-1');
    expect(result).not.toHaveProperty('passwordHash');  // security requirement
  });
});

// ─── updateMe ────────────────────────────────────────────────────────────────
// updateMe(donorId, data) → updated donor without passwordHash

describe('updateMe', () => {
  it('updates the donor and returns without passwordHash', async () => {
    prisma.donor.findFirst.mockResolvedValue(null);   // no email conflict
    prisma.donor.update.mockResolvedValue(stubDonor({ name: 'Alice Updated' }));

    const result = await updateMe('donor-1', { name: 'Alice Updated' });
    expect(result.name).toBe('Alice Updated');
    expect(result).not.toHaveProperty('passwordHash');
  });

  it('throws EMAIL_TAKEN when new email already belongs to another donor', async () => {
    // findFirst finds a DIFFERENT donor with the same email
    prisma.donor.findFirst.mockResolvedValue(stubDonor({ id: 'donor-2', email: 'taken@test.com' }));
    await expect(
      updateMe('donor-1', { email: 'taken@test.com' })
    ).rejects.toMatchObject({ code: 'EMAIL_TAKEN', statusCode: 409 });
  });
});

// ─── updateMyPassword ─────────────────────────────────────────────────────────
// updateMyPassword(donorId, { currentPassword, newPassword })

describe('updateMyPassword', () => {
  it('updates the password when currentPassword is correct', async () => {
    prisma.donor.findUnique.mockResolvedValue(stubDonor());
    bcrypt.compare.mockResolvedValue(true);   // current password matches
    prisma.donor.update.mockResolvedValue({});

    await updateMyPassword('donor-1', { currentPassword: 'correct', newPassword: 'newSecure!' });
    // New password must be stored as a bcrypt hash
    expect(prisma.donor.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { passwordHash: '$hashed' } })
    );
  });

  it('throws INVALID_PASSWORD when currentPassword is wrong', async () => {
    prisma.donor.findUnique.mockResolvedValue(stubDonor());
    bcrypt.compare.mockResolvedValue(false);  // wrong password
    await expect(
      updateMyPassword('donor-1', { currentPassword: 'wrong', newPassword: 'new' })
    ).rejects.toMatchObject({ code: 'INVALID_PASSWORD', statusCode: 400 });
  });
});

// ─── getMyEngagement ──────────────────────────────────────────────────────────
// getMyEngagement(donorId) → engagement or NOT_FOUND

describe('getMyEngagement', () => {
  it('returns engagement when it exists', async () => {
    const engagement = { id: 'eng-1', donorId: 'donor-1', totalPledge: 5000 };
    prisma.engagement.findUnique.mockResolvedValue(engagement);

    const result = await getMyEngagement('donor-1');
    expect(result.totalPledge).toBe(5000);
  });

  it('throws NOT_FOUND when no engagement exists', async () => {
    prisma.engagement.findUnique.mockResolvedValue(null);
    await expect(getMyEngagement('donor-1')).rejects.toMatchObject({
      code: 'NOT_FOUND', statusCode: 404,
    });
  });
});

// ─── createEngagement ─────────────────────────────────────────────────────────
// createEngagement(donorId, data) → engagement

describe('createEngagement', () => {
  it('creates engagement with a flat totalPledge', async () => {
    prisma.engagement.findUnique.mockResolvedValue(null);  // no existing
    const created = { id: 'eng-1', donorId: 'donor-1', totalPledge: 2000 };
    prisma.engagement.create.mockResolvedValue(created);
    prisma.donor.findUnique.mockResolvedValue(stubDonor());

    const result = await createEngagement('donor-1', { totalPledge: 2000 });
    expect(result.totalPledge).toBe(2000);
  });

  it('throws CONFLICT when engagement already exists', async () => {
    // Donor can only have one active engagement at a time
    prisma.engagement.findUnique.mockResolvedValue({ id: 'eng-1', donorId: 'donor-1' });
    await expect(
      createEngagement('donor-1', { totalPledge: 1000 })
    ).rejects.toMatchObject({ code: 'CONFLICT', statusCode: 409 });
  });

  it('throws MISSING_PLEDGE_DATA when neither totalPledge nor pillars are provided', async () => {
    prisma.engagement.findUnique.mockResolvedValue(null);
    await expect(
      createEngagement('donor-1', {})  // no pledge data at all
    ).rejects.toMatchObject({ code: 'MISSING_PLEDGE_DATA', statusCode: 400 });
  });
});

// ─── updateEngagement ─────────────────────────────────────────────────────────
// updateEngagement(donorId, data) → updated engagement

describe('updateEngagement', () => {
  it('updates the totalPledge', async () => {
    prisma.engagement.findUnique.mockResolvedValue({ id: 'eng-1', donorId: 'donor-1', totalPledge: 1000 });
    const updated = { id: 'eng-1', donorId: 'donor-1', totalPledge: 3000 };
    prisma.engagement.update.mockResolvedValue(updated);
    prisma.donor.findUnique.mockResolvedValue(stubDonor());

    const result = await updateEngagement('donor-1', { totalPledge: 3000 });
    expect(result.totalPledge).toBe(3000);
  });

  it('throws NOT_FOUND when engagement does not exist', async () => {
    prisma.engagement.findUnique.mockResolvedValue(null);
    await expect(
      updateEngagement('donor-1', { totalPledge: 500 })
    ).rejects.toMatchObject({ code: 'NOT_FOUND', statusCode: 404 });
  });
});

// ─── listDonors ───────────────────────────────────────────────────────────────
// listDonors(options) → { total, page, limit, items }

describe('listDonors', () => {
  it('returns paginated donor list', async () => {
    prisma.donor.count.mockResolvedValue(2);
    prisma.donor.findMany.mockResolvedValue([
      { ...stubDonor(), payments: [{ amount: 100 }], _count: { payments: 1 } },
      { ...stubDonor({ id: 'donor-2', email: 'bob@test.com' }), payments: [], _count: { payments: 0 } },
    ]);

    const result = await listDonors();
    expect(result.total).toBe(2);
    expect(result.items).toHaveLength(2);
    // passwordHash stripped from every item
    result.items.forEach((d) => expect(d).not.toHaveProperty('passwordHash'));
    // paidAmount computed from payments array
    expect(result.items[0].paidAmount).toBe(100);
  });

  it('passes search filter to the DB query', async () => {
    prisma.donor.count.mockResolvedValue(0);
    prisma.donor.findMany.mockResolvedValue([]);

    await listDonors({ search: 'alice' });
    expect(prisma.donor.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { OR: [{ name: { contains: 'alice' } }, { email: { contains: 'alice' } }] },
      })
    );
  });

  it('clamps limit to 100', async () => {
    prisma.donor.count.mockResolvedValue(0);
    prisma.donor.findMany.mockResolvedValue([]);

    const result = await listDonors({ limit: 500 });
    expect(result.limit).toBe(100);
  });
});

// ─── getDonorById ─────────────────────────────────────────────────────────────

describe('getDonorById', () => {
  it('returns full donor record without passwordHash', async () => {
    prisma.donor.findUnique.mockResolvedValue({
      ...stubDonor(),
      payments:  [],
      requests:  [],
      _count:    { payments: 0 },
    });

    const result = await getDonorById('donor-1');
    expect(result.id).toBe('donor-1');
    expect(result).not.toHaveProperty('passwordHash');
  });

  it('throws NOT_FOUND when donor does not exist', async () => {
    prisma.donor.findUnique.mockResolvedValue(null);
    await expect(getDonorById('ghost')).rejects.toMatchObject({
      code: 'NOT_FOUND', statusCode: 404,
    });
  });
});

// ─── adminUpdateDonor ─────────────────────────────────────────────────────────

describe('adminUpdateDonor', () => {
  it('updates donor fields and returns without passwordHash', async () => {
    prisma.donor.findUnique.mockResolvedValue(stubDonor());
    prisma.donor.findFirst.mockResolvedValue(null);  // no email conflict
    prisma.donor.update.mockResolvedValue(stubDonor({ name: 'Updated' }));

    const result = await adminUpdateDonor('admin-1', 'Admin', 'donor-1', { name: 'Updated' });
    expect(result.name).toBe('Updated');
    expect(result).not.toHaveProperty('passwordHash');
  });

  it('throws NOT_FOUND when donor does not exist', async () => {
    prisma.donor.findUnique.mockResolvedValue(null);
    await expect(
      adminUpdateDonor('admin-1', 'Admin', 'ghost', { name: 'X' })
    ).rejects.toMatchObject({ code: 'NOT_FOUND', statusCode: 404 });
  });

  it('throws EMAIL_TAKEN when new email conflicts with another donor', async () => {
    prisma.donor.findUnique.mockResolvedValue(stubDonor());
    prisma.donor.findFirst.mockResolvedValue(stubDonor({ id: 'donor-2', email: 'taken@test.com' }));
    await expect(
      adminUpdateDonor('admin-1', 'Admin', 'donor-1', { email: 'taken@test.com' })
    ).rejects.toMatchObject({ code: 'EMAIL_TAKEN' });
  });
});

// ─── adminDeleteDonor ─────────────────────────────────────────────────────────

describe('adminDeleteDonor', () => {
  it('deletes the donor when found', async () => {
    prisma.donor.findUnique.mockResolvedValue(stubDonor());
    prisma.donor.delete.mockResolvedValue({});

    await adminDeleteDonor('admin-1', 'Admin', 'donor-1');
    expect(prisma.donor.delete).toHaveBeenCalledWith({ where: { id: 'donor-1' } });
  });

  it('throws NOT_FOUND when donor does not exist', async () => {
    prisma.donor.findUnique.mockResolvedValue(null);
    await expect(
      adminDeleteDonor('admin-1', 'Admin', 'ghost')
    ).rejects.toMatchObject({ code: 'NOT_FOUND', statusCode: 404 });
  });
});

// ─── adminAddPayment ──────────────────────────────────────────────────────────

describe('adminAddPayment', () => {
  it('creates and returns the payment', async () => {
    prisma.donor.findUnique.mockResolvedValue(stubDonor());
    const payment = stubPayment();
    prisma.payment.create.mockResolvedValue(payment);
    // These two are called inside the email-sending block
    prisma.payment.findMany.mockResolvedValue([payment]);
    prisma.engagement.findUnique.mockResolvedValue(null);

    const result = await adminAddPayment('admin-1', 'Admin', 'donor-1', {
      amount: 100,
      date:   '2025-01-15',
      method: 'cash',
    });
    expect(result.amount).toBe(100);
    expect(prisma.payment.create).toHaveBeenCalledTimes(1);
  });

  it('throws NOT_FOUND when donor does not exist', async () => {
    prisma.donor.findUnique.mockResolvedValue(null);
    await expect(
      adminAddPayment('admin-1', 'Admin', 'ghost', { amount: 50, date: '2025-01-01', method: 'cash' })
    ).rejects.toMatchObject({ code: 'NOT_FOUND', statusCode: 404 });
  });
});

// ─── adminUpdatePayment ───────────────────────────────────────────────────────

describe('adminUpdatePayment', () => {
  it('updates and returns the payment', async () => {
    const payment = { ...stubPayment(), donor: { id: 'donor-1', email: 'alice@test.com' } };
    prisma.payment.findUnique.mockResolvedValue(payment);
    prisma.payment.update.mockResolvedValue({ ...payment, amount: 250 });

    const result = await adminUpdatePayment('admin-1', 'Admin', 'donor-1', 'pay-1', { amount: 250 });
    expect(result.amount).toBe(250);
  });

  it('throws PAYMENT_NOT_FOUND when payment does not belong to donor', async () => {
    // Payment row exists but donorId mismatch — prevents cross-donor edits
    const payment = { ...stubPayment({ donorId: 'donor-99' }), donor: { id: 'donor-99', email: 'other@test.com' } };
    prisma.payment.findUnique.mockResolvedValue(payment);
    await expect(
      adminUpdatePayment('admin-1', 'Admin', 'donor-1', 'pay-1', { amount: 50 })
    ).rejects.toMatchObject({ code: 'PAYMENT_NOT_FOUND', statusCode: 404 });
  });

  it('throws PAYMENT_NOT_FOUND when payment does not exist', async () => {
    prisma.payment.findUnique.mockResolvedValue(null);
    await expect(
      adminUpdatePayment('admin-1', 'Admin', 'donor-1', 'ghost-pay', { amount: 50 })
    ).rejects.toMatchObject({ code: 'PAYMENT_NOT_FOUND' });
  });
});

// ─── adminDeletePayment ───────────────────────────────────────────────────────

describe('adminDeletePayment', () => {
  it('deletes the payment when it belongs to the donor', async () => {
    const payment = { ...stubPayment(), donor: { id: 'donor-1', email: 'alice@test.com' } };
    prisma.payment.findUnique.mockResolvedValue(payment);
    prisma.payment.delete.mockResolvedValue({});

    await adminDeletePayment('admin-1', 'Admin', 'donor-1', 'pay-1');
    expect(prisma.payment.delete).toHaveBeenCalledWith({ where: { id: 'pay-1' } });
  });

  it('throws PAYMENT_NOT_FOUND when donorId mismatch', async () => {
    const payment = { ...stubPayment({ donorId: 'donor-99' }), donor: { id: 'donor-99', email: 'o@test.com' } };
    prisma.payment.findUnique.mockResolvedValue(payment);
    await expect(
      adminDeletePayment('admin-1', 'Admin', 'donor-1', 'pay-1')
    ).rejects.toMatchObject({ code: 'PAYMENT_NOT_FOUND' });
  });
});

// ─── adminImportPaymentsCsv ───────────────────────────────────────────────────
// Batch-import payments from a CSV buffer.
// Creates placeholder donors for unknown emails; records payments for each row.

describe('adminImportPaymentsCsv', () => {
  it('throws CSV_FILE_REQUIRED when no buffer provided', async () => {
    await expect(
      adminImportPaymentsCsv('admin-1', 'Admin', null)
    ).rejects.toMatchObject({ code: 'CSV_FILE_REQUIRED', statusCode: 400 });
  });

  it('imports a payment for an existing donor', async () => {
    const csv = 'email,amount,method,date\nalice@test.com,100,cash,2025-01-01\n';
    const buffer = Buffer.from(csv, 'utf8');

    // Donor already exists — no donor.create call expected
    prisma.donor.findUnique.mockResolvedValue(stubDonor());
    prisma.engagement.findUnique.mockResolvedValue(null);
    prisma.payment.create.mockResolvedValue(stubPayment());
    prisma.payment.findMany.mockResolvedValue([stubPayment()]);

    const result = await adminImportPaymentsCsv('admin-1', 'Admin', buffer);
    expect(result.importedPayments).toBe(1);
    expect(result.createdDonors).toBe(0);
    expect(result.errors).toHaveLength(0);
  });

  it('creates a placeholder donor for an unknown email', async () => {
    const csv = 'email,amount,method,date\nnewdonor@test.com,50,card,2025-02-01\n';
    const buffer = Buffer.from(csv, 'utf8');

    // Donor does not exist yet → will be created as a placeholder
    prisma.donor.findUnique.mockResolvedValue(null);
    const newDonor = stubDonor({ id: 'donor-new', email: 'newdonor@test.com', accountCreated: false });
    prisma.donor.create.mockResolvedValue(newDonor);
    prisma.engagement.findUnique.mockResolvedValue(null);
    prisma.payment.create.mockResolvedValue(stubPayment({ donorId: 'donor-new' }));
    prisma.payment.findMany.mockResolvedValue([]);

    const result = await adminImportPaymentsCsv('admin-1', 'Admin', buffer);
    expect(result.createdDonors).toBe(1);
    expect(result.importedPayments).toBe(1);
  });

  it('records row-level errors and continues processing remaining rows', async () => {
    // Row 1: valid; Row 2: invalid method → error recorded, import continues
    const csv = 'email,amount,method,date\nalice@test.com,100,cash,2025-01-01\nbob@test.com,50,INVALID_METHOD,2025-01-02\n';
    const buffer = Buffer.from(csv, 'utf8');

    prisma.donor.findUnique
      .mockResolvedValueOnce(stubDonor())           // row 1: alice exists
      .mockResolvedValueOnce(stubDonor({ id: 'donor-2', email: 'bob@test.com' })); // row 2

    prisma.engagement.findUnique.mockResolvedValue(null);
    prisma.payment.create.mockResolvedValue(stubPayment());
    prisma.payment.findMany.mockResolvedValue([]);

    const result = await adminImportPaymentsCsv('admin-1', 'Admin', buffer);
    expect(result.importedPayments).toBe(1);   // only row 1 succeeded
    expect(result.errors.length).toBeGreaterThan(0);  // row 2 recorded an error
  });

  it('creates and updates engagement when CSV row includes a pledge column', async () => {
    const csv = 'email,amount,method,date,engagement\nalice@test.com,100,cash,2025-01-01,500\n';
    const buffer = Buffer.from(csv, 'utf8');

    prisma.donor.findUnique.mockResolvedValue(stubDonor());
    // No existing engagement → create path
    prisma.engagement.findUnique.mockResolvedValue(null);
    prisma.engagement.create.mockResolvedValue({});
    prisma.payment.create.mockResolvedValue(stubPayment());
    prisma.payment.findMany.mockResolvedValue([]);

    const result = await adminImportPaymentsCsv('admin-1', 'Admin', buffer);
    expect(result.importedPayments).toBe(1);
    expect(prisma.engagement.create).toHaveBeenCalledTimes(1);
  });

  it('updates engagement when donor already has one and pledge column is present', async () => {
    const csv = 'email,amount,method,date,pledge\nalice@test.com,100,cash,2025-01-01,1000\n';
    const buffer = Buffer.from(csv, 'utf8');

    prisma.donor.findUnique.mockResolvedValue(stubDonor());
    // Existing engagement → update path
    prisma.engagement.findUnique.mockResolvedValue({ donorId: 'donor-1', totalPledge: 500 });
    prisma.engagement.update.mockResolvedValue({});
    prisma.payment.create.mockResolvedValue(stubPayment());
    prisma.payment.findMany.mockResolvedValue([]);

    await adminImportPaymentsCsv('admin-1', 'Admin', buffer);
    expect(prisma.engagement.update).toHaveBeenCalledTimes(1);
  });
});

// ─── getMyPayments / getMyRequests ────────────────────────────────────────────

describe('getMyPayments', () => {
  it('returns all payments for the donor ordered by date desc', async () => {
    prisma.payment.findMany.mockResolvedValue([stubPayment()]);

    const result = await getMyPayments('donor-1');
    expect(result).toHaveLength(1);
    expect(prisma.payment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { donorId: 'donor-1' } })
    );
  });
});

describe('getMyRequests', () => {
  it('returns all requests linked to the donor', async () => {
    prisma.request.findMany.mockResolvedValue([{ id: 'req-1', type: 'general' }]);

    const result = await getMyRequests('donor-1');
    expect(result).toHaveLength(1);
  });
});

// ─── adminUpdateDonorPassword ─────────────────────────────────────────────────

describe('adminUpdateDonorPassword', () => {
  it('hashes and stores new password for existing donor', async () => {
    prisma.donor.findUnique.mockResolvedValue(stubDonor());
    prisma.donor.update.mockResolvedValue({});

    await adminUpdateDonorPassword('admin-1', 'Admin', 'donor-1', 'NewPass!');
    expect(prisma.donor.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { passwordHash: '$hashed' } })
    );
  });

  it('throws NOT_FOUND when donor does not exist', async () => {
    prisma.donor.findUnique.mockResolvedValue(null);
    await expect(
      adminUpdateDonorPassword('admin-1', 'Admin', 'ghost', 'pass')
    ).rejects.toMatchObject({ code: 'NOT_FOUND', statusCode: 404 });
  });
});

// ─── adminGetDonorPayments ────────────────────────────────────────────────────

describe('adminGetDonorPayments', () => {
  it('returns payments for a known donor', async () => {
    prisma.donor.findUnique.mockResolvedValue(stubDonor());
    prisma.payment.findMany.mockResolvedValue([stubPayment()]);

    const result = await adminGetDonorPayments('donor-1');
    expect(result).toHaveLength(1);
  });

  it('throws NOT_FOUND when donor does not exist', async () => {
    prisma.donor.findUnique.mockResolvedValue(null);
    await expect(adminGetDonorPayments('ghost')).rejects.toMatchObject({
      code: 'NOT_FOUND', statusCode: 404,
    });
  });
});

// ─── adminSetEngagement ───────────────────────────────────────────────────────

describe('adminSetEngagement', () => {
  it('creates engagement when none exists yet', async () => {
    prisma.donor.findUnique.mockResolvedValue(stubDonor());
    prisma.engagement.findUnique.mockResolvedValue(null); // no existing
    prisma.engagement.create.mockResolvedValue({ donorId: 'donor-1', totalPledge: 2000 });

    const result = await adminSetEngagement('admin-1', 'Admin', 'donor-1', {
      totalPledge: 2000,
    });
    expect(result.totalPledge).toBe(2000);
    expect(prisma.engagement.create).toHaveBeenCalledTimes(1);
  });

  it('updates existing engagement when one already exists', async () => {
    prisma.donor.findUnique.mockResolvedValue(stubDonor());
    prisma.engagement.findUnique.mockResolvedValue({ donorId: 'donor-1', totalPledge: 500, startDate: new Date(), endDate: null });
    prisma.engagement.update.mockResolvedValue({ donorId: 'donor-1', totalPledge: 3000 });

    const result = await adminSetEngagement('admin-1', 'Admin', 'donor-1', {
      totalPledge: 3000,
    });
    expect(result.totalPledge).toBe(3000);
    expect(prisma.engagement.update).toHaveBeenCalledTimes(1);
  });

  it('throws NOT_FOUND when donor does not exist', async () => {
    prisma.donor.findUnique.mockResolvedValue(null);
    await expect(
      adminSetEngagement('admin-1', 'Admin', 'ghost', { totalPledge: 1000 })
    ).rejects.toMatchObject({ code: 'NOT_FOUND', statusCode: 404 });
  });

  it('throws MISSING_PLEDGE_DATA when neither totalPledge nor pillars provided', async () => {
    prisma.donor.findUnique.mockResolvedValue(stubDonor());
    prisma.engagement.findUnique.mockResolvedValue(null);
    await expect(
      adminSetEngagement('admin-1', 'Admin', 'donor-1', {})
    ).rejects.toMatchObject({ code: 'MISSING_PLEDGE_DATA' });
  });

  it('calculates total from pillars when pillars object provided', async () => {
    prisma.donor.findUnique.mockResolvedValue(stubDonor());
    prisma.engagement.findUnique.mockResolvedValue(null);
    prisma.engagement.create.mockResolvedValue({ donorId: 'donor-1', totalPledge: 1000 });

    // pillars config has 'foundation' at 500, 'walls' at 1000 — provide a valid tier amount
    const result = await adminSetEngagement('admin-1', 'Admin', 'donor-1', {
      pillars: { foundation: 1 },
    });
    expect(prisma.engagement.create).toHaveBeenCalledTimes(1);
  });

  it('suceeds even when engagement confirmation email fails', async () => {
    const mailService = require('../../../modules/mail/mail.service');
    prisma.donor.findUnique.mockResolvedValue(stubDonor());
    prisma.engagement.findUnique.mockResolvedValue(null);
    prisma.engagement.create.mockResolvedValue({ donorId: 'donor-1', totalPledge: 500, startDate: new Date(), endDate: null });
    mailService.sendEngagementConfirmation.mockRejectedValueOnce(new Error('SMTP'));

    await expect(
      adminSetEngagement('admin-1', 'Admin', 'donor-1', { totalPledge: 500 })
    ).resolves.toBeDefined();
  });
});

// ─── adminCreateDonor ─────────────────────────────────────────────────────────

describe('adminCreateDonor', () => {
  it('creates a full account when a valid password is provided', async () => {
    prisma.donor.findUnique.mockResolvedValue(null); // email not taken
    prisma.donor.create.mockResolvedValue({
      ...stubDonor(), engagement: null, passwordHash: '$hashed',
    });

    const result = await adminCreateDonor('admin-1', 'Admin', {
      name:     'New Donor',
      email:    'newdonor@test.com',
      password: 'StrongPass!1',
    });
    expect(result).not.toHaveProperty('passwordHash');
    expect(prisma.donor.create).toHaveBeenCalledTimes(1);
  });

  it('creates a placeholder account when no valid password given', async () => {
    prisma.donor.findUnique.mockResolvedValue(null);
    prisma.donor.create.mockResolvedValue({ ...stubDonor(), accountCreated: false, engagement: null });

    const result = await adminCreateDonor('admin-1', 'Admin', {
      name:  'Placeholder',
      email: 'placeholder@test.com',
      // no password → placeholder
    });
    expect(result).not.toHaveProperty('passwordHash');
  });

  it('includes pledge engagement when pledgeAmount provided', async () => {
    prisma.donor.findUnique.mockResolvedValue(null);
    prisma.donor.create.mockResolvedValue({ ...stubDonor(), engagement: { totalPledge: 2000 } });

    await adminCreateDonor('admin-1', 'Admin', {
      name:          'With Pledge',
      email:         'pledge@test.com',
      password:      'StrongPass!1',
      pledgeAmount:  2000,
    });
    const { data } = prisma.donor.create.mock.calls[0][0];
    expect(data).toHaveProperty('engagement.create.totalPledge', 2000);
  });

  it('throws EMAIL_TAKEN when email already in use', async () => {
    prisma.donor.findUnique.mockResolvedValue(stubDonor());
    await expect(
      adminCreateDonor('admin-1', 'Admin', { name: 'X', email: 'alice@test.com', password: 'pass' })
    ).rejects.toMatchObject({ code: 'EMAIL_TAKEN', statusCode: 409 });
  });

  it('succeeds even when donor welcome email fails', async () => {
    const mailService = require('../../../modules/mail/mail.service');
    prisma.donor.findUnique.mockResolvedValue(null);
    prisma.donor.create.mockResolvedValue({ ...stubDonor(), engagement: null });
    mailService.sendDonorAccountCreation.mockRejectedValueOnce(new Error('SMTP'));

    await expect(
      adminCreateDonor('admin-1', 'Admin', { name: 'X', email: 'x@test.com', password: 'StrongPass!1' })
    ).resolves.toBeDefined();
  });
});

// ─── adminUpsertDonorPayment ──────────────────────────────────────────────────

describe('adminUpsertDonorPayment', () => {
  it('returns duplicate:true when payment with same externalEntryId already exists', async () => {
    const existingPayment = {
      id:      'pay-1',
      donorId: 'donor-1',
      donor:   stubDonor(),
      recordedByAdmin: { id: 'admin-1', name: 'Admin' },
    };
    prisma.payment.findFirst.mockResolvedValue(existingPayment);

    const result = await adminUpsertDonorPayment('admin-1', 'Admin', {
      donor:   { email: 'alice@test.com', name: 'Alice' },
      payment: { entryId: 'entry-001', amount: 100, date: '2025-01-01', method: 'cash' },
    });
    expect(result.duplicate).toBe(true);
    expect(result.paymentCreated).toBe(false);
  });

  it('creates donor and payment when donor does not exist', async () => {
    prisma.payment.findFirst.mockResolvedValue(null); // no duplicate
    const newDonorRecord = { id: 'donor-1', name: 'New Person', email: 'new@test.com', accountCreated: false, isActive: true, engagement: null };
    prisma.donor.findUnique
      .mockResolvedValueOnce(null)           // adminUpsertDonorPayment: email lookup → not found
      .mockResolvedValueOnce(null)           // adminCreateDonor: email taken check → not taken
      .mockResolvedValueOnce(newDonorRecord); // adminAddPayment: donor by id → found
    prisma.donor.create.mockResolvedValue({ ...newDonorRecord, passwordHash: '$hashed' });
    // adminAddPayment inside upsert:
    prisma.payment.create.mockResolvedValue(stubPayment());
    prisma.payment.findMany.mockResolvedValue([stubPayment()]);
    prisma.engagement.findUnique.mockResolvedValue(null);

    const result = await adminUpsertDonorPayment('admin-1', 'Admin', {
      donor:   { email: 'new@test.com', name: 'New Person' },
      payment: { entryId: 'entry-002', amount: 100, date: '2025-01-01', method: 'cash' },
    });
    expect(result.donorCreated).toBe(true);
    expect(result.paymentCreated).toBe(true);
  });

  it('uses existing donor and creates payment when donor already exists', async () => {
    prisma.payment.findFirst.mockResolvedValue(null); // no duplicate
    const existingDonor = { ...stubDonor(), engagement: null };
    prisma.donor.findUnique.mockResolvedValue(existingDonor); // all id/email lookups return donor
    prisma.payment.create.mockResolvedValue(stubPayment());
    prisma.payment.findMany.mockResolvedValue([stubPayment()]);
    prisma.engagement.findUnique.mockResolvedValue(null);

    const result = await adminUpsertDonorPayment('admin-1', 'Admin', {
      donor:   { email: 'alice@test.com', name: 'Alice' }, // same name → no donor.update triggered
      payment: { entryId: 'entry-003', amount: 200, date: '2025-02-01', method: 'card' },
    });
    expect(result.donorCreated).toBe(false);
    expect(result.duplicate).toBe(false);
  });
});

// ─── adminUpdateDonor — deactivation email ────────────────────────────────────

describe('adminUpdateDonor — deactivation email', () => {
  it('sends deactivation notice when isActive is set to false', async () => {
    const mailService = require('../../../modules/mail/mail.service');
    prisma.donor.findUnique.mockResolvedValue(stubDonor());
    prisma.donor.findFirst.mockResolvedValue(null); // no email conflict
    prisma.donor.update.mockResolvedValue(stubDonor({ isActive: false }));

    await adminUpdateDonor('admin-1', 'Admin', 'donor-1', { isActive: false });
    expect(mailService.sendDonorDeactivationNotice).toHaveBeenCalledTimes(1);
  });

  it('succeeds even when deactivation email fails', async () => {
    const mailService = require('../../../modules/mail/mail.service');
    prisma.donor.findUnique.mockResolvedValue(stubDonor());
    prisma.donor.findFirst.mockResolvedValue(null);
    prisma.donor.update.mockResolvedValue(stubDonor({ isActive: false }));
    mailService.sendDonorDeactivationNotice.mockRejectedValueOnce(new Error('SMTP'));

    await expect(
      adminUpdateDonor('admin-1', 'Admin', 'donor-1', { isActive: false })
    ).resolves.toBeDefined();
  });
});

// ─── adminAddPayment — email failure resilience ─────────────────────────────

describe('adminAddPayment — email failure resilience', () => {
  it('succeeds even when payment confirmation email fails', async () => {
    const mailService = require('../../../modules/mail/mail.service');
    prisma.donor.findUnique.mockResolvedValue(stubDonor());
    prisma.payment.create.mockResolvedValue(stubPayment());
    prisma.payment.findMany.mockResolvedValue([stubPayment()]);
    prisma.engagement.findUnique.mockResolvedValue(null);
    mailService.sendPaymentConfirmation.mockRejectedValueOnce(new Error('SMTP'));

    await expect(
      adminAddPayment('admin-1', 'Admin', 'donor-1', { amount: 100, date: '2025-01-01', method: 'cash' })
    ).resolves.toBeDefined();
  });
});

// ─── generatePaymentConfirmation ──────────────────────────────────────────────

describe('generatePaymentConfirmation', () => {
  it('returns a PDFDocument stream for valid donor+payment', async () => {
    prisma.donor.findUnique.mockResolvedValue(stubDonor());
    prisma.payment.findUnique.mockResolvedValue({
      ...stubPayment(),
      recordedByAdmin: null,
    });
    prisma.payment.findMany.mockResolvedValue([stubPayment()]);

    const doc = await generatePaymentConfirmation('donor-1', 'pay-1', 'admin-1');
    // pdfkit is mocked — verify end() was called (document was finalized)
    expect(doc.end).toHaveBeenCalled();
  });

  it('includes pledge section when donor has engagement', async () => {
    const PDFDocument = require('pdfkit');
    const mockDoc = new PDFDocument();

    prisma.donor.findUnique.mockResolvedValue({
      ...stubDonor(),
      engagement: { totalPledge: 5000 },
    });
    prisma.payment.findUnique.mockResolvedValue({ ...stubPayment(), note: 'test note', recordedByAdmin: null });
    prisma.payment.findMany.mockResolvedValue([stubPayment()]);

    await generatePaymentConfirmation('donor-1', 'pay-1', 'admin-1');
    // text() is called multiple times for pledge information
    expect(mockDoc.text).toHaveBeenCalled();
  });

  it('throws NOT_FOUND when donor does not exist', async () => {
    prisma.donor.findUnique.mockResolvedValue(null);
    prisma.payment.findUnique.mockResolvedValue(stubPayment());
    await expect(
      generatePaymentConfirmation('ghost', 'pay-1', 'admin-1')
    ).rejects.toMatchObject({ code: 'NOT_FOUND', statusCode: 404 });
  });

  it('throws NOT_FOUND when payment does not exist', async () => {
    prisma.donor.findUnique.mockResolvedValue(stubDonor());
    prisma.payment.findUnique.mockResolvedValue(null);
    await expect(
      generatePaymentConfirmation('donor-1', 'ghost-pay', 'admin-1')
    ).rejects.toMatchObject({ code: 'NOT_FOUND', statusCode: 404 });
  });

  it('throws INVALID_REQUEST when payment belongs to a different donor', async () => {
    prisma.donor.findUnique.mockResolvedValue(stubDonor());
    prisma.payment.findUnique.mockResolvedValue({ ...stubPayment({ donorId: 'donor-99' }), recordedByAdmin: null });
    await expect(
      generatePaymentConfirmation('donor-1', 'pay-1', 'admin-1')
    ).rejects.toMatchObject({ code: 'INVALID_REQUEST' });
  });
});

// ─── uploadPaymentReceipt ─────────────────────────────────────────────────────

describe('uploadPaymentReceipt', () => {
  it('stores the receipt path and returns updated payment', async () => {
    prisma.payment.findUnique.mockResolvedValue(stubPayment());
    prisma.payment.update.mockResolvedValue({ ...stubPayment(), receiptPath: '/receipts/test.jpg' });

    const result = await uploadPaymentReceipt('admin-1', 'Admin', 'donor-1', 'pay-1', {
      filename: 'test.jpg',
    });
    expect(result.receiptPath).toContain('test.jpg');
  });

  it('throws PAYMENT_NOT_FOUND when payment not found', async () => {
    prisma.payment.findUnique.mockResolvedValue(null);
    await expect(
      uploadPaymentReceipt('admin-1', 'Admin', 'donor-1', 'ghost', { filename: 'x.pdf' })
    ).rejects.toMatchObject({ code: 'PAYMENT_NOT_FOUND', statusCode: 404 });
  });

  it('throws PAYMENT_NOT_FOUND when payment belongs to a different donor', async () => {
    prisma.payment.findUnique.mockResolvedValue(stubPayment({ donorId: 'donor-99' }));
    await expect(
      uploadPaymentReceipt('admin-1', 'Admin', 'donor-1', 'pay-1', { filename: 'f.pdf' })
    ).rejects.toMatchObject({ code: 'PAYMENT_NOT_FOUND' });
  });
});

// ─── downloadPaymentConfirmation ──────────────────────────────────────────────

describe('downloadPaymentConfirmation', () => {
  const mockRes = { setHeader: jest.fn(), write: jest.fn(), end: jest.fn() };

  it('pipes PDF to response for valid donor+payment', async () => {
    prisma.payment.findUnique.mockResolvedValue({
      ...stubPayment(),
      donor: stubDonor(),
      paymentDate: new Date('2025-01-15'),
      status: 'paid',
    });

    await downloadPaymentConfirmation('donor-1', 'pay-1', mockRes);
    // The res headers must be set before piping
    expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
  });

  it('throws PAYMENT_NOT_FOUND when payment not found', async () => {
    prisma.payment.findUnique.mockResolvedValue(null);
    await expect(
      downloadPaymentConfirmation('donor-1', 'ghost', mockRes)
    ).rejects.toMatchObject({ code: 'PAYMENT_NOT_FOUND' });
  });

  it('throws PAYMENT_NOT_FOUND when payment belongs to a different donor', async () => {
    prisma.payment.findUnique.mockResolvedValue({
      ...stubPayment({ donorId: 'donor-99' }),
      donor: stubDonor({ id: 'donor-99' }),
    });
    await expect(
      downloadPaymentConfirmation('donor-1', 'pay-1', mockRes)
    ).rejects.toMatchObject({ code: 'PAYMENT_NOT_FOUND' });
  });
});
