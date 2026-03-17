'use strict';

const { z } = require('zod');

const createApiKeySchema = z.object({
  title: z.string().trim().min(2, 'Title must be at least 2 characters').max(120, 'Title must be 120 characters or fewer'),
});

const updateApiKeySchema = z.object({
  title: z.string().trim().min(2, 'Title must be at least 2 characters').max(120, 'Title must be 120 characters or fewer').optional(),
  isActive: z.boolean().optional(),
}).refine((data) => data.title !== undefined || data.isActive !== undefined, {
  message: 'At least one field required',
});

module.exports = {
  createApiKeySchema,
  updateApiKeySchema,
};
