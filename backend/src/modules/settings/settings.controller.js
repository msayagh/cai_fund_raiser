'use strict';

const { sendSuccess } = require('../../utils/response');
const service = require('./settings.service');
const { getRequestActor } = require('../../utils/requestActor');

// ─── Global Goal ──────────────────────────────────────────────────────────────

const getGlobalGoal = async (req, res, next) => {
    try {
        const goal = await service.getGlobalGoal();
        sendSuccess(res, goal, 'Global goal retrieved');
    } catch (error) {
        next(error);
    }
};

const updateGlobalGoal = async (req, res, next) => {
    try {
        const actor = getRequestActor(req);
        const { amount, raised } = req.body;
        const goal = await service.updateGlobalGoal(actor.id, actor.name, { amount, raised });
        sendSuccess(res, goal, 'Global goal updated', 200);
    } catch (error) {
        next(error);
    }
};

// ─── Campaigns ────────────────────────────────────────────────────────────────

const listCampaigns = async (req, res, next) => {
    try {
        const campaigns = await service.listCampaigns();
        sendSuccess(res, campaigns, 'Campaigns retrieved');
    } catch (error) {
        next(error);
    }
};

const getCampaign = async (req, res, next) => {
    try {
        const { id } = req.params;
        const campaign = await service.getCampaign(id);
        sendSuccess(res, campaign, 'Campaign retrieved');
    } catch (error) {
        next(error);
    }
};

const createCampaign = async (req, res, next) => {
    try {
        const actor = getRequestActor(req);
        const { name, description, goal, startDate, endDate, status } = req.body;
        const campaign = await service.createCampaign(actor.id, actor.name, {
            name,
            description,
            goal,
            startDate,
            endDate,
            status
        });
        sendSuccess(res, campaign, 'Campaign created', 201);
    } catch (error) {
        next(error);
    }
};

const updateCampaign = async (req, res, next) => {
    try {
        const actor = getRequestActor(req);
        const { id } = req.params;
        const updates = req.body;
        const campaign = await service.updateCampaign(actor.id, actor.name, id, updates);
        sendSuccess(res, campaign, 'Campaign updated', 200);
    } catch (error) {
        next(error);
    }
};

const deleteCampaign = async (req, res, next) => {
    try {
        const actor = getRequestActor(req);
        const { id } = req.params;
        const campaign = await service.deleteCampaign(actor.id, actor.name, id);
        sendSuccess(res, campaign, 'Campaign deleted', 200);
    } catch (error) {
        next(error);
    }
};

// ─── Pillars ──────────────────────────────────────────────────────────────────

const getPillars = async (req, res, next) => {
    try {
        const pillars = await service.getPillars();
        // Convert to object format for easier frontend use
        const pillarsObj = {};
        pillars.forEach(p => {
            pillarsObj[p.name] = {
                amount: p.amount,
                arabicName: p.arabicName,
                icon: p.icon,
                color: p.color,
                lightColor: p.lightColor
            };
        });
        sendSuccess(res, pillarsObj, 'Pillars retrieved');
    } catch (error) {
        next(error);
    }
};

const getPillar = async (req, res, next) => {
    try {
        const { name } = req.params;
        const pillar = await service.getPillar(name);
        sendSuccess(res, pillar, 'Pillar retrieved');
    } catch (error) {
        next(error);
    }
};

const updatePillar = async (req, res, next) => {
    try {
        const actor = getRequestActor(req);
        const { name } = req.params;
        const { amount } = req.body;
        const pillar = await service.updatePillar(actor.id, actor.name, name, { amount });
        sendSuccess(res, pillar, 'Pillar updated', 200);
    } catch (error) {
        next(error);
    }
};

const updateAllPillars = async (req, res, next) => {
    try {
        const actor = getRequestActor(req);
        const pillarsData = req.body; // { foundation: 1000, walls: 2000, ... }
        const pillars = await service.updateAllPillars(actor.id, actor.name, pillarsData);

        // Convert to object format
        const pillarsObj = {};
        pillars.forEach(p => {
            pillarsObj[p.name] = {
                amount: p.amount,
                arabicName: p.arabicName,
                icon: p.icon,
                color: p.color,
                lightColor: p.lightColor
            };
        });

        sendSuccess(res, pillarsObj, 'Pillars updated', 200);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    // Global Goal
    getGlobalGoal,
    updateGlobalGoal,

    // Campaigns
    listCampaigns,
    getCampaign,
    createCampaign,
    updateCampaign,
    deleteCampaign,

    // Pillars
    getPillars,
    getPillar,
    updatePillar,
    updateAllPillars
};
