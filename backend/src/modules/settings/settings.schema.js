'use strict';

const { z } = require('zod');

const updateGlobalGoalSchema = z.object({
    amount: z.number().min(0, 'Amount must be non-negative'),
    raised: z.number().min(0, 'Raised must be non-negative')
}).refine((data) => data.raised <= data.amount, {
    message: 'Raised amount cannot exceed total amount'
});

const createCampaignSchema = z.object({
    name: z.string().trim().min(1, 'Campaign name is required').max(120, 'Campaign name must be 120 characters or fewer'),
    description: z.string().trim().max(1000, 'Description must be 1000 characters or fewer').optional(),
    goal: z.number().min(0, 'Goal must be non-negative'),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    status: z.enum(['active', 'completed', 'archived']).optional()
}).refine((data) => !data.startDate || !data.endDate || new Date(data.endDate) >= new Date(data.startDate), {
    message: 'End date must be on or after start date'
});

const updateCampaignSchema = z.object({
    name: z.string().trim().min(1, 'Campaign name cannot be empty').max(120, 'Campaign name must be 120 characters or fewer').optional(),
    description: z.string().trim().max(1000, 'Description must be 1000 characters or fewer').optional(),
    goal: z.number().min(0).optional(),
    raised: z.number().min(0).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    status: z.enum(['active', 'completed', 'archived']).optional()
}).refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required'
}).refine((data) => !data.startDate || !data.endDate || new Date(data.endDate) >= new Date(data.startDate), {
    message: 'End date must be on or after start date'
});

const updatePillarSchema = z.object({
    amount: z.number().min(0, 'Amount must be non-negative')
});

const updateAllPillarsSchema = z.object({
    foundation: z.number().min(0).optional(),
    walls: z.number().min(0).optional(),
    arches: z.number().min(0).optional(),
    dome: z.number().min(0).optional()
}).refine((data) => Object.keys(data).length > 0, {
    message: 'At least one pillar amount is required'
});

const updateVolunteeringSettingsSchema = z.object({
    volEnabled: z.boolean(),
    volShowDiscussion: z.boolean(),
    volShowHistory: z.boolean(),
    volShowUnscheduled: z.boolean(),
});

module.exports = {
    updateGlobalGoalSchema,
    createCampaignSchema,
    updateCampaignSchema,
    updatePillarSchema,
    updateAllPillarsSchema,
    updateVolunteeringSettingsSchema,
};
