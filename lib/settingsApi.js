import { apiFetch } from '@/lib/apiClient.js';

// ─── Global Goal ──────────────────────────────────────────────────────────────

export function getGlobalGoal() {
    return apiFetch('/api/settings/goal', {
        method: 'GET',
    });
}

export function updateGlobalGoal(goal) {
    return apiFetch('/api/settings/goal', {
        method: 'PUT',
        body: JSON.stringify(goal),
    });
}

// ─── Campaigns ────────────────────────────────────────────────────────────────

export function listCampaigns() {
    return apiFetch('/api/settings/campaigns', {
        method: 'GET',
    });
}

export function getCampaign(id) {
    return apiFetch(`/api/settings/campaigns/${id}`, {
        method: 'GET',
    });
}

export function createCampaign(campaign) {
    return apiFetch('/api/settings/campaigns', {
        method: 'POST',
        body: JSON.stringify(campaign),
    });
}

export function updateCampaign(id, campaign) {
    return apiFetch(`/api/settings/campaigns/${id}`, {
        method: 'PUT',
        body: JSON.stringify(campaign),
    });
}

export function deleteCampaign(id) {
    return apiFetch(`/api/settings/campaigns/${id}`, {
        method: 'DELETE',
    });
}

// ─── Pillars ──────────────────────────────────────────────────────────────────

export function getPillars() {
    return apiFetch('/api/settings/pillars', {
        method: 'GET',
    });
}

export function getPillar(name) {
    return apiFetch(`/api/settings/pillars/${name}`, {
        method: 'GET',
    });
}

export function updatePillar(name, pillar) {
    return apiFetch(`/api/settings/pillars/${name}`, {
        method: 'PUT',
        body: JSON.stringify(pillar),
    });
}

export function updateAllPillars(pillars) {
    return apiFetch('/api/settings/pillars', {
        method: 'PUT',
        body: JSON.stringify(pillars),
    });
}

// ─── Volunteering Settings ────────────────────────────────────────────────────

export function getVolunteeringSettings() {
    return apiFetch('/api/settings/volunteering', { method: 'GET' });
}

export function updateVolunteeringSettings(settings) {
    return apiFetch('/api/settings/volunteering', {
        method: 'PUT',
        body: JSON.stringify(settings),
    });
}
