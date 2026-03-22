'use strict';

const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { resolveDatabaseConfig } = require('../src/config/database');

const BCRYPT_ROUNDS = 12;
const DEFAULT_PASSWORD = process.env.DONOR_IMPORT_DEFAULT_PASSWORD || 'demo123';
const PILLAR_ENGAGEMENT_AMOUNTS = {
  foundation: 500,
  walls: 1000,
  arches: 1500,
  dome: 2000,
};

function parseArgs(argv) {
  const args = { dryRun: false };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--dry-run') args.dryRun = true;
    if (token === '--sheet-url') args.sheetUrl = argv[i + 1];
    if (token === '--gid') args.gid = argv[i + 1];
  }
  return args;
}

function buildCsvExportUrl(baseUrl, gid) {
  if (!baseUrl) return null;
  const url = String(baseUrl).trim();
  const exportUrl = url.replace(/\/edit.*$/, '/export?format=csv');
  return gid ? `${exportUrl}&gid=${gid}` : exportUrl;
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let insideQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    const next = line[i + 1];

    if (ch === '"') {
      if (insideQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (ch === ',' && !insideQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }

  result.push(current.trim());
  return result;
}

function convertCsvToJson(csv) {
  const lines = csv.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) return [];

  const headers = parseCSVLine(lines[0]).map((h) => String(h || '').trim());
  return lines.slice(1).map((line) => {
    const values = parseCSVLine(line);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    return row;
  });
}

function normalizeColumnName(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function getFirstColumnValue(row, aliases) {
  const keys = Object.keys(row);
  const normalizedAliases = aliases.map(normalizeColumnName);
  const key = keys.find((k) => normalizedAliases.includes(normalizeColumnName(k)));
  return key ? String(row[key] || '').trim() : '';
}

function parseBool(raw, fallback = true) {
  const v = String(raw || '').trim().toLowerCase();
  if (!v) return fallback;
  if (['true', '1', 'yes', 'y', 'oui'].includes(v)) return true;
  if (['false', '0', 'no', 'n', 'non'].includes(v)) return false;
  return fallback;
}

function parseNumber(raw) {
  const cleaned = String(raw || '').replace(/[^\d.-]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function parseDate(raw) {
  const value = String(raw || '').trim();
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function sanitizeNameFromEmail(email) {
  return email.split('@')[0].replace(/[._-]+/g, ' ').trim();
}

function normalizePaymentMethod(raw) {
  const value = String(raw || '').trim().toLowerCase();
  if (!value) return 'other';
  if (value.includes('apple') || value.includes('google') || value.includes('card') || value.includes('zeffy')) return 'zeffy';
  if (value.includes('cash') || value.includes('interac')) return 'cash';
  return value;
}

function normalizePillar(rawTier, rawFund) {
  const base = String(rawTier || rawFund || '').trim().toLowerCase();
  const compact = base.replace(/[^a-z0-9]/g, '');

  if (!compact) return 'unassigned';
  if (['foundation', 'mutasaddiq', 'motasaddiq'].includes(compact)) return 'foundation';
  if (['walls', 'kareem', 'karim'].includes(compact)) return 'walls';
  if (['arches', 'jawaad', 'jawad'].includes(compact)) return 'arches';
  if (['dome', 'sabbaq', 'sabaaq'].includes(compact)) return 'dome';
  return base;
}

function pillarEngagementAmount(pillar) {
  return PILLAR_ENGAGEMENT_AMOUNTS[pillar] || 0;
}

function buildPaymentNote({ campaign, details, tier, fund, paymentId }) {
  const parts = [];
  if (campaign) parts.push(`campaign=${campaign}`);
  if (tier) parts.push(`tier=${tier}`);
  if (fund) parts.push(`fund=${fund}`);
  if (details) parts.push(`details=${details}`);
  if (paymentId) parts.push(`sheetPaymentId=${paymentId}`);
  return parts.length ? parts.join(' | ').slice(0, 180) : null;
}

function buildPaymentRequestMessage(payment) {
  const parts = [
    'Imported payment',
    `amount=${payment.amount}`,
    `method=${payment.method}`,
    `date=${payment.date.toISOString().slice(0, 10)}`,
  ];
  if (payment.pillar && payment.pillar !== 'unassigned') parts.push(`pillar=${payment.pillar}`);
  return parts.join(' | ').slice(0, 120);
}

function toDonorRecord(row) {
  const email = getFirstColumnValue(row, ['email', 'e-mail', 'courriel']).toLowerCase();
  if (!email || !email.includes('@')) return null;

  const firstNameRaw = getFirstColumnValue(row, ['first name', 'prenom', 'prénom']);
  const lastNameRaw = getFirstColumnValue(row, ['last name', 'nom']);
  const fullNameRaw = getFirstColumnValue(row, ['name', 'full name', 'donor name', 'prenom nom']);
  const nameRaw = fullNameRaw || `${firstNameRaw} ${lastNameRaw}`.trim();
  const passwordRaw = getFirstColumnValue(row, ['password', 'mot de passe']);
  const accountCreatedRaw = getFirstColumnValue(row, ['account created', 'accountcreated', 'has account']);
  const pledgeRaw = getFirstColumnValue(row, ['total pledge', 'pledge', 'engagement', 'montant engagement']);
  const startDateRaw = getFirstColumnValue(row, ['start date', 'engagement start', 'start']);
  const endDateRaw = getFirstColumnValue(row, ['end date', 'engagement end', 'end']);
  const paymentAmountRaw = getFirstColumnValue(row, ['montant total', 'amount', 'donated', 'montant']);
  const refundedAmountRaw = getFirstColumnValue(row, ['montant rembourse', 'montant remboursé', 'refunded amount']);
  const discountRaw = getFirstColumnValue(row, ['remise', 'discount']);
  const paymentDateRaw = getFirstColumnValue(row, ['date du paiement america toronto', 'date du paiement', 'payment date', 'date']);
  const paymentMethodRaw = getFirstColumnValue(row, ['methode de paiement', 'méthode de paiement', 'payment method', 'method']);
  const paymentIdRaw = getFirstColumnValue(row, ['id', 'transaction id', 'payment id']);
  const detailsRaw = getFirstColumnValue(row, ['details', 'détails']);
  const campaignRaw = getFirstColumnValue(row, ['titre de la campagne', 'campaign title']);
  const tierRaw = getFirstColumnValue(row, ['tier']);
  const fundRaw = getFirstColumnValue(row, ['fonds', 'fund']);

  const totalPledge = parseNumber(pledgeRaw);
  const startDate = parseDate(startDateRaw);
  const endDate = parseDate(endDateRaw);
  const paymentAmount = parseNumber(paymentAmountRaw);
  const refundedAmount = parseNumber(refundedAmountRaw) || 0;
  const discountAmount = parseNumber(discountRaw) || 0;
  const netAmount = paymentAmount != null
    ? Math.max(0, paymentAmount - refundedAmount - discountAmount)
    : null;
  const paymentDate = parseDate(paymentDateRaw);
  const paymentNote = buildPaymentNote({
    campaign: campaignRaw,
    details: detailsRaw,
    tier: tierRaw,
    fund: fundRaw,
    paymentId: paymentIdRaw,
  });

  const payment = netAmount && netAmount > 0
    ? {
        paymentId: paymentIdRaw || null,
        amount: netAmount,
        date: paymentDate || new Date(),
        method: normalizePaymentMethod(paymentMethodRaw),
        pillar: normalizePillar(tierRaw, fundRaw),
        note: paymentNote,
      }
    : null;

  return {
    email,
    name: nameRaw || sanitizeNameFromEmail(email),
    password: passwordRaw || DEFAULT_PASSWORD,
    accountCreated: parseBool(accountCreatedRaw, true),
    explicitPledge: totalPledge && totalPledge > 0 ? totalPledge : null,
    explicitStartDate: startDate,
    explicitEndDate: endDate,
    payment,
  };
}

function aggregateDonors(records) {
  const byEmail = new Map();

  for (const record of records) {
    if (!record) continue;
    const existing = byEmail.get(record.email);
    if (!existing) {
      byEmail.set(record.email, {
        email: record.email,
        name: record.name,
        password: record.password,
        accountCreated: record.accountCreated,
        explicitPledge: record.explicitPledge,
        explicitStartDate: record.explicitStartDate,
        explicitEndDate: record.explicitEndDate,
        payments: [],
        paymentKeys: new Set(),
      });
    }

    const donor = byEmail.get(record.email);
    if (!donor.name && record.name) donor.name = record.name;
    if (!donor.explicitPledge && record.explicitPledge) donor.explicitPledge = record.explicitPledge;
    if (!donor.explicitEndDate && record.explicitEndDate) donor.explicitEndDate = record.explicitEndDate;

    if (record.payment) {
      // Keep one record per transaction + pillar + amount. This allows
      // multi-pillar contributions under a single transaction id to be summed.
      const dedupeKey = record.payment.paymentId
        ? `${record.payment.paymentId}|${record.payment.pillar}|${record.payment.amount}`
        : `${record.payment.date.toISOString()}|${record.payment.amount}|${record.payment.method}|${record.payment.pillar}`;
      if (!donor.paymentKeys.has(dedupeKey)) {
        donor.paymentKeys.add(dedupeKey);
        donor.payments.push({
          amount: record.payment.amount,
          date: record.payment.date,
          method: record.payment.method,
          pillar: record.payment.pillar,
          note: record.payment.note,
        });
      }
    }
  }

  return Array.from(byEmail.values()).map((donor) => {
    const engagementFromPillars = donor.payments.reduce((sum, p) => sum + pillarEngagementAmount(p.pillar), 0);
    const totalPledge = engagementFromPillars > 0 ? engagementFromPillars : (donor.explicitPledge || null);
    const startDate = donor.explicitStartDate
      || (donor.payments.length ? donor.payments.reduce((min, p) => (p.date < min ? p.date : min), donor.payments[0].date) : new Date());
    const endDate = donor.explicitEndDate || null;

    return {
      email: donor.email,
      name: donor.name,
      password: donor.password,
      accountCreated: donor.accountCreated,
      payments: donor.payments,
      engagement: totalPledge && totalPledge > 0
        ? { totalPledge, startDate, endDate }
        : null,
    };
  });
}

async function fetchSheetRows(sheetUrl, gid) {
  const exportUrl = buildCsvExportUrl(sheetUrl, gid);
  if (!exportUrl) {
    throw new Error('Missing sheet URL. Set DONOR_IMPORT_SHEET_URL or NEXT_PUBLIC_GOOGLE_SHEET_APP_URL, or pass --sheet-url.');
  }

  const response = await fetch(exportUrl, { method: 'GET', cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Failed to fetch sheet CSV (HTTP ${response.status})`);
  }

  const csv = await response.text();
  const rows = convertCsvToJson(csv);
  if (rows.length === 0) {
    throw new Error('Sheet has no rows.');
  }

  return { exportUrl, rows };
}

async function wipeDonorData(prisma) {
  // Donor-specific cleanup while preserving admins and admin-auth data.
  await prisma.activityLog.deleteMany({
    where: {
      OR: [
        { actorType: 'donor' },
        { donorId: { not: null } },
      ],
    },
  });

  await prisma.requestAttachment.deleteMany({
    where: {
      request: {
        donorId: { not: null },
      },
    },
  });

  await prisma.request.deleteMany({ where: { donorId: { not: null } } });
  await prisma.payment.deleteMany();
  await prisma.engagement.deleteMany();
  await prisma.refreshToken.deleteMany({ where: { donorId: { not: null } } });
  await prisma.donor.deleteMany();
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  try {
    const dbConfig = resolveDatabaseConfig(process.env);
    process.env.DB_PROVIDER = dbConfig.dbProvider;
    process.env.DATABASE_URL = dbConfig.databaseUrl;
  } catch (error) {
    console.error('Invalid database configuration:', error.message);
    process.exit(1);
  }

  const sheetUrl = args.sheetUrl
    || process.env.DONOR_IMPORT_SHEET_URL
    || process.env.NEXT_PUBLIC_GOOGLE_SHEET_APP_URL;

  const gid = args.gid
    || process.env.DONOR_IMPORT_SHEET_GID
    || process.env.NEXT_PUBLIC_GOOGLE_SHEET_DONORS_GID
    || '';

  const prisma = new PrismaClient();

  try {
    const { exportUrl, rows } = await fetchSheetRows(sheetUrl, gid);
    const donors = rows.map(toDonorRecord).filter(Boolean);
    const aggregatedDonors = aggregateDonors(donors);
    const uniqueDonors = aggregatedDonors.filter((donor) => Boolean(donor.engagement));
    const skippedDonorsWithoutEngagement = aggregatedDonors.length - uniqueDonors.length;

    if (uniqueDonors.length === 0) {
      throw new Error('No valid donor rows found. Expected columns including email/courriel and payment amount.');
    }

    const totalPayments = uniqueDonors.reduce((sum, d) => sum + d.payments.length, 0);
    const totalRequests = totalPayments;
    const totalAmount = uniqueDonors.reduce((sum, d) => sum + d.payments.reduce((s, p) => s + p.amount, 0), 0);
    const donorsWithEngagement = uniqueDonors.filter((d) => d.engagement).length;

    console.log(`Sheet source: ${exportUrl}`);
    console.log(`Rows read: ${rows.length}`);
    console.log(`Valid donors from sheet: ${aggregatedDonors.length}`);
    console.log(`Skipped donors without engagement: ${skippedDonorsWithoutEngagement}`);
    console.log(`Imported donors with engagement only: ${uniqueDonors.length}`);
    console.log(`Payments parsed: ${totalPayments}`);
    console.log(`Requests to create: ${totalRequests}`);
    console.log(`Total paid amount: ${totalAmount.toFixed(2)}`);
    console.log(`Engagements to create: ${donorsWithEngagement}`);
    console.log(`Mode: ${args.dryRun ? 'DRY RUN (no DB changes)' : 'LIVE IMPORT'}`);

    if (args.dryRun) {
      console.log('Preview (first 5 donors):');
      uniqueDonors.slice(0, 5).forEach((d, i) => {
        console.log(`${i + 1}. ${d.email} | ${d.name} | payments=${d.payments.length} | engagement=${d.engagement ? d.engagement.totalPledge : 0}`);
      });
      return;
    }

    await prisma.$transaction(async (tx) => {
      await wipeDonorData(tx);

      for (const donor of uniqueDonors) {
        const passwordHash = await bcrypt.hash(donor.password, BCRYPT_ROUNDS);
        await tx.donor.create({
          data: {
            name: donor.name,
            email: donor.email,
            passwordHash,
            accountCreated: donor.accountCreated,
            engagement: donor.engagement
              ? {
                  create: {
                    totalPledge: donor.engagement.totalPledge,
                    startDate: donor.engagement.startDate,
                    endDate: donor.engagement.endDate,
                  },
                }
              : undefined,
            payments: donor.payments.length
              ? {
                  create: donor.payments.map((p) => ({
                    amount: p.amount,
                    quantity: p.quantity != null ? Math.max(1, Math.floor(Number(p.quantity))) : 1,
                    date: p.date,
                    method: p.method,
                    note: p.note,
                  })),
                }
              : undefined,
            requests: donor.payments.length
              ? {
                  create: donor.payments.map((p) => ({
                    type: 'payment_upload',
                    name: donor.name,
                    email: donor.email,
                    message: buildPaymentRequestMessage(p),
                    status: 'approved',
                  })),
                }
              : undefined,
          },
        });
      }
    }, { maxWait: 10000, timeout: 120000 });

    console.log(`Imported ${uniqueDonors.length} donors successfully.`);
  } catch (error) {
    console.error('Donor import failed:', error.message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
