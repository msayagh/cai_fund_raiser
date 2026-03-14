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
  const donors = await prisma.donor.findMany({
    include: {
      engagement: true,
      payments: {
        orderBy: { date: 'desc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const funded = { ...EMPTY_FUNDED };
  const donations = [];
  let ramadanRaised = 0;
  let engagementAmount = 0;

  for (const donor of donors) {
    const totalDonated = donor.payments.reduce((sum, payment) => sum + payment.amount, 0);
    const tier = donor.engagement ? getTierByAmount(donor.engagement.totalPledge) : null;

    if (tier) {
      funded[tier.key] += 1;
      engagementAmount += donor.engagement.totalPledge;
    }

    ramadanRaised += totalDonated;

    if (totalDonated <= 0 && !tier) {
      continue;
    }

    donations.push({
      id: donor.id,
      email: donor.email,
      donorLabel: donor.name,
      donated: totalDonated,
      tier: tier?.key || '',
      tierName: tier?.name || '',
      details: tier ? `${tier.name} pledge` : '',
      engagementAmount: donor.engagement?.totalPledge ?? 0,
      ticketCount: donor.payments.length,
      lastPaymentDate: donor.payments[0]?.date ?? null,
    });
  }

  return {
    funded,
    donations,
    summary: {
      donorCount: donations.length,
      ramadanRaised,
      engagementAmount,
      tiers: TIER_LIST,
    },
  };
}

module.exports = {
  getCampaignSnapshot,
  TIER_CONFIG,
};
