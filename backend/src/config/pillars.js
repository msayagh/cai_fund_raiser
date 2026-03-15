'use strict';

/**
 * Mosque Pillar Configuration
 * Defines the structure of mosque pillars with their names, amounts, colors, and descriptions
 */

const PILLARS_CONFIG = {
    foundation: {
        key: 'foundation',
        label: 'Foundation',
        arabicName: 'Mutasaddiq',
        description: 'Support the Foundation',
        amount: 500,
        color: '#8B4513',      // Brown
        lightColor: '#D2B48C',  // Light brown
        icon: '🏛️',
        order: 1,
    },
    walls: {
        key: 'walls',
        label: 'Walls',
        arabicName: 'Kareem',
        description: 'Build the Walls',
        amount: 1000,
        color: '#696969',      // Dim gray
        lightColor: '#A9A9A9', // Dark gray
        icon: '🧱',
        order: 2,
    },
    arches: {
        key: 'arches',
        label: 'Arches',
        arabicName: 'Jawaad',
        description: 'Create the Arches',
        amount: 1500,
        color: '#4169E1',      // Royal blue
        lightColor: '#87CEEB', // Sky blue
        icon: '🌉',
        order: 3,
    },
    dome: {
        key: 'dome',
        label: 'Dome',
        arabicName: 'Sabbaq',
        description: 'Complete the Dome',
        amount: 2000,
        color: '#FFD700',      // Gold
        lightColor: '#FFED4E', // Light gold
        icon: '⛪',
        order: 4,
    },
};

const PILLARS_ARRAY = Object.values(PILLARS_CONFIG).sort((a, b) => a.order - b.order);

/**
 * Get pillar config by key
 */
function getPillarByKey(key) {
    return PILLARS_CONFIG[key] || null;
}

/**
 * Calculate total pledge from pillar amounts
 */
function calculateTotalFromPillars(pillars) {
    if (!pillars || typeof pillars !== 'object') return 0;
    return Object.values(pillars).reduce((sum, amount) => sum + (Number(amount) || 0), 0);
}

/**
 * Validate pillar amounts
 */
function validatePillars(pillars) {
    if (!pillars || typeof pillars !== 'object') return true;

    for (const [key, amount] of Object.entries(pillars)) {
        if (!PILLARS_CONFIG[key]) {
            return false; // Invalid pillar key
        }
        const numAmount = Number(amount);
        if (numAmount < 0) {
            return false; // Negative amounts not allowed
        }
    }
    return true;
}

/**
 * Initialize empty pillars object (all zeros)
 */
function initializePillars() {
    const pillars = {};
    Object.keys(PILLARS_CONFIG).forEach(key => {
        pillars[key] = 0;
    });
    return pillars;
}

module.exports = {
    PILLARS_CONFIG,
    PILLARS_ARRAY,
    getPillarByKey,
    calculateTotalFromPillars,
    validatePillars,
    initializePillars,
};
