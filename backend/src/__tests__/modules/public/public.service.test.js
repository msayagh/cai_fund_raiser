'use strict';

// ─── Test Suite: public.service ───────────────────────────────────────────────
// getCampaignSnapshot queries all donors with their engagement and payments then:
//   - counts funded tiers (foundation/walls/arches/dome) from engagement totalPledge
//   - builds a donations array (donors with totalDonated > 0 OR with a valid tier)
//   - calculates ramadanRaised (sum of all payment amounts)
//   - calculates engagementAmount (sum of all engagement totalPledge values)
//   - skips donors that have zero payments AND no valid tier

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('../../../db/client', () => ({
  donor: { findMany: jest.fn() },
}));

// ── Imports ───────────────────────────────────────────────────────────────────

const prisma = require('../../../db/client');
const { getCampaignSnapshot, TIER_CONFIG } = require('../../../modules/public/public.service');

// ── Stubs ─────────────────────────────────────────────────────────────────────

const stubDonor = (overrides = {}) => ({
  id:         'donor-1',
  name:       'Alice',
  email:      'alice@test.com',
  engagement: null,
  payments:   [],
  createdAt:  new Date('2025-01-01'),
  ...overrides,
});

// ─── getCampaignSnapshot ──────────────────────────────────────────────────────

describe('getCampaignSnapshot', () => {
  it('returns empty snapshot when there are no donors', async () => {
    prisma.donor.findMany.mockResolvedValue([]);

    const result = await getCampaignSnapshot();

    expect(result.funded).toEqual({ foundation: 0, walls: 0, arches: 0, dome: 0 });
    expect(result.donations).toHaveLength(0);
    expect(result.summary.donorCount).toBe(0);
    expect(result.summary.ramadanRaised).toBe(0);
    expect(result.summary.engagementAmount).toBe(0);
  });

  it('includes donor with valid tier engagement in funded counts and donations', async () => {
    // totalPledge=1000 maps to 'walls' tier
    prisma.donor.findMany.mockResolvedValue([
      stubDonor({
        engagement: { totalPledge: 1000 },
        payments:   [{ id: 'p1', amount: 250 }, { id: 'p2', amount: 250 }],
      }),
    ]);

    const result = await getCampaignSnapshot();

    expect(result.funded.walls).toBe(1);
    expect(result.funded.foundation).toBe(0);
    expect(result.donations).toHaveLength(1);
    expect(result.donations[0].tier).toBe('walls');
    expect(result.donations[0].donated).toBe(500);
    expect(result.summary.ramadanRaised).toBe(500);
    expect(result.summary.engagementAmount).toBe(1000);
  });

  it('includes donor with payments but no engagement (tier is empty string)', async () => {
    prisma.donor.findMany.mockResolvedValue([
      stubDonor({
        engagement: null,
        payments:   [{ id: 'p1', amount: 100 }],
      }),
    ]);

    const result = await getCampaignSnapshot();

    expect(result.donations).toHaveLength(1);
    expect(result.donations[0].tier).toBe('');
    expect(result.donations[0].donated).toBe(100);
    expect(result.funded).toEqual({ foundation: 0, walls: 0, arches: 0, dome: 0 });
  });

  it('skips donors with no payments and no valid tier', async () => {
    prisma.donor.findMany.mockResolvedValue([
      stubDonor({ engagement: null, payments: [] }),
    ]);

    const result = await getCampaignSnapshot();

    expect(result.donations).toHaveLength(0);
    expect(result.summary.donorCount).toBe(0);
    expect(result.summary.ramadanRaised).toBe(0);
  });

  it('includes donor with a valid tier but zero payments', async () => {
    // engagement without payments → tier counted in funded, donor in donations
    prisma.donor.findMany.mockResolvedValue([
      stubDonor({
        engagement: { totalPledge: 500 }, // foundation tier
        payments:   [],
      }),
    ]);

    const result = await getCampaignSnapshot();

    expect(result.funded.foundation).toBe(1);
    expect(result.donations).toHaveLength(1);
    expect(result.donations[0].donated).toBe(0);
    expect(result.donations[0].tier).toBe('foundation');
  });

  it('skips donor whose engagement amount does not match any tier', async () => {
    // 750 is not 500, 1000, 1500, or 2000 → getTierByAmount returns null
    prisma.donor.findMany.mockResolvedValue([
      stubDonor({
        engagement: { totalPledge: 750 },
        payments:   [],
      }),
    ]);

    const result = await getCampaignSnapshot();

    // tier is null → totalDonated is 0 → skipped
    expect(result.donations).toHaveLength(0);
    expect(result.funded).toEqual({ foundation: 0, walls: 0, arches: 0, dome: 0 });
  });

  it('accumulates ramadanRaised and engagementAmount across multiple donors', async () => {
    prisma.donor.findMany.mockResolvedValue([
      stubDonor({
        id: 'donor-1', email: 'd1@test.com',
        engagement: { totalPledge: 500 },
        payments:   [{ id: 'p1', amount: 200 }],
      }),
      stubDonor({
        id: 'donor-2', email: 'd2@test.com',
        engagement: { totalPledge: 2000 },
        payments:   [{ id: 'p2', amount: 300 }, { id: 'p3', amount: 150 }],
      }),
    ]);

    const result = await getCampaignSnapshot();

    expect(result.summary.ramadanRaised).toBe(650);          // 200 + 300 + 150
    expect(result.summary.engagementAmount).toBe(2500);       // 500 + 2000
    expect(result.funded.foundation).toBe(1);
    expect(result.funded.dome).toBe(1);
    expect(result.donations).toHaveLength(2);
  });

  it('exposes TIER_CONFIG as a module export', () => {
    expect(TIER_CONFIG).toBeDefined();
    expect(TIER_CONFIG.foundation.amount).toBe(500);
    expect(TIER_CONFIG.dome.amount).toBe(2000);
  });

  it('sets lastPaymentDate to null when donor has no payments', async () => {
    prisma.donor.findMany.mockResolvedValue([
      stubDonor({ engagement: { totalPledge: 1000 }, payments: [] }),
    ]);

    const result = await getCampaignSnapshot();
    expect(result.donations[0].lastPaymentDate).toBeNull();
  });

  it('sets lastPaymentDate to the most recent payment date', async () => {
    const recentDate = new Date('2025-03-01');
    prisma.donor.findMany.mockResolvedValue([
      stubDonor({
        engagement: { totalPledge: 1000 },
        payments:   [{ id: 'p1', amount: 100, date: recentDate }], // ordered by date desc
      }),
    ]);

    const result = await getCampaignSnapshot();
    expect(result.donations[0].lastPaymentDate).toEqual(recentDate);
  });
});
