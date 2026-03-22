'use strict';

const prisma = require('../../db/client');
const { TIER_CONFIG, TIER_LIST, getTierByAmount } = require('../../config/campaign');

const EMPTY_FUNDED = Object.freeze({
  foundation: 0,
  walls: 0,
  arches: 0,
  dome: 0,
});

async function getCampaignSnapshot() {
  const allPayments = await prisma.payment.findMany({
    include: { donor: { select: { email: true } } },
  });

  return allPayments;
}

module.exports = {
  getCampaignSnapshot,
};
