'use strict';

const TIER_CONFIG = {
  foundation: { key: 'foundation', name: 'Mutasaddiq', amount: 500 },
  walls: { key: 'walls', name: 'Kareem', amount: 1000 },
  arches: { key: 'arches', name: 'Jawaad', amount: 1500 },
  dome: { key: 'dome', name: 'Sabbaq', amount: 2000 },
};

const TIER_LIST = Object.values(TIER_CONFIG);

function getTierByAmount(amount) {
  return TIER_LIST.find((tier) => tier.amount === amount) || null;
}

module.exports = {
  TIER_CONFIG,
  TIER_LIST,
  getTierByAmount,
};
