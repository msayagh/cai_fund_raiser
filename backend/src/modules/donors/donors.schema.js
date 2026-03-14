'use strict';

const { z } = require('zod');

const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
}).refine((d) => d.name || d.email, { message: 'At least one field required' });

const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

const createEngagementSchema = z.object({
  totalPledge: z.number().positive('Pledge amount must be positive'),
  startDate: z.string().datetime({ offset: true }).optional(),
  endDate: z.string().datetime({ offset: true }).optional().nullable(),
});

const updateEngagementSchema = z.object({
  totalPledge: z.number().positive().optional(),
  endDate: z.string().datetime({ offset: true }).optional().nullable(),
});

module.exports = {
  updateProfileSchema,
  updatePasswordSchema,
  createEngagementSchema,
  updateEngagementSchema,
};
