'use strict';

// ─── Test Suite: settings.service ────────────────────────────────────────────
// settings.service manages three categories of configurable data:
//
//   Global Goal — a single row tracking the mosque's total fundraising target
//   Campaigns   — named fundraising drives with optional start/end dates
//   Pillars     — the four building tiers (foundation, walls, arches, dome)
//                 each with a pledged/raised amount
//
// Key behaviors tested:
//   - Auto-create on first read (getGlobalGoal, getPillars)
//   - NAME_TAKEN guard on campaign create/update
//   - NOT_FOUND guards on getCampaign, updateCampaign, deleteCampaign, getPillar, updatePillar
//   - Audit log calls when an adminId is present

// Mock the Prisma client
jest.mock('../../../db/client', () => ({
  globalGoal: {
    findFirst: jest.fn(),
    create:    jest.fn(),
    update:    jest.fn(),
  },
  campaign: {
    findFirst:  jest.fn(),
    findUnique: jest.fn(),
    findMany:   jest.fn(),
    create:     jest.fn(),
    update:     jest.fn(),
    delete:     jest.fn(),
  },
  pillar: {
    findUnique: jest.fn(),
    findMany:   jest.fn(),
    create:     jest.fn(),
    update:     jest.fn(),
  },
  activityLog: { create: jest.fn() },
}));

// Mock audit logging so tests don't fail due to missing activityLog setup
jest.mock('../../../modules/logs/logs.service', () => ({
  createLog: jest.fn().mockResolvedValue(undefined),
}));

const prisma   = require('../../../db/client');
const AppError = require('../../../utils/AppError');
const {
  getGlobalGoal,
  updateGlobalGoal,
  listCampaigns,
  getCampaign,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  getPillars,
  getPillar,
  updatePillar,
  updateAllPillars,
} = require('../../../modules/settings/settings.service');

// ─── Global Goal ─────────────────────────────────────────────────────────────

describe('getGlobalGoal', () => {
  it('returns the existing global goal row when one exists', async () => {
    const existing = { id: 'goal-1', amount: 100000, raised: 45000 };
    prisma.globalGoal.findFirst.mockResolvedValue(existing);

    const result = await getGlobalGoal();
    expect(result).toEqual(existing);
    // No create call — row already exists
    expect(prisma.globalGoal.create).not.toHaveBeenCalled();
  });

  it('auto-creates a goal row with amount=0 when none exists', async () => {
    // The DB starts empty — the service must seed the initial row
    prisma.globalGoal.findFirst.mockResolvedValue(null);
    const created = { id: 'goal-1', amount: 0, raised: 0 };
    prisma.globalGoal.create.mockResolvedValue(created);

    const result = await getGlobalGoal();
    expect(result).toEqual(created);
    expect(prisma.globalGoal.create).toHaveBeenCalledWith({
      data: { amount: 0, raised: 0 },
    });
  });
});

describe('updateGlobalGoal', () => {
  it('updates the existing row when one exists', async () => {
    const existing = { id: 'goal-1', amount: 50000, raised: 10000 };
    prisma.globalGoal.findFirst.mockResolvedValue(existing);
    const updated = { ...existing, amount: 200000, raised: 50000 };
    prisma.globalGoal.update.mockResolvedValue(updated);

    const result = await updateGlobalGoal('admin-1', 'Alice', { amount: 200000, raised: 50000 });
    expect(result.amount).toBe(200000);
    expect(prisma.globalGoal.update).toHaveBeenCalledTimes(1);
  });

  it('creates a new row when none exists', async () => {
    // First update ever — no existing goal row
    prisma.globalGoal.findFirst.mockResolvedValue(null);
    const created = { id: 'goal-1', amount: 100000, raised: 0 };
    prisma.globalGoal.create.mockResolvedValue(created);

    const result = await updateGlobalGoal('admin-1', 'Alice', { amount: 100000, raised: 0 });
    expect(result).toEqual(created);
    expect(prisma.globalGoal.create).toHaveBeenCalledTimes(1);
  });
});

// ─── Campaigns ───────────────────────────────────────────────────────────────

describe('listCampaigns', () => {
  it('returns all campaigns ordered by createdAt desc', async () => {
    const campaigns = [
      { id: 'c1', name: 'Ramadan 2024', status: 'active' },
      { id: 'c2', name: 'Eid 2023', status: 'closed' },
    ];
    prisma.campaign.findMany.mockResolvedValue(campaigns);

    const result = await listCampaigns();
    expect(result).toHaveLength(2);
    expect(prisma.campaign.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { createdAt: 'desc' } })
    );
  });

  it('returns an empty array when no campaigns exist', async () => {
    prisma.campaign.findMany.mockResolvedValue([]);
    expect(await listCampaigns()).toEqual([]);
  });
});

describe('getCampaign', () => {
  it('returns the campaign when found', async () => {
    const campaign = { id: 'c1', name: 'Ramadan 2024' };
    prisma.campaign.findUnique.mockResolvedValue(campaign);

    const result = await getCampaign('c1');
    expect(result.id).toBe('c1');
  });

  it('throws NOT_FOUND when campaign does not exist', async () => {
    prisma.campaign.findUnique.mockResolvedValue(null);
    await expect(getCampaign('ghost')).rejects.toMatchObject({
      code:       'NOT_FOUND',
      statusCode: 404,
    });
  });
});

describe('createCampaign', () => {
  it('creates and returns a campaign', async () => {
    prisma.campaign.findFirst.mockResolvedValue(null);  // name not taken
    const created = { id: 'c1', name: 'New Campaign', status: 'active' };
    prisma.campaign.create.mockResolvedValue(created);

    const result = await createCampaign('admin-1', 'Alice', {
      name:        'New Campaign',
      description: 'Test',
      goal:        10000,
    });
    expect(result.name).toBe('New Campaign');
    expect(prisma.campaign.create).toHaveBeenCalledTimes(1);
  });

  it('throws NAME_TAKEN when campaign name already exists', async () => {
    // Duplicate campaign names are not allowed
    prisma.campaign.findFirst.mockResolvedValue({ id: 'c-existing', name: 'Existing' });
    await expect(
      createCampaign('admin-1', 'Alice', { name: 'Existing', goal: 1000 })
    ).rejects.toMatchObject({ code: 'NAME_TAKEN', statusCode: 409 });
  });

  it('converts startDate and endDate strings to Date objects', async () => {
    prisma.campaign.findFirst.mockResolvedValue(null);
    prisma.campaign.create.mockResolvedValue({ id: 'c1', name: 'Dated' });

    await createCampaign('admin-1', 'Alice', {
      name:      'Dated',
      goal:      5000,
      startDate: '2025-03-01',
      endDate:   '2025-03-31',
    });

    const { data } = prisma.campaign.create.mock.calls[0][0];
    // Strings must be converted to Date instances before writing to DB
    expect(data.startDate).toBeInstanceOf(Date);
    expect(data.endDate).toBeInstanceOf(Date);
  });
});

describe('updateCampaign', () => {
  it('updates and returns the campaign', async () => {
    const existing = { id: 'c1', name: 'Old Name' };
    prisma.campaign.findUnique.mockResolvedValue(existing);
    prisma.campaign.findFirst.mockResolvedValue(null);  // new name not taken
    prisma.campaign.update.mockResolvedValue({ ...existing, name: 'New Name' });

    const result = await updateCampaign('admin-1', 'Alice', 'c1', { name: 'New Name' });
    expect(result.name).toBe('New Name');
  });

  it('throws NOT_FOUND when campaign does not exist', async () => {
    prisma.campaign.findUnique.mockResolvedValue(null);
    await expect(
      updateCampaign('admin-1', 'Alice', 'ghost', { name: 'X' })
    ).rejects.toMatchObject({ code: 'NOT_FOUND', statusCode: 404 });
  });

  it('throws NAME_TAKEN when new name is already used by another campaign', async () => {
    prisma.campaign.findUnique.mockResolvedValue({ id: 'c1', name: 'Old' });
    // findFirst finds a DIFFERENT campaign row with the same name
    prisma.campaign.findFirst.mockResolvedValue({ id: 'c2', name: 'Taken Name' });
    await expect(
      updateCampaign('admin-1', 'Alice', 'c1', { name: 'Taken Name' })
    ).rejects.toMatchObject({ code: 'NAME_TAKEN' });
  });

  it('does not check name uniqueness when name is unchanged', async () => {
    // If the name didn't change we must not query for conflicts
    const existing = { id: 'c1', name: 'Same Name' };
    prisma.campaign.findUnique.mockResolvedValue(existing);
    prisma.campaign.update.mockResolvedValue({ ...existing, goal: 9999 });

    await updateCampaign('admin-1', 'Alice', 'c1', { name: 'Same Name', goal: 9999 });
    // findFirst for name conflict should not have been called
    expect(prisma.campaign.findFirst).not.toHaveBeenCalled();
  });
});

describe('deleteCampaign', () => {
  it('deletes and returns the campaign', async () => {
    const campaign = { id: 'c1', name: 'To Delete' };
    prisma.campaign.findUnique.mockResolvedValue(campaign);
    prisma.campaign.delete.mockResolvedValue({});

    const result = await deleteCampaign('admin-1', 'Alice', 'c1');
    expect(result.name).toBe('To Delete');
    expect(prisma.campaign.delete).toHaveBeenCalledWith({ where: { id: 'c1' } });
  });

  it('throws NOT_FOUND when campaign does not exist', async () => {
    prisma.campaign.findUnique.mockResolvedValue(null);
    await expect(
      deleteCampaign('admin-1', 'Alice', 'ghost')
    ).rejects.toMatchObject({ code: 'NOT_FOUND', statusCode: 404 });
  });
});

// ─── Pillars ─────────────────────────────────────────────────────────────────

describe('getPillars', () => {
  it('returns existing pillars when already seeded', async () => {
    const pillars = [
      { name: 'foundation', amount: 1000 },
      { name: 'walls', amount: 2000 },
    ];
    prisma.pillar.findMany.mockResolvedValue(pillars);

    const result = await getPillars();
    expect(result).toHaveLength(2);
    // No create calls — pillars already exist
    expect(prisma.pillar.create).not.toHaveBeenCalled();
  });

  it('creates the 4 default pillars when none exist', async () => {
    // First call to an empty DB must seed the default pillars
    prisma.pillar.findMany
      .mockResolvedValueOnce([])         // initial check: empty
      .mockResolvedValueOnce([           // after seeding: 4 pillars
        { name: 'foundation' },
        { name: 'walls' },
        { name: 'arches' },
        { name: 'dome' },
      ]);
    prisma.pillar.create.mockResolvedValue({});

    const result = await getPillars();
    // All 4 defaults must be created
    expect(prisma.pillar.create).toHaveBeenCalledTimes(4);
    expect(result).toHaveLength(4);
  });
});

describe('getPillar', () => {
  it('returns the pillar when found', async () => {
    prisma.pillar.findUnique.mockResolvedValue({ name: 'dome', amount: 5000 });
    const result = await getPillar('dome');
    expect(result.name).toBe('dome');
  });

  it('throws NOT_FOUND when pillar does not exist', async () => {
    prisma.pillar.findUnique.mockResolvedValue(null);
    await expect(getPillar('unknown-pillar')).rejects.toMatchObject({
      code:       'NOT_FOUND',
      statusCode: 404,
    });
  });
});

describe('updatePillar', () => {
  it('updates the pillar amount and returns the updated row', async () => {
    prisma.pillar.findUnique.mockResolvedValue({ name: 'walls', amount: 0 });
    prisma.pillar.update.mockResolvedValue({ name: 'walls', amount: 15000 });

    const result = await updatePillar('admin-1', 'Alice', 'walls', { amount: 15000 });
    expect(result.amount).toBe(15000);
    expect(prisma.pillar.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { name: 'walls' }, data: expect.objectContaining({ amount: 15000 }) })
    );
  });

  it('throws NOT_FOUND when pillar does not exist', async () => {
    prisma.pillar.findUnique.mockResolvedValue(null);
    await expect(
      updatePillar('admin-1', 'Alice', 'unknown', { amount: 100 })
    ).rejects.toMatchObject({ code: 'NOT_FOUND', statusCode: 404 });
  });
});

describe('updateAllPillars', () => {
  it('updates existing pillars and returns the array', async () => {
    // Simulate two existing pillars being updated
    prisma.pillar.findUnique
      .mockResolvedValueOnce({ name: 'foundation', amount: 0 })
      .mockResolvedValueOnce({ name: 'dome', amount: 0 });
    prisma.pillar.update
      .mockResolvedValueOnce({ name: 'foundation', amount: 5000 })
      .mockResolvedValueOnce({ name: 'dome', amount: 8000 });

    const result = await updateAllPillars('admin-1', 'Alice', {
      foundation: 5000,
      dome:       8000,
    });
    expect(result).toHaveLength(2);
    expect(prisma.pillar.update).toHaveBeenCalledTimes(2);
  });

  it('creates a pillar when it does not exist', async () => {
    // If the pillar row is missing, create it instead of throwing
    prisma.pillar.findUnique.mockResolvedValue(null);
    prisma.pillar.create.mockResolvedValue({ name: 'arches', amount: 3000 });

    const result = await updateAllPillars('admin-1', 'Alice', { arches: 3000 });
    expect(prisma.pillar.create).toHaveBeenCalledTimes(1);
    expect(result[0].name).toBe('arches');
  });
});

// ─── Null adminId / unauthenticated paths ─────────────────────────────────────
// All write functions accept adminId=null (system-level calls with no logged-in admin).
// When adminId is null, safeAdminId is null and audit logging is skipped.
// These tests cover the false-branch of every `if (safeAdminId)` block.

describe('updateGlobalGoal — null adminId (no logging)', () => {
  it('updates goal without writing an audit log when adminId is null', async () => {
    const { createLog } = require('../../../modules/logs/logs.service');
    const existing = { id: 'goal-1', amount: 0, raised: 0 };
    prisma.globalGoal.findFirst.mockResolvedValue(existing);
    prisma.globalGoal.update.mockResolvedValue({ ...existing, amount: 50000 });

    await updateGlobalGoal(null, null, { amount: 50000, raised: 0 });
    // createLog must NOT be called when adminId is null
    expect(createLog).not.toHaveBeenCalled();
  });

  it('creates a new goal row when none exists and adminId is null', async () => {
    prisma.globalGoal.findFirst.mockResolvedValue(null);
    prisma.globalGoal.create.mockResolvedValue({ id: 'g1', amount: 10000, raised: 0, updatedBy: null });

    const result = await updateGlobalGoal(null, null, { amount: 10000, raised: 0 });
    expect(result.amount).toBe(10000);
    expect(prisma.globalGoal.create).toHaveBeenCalledTimes(1);
  });
});

describe('createCampaign — null adminId (no logging)', () => {
  it('creates campaign without audit log when adminId is null', async () => {
    const { createLog } = require('../../../modules/logs/logs.service');
    prisma.campaign.findFirst.mockResolvedValue(null);
    prisma.campaign.create.mockResolvedValue({ id: 'c1', name: 'System Campaign' });

    await createCampaign(null, null, { name: 'System Campaign', goal: 1000 });
    expect(createLog).not.toHaveBeenCalled();
  });
});

describe('updateCampaign — null adminId (no logging)', () => {
  it('updates campaign without audit log when adminId is null', async () => {
    const { createLog } = require('../../../modules/logs/logs.service');
    const existing = { id: 'c1', name: 'Old' };
    prisma.campaign.findUnique.mockResolvedValue(existing);
    prisma.campaign.update.mockResolvedValue({ ...existing, name: 'Old' });

    await updateCampaign(null, null, 'c1', { goal: 2000 });
    expect(createLog).not.toHaveBeenCalled();
  });
});

describe('deleteCampaign — null adminId (no logging)', () => {
  it('deletes campaign without audit log when adminId is null', async () => {
    const { createLog } = require('../../../modules/logs/logs.service');
    prisma.campaign.findUnique.mockResolvedValue({ id: 'c1', name: 'Old' });
    prisma.campaign.delete.mockResolvedValue({});

    await deleteCampaign(null, null, 'c1');
    expect(createLog).not.toHaveBeenCalled();
  });
});

describe('updatePillar — null adminId (no logging)', () => {
  it('updates pillar without audit log when adminId is null', async () => {
    const { createLog } = require('../../../modules/logs/logs.service');
    prisma.pillar.findUnique.mockResolvedValue({ name: 'dome', amount: 0 });
    prisma.pillar.update.mockResolvedValue({ name: 'dome', amount: 9000 });

    await updatePillar(null, null, 'dome', { amount: 9000 });
    expect(createLog).not.toHaveBeenCalled();
  });
});

describe('updateAllPillars — null adminId (no logging)', () => {
  it('updates all pillars without audit log when adminId is null', async () => {
    const { createLog } = require('../../../modules/logs/logs.service');
    prisma.pillar.findUnique.mockResolvedValue({ name: 'foundation', amount: 0 });
    prisma.pillar.update.mockResolvedValue({ name: 'foundation', amount: 1000 });

    await updateAllPillars(null, null, { foundation: 1000 });
    expect(createLog).not.toHaveBeenCalled();
  });
});

// ─── updateCampaign — date branches ──────────────────────────────────────────

describe('updateCampaign — startDate and endDate branches', () => {
  it('converts startDate and endDate strings to Date objects', async () => {
    prisma.campaign.findUnique.mockResolvedValue({ id: 'camp-1', name: 'Ramadan', startDate: null, endDate: null });
    prisma.campaign.findFirst.mockResolvedValue(null); // no name conflict
    prisma.campaign.update.mockResolvedValue({ id: 'camp-1', name: 'Ramadan', startDate: new Date('2025-03-01'), endDate: new Date('2025-03-31') });

    const result = await updateCampaign('admin-1', 'Admin', 'camp-1', {
      startDate: '2025-03-01',
      endDate:   '2025-03-31',
    });
    expect(result.startDate).toBeInstanceOf(Date);
    expect(result.endDate).toBeInstanceOf(Date);
  });
});
