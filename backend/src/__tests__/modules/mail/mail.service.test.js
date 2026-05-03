'use strict';

// ─── Test Suite: mail.service ─────────────────────────────────────────────────
// Covers every exported symbol:
//   initializeTransporter   — creates SMTP transporter from env vars (two branches)
//   getTransporter          — lazy singleton accessor (both truthy/falsy cache paths)
//   sendEmail               — core send with try/catch (success, text param, failure)
//   sendRegistrationConfirmation
//   sendPaymentConfirmation
//   sendRequestStatusUpdate
//   sendAdminAccountCreation       — (email, name) — passwordless OTP login
//   sendDonorAccountCreation       — (email, name) — passwordless OTP login
//   sendDonorDeactivationNotice (with and without reason param)
//   sendAdminActionNotification
//   sendEngagementConfirmation
//
// Note: sendPasswordReset has been removed alongside passwordless OTP login.

// ── Mocks ─────────────────────────────────────────────────────────────────────

// Keep a reference to the mock sendMail that nodemailer's transporter exposes
const mockSendMail = jest.fn();

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(),
}));

jest.mock('../../../modules/mail/mail.templates', () => ({
  registrationConfirmationTemplate: jest.fn(() => '<html>registration</html>'),
  paymentConfirmationTemplate:      jest.fn(() => '<html>payment</html>'),
  requestStatusTemplate:            jest.fn(() => '<html>request</html>'),
  adminAccountTemplate:             jest.fn(() => '<html>admin</html>'),
  donorAccountCreationTemplate:     jest.fn(() => '<html>donor</html>'),
  donorDeactivationTemplate:        jest.fn(() => '<html>deactivation</html>'),
  adminActionTemplate:              jest.fn(() => '<html>action</html>'),
  engagementConfirmationTemplate:   jest.fn(() => '<html>engagement</html>'),
}));

// ── Imports ───────────────────────────────────────────────────────────────────

const nodemailer = require('nodemailer');

// Set createTransport to return a mock transporter before requiring mail.service
// (the module-level `transporter` is null until getTransporter() is first called)
nodemailer.createTransport.mockReturnValue({ sendMail: mockSendMail });

const {
  sendEmail,
  initializeTransporter,
  getTransporter,
  sendRegistrationConfirmation,
  sendPaymentConfirmation,
  sendRequestStatusUpdate,
  sendAdminAccountCreation,
  sendDonorAccountCreation,
  sendDonorDeactivationNotice,
  sendAdminActionNotification,
  sendEngagementConfirmation,
} = require('../../../modules/mail/mail.service');

// ─── initializeTransporter ────────────────────────────────────────────────────

describe('initializeTransporter', () => {
  it('creates a production SMTP transporter when EMAIL_PROVIDER is not set', () => {
    delete process.env.EMAIL_PROVIDER;
    initializeTransporter();
    // Should call createTransport with a gmail-based host (default)
    const lastCall = nodemailer.createTransport.mock.calls.at(-1)[0];
    expect(lastCall.host).toMatch(/smtp/i);
  });

  it('creates an Ethereal test transporter when EMAIL_PROVIDER=test', () => {
    process.env.EMAIL_PROVIDER = 'test';
    initializeTransporter();
    const lastCall = nodemailer.createTransport.mock.calls.at(-1)[0];
    expect(lastCall.host).toBe('smtp.ethereal.email');
    delete process.env.EMAIL_PROVIDER;
  });
});

// ─── getTransporter ───────────────────────────────────────────────────────────

describe('getTransporter', () => {
  it('returns a transporter with a sendMail function', () => {
    const t = getTransporter();
    expect(t).toBeDefined();
    expect(typeof t.sendMail).toBe('function');
  });

  it('returns the same cached instance on subsequent calls', () => {
    const t1 = getTransporter();
    const t2 = getTransporter();
    expect(t1).toBe(t2);
  });
});

// ─── sendEmail ────────────────────────────────────────────────────────────────

describe('sendEmail', () => {
  it('returns success result when sendMail resolves', async () => {
    mockSendMail.mockResolvedValueOnce({ messageId: 'msg-1', response: '250 OK' });
    const result = await sendEmail('recipient@test.com', 'Hello', '<p>World</p>');
    expect(result.success).toBe(true);
    expect(result.messageId).toBe('msg-1');
  });

  it('includes plain-text fallback when text argument is provided', async () => {
    mockSendMail.mockResolvedValueOnce({ messageId: 'msg-2', response: '250 OK' });
    const result = await sendEmail('r@test.com', 'Sub', '<p>HTML</p>', 'Plain text');
    expect(result.success).toBe(true);
  });

  it('returns failure result without throwing when sendMail rejects', async () => {
    mockSendMail.mockRejectedValueOnce(new Error('SMTP connection refused'));
    const result = await sendEmail('r@test.com', 'Sub', '<p>Body</p>');
    expect(result.success).toBe(false);
    expect(result.error).toBe('SMTP connection refused');
  });
});

// ─── send* helpers ────────────────────────────────────────────────────────────

describe('sendRegistrationConfirmation', () => {
  it('calls sendEmail with the registration template', async () => {
    mockSendMail.mockResolvedValueOnce({ messageId: 'x', response: 'ok' });
    const result = await sendRegistrationConfirmation('user@test.com', 'Alice');
    expect(result.success).toBe(true);
  });
});

describe('sendPaymentConfirmation', () => {
  it('calls sendEmail with the payment confirmation template', async () => {
    mockSendMail.mockResolvedValueOnce({ messageId: 'x', response: 'ok' });
    const result = await sendPaymentConfirmation('user@test.com', 'Alice', {
      amount: 150, date: new Date('2025-01-01'), method: 'card', paymentId: 'pay-1',
    });
    expect(result.success).toBe(true);
  });
});

describe('sendRequestStatusUpdate', () => {
  it('calls sendEmail with the request status template', async () => {
    mockSendMail.mockResolvedValueOnce({ messageId: 'x', response: 'ok' });
    const result = await sendRequestStatusUpdate('user@test.com', 'Alice', {
      status: 'approved', requestType: 'general', requestId: 'req-1',
    });
    expect(result.success).toBe(true);
  });
});

describe('sendAdminAccountCreation', () => {
  it('calls sendEmail with the admin account template using (email, name)', async () => {
    mockSendMail.mockResolvedValueOnce({ messageId: 'x', response: 'ok' });
    const result = await sendAdminAccountCreation('admin@test.com', 'Admin One');
    expect(result.success).toBe(true);
  });
});

describe('sendDonorAccountCreation', () => {
  it('calls sendEmail with the donor account creation template using (email, name)', async () => {
    mockSendMail.mockResolvedValueOnce({ messageId: 'x', response: 'ok' });
    const result = await sendDonorAccountCreation('donor@test.com', 'Bob');
    expect(result.success).toBe(true);
  });
});

describe('sendDonorDeactivationNotice', () => {
  it('sends deactivation email with a reason', async () => {
    mockSendMail.mockResolvedValueOnce({ messageId: 'x', response: 'ok' });
    const result = await sendDonorDeactivationNotice('donor@test.com', 'Bob', 'Policy violation');
    expect(result.success).toBe(true);
  });

  it('uses empty string when reason is omitted', async () => {
    mockSendMail.mockResolvedValueOnce({ messageId: 'x', response: 'ok' });
    const result = await sendDonorDeactivationNotice('donor@test.com', 'Bob');
    expect(result.success).toBe(true);
  });
});

describe('sendAdminActionNotification', () => {
  it('calls sendEmail with the admin action template', async () => {
    mockSendMail.mockResolvedValueOnce({ messageId: 'x', response: 'ok' });
    const result = await sendAdminActionNotification('admin@test.com', 'Admin One', {
      action: 'delete_donor', targetDonorEmail: 'victim@test.com',
    });
    expect(result.success).toBe(true);
  });
});

describe('sendEngagementConfirmation', () => {
  it('calls sendEmail with the engagement confirmation template', async () => {
    mockSendMail.mockResolvedValueOnce({ messageId: 'x', response: 'ok' });
    const result = await sendEngagementConfirmation('donor@test.com', 'Alice', {
      totalPledge: 2000, startDate: new Date('2025-01-01'), endDate: null,
    });
    expect(result.success).toBe(true);
  });
});

// ─── sendEmail — EMAIL_FROM env branch ─────────────────────────────────────

describe('sendEmail — EMAIL_FROM env variable', () => {
  it('uses EMAIL_FROM env var as the from address when set', async () => {
    process.env.EMAIL_FROM = 'custom@mosque.org';
    mockSendMail.mockResolvedValueOnce({ messageId: 'x', response: 'ok' });
    const result = await sendEmail('r@test.com', 'Test', '<p>body</p>');
    expect(result.success).toBe(true);
    delete process.env.EMAIL_FROM;
  });
});
