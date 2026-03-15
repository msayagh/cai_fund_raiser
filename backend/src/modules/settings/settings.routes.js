'use strict';

const { Router } = require('express');
const validate = require('../../middleware/validate');
const ctrl = require('./settings.controller');
const {
    updateGlobalGoalSchema,
    createCampaignSchema,
    updateCampaignSchema,
    updatePillarSchema,
    updateAllPillarsSchema
} = require('./settings.schema');

const router = Router();

// ─── Global Goal Endpoints ────────────────────────────────────────────────────
router.get('/goal', ctrl.getGlobalGoal);
router.put('/goal', validate(updateGlobalGoalSchema), ctrl.updateGlobalGoal);

// ─── Campaign Endpoints ────────────────────────────────────────────────────────
router.get('/campaigns', ctrl.listCampaigns);
router.post('/campaigns', validate(createCampaignSchema), ctrl.createCampaign);
router.get('/campaigns/:id', ctrl.getCampaign);
router.put('/campaigns/:id', validate(updateCampaignSchema), ctrl.updateCampaign);
router.delete('/campaigns/:id', ctrl.deleteCampaign);

// ─── Pillar Endpoints ─────────────────────────────────────────────────────────
router.get('/pillars', ctrl.getPillars);
router.put('/pillars', validate(updateAllPillarsSchema), ctrl.updateAllPillars);
router.get('/pillars/:name', ctrl.getPillar);
router.put('/pillars/:name', validate(updatePillarSchema), ctrl.updatePillar);

module.exports = router;
