'use strict';

const { Router } = require('express');
const { requireAdminOrApiKey } = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const ctrl = require('./settings.controller');
const {
    updateGlobalGoalSchema,
    createCampaignSchema,
    updateCampaignSchema,
    updatePillarSchema,
    updateAllPillarsSchema,
    updateVolunteeringSettingsSchema,
} = require('./settings.schema');

const router = Router();

// ─── Global Goal Endpoints ────────────────────────────────────────────────────
router.get('/goal', ctrl.getGlobalGoal);
router.put('/goal', requireAdminOrApiKey, validate(updateGlobalGoalSchema), ctrl.updateGlobalGoal);

// ─── Campaign Endpoints ────────────────────────────────────────────────────────
router.get('/campaigns', ctrl.listCampaigns);
router.post('/campaigns', requireAdminOrApiKey, validate(createCampaignSchema), ctrl.createCampaign);
router.get('/campaigns/:id', ctrl.getCampaign);
router.put('/campaigns/:id', requireAdminOrApiKey, validate(updateCampaignSchema), ctrl.updateCampaign);
router.delete('/campaigns/:id', requireAdminOrApiKey, ctrl.deleteCampaign);

// ─── Pillar Endpoints ─────────────────────────────────────────────────────────
router.get('/pillars', ctrl.getPillars);
router.put('/pillars', requireAdminOrApiKey, validate(updateAllPillarsSchema), ctrl.updateAllPillars);
router.get('/pillars/:name', ctrl.getPillar);
router.put('/pillars/:name', requireAdminOrApiKey, validate(updatePillarSchema), ctrl.updatePillar);

// ─── Volunteering settings ────────────────────────────────────────────────────
router.get('/volunteering', ctrl.getVolunteeringSettings);
router.put('/volunteering', requireAdminOrApiKey, validate(updateVolunteeringSettingsSchema), ctrl.updateVolunteeringSettings);

module.exports = router;
