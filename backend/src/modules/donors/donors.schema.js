'use strict';

const { z } = require('zod');

const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  phoneNumber: z.string().regex(/^\+?[0-9\s\-()]{10,}$/, 'Invalid phone number format').optional().nullable(),
  address: z.string().max(255).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  postalCode: z.string().max(20).optional().nullable(),
  dateOfBirth: z.string().datetime({ offset: true }).optional().nullable(),
  taxNumber: z.string().max(50).optional().nullable(),
  companyName: z.string().max(200).optional().nullable(),
}).refine((d) => Object.values(d).some(v => v !== undefined && v !== null), {
  message: 'At least one field required'
});

const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

const createEngagementSchema = z.object({
  totalPledge: z.number().positive('Pledge amount must be positive').optional(),
  pillars: z.record(z.string(), z.number().nonnegative()).optional(),
  startDate: z.string().datetime({ offset: true }).optional(),
  endDate: z.string().datetime({ offset: true }).optional().nullable(),
}).refine((data) => {
  // Either totalPledge or pillars must be provided
  return data.totalPledge !== undefined || (data.pillars && Object.values(data.pillars).some(v => v > 0));
}, {
  message: 'Either totalPledge or pillars with amounts must be provided'
});

const updateEngagementSchema = z.object({
  totalPledge: z.number().positive().optional(),
  pillars: z.record(z.string(), z.number().nonnegative()).optional(),
  endDate: z.string().datetime({ offset: true }).optional().nullable(),
}).refine((data) => {
  // At least one field must be provided
  return data.totalPledge !== undefined || data.pillars !== undefined || data.endDate !== undefined;
}, {
  message: 'At least one field (totalPledge, pillars, or endDate) must be provided'
});

const upsertDonorPaymentSchema = z.object({
  donor: z.object({
    name: z.string().trim().min(2, 'Donor name must be at least 2 characters').max(100, 'Donor name must be 100 characters or fewer'),
    email: z.string().email('Valid donor email is required'),
    accountCreated: z.boolean().optional(),
    password: z.string().min(8, 'Password must be at least 8 characters').optional(),
    pledgeAmount: z.number().positive('Pledge amount must be greater than 0').optional(),
  }),
  payment: z.object({
    amount: z.number().positive('Payment amount must be greater than 0'),
    date: z.string().refine((val) => /^\d{4}-\d{2}-\d{2}$/.test(val), 'Date must be in YYYY-MM-DD format'),
    method: z.enum(['cash', 'card', 'zeffy']),
    note: z.string().trim().max(500, 'Note must be 500 characters or fewer').optional(),
  }),
});

module.exports = {
  updateProfileSchema,
  updatePasswordSchema,
  createEngagementSchema,
  updateEngagementSchema,
  upsertDonorPaymentSchema,
};
