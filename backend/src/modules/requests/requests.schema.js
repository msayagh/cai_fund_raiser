'use strict';

const { z } = require('zod');

const createRequestSchema = z.object({
  type: z.enum(['account_creation', 'payment_upload', 'engagement_change', 'other']),
  name: z.string().min(2).max(100),
  email: z.string().email(),
  message: z.string().min(1).max(2000),
  donorId: z.string().optional(),
});

const approveAccountCreationSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  pledgeAmount: z.number().positive().optional(),
});

const approvePaymentUploadSchema = z.object({
  amount: z.number().positive(),
  date: z.string().datetime({ offset: true }),
  method: z.enum(['zeffy', 'cash', 'other']),
  note: z.string().max(500).optional(),
});

module.exports = {
  createRequestSchema,
  approveAccountCreationSchema,
  approvePaymentUploadSchema,
};
