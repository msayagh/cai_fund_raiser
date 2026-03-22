'use strict';

const { z } = require('zod');

const createActivitySchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1),
  skills: z.string().optional(),
  recurrenceType: z.enum(['none', 'weekly', 'custom']).optional(),
  recurrenceNote: z.string().max(300).optional(),
  maxVolunteers: z.number().int().min(0).optional(),
});

const updateActivitySchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).optional(),
  skills: z.string().optional(),
  recurrenceType: z.enum(['none', 'weekly', 'custom']).optional(),
  recurrenceNote: z.string().max(300).optional(),
  maxVolunteers: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

const addScheduleSchema = z.object({
  scheduledAt: z.string().datetime(),
  location: z.string().max(500).optional(),
  notes: z.string().optional(),
  maxVolunteers: z.number().int().min(1).optional(),
});

const updateScheduleSchema = z.object({
  scheduledAt: z.string().datetime().optional(),
  location: z.string().min(1).max(500).optional(),
  notes: z.string().optional(),
  maxVolunteers: z.number().int().min(1).nullable().optional(),
  status: z.enum(['upcoming', 'completed', 'cancelled']).optional(),
});

const postDiscussionSchema = z.object({
  message: z.string().min(1).max(2000),
});

const signupNoteSchema = z.object({
  note: z.string().max(500).optional(),
});

module.exports = {
  createActivitySchema,
  updateActivitySchema,
  addScheduleSchema,
  updateScheduleSchema,
  postDiscussionSchema,
  signupNoteSchema,
};
