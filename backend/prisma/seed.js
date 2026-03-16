'use strict';

const path = require('node:path');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { resolveDatabaseConfig } = require('../src/config/database');

try {
  const dbConfig = resolveDatabaseConfig(process.env);
  process.env.DB_PROVIDER = dbConfig.dbProvider;
  process.env.DATABASE_URL = dbConfig.databaseUrl;
} catch (error) {
  console.error('❌ Seed database configuration is invalid:');
  console.error(error.message);
  process.exit(1);
}

const prisma = new PrismaClient();
const BCRYPT_ROUNDS = 12;

async function main() {
  console.log('🌱 Seeding database…');

  // ─── Clean existing data ────────────────────────────────────────────────────
  await prisma.activityLog.deleteMany();
  await prisma.requestAttachment.deleteMany();
  await prisma.request.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.engagement.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.otpCode.deleteMany();
  await prisma.donor.deleteMany();
  await prisma.admin.deleteMany();


  // ─── Admin ──────────────────────────────────────────────────────────────────
  const adminHash = await bcrypt.hash('admin123', BCRYPT_ROUNDS);
  const admin = await prisma.admin.create({
    data: {
      name: 'Imam Abdallah',
      email: 'admin@masjid.com',
      passwordHash: adminHash,
    },
  });
  console.log(`  ✓ Admin: ${admin.email}`);

  // ─── Donors ─────────────────────────────────────────────────────────────────
  const donorHash = await bcrypt.hash('demo123', BCRYPT_ROUNDS);
  const placeholderHash = await bcrypt.hash('placeholder-disabled-account', BCRYPT_ROUNDS);

  const ahmed = await prisma.donor.create({
    data: {
      name: 'Ahmed Benali',
      email: 'ahmed@example.com',
      passwordHash: donorHash,
      engagement: {
        create: {
          totalPledge: 1000,
          startDate: new Date('2024-01-01'),
        },
      },
      payments: {
        create: [
          {
            amount: 250,
            date: new Date('2024-02-01'),
            method: 'zeffy',
            note: 'First payment',
            recordedByAdminId: admin.id,
          },
          {
            amount: 250,
            date: new Date('2024-05-01'),
            method: 'zeffy',
            note: 'Second payment',
            recordedByAdminId: admin.id,
          },
          {
            amount: 500,
            date: new Date('2024-08-01'),
            method: 'cash',
            note: 'Ramadan contribution',
            recordedByAdminId: admin.id,
          },
        ],
      },
    },
    include: { engagement: true, payments: true },
  });
  console.log(`  ✓ Donor: ${ahmed.email} (${ahmed.payments.length} payments)`);

  const fatima = await prisma.donor.create({
    data: {
      name: 'Fatima Choudhry',
      email: 'fatima@example.com',
      passwordHash: donorHash,
      engagement: {
        create: {
          totalPledge: 2000,
          startDate: new Date('2024-01-15'),
          endDate: new Date('2025-12-31'),
        },
      },
      payments: {
        create: [
          {
            amount: 1000,
            date: new Date('2024-03-01'),
            method: 'zeffy',
            note: 'Spring payment',
            recordedByAdminId: admin.id,
          },
          {
            amount: 500,
            date: new Date('2024-07-01'),
            method: 'cash',
            recordedByAdminId: admin.id,
          },
        ],
      },
    },
    include: { engagement: true, payments: true },
  });
  console.log(`  ✓ Donor: ${fatima.email} (${fatima.payments.length} payments)`);

  const youssef = await prisma.donor.create({
    data: {
      name: 'Youssef Mansour',
      email: 'youssef@example.com',
      passwordHash: donorHash,
      engagement: {
        create: {
          totalPledge: 500,
          startDate: new Date('2024-06-01'),
        },
      },
      payments: {
        create: [
          {
            amount: 200,
            date: new Date('2024-09-01'),
            method: 'other',
            note: 'Bank transfer',
            recordedByAdminId: admin.id,
          },
        ],
      },
    },
    include: { engagement: true, payments: true },
  });
  console.log(`  ✓ Donor: ${youssef.email} (${youssef.payments.length} payment)`);

  const layla = await prisma.donor.create({
    data: {
      name: 'Layla Hassan',
      email: 'layla@example.com',
      passwordHash: placeholderHash,
      accountCreated: false,
      payments: {
        create: [
          {
            amount: 300,
            date: new Date('2024-09-13'),
            method: 'cash',
            note: 'Friday prayer collection',
            recordedByAdminId: admin.id,
          },
          {
            amount: 150,
            date: new Date('2024-11-08'),
            method: 'zeffy',
            note: 'Online community campaign',
            recordedByAdminId: admin.id,
          },
        ],
      },
    },
    include: { payments: true },
  });
  console.log(`  ✓ Placeholder donor: ${layla.email} (${layla.payments.length} payments)`);

  // ─── Requests ───────────────────────────────────────────────────────────────

  const req2 = await prisma.request.create({
    data: {
      type: 'payment_upload',
      name: ahmed.name,
      email: ahmed.email,
      message: 'Cash payment request\nAmount: $100\nAdmin note: test\nPersonal note: test',
      status: 'pending',
      donorId: ahmed.id,
    },
  });

  const req3 = await prisma.request.create({
    data: {
      type: 'engagement_change',
      name: fatima.name,
      email: fatima.email,
      message: 'I would like to increase my pledge to $3000 for next year.',
      status: 'approved',
      donorId: fatima.id,
    },
  });
  console.log(`  ✓ Requests: ${[req2, req3].length} created`);

  // ─── Activity Logs ──────────────────────────────────────────────────────────
  const logsData = [
    {
      actor: `Donor: ${ahmed.name}`,
      actorType: 'donor',
      actorId: ahmed.id,
      action: 'donor_registered',
      details: `New donor registered: ${ahmed.email}`,
      donorId: ahmed.id,
    },
    {
      actor: `Donor: ${fatima.name}`,
      actorType: 'donor',
      actorId: fatima.id,
      action: 'donor_registered',
      details: `New donor registered: ${fatima.email}`,
      donorId: fatima.id,
    },
    {
      actor: `Donor: ${youssef.name}`,
      actorType: 'donor',
      actorId: youssef.id,
      action: 'donor_registered',
      details: `New donor registered: ${youssef.email}`,
      donorId: youssef.id,
    },
    {
      actor: `Admin: ${admin.name}`,
      actorType: 'admin',
      actorId: admin.id,
      action: 'admin_donor_placeholder_created',
      details: `Admin created placeholder donor for ${layla.email}`,
      donorId: layla.id,
      adminId: admin.id,
    },
    {
      actor: `Admin: ${admin.name}`,
      actorType: 'admin',
      actorId: admin.id,
      action: 'payment_recorded',
      details: `Payment of $250 recorded for ${ahmed.email} via zeffy`,
      donorId: ahmed.id,
      adminId: admin.id,
    },
    {
      actor: `Admin: ${admin.name}`,
      actorType: 'admin',
      actorId: admin.id,
      action: 'payment_recorded',
      details: `Payment of $1000 recorded for ${fatima.email} via zeffy`,
      donorId: fatima.id,
      adminId: admin.id,
    },
    {
      actor: `Admin: ${admin.name}`,
      actorType: 'admin',
      actorId: admin.id,
      action: 'engagement_change_approved',
      details: `Engagement change request approved for ${fatima.email}`,
      donorId: fatima.id,
      adminId: admin.id,
    },
    {
      actor: 'System',
      actorType: 'system',
      action: 'system_seed',
      details: 'Database seeded with initial data',
    },
  ];

  await prisma.activityLog.createMany({ data: logsData });
  console.log(`  ✓ Activity logs: ${logsData.length} created`);

  console.log('\n✅ Seed complete!');
  console.log('\nTest credentials:');
  console.log('  Admin: admin@masjid.com / admin123');
  console.log('  Donor: ahmed@example.com / demo123');
  console.log('  Donor: fatima@example.com / demo123');
  console.log('  Donor: youssef@example.com / demo123');
}

main()
  .catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
