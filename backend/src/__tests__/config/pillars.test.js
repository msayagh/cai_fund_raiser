'use strict';

// ─── Test Suite: Pillar configuration ─────────────────────────────────────────────
// The pillars module defines the 4 mosque construction phases (foundation,
// walls, arches, dome). Donors pledge amounts per pillar; the totals drive
// the campaign progress UI and engagement calculation.
// These functions are pure (no DB / network) so they need no mocking.

const {
  getPillarByKey,
  calculateTotalFromPillars,
  validatePillars,
  initializePillars,
  PILLARS_CONFIG,
  PILLARS_ARRAY,
} = require('../../config/pillars');

// ─── PILLARS_CONFIG ───────────────────────────────────────────────────────────
// The config object is the single source of truth used by the frontend and
// the import CSV parser.  We lock in the expected shape here.
describe('PILLARS_CONFIG', () => {
  it('has exactly 4 keys — foundation, walls, arches, dome', () => {
    const keys = Object.keys(PILLARS_CONFIG);
    // Must contain all 4 pillars (order does not matter here)
    expect(keys).toEqual(expect.arrayContaining(['foundation', 'walls', 'arches', 'dome']));
    expect(keys).toHaveLength(4);               // no extra/missing pillars
  });

  it('each pillar has the required fields used by the frontend and DB', () => {
    for (const pillar of Object.values(PILLARS_CONFIG)) {
      expect(pillar).toHaveProperty('key');     // machine-readable identifier
      expect(pillar).toHaveProperty('label');   // display name
      expect(pillar).toHaveProperty('amount');  // default pledge amount
      expect(pillar).toHaveProperty('color');   // hex CSS color
      expect(pillar).toHaveProperty('order');   // sort order in the UI
      expect(typeof pillar.amount).toBe('number');
    }
  });

  it('amounts are in ascending order: 500 → 1000 → 1500 → 2000', () => {
    // This ordering is used by the tier upgrade UI — changes here break the UI
    expect(PILLARS_CONFIG.foundation.amount).toBe(500);
    expect(PILLARS_CONFIG.walls.amount).toBe(1000);
    expect(PILLARS_CONFIG.arches.amount).toBe(1500);
    expect(PILLARS_CONFIG.dome.amount).toBe(2000);
  });
});

// ─── PILLARS_ARRAY ─────────────────────────────────────────────────────────────
// PILLARS_ARRAY is the sorted version used by the frontend pillar selector.
describe('PILLARS_ARRAY', () => {
  it('is sorted by the .order field in ascending order (UI rendering order)', () => {
    for (let i = 1; i < PILLARS_ARRAY.length; i++) {
      // Each pillar must have a higher order number than the previous one
      expect(PILLARS_ARRAY[i].order).toBeGreaterThan(PILLARS_ARRAY[i - 1].order);
    }
  });

  it('has 4 elements — one for each pillar', () => {
    expect(PILLARS_ARRAY).toHaveLength(4);
  });
});

// ─── getPillarByKey ────────────────────────────────────────────────────────────
// Used in CSV import validation and the payment tier lookup.
describe('getPillarByKey', () => {
  it('returns the full pillar config object for a known key', () => {
    const p = getPillarByKey('dome');
    expect(p).not.toBeNull();
    expect(p.key).toBe('dome');
    expect(p.amount).toBe(2000);
  });

  it('returns null for an unrecognized key (e.g. a typo)', () => {
    expect(getPillarByKey('minaret')).toBeNull();  // not a real pillar
  });

  it('returns null for undefined input (called with no argument)', () => {
    expect(getPillarByKey(undefined)).toBeNull();
  });
});

// ─── calculateTotalFromPillars ─────────────────────────────────────────────────
// Sums the values in a { pillarKey: amount } object.
// Used to compute totalPledge when a donor selects individual pillars.
describe('calculateTotalFromPillars', () => {
  it('sums all provided numeric amounts', () => {
    expect(calculateTotalFromPillars({ foundation: 500, walls: 1000 })).toBe(1500);
  });

  it('coerces string amounts to numbers (CSV import sends strings)', () => {
    expect(calculateTotalFromPillars({ foundation: '300', walls: '700' })).toBe(1000);
  });

  it('returns 0 for an empty object (no pillars selected)', () => {
    expect(calculateTotalFromPillars({})).toBe(0);
  });

  it('returns 0 for null input without throwing', () => {
    expect(calculateTotalFromPillars(null)).toBe(0);
  });

  it('returns 0 for a non-object (e.g. string) without throwing', () => {
    expect(calculateTotalFromPillars('invalid')).toBe(0);
  });

  it('treats non-numeric string values as 0 (Number("abc") = NaN → 0)', () => {
    expect(calculateTotalFromPillars({ foundation: 'abc', walls: 500 })).toBe(500);
  });
});

// ─── validatePillars ────────────────────────────────────────────────────────────
// Guards against unknown pillar keys and negative amounts in donor requests.
describe('validatePillars', () => {
  it('returns true for valid pillar keys with non-negative amounts', () => {
    expect(validatePillars({ foundation: 100, dome: 0 })).toBe(true);
  });

  it('returns false for an unrecognized pillar key (prevents data corruption)', () => {
    expect(validatePillars({ minaret: 500 })).toBe(false);
  });

  it('returns false for a negative amount (business rule: amounts must be >= 0)', () => {
    expect(validatePillars({ foundation: -1 })).toBe(false);
  });

  it('returns true for an empty object (no pillars is valid — donor uses totalPledge)', () => {
    expect(validatePillars({})).toBe(true);
  });

  it('returns true for null (treated as “no pillars provided”)', () => {
    expect(validatePillars(null)).toBe(true);
  });

  it('returns true for undefined (same treatment as null)', () => {
    expect(validatePillars(undefined)).toBe(true);
  });

  it('returns true for a zero amount (fully valid — pillar not chosen)', () => {
    expect(validatePillars({ foundation: 0, walls: 0 })).toBe(true);
  });
});

// ─── initializePillars ───────────────────────────────────────────────────────────
// Returns a blank slate { foundation:0, walls:0, arches:0, dome:0 }
// used by the frontend to pre-populate the pillar selection form.
describe('initializePillars', () => {
  it('returns an object with all 4 pillar keys set to 0', () => {
    const result = initializePillars();
    expect(result).toEqual({ foundation: 0, walls: 0, arches: 0, dome: 0 });
  });

  it('returns a new independent object on each call (no shared reference)', () => {
    const a = initializePillars();
    const b = initializePillars();
    a.foundation = 999;                    // mutating one should not affect the other
    expect(b.foundation).toBe(0);
  });
});


describe('PILLARS_CONFIG', () => {
  it('has exactly 4 pillars: foundation, walls, arches, dome', () => {
    const keys = Object.keys(PILLARS_CONFIG);
    expect(keys).toEqual(expect.arrayContaining(['foundation', 'walls', 'arches', 'dome']));
    expect(keys).toHaveLength(4);
  });

  it('each pillar has required fields', () => {
    for (const pillar of Object.values(PILLARS_CONFIG)) {
      expect(pillar).toHaveProperty('key');
      expect(pillar).toHaveProperty('label');
      expect(pillar).toHaveProperty('amount');
      expect(pillar).toHaveProperty('color');
      expect(pillar).toHaveProperty('order');
      expect(typeof pillar.amount).toBe('number');
    }
  });

  it('amounts are in ascending order: 500, 1000, 1500, 2000', () => {
    expect(PILLARS_CONFIG.foundation.amount).toBe(500);
    expect(PILLARS_CONFIG.walls.amount).toBe(1000);
    expect(PILLARS_CONFIG.arches.amount).toBe(1500);
    expect(PILLARS_CONFIG.dome.amount).toBe(2000);
  });
});

describe('PILLARS_ARRAY', () => {
  it('is sorted by order ascending', () => {
    for (let i = 1; i < PILLARS_ARRAY.length; i++) {
      expect(PILLARS_ARRAY[i].order).toBeGreaterThan(PILLARS_ARRAY[i - 1].order);
    }
  });

  it('has 4 elements', () => {
    expect(PILLARS_ARRAY).toHaveLength(4);
  });
});

describe('getPillarByKey', () => {
  it('returns the correct pillar config', () => {
    const p = getPillarByKey('dome');
    expect(p).not.toBeNull();
    expect(p.key).toBe('dome');
    expect(p.amount).toBe(2000);
  });

  it('returns null for an unknown key', () => {
    expect(getPillarByKey('minaret')).toBeNull();
  });

  it('returns null for undefined', () => {
    expect(getPillarByKey(undefined)).toBeNull();
  });
});

describe('calculateTotalFromPillars', () => {
  it('sums all numeric amounts', () => {
    expect(calculateTotalFromPillars({ foundation: 500, walls: 1000 })).toBe(1500);
  });

  it('handles string amounts by coercing to number', () => {
    expect(calculateTotalFromPillars({ foundation: '300', walls: '700' })).toBe(1000);
  });

  it('returns 0 for an empty object', () => {
    expect(calculateTotalFromPillars({})).toBe(0);
  });

  it('returns 0 for null input', () => {
    expect(calculateTotalFromPillars(null)).toBe(0);
  });

  it('returns 0 for non-object input', () => {
    expect(calculateTotalFromPillars('invalid')).toBe(0);
  });

  it('ignores NaN values (treats them as 0)', () => {
    expect(calculateTotalFromPillars({ foundation: 'abc', walls: 500 })).toBe(500);
  });
});

describe('validatePillars', () => {
  it('returns true for valid pillar keys and amounts', () => {
    expect(validatePillars({ foundation: 100, dome: 0 })).toBe(true);
  });

  it('returns false for an invalid pillar key', () => {
    expect(validatePillars({ minaret: 500 })).toBe(false);
  });

  it('returns false for a negative amount', () => {
    expect(validatePillars({ foundation: -1 })).toBe(false);
  });

  it('returns true for an empty object', () => {
    expect(validatePillars({})).toBe(true);
  });

  it('returns true for null (nothing to validate)', () => {
    expect(validatePillars(null)).toBe(true);
  });

  it('returns true for undefined', () => {
    expect(validatePillars(undefined)).toBe(true);
  });

  it('returns true for zero amounts (allowed)', () => {
    expect(validatePillars({ foundation: 0, walls: 0 })).toBe(true);
  });
});

describe('initializePillars', () => {
  it('returns an object with all 4 keys set to 0', () => {
    const result = initializePillars();
    expect(result).toEqual({ foundation: 0, walls: 0, arches: 0, dome: 0 });
  });

  it('returns a fresh object on each call', () => {
    const a = initializePillars();
    const b = initializePillars();
    a.foundation = 999;
    expect(b.foundation).toBe(0);
  });
});
