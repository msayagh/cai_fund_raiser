'use strict';

const prisma = require('../../db/client');
const AppError = require('../../utils/AppError');
const { createLog } = require('../logs/logs.service');

// ─── Global Goal ──────────────────────────────────────────────────────────────

const getGlobalGoal = async () => {
    let goal = await prisma.globalGoal.findFirst();
    if (!goal) {
        goal = await prisma.globalGoal.create({
            data: { amount: 0, raised: 0 }
        });
    }
    return goal;
};

const updateGlobalGoal = async (adminId, adminName, { amount, raised }) => {
    let goal = await prisma.globalGoal.findFirst();
    if (!goal) {
        goal = await prisma.globalGoal.create({
            data: { amount, raised, updatedBy: adminId === 'anonymous' ? null : adminId }
        });
    } else {
        goal = await prisma.globalGoal.update({
            where: { id: goal.id },
            data: { amount, raised, updatedBy: adminId === 'anonymous' ? null : adminId }
        });
    }

    // Only log if admin is authenticated
    if (adminId !== 'anonymous') {
        await createLog({
            actor: `Admin: ${adminName}`,
            actorType: 'admin',
            actorId: adminId,
            action: 'global_goal_updated',
            details: `Global goal updated to $${amount}, raised: $${raised}`,
            adminId
        });
    }

    return goal;
};

// ─── Campaigns ────────────────────────────────────────────────────────────────

const listCampaigns = async () => {
    return prisma.campaign.findMany({
        orderBy: { createdAt: 'desc' }
    });
};

const getCampaign = async (id) => {
    const campaign = await prisma.campaign.findUnique({ where: { id } });
    if (!campaign) throw new AppError('Campaign not found', 404, 'NOT_FOUND');
    return campaign;
};

const createCampaign = async (adminId, adminName, { name, description, goal, startDate, endDate, status = 'active' }) => {
    const existing = await prisma.campaign.findFirst({ where: { name } });
    if (existing) throw new AppError('Campaign name already exists', 409, 'NAME_TAKEN');

    const campaign = await prisma.campaign.create({
        data: {
            name,
            description,
            goal,
            startDate: startDate ? new Date(startDate) : null,
            endDate: endDate ? new Date(endDate) : null,
            status,
            updatedBy: adminId === 'anonymous' ? null : adminId
        }
    });

    // Only log if admin is authenticated
    if (adminId !== 'anonymous') {
        await createLog({
            actor: `Admin: ${adminName}`,
            actorType: 'admin',
            actorId: adminId,
            action: 'campaign_created',
            details: `Campaign created: ${name}`,
            adminId
        });
    }

    return campaign;
};

const updateCampaign = async (adminId, adminName, id, updates) => {
    const campaign = await prisma.campaign.findUnique({ where: { id } });
    if (!campaign) throw new AppError('Campaign not found', 404, 'NOT_FOUND');

    if (updates.name && updates.name !== campaign.name) {
        const existing = await prisma.campaign.findFirst({ where: { name: updates.name } });
        if (existing) throw new AppError('Campaign name already exists', 409, 'NAME_TAKEN');
    }

    const updateData = { ...updates, updatedBy: adminId === 'anonymous' ? null : adminId };
    if (updates.startDate) updateData.startDate = new Date(updates.startDate);
    if (updates.endDate) updateData.endDate = new Date(updates.endDate);

    const updated = await prisma.campaign.update({
        where: { id },
        data: updateData
    });

    // Only log if admin is authenticated
    if (adminId !== 'anonymous') {
        await createLog({
            actor: `Admin: ${adminName}`,
            actorType: 'admin',
            actorId: adminId,
            action: 'campaign_updated',
            details: `Campaign updated: ${updated.name}`,
            adminId
        });
    }

    return updated;
};

const deleteCampaign = async (adminId, adminName, id) => {
    const campaign = await prisma.campaign.findUnique({ where: { id } });
    if (!campaign) throw new AppError('Campaign not found', 404, 'NOT_FOUND');

    await prisma.campaign.delete({ where: { id } });

    // Only log if admin is authenticated
    if (adminId !== 'anonymous') {
        await createLog({
            actor: `Admin: ${adminName}`,
            actorType: 'admin',
            actorId: adminId,
            action: 'campaign_deleted',
            details: `Campaign deleted: ${campaign.name}`,
            adminId
        });
    }

    return campaign;
};

// ─── Pillars ──────────────────────────────────────────────────────────────────

const getPillars = async () => {
    let pillars = await prisma.pillar.findMany();

    // Initialize default pillars if none exist
    if (pillars.length === 0) {
        const defaults = [
            { name: 'foundation', amount: 0, arabicName: 'Mutasaddiq', icon: '🏛️', color: '#8B4513', lightColor: '#D2B48C' },
            { name: 'walls', amount: 0, arabicName: 'Kareem', icon: '🧱', color: '#696969', lightColor: '#A9A9A9' },
            { name: 'arches', amount: 0, arabicName: 'Jawaad', icon: '🌉', color: '#4169E1', lightColor: '#87CEEB' },
            { name: 'dome', amount: 0, arabicName: 'Sabbaq', icon: '⛪', color: '#FFD700', lightColor: '#FFED4E' }
        ];

        for (const pillar of defaults) {
            await prisma.pillar.create({ data: pillar });
        }

        pillars = await prisma.pillar.findMany();
    }

    return pillars;
};

const getPillar = async (name) => {
    const pillar = await prisma.pillar.findUnique({ where: { name } });
    if (!pillar) throw new AppError('Pillar not found', 404, 'NOT_FOUND');
    return pillar;
};

const updatePillar = async (adminId, adminName, name, { amount }) => {
    let pillar = await prisma.pillar.findUnique({ where: { name } });
    if (!pillar) throw new AppError('Pillar not found', 404, 'NOT_FOUND');

    pillar = await prisma.pillar.update({
        where: { name },
        data: { amount, updatedBy: adminId }
    });

    await createLog({
        actor: `Admin: ${adminName}`,
        actorType: 'admin',
        actorId: adminId,
        action: 'pillar_updated',
        details: `Pillar ${name} amount updated to $${amount}`,
        adminId
    });

    return pillar;
};

const updateAllPillars = async (adminId, adminName, pillarsData) => {
    const updated = [];

    for (const [name, amount] of Object.entries(pillarsData)) {
        let pillar = await prisma.pillar.findUnique({ where: { name } });
        if (!pillar) {
            // Create if doesn't exist
            pillar = await prisma.pillar.create({
                data: { name, amount, updatedBy: adminId }
            });
        } else {
            pillar = await prisma.pillar.update({
                where: { name },
                data: { amount, updatedBy: adminId }
            });
        }
        updated.push(pillar);
    }

    await createLog({
        actor: `Admin: ${adminName}`,
        actorType: 'admin',
        actorId: adminId,
        action: 'pillars_updated',
        details: `All pillars updated`,
        adminId
    });

    return updated;
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
