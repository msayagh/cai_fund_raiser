'use strict';

const { z } = require('zod');

const updateGlobalGoalSchema = z.object({
    amount: z.number().min(0, 'Amount must be non-negative'),
    raised: z.number().min(0, 'Raised must be non-negative')
});

const createCampaignSchema = z.object({
    name: z.string().min(1, 'Campaign name is required'),
    description: z.string().optional(),
    goal: z.number().min(0, 'Goal must be non-negative'),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    status: z.enum(['active', 'completed', 'archived']).optional()
});

const updateCampaignSchema = z.object({
    name: z.string().optional(),
    description: z.string().optional(),
    goal: z.number().min(0).optional(),
    raised: z.number().min(0).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    status: z.enum(['active', 'completed', 'archived']).optional()
});

const updatePillarSchema = z.object({
    amount: z.number().min(0, 'Amount must be non-negative')
});

const updateAllPillarsSchema = z.object({
    foundation: z.number().min(0).optional(),
    walls: z.number().min(0).optional(),
    arches: z.number().min(0).optional(),
    dome: z.number().min(0).optional()
});

module.exports = {
    updateGlobalGoalSchema,
    createCampaignSchema,
    updateCampaignSchema,
    updatePillarSchema,
    updateAllPillarsSchema
};
