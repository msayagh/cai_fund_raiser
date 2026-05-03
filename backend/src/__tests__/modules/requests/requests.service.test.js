'use strict';

// ─── Test Suite: requests.service ────────────────────────────────────────────
// Requests are the main workflow object: a donor (or anonymous visitor) fills out
// a form and an admin then approves, declines, or holds the request.
//
// Request types and their approval side-effects:
//   general          — just updates status to 'approved'
//   account_creation — creates a donor account and links it to the request
//   payment_upload   — records a payment for the linked donor
//   engagement_change — updates the donor's engagement plan
//
// Status machine:
//   pending ──→ approved
//   pending ──→ declined
//   pending ──→ on_hold
//   on_hold ──→ approved
//   on_hold ──→ declined
//   approved/declined ──→ ✗ ALREADY_PROCESSED

// Mock every Prisma model the service needs
jest.mock('../../../db/client', () => ({
  request: {
    findUnique: jest.fn(),
    findMany:   jest.fn(),
    create:     jest.fn(),
    update:     jest.fn(),
    count:      jest.fn(),
  },
  requestAttachment: { create: jest.fn(), findFirst: jest.fn() },
  donor:   { findUnique: jest.fn(), create: jest.fn() },
  payment: { create: jest.fn(), findMany: jest.fn() },
  activityLog: { create: jest.fn() },
}));

// Mock audit logging
jest.mock('../../../modules/logs/logs.service', () => ({
  createLog: jest.fn().mockResolvedValue(undefined),
}));

// Mock all email notifications — no SMTP calls during tests
jest.mock('../../../modules/mail/mail.service', () => ({
  sendRequestStatusUpdate:  jest.fn().mockResolvedValue(undefined),
  sendDonorAccountCreation: jest.fn().mockResolvedValue(undefined),
  sendPaymentConfirmation:  jest.fn().mockResolvedValue(undefined),
}));

const prisma       = require('../../../db/client');
const mailService  = require('../../../modules/mail/mail.service');
const AppError     = require('../../../utils/AppError');
const {
  listRequests,
  getRequestById,
  createRequest,
  addAttachments,
  getAttachment,
  approveRequest,
  declineRequest,
  holdRequest,
} = require('../../../modules/requests/requests.service');

// Minimal request DB row — override only what each test needs
const stubRequest = (overrides = {}) => ({
  id:          'req-1',
  type:        'general',
  name:        'John Doe',
  email:       'john@test.com',
  message:     'Hello',
  status:      'pending',
  donorId:     null,        // null until an account_creation request is approved
  attachments: [],
  createdAt:   new Date(),
  ...overrides,
});

// ─── listRequests ─────────────────────────────────────────────────────────────
// listRequests(filters) → { items, total, page, limit }
// Supports pagination and filtering by status and type.

describe('listRequests', () => {
  it('returns paginated results with total', async () => {
    prisma.request.count.mockResolvedValue(1);
    prisma.request.findMany.mockResolvedValue([stubRequest()]);

    const result = await listRequests();
    expect(result.total).toBe(1);
    expect(result.items).toHaveLength(1);
    expect(result.page).toBe(1);    // defaults to page 1
    expect(result.limit).toBe(20);  // default page size is 20
  });

  it('clamps limit to a maximum of 100', async () => {
    // Prevent clients from requesting arbitrarily large pages
    prisma.request.count.mockResolvedValue(0);
    prisma.request.findMany.mockResolvedValue([]);

    const result = await listRequests({ limit: 9999 });
    expect(result.limit).toBe(100);  // capped at 100
  });

  it('filters by status when provided', async () => {
    prisma.request.count.mockResolvedValue(0);
    prisma.request.findMany.mockResolvedValue([]);

    await listRequests({ status: 'approved' });
    // The where clause must include the status filter
    expect(prisma.request.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: 'approved' } })
    );
  });

  it('filters by type when provided', async () => {
    prisma.request.count.mockResolvedValue(0);
    prisma.request.findMany.mockResolvedValue([]);

    await listRequests({ type: 'account_creation' });
    expect(prisma.request.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { type: 'account_creation' } })
    );
  });
});

// ─── getRequestById ───────────────────────────────────────────────────────────
// getRequestById(id) → request
// Throws NOT_FOUND when the request doesn't exist (or was never created).

describe('getRequestById', () => {
  it('returns the request when found', async () => {
    const req = stubRequest();
    prisma.request.findUnique.mockResolvedValue(req);

    const result = await getRequestById('req-1');
    expect(result.id).toBe('req-1');
  });

  it('throws NOT_FOUND when request does not exist', async () => {
    prisma.request.findUnique.mockResolvedValue(null);
    await expect(getRequestById('ghost')).rejects.toMatchObject({
      code:       'NOT_FOUND',
      statusCode: 404,
    });
  });
});

// ─── createRequest ────────────────────────────────────────────────────────────
// createRequest(data) → request
// Any visitor can submit a request — no auth required for this endpoint.

describe('createRequest', () => {
  it('creates and returns a request', async () => {
    const created = stubRequest({ type: 'account_creation' });
    prisma.request.create.mockResolvedValue(created);

    const result = await createRequest({
      type:    'account_creation',
      name:    'John Doe',
      email:   'john@test.com',
      message: 'Please create account',
    });

    expect(result.type).toBe('account_creation');
    expect(prisma.request.create).toHaveBeenCalledTimes(1);
  });

  it('sets donorId to null when not provided', async () => {
    // Anonymous requests always have donorId=null until approved and linked
    prisma.request.create.mockResolvedValue(stubRequest());
    await createRequest({ type: 'general', name: 'A', email: 'a@test.com', message: 'msg' });
    const callData = prisma.request.create.mock.calls[0][0].data;
    expect(callData.donorId).toBeNull();
  });
});

// ─── approveRequest ───────────────────────────────────────────────────────────
// approveRequest(adminId, adminName, requestId, extraData) → { request, extraData }
// extraData carries type-specific approval inputs (pledgeAmount for
// account_creation; amount/date/method for payment_upload). Login is now
// passwordless (OTP) so account_creation no longer takes a password.

describe('approveRequest — general type', () => {
  it('sets status to approved for a general pending request', async () => {
    const req = stubRequest({ type: 'general', status: 'pending' });
    prisma.request.findUnique.mockResolvedValue(req);
    prisma.request.update.mockResolvedValue({ ...req, status: 'approved' });

    const result = await approveRequest('admin-1', 'Admin', 'req-1', {});
    expect(result.request.status).toBe('approved');
  });

  it('throws NOT_FOUND when request does not exist', async () => {
    prisma.request.findUnique.mockResolvedValue(null);
    await expect(
      approveRequest('admin-1', 'Admin', 'ghost', {})
    ).rejects.toMatchObject({ code: 'NOT_FOUND', statusCode: 404 });
  });

  it('throws ALREADY_PROCESSED when request is already approved', async () => {
    // Prevents double-processing — e.g. two admins clicking at the same time
    prisma.request.findUnique.mockResolvedValue(stubRequest({ status: 'approved' }));
    await expect(
      approveRequest('admin-1', 'Admin', 'req-1', {})
    ).rejects.toMatchObject({ code: 'ALREADY_PROCESSED' });
  });

  it('throws ALREADY_PROCESSED when request is already declined', async () => {
    // A declined request is also terminal — cannot be re-approved
    prisma.request.findUnique.mockResolvedValue(stubRequest({ status: 'declined' }));
    await expect(
      approveRequest('admin-1', 'Admin', 'req-1', {})
    ).rejects.toMatchObject({ code: 'ALREADY_PROCESSED' });
  });

  it('can approve an on_hold request', async () => {
    // on_hold is NOT terminal — admin can still approve or decline after review
    const req = stubRequest({ status: 'on_hold' });
    prisma.request.findUnique.mockResolvedValue(req);
    prisma.request.update.mockResolvedValue({ ...req, status: 'approved' });

    const result = await approveRequest('admin-1', 'Admin', 'req-1', {});
    expect(result.request.status).toBe('approved');
  });
});

describe('approveRequest — account_creation type', () => {
  it('creates a donor and links them to the request', async () => {
    const req = stubRequest({ type: 'account_creation', status: 'pending' });
    prisma.request.findUnique.mockResolvedValue(req);
    prisma.donor.findUnique.mockResolvedValue(null); // email not taken
    prisma.donor.create.mockResolvedValue({ id: 'new-donor', name: 'John Doe', email: 'john@test.com' });
    prisma.request.update.mockResolvedValue({ ...req, status: 'approved', donorId: 'new-donor' });

    const result = await approveRequest('admin-1', 'Admin', 'req-1', {});
    // extraData returns the new donor ID so the client can redirect/display it
    expect(result.extraData.donorId).toBe('new-donor');
  });

  it('throws EMAIL_TAKEN when donor account already exists', async () => {
    // Prevents overwriting an existing donor account via a second request
    prisma.request.findUnique.mockResolvedValue(
      stubRequest({ type: 'account_creation', status: 'pending' })
    );
    prisma.donor.findUnique.mockResolvedValue({
      id: 'existing', email: 'john@test.com', accountCreated: true,
    });
    await expect(
      approveRequest('admin-1', 'Admin', 'req-1', {})
    ).rejects.toMatchObject({ code: 'EMAIL_TAKEN' });
  });

  it('calls sendDonorAccountCreation with (email, name) only', async () => {
    const req = stubRequest({ type: 'account_creation', status: 'pending' });
    prisma.request.findUnique.mockResolvedValue(req);
    prisma.donor.findUnique.mockResolvedValue(null);
    prisma.donor.create.mockResolvedValue({ id: 'new-donor', name: 'John Doe', email: 'john@test.com' });
    prisma.request.update.mockResolvedValue({ ...req, status: 'approved', donorId: 'new-donor' });
    mailService.sendDonorAccountCreation.mockClear();

    await approveRequest('admin-1', 'Admin', 'req-1', {});
    expect(mailService.sendDonorAccountCreation).toHaveBeenCalledWith('john@test.com', 'John Doe');
  });
});

describe('approveRequest — payment_upload type', () => {
  it('creates a payment when required fields are present', async () => {
    const req = stubRequest({ type: 'payment_upload', status: 'pending', donorId: 'donor-1' });
    prisma.request.findUnique.mockResolvedValue(req);
    prisma.payment.create.mockResolvedValue({ id: 'pay-1' });
    prisma.request.update.mockResolvedValue({ ...req, status: 'approved' });
    // The donor record is needed to send a confirmation email
    prisma.donor.findUnique.mockResolvedValue({ id: 'donor-1', email: 'john@test.com', name: 'John', engagement: null });
    prisma.payment.findMany.mockResolvedValue([{ amount: 100 }]);

    const result = await approveRequest('admin-1', 'Admin', 'req-1', {
      amount: 500,
      date:   '2025-01-01',
      method: 'cash',
    });
    // extraData carries the payment ID for the confirmation UI
    expect(result.extraData.paymentId).toBe('pay-1');
  });

  it('throws VALIDATION_ERROR when amount/date/method are missing', async () => {
    // All three fields required — if any is missing we reject before touching the DB
    prisma.request.findUnique.mockResolvedValue(
      stubRequest({ type: 'payment_upload', status: 'pending', donorId: 'donor-1' })
    );
    await expect(
      approveRequest('admin-1', 'Admin', 'req-1', {}) // missing amount, date, method
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });
});

// ─── declineRequest ───────────────────────────────────────────────────────────
// declineRequest(adminId, adminName, requestId) → request
// Allowed from pending or on_hold status.  Terminal states (approved/declined) throw.

describe('declineRequest', () => {
  it('sets status to declined for a pending request', async () => {
    const req = stubRequest({ status: 'pending' });
    prisma.request.findUnique.mockResolvedValue(req);
    prisma.request.update.mockResolvedValue({ ...req, status: 'declined' });

    const result = await declineRequest('admin-1', 'Admin', 'req-1');
    expect(result.status).toBe('declined');
  });

  it('can decline an on_hold request', async () => {
    // on_hold → declined is a valid transition (admin reviewed and rejected)
    const req = stubRequest({ status: 'on_hold' });
    prisma.request.findUnique.mockResolvedValue(req);
    prisma.request.update.mockResolvedValue({ ...req, status: 'declined' });

    const result = await declineRequest('admin-1', 'Admin', 'req-1');
    expect(result.status).toBe('declined');
  });

  it('throws NOT_FOUND when request does not exist', async () => {
    prisma.request.findUnique.mockResolvedValue(null);
    await expect(
      declineRequest('admin-1', 'Admin', 'ghost')
    ).rejects.toMatchObject({ code: 'NOT_FOUND', statusCode: 404 });
  });

  it('throws ALREADY_PROCESSED when request is already declined', async () => {
    prisma.request.findUnique.mockResolvedValue(stubRequest({ status: 'declined' }));
    await expect(
      declineRequest('admin-1', 'Admin', 'req-1')
    ).rejects.toMatchObject({ code: 'ALREADY_PROCESSED' });
  });
});

// ─── holdRequest ─────────────────────────────────────────────────────────────
// holdRequest(adminId, adminName, requestId) → request
// Marks a pending request as on_hold — the admin needs more information or time.
// on_hold requests can later be approved or declined.

describe('holdRequest', () => {
  it('sets status to on_hold for a pending request', async () => {
    const req = stubRequest({ status: 'pending' });
    prisma.request.findUnique.mockResolvedValue(req);
    prisma.request.update.mockResolvedValue({ ...req, status: 'on_hold' });

    const result = await holdRequest('admin-1', 'Admin', 'req-1');
    expect(result.status).toBe('on_hold');
  });

  it('throws NOT_FOUND when request does not exist', async () => {
    prisma.request.findUnique.mockResolvedValue(null);
    await expect(
      holdRequest('admin-1', 'Admin', 'ghost')
    ).rejects.toMatchObject({ code: 'NOT_FOUND', statusCode: 404 });
  });

  it('throws ALREADY_PROCESSED when request is not pending (e.g. on_hold)', async () => {
    // holdRequest can only move pending → on_hold; on_hold → on_hold is not valid
    prisma.request.findUnique.mockResolvedValue(stubRequest({ status: 'on_hold' }));
    await expect(
      holdRequest('admin-1', 'Admin', 'req-1')
    ).rejects.toMatchObject({ code: 'ALREADY_PROCESSED' });
  });
});

// ─── addAttachments ───────────────────────────────────────────────────────────
// addAttachments(requestId, files) — stores uploaded file metadata in the DB.

describe('addAttachments', () => {
  it('creates attachment records and returns them', async () => {
    prisma.request.findUnique.mockResolvedValue(stubRequest());
    const fakeAtt = { id: 'att-1', requestId: 'req-1', filename: 'doc.pdf' };
    prisma.requestAttachment.create.mockResolvedValue(fakeAtt);

    const files = [{ originalname: 'doc.pdf', mimetype: 'application/pdf', path: '/uploads/doc.pdf', size: 1024 }];
    const result = await addAttachments('req-1', files);
    expect(result).toHaveLength(1);
    expect(result[0].filename).toBe('doc.pdf');
  });

  it('throws NOT_FOUND when request does not exist', async () => {
    prisma.request.findUnique.mockResolvedValue(null);
    await expect(
      addAttachments('ghost', [{ originalname: 'f.pdf', mimetype: 'application/pdf', path: '/p', size: 1 }])
    ).rejects.toMatchObject({ code: 'NOT_FOUND', statusCode: 404 });
  });
});

// ─── getAttachment ────────────────────────────────────────────────────────────
// getAttachment(requestId, attachmentId) — retrieves a specific attachment record.

describe('getAttachment', () => {
  it('returns the attachment when found', async () => {
    const fakeAtt = { id: 'att-1', requestId: 'req-1', filename: 'img.jpg' };
    prisma.requestAttachment.findFirst.mockResolvedValue(fakeAtt);

    const result = await getAttachment('req-1', 'att-1');
    expect(result.id).toBe('att-1');
  });

  it('throws NOT_FOUND when attachment does not exist', async () => {
    prisma.requestAttachment.findFirst.mockResolvedValue(null);
    await expect(
      getAttachment('req-1', 'ghost-att')
    ).rejects.toMatchObject({ code: 'NOT_FOUND', statusCode: 404 });
  });
});

// ─── approveRequest — engagement_change type ────────────────────────────────

describe('approveRequest — engagement_change type', () => {
  it('approves an engagement_change request and returns updated record', async () => {
    const req = stubRequest({ type: 'engagement_change', status: 'pending', donorId: 'donor-9' });
    prisma.request.findUnique.mockResolvedValue(req);
    prisma.request.update.mockResolvedValue({ ...req, status: 'approved' });

    const result = await approveRequest('admin-1', 'Admin', 'req-1', {});
    expect(result.request.status).toBe('approved');
  });
});

// ─── approveRequest — payment_upload without donorId on request ─────────────

describe('approveRequest — payment_upload email fallback', () => {
  it('looks up donor by email when request.donorId is null', async () => {
    // The request has no donorId — the service must find the donor via email
    const req = stubRequest({ type: 'payment_upload', status: 'pending', donorId: null });
    prisma.request.findUnique.mockResolvedValue(req);
    const donor = { id: 'donor-found', email: 'john@test.com', name: 'John', engagement: null };
    prisma.donor.findUnique.mockResolvedValue(donor);
    prisma.payment.create.mockResolvedValue({ id: 'pay-2' });
    prisma.request.update.mockResolvedValue({ ...req, status: 'approved' });
    prisma.payment.findMany.mockResolvedValue([{ amount: 200 }]);

    const result = await approveRequest('admin-1', 'Admin', 'req-1', {
      amount: 200, date: '2025-03-01', method: 'card',
    });
    expect(result.extraData.paymentId).toBe('pay-2');
  });

  it('throws NOT_FOUND when no donor account found by email for payment_upload', async () => {
    const req = stubRequest({ type: 'payment_upload', status: 'pending', donorId: null });
    prisma.request.findUnique.mockResolvedValue(req);
    prisma.donor.findUnique.mockResolvedValue(null); // no donor found

    await expect(
      approveRequest('admin-1', 'Admin', 'req-1', { amount: 100, date: '2025-01-01', method: 'cash' })
    ).rejects.toMatchObject({ code: 'NOT_FOUND', statusCode: 404 });
  });
});

// ─── email send failure resilience ────────────────────────────────────────────
// Each request operation tries to send an email; if the mail service throws,
// the operation must still succeed (error is caught and logged, not propagated).

describe('email send failure resilience', () => {
  let consoleErrorSpy;
  beforeEach(() => { consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {}); });
  afterEach(() => { consoleErrorSpy.mockRestore(); });
  it('approveRequest succeeds even when status-update email fails', async () => {
    const req = stubRequest({ type: 'general', status: 'pending' });
    prisma.request.findUnique.mockResolvedValue(req);
    prisma.request.update.mockResolvedValue({ ...req, status: 'approved' });
    mailService.sendRequestStatusUpdate.mockRejectedValueOnce(new Error('SMTP down'));

    // Should NOT throw even though the email failed
    const result = await approveRequest('admin-1', 'Admin', 'req-1', {});
    expect(result.request.status).toBe('approved');
  });

  it('declineRequest succeeds even when status-update email fails', async () => {
    const req = stubRequest({ status: 'pending' });
    prisma.request.findUnique.mockResolvedValue(req);
    prisma.request.update.mockResolvedValue({ ...req, status: 'declined' });
    mailService.sendRequestStatusUpdate.mockRejectedValueOnce(new Error('SMTP down'));

    const result = await declineRequest('admin-1', 'Admin', 'req-1');
    expect(result.status).toBe('declined');
  });

  it('holdRequest succeeds even when status-update email fails', async () => {
    const req = stubRequest({ status: 'pending' });
    prisma.request.findUnique.mockResolvedValue(req);
    prisma.request.update.mockResolvedValue({ ...req, status: 'on_hold' });
    mailService.sendRequestStatusUpdate.mockRejectedValueOnce(new Error('SMTP down'));

    const result = await holdRequest('admin-1', 'Admin', 'req-1');
    expect(result.status).toBe('on_hold');
  });

  it('approveRequest (account_creation) succeeds even when donor creation email fails', async () => {
    const req = stubRequest({ type: 'account_creation', status: 'pending' });
    prisma.request.findUnique.mockResolvedValue(req);
    prisma.donor.findUnique
      .mockResolvedValueOnce(null)   // email not taken check
      .mockResolvedValueOnce(null);  // post-approval email lookup (returns null — mail skipped OK)
    prisma.donor.create.mockResolvedValue({ id: 'new-d', name: 'John', email: 'john@test.com' });
    prisma.request.update.mockResolvedValue({ ...req, status: 'approved', donorId: 'new-d' });
    mailService.sendDonorAccountCreation.mockRejectedValueOnce(new Error('SMTP down'));
    mailService.sendRequestStatusUpdate.mockRejectedValueOnce(new Error('SMTP down'));

    const result = await approveRequest('admin-1', 'Admin', 'req-1', {});
    expect(result.extraData.donorId).toBe('new-d');
  });
});

// ─── approveRequest payment_upload — sendPaymentConfirmation failure ──────────

describe('approveRequest payment_upload — email failure resilience', () => {
  let consoleErrorSpy;
  beforeEach(() => { consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {}); });
  afterEach(() => { consoleErrorSpy.mockRestore(); });

  it('succeeds even when sendPaymentConfirmation fails', async () => {
    const req = {
      id: 'req-1', status: 'pending', type: 'payment_upload',
      email: 'alice@test.com', donorId: 'donor-1',
    };
    prisma.request.findUnique.mockResolvedValue(req);
    prisma.payment.create.mockResolvedValue({ id: 'pay-1', date: new Date(), donorId: 'donor-1' });
    prisma.request.update.mockResolvedValue({ ...req, status: 'approved' });
    // donor lookup inside sendPaymentConfirmation try block
    prisma.donor.findUnique.mockResolvedValue({ id: 'donor-1', name: 'Alice', email: 'alice@test.com', engagement: null });
    prisma.payment.findMany.mockResolvedValue([{ amount: 100 }]);
    mailService.sendPaymentConfirmation.mockRejectedValueOnce(new Error('SMTP down'));
    mailService.sendRequestStatusUpdate.mockResolvedValue({});

    const result = await approveRequest('admin-1', 'Admin', 'req-1', {
      amount: 100, date: '2025-01-15', method: 'cash',
    });
    expect(result.request.status).toBe('approved');
  });
});
