'use strict';

const { z } = require('zod');

const createAdminSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
});

const updateAdminSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
}).refine((d) => d.name || d.email, { message: 'At least one field required' });

module.exports = { createAdminSchema, updateAdminSchema };
