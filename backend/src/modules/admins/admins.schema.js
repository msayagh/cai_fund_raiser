'use strict';

const { z } = require('zod');

const createAdminSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
});

const updateAdminSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
}).refine((d) => d.name || d.email || d.password, { message: 'At least one field required' });

module.exports = { createAdminSchema, updateAdminSchema };
