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
  await prisma.adminRole.deleteMany();
  await prisma.donorRole.deleteMany();
  await prisma.roleCapability.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.otpCode.deleteMany();
  await prisma.donor.deleteMany();
  await prisma.admin.deleteMany();
  await prisma.role.deleteMany();
  await prisma.capability.deleteMany();

  // ─── Capabilities ───────────────────────────────────────────────────────────
  const capabilities = await Promise.all([
    // Admin donor management
    prisma.capability.create({ data: { name: 'admin.donors.view', module: 'admin.donors', description: 'View donor list and details' } }),
    prisma.capability.create({ data: { name: 'admin.donors.create', module: 'admin.donors', description: 'Create new donor accounts' } }),
    prisma.capability.create({ data: { name: 'admin.donors.edit', module: 'admin.donors', description: 'Edit donor profiles' } }),
    prisma.capability.create({ data: { name: 'admin.donors.delete', module: 'admin.donors', description: 'Delete donor accounts' } }),
    prisma.capability.create({ data: { name: 'admin.donors.deactivate', module: 'admin.donors', description: 'Deactivate/reactivate donors' } }),

    // Admin request management
    prisma.capability.create({ data: { name: 'admin.requests.view', module: 'admin.requests', description: 'View all requests' } }),
    prisma.capability.create({ data: { name: 'admin.requests.approve', module: 'admin.requests', description: 'Approve requests' } }),
    prisma.capability.create({ data: { name: 'admin.requests.reject', module: 'admin.requests', description: 'Reject requests' } }),

    // Admin management
    prisma.capability.create({ data: { name: 'admin.admins.view', module: 'admin.admins', description: 'View admin list' } }),
    prisma.capability.create({ data: { name: 'admin.admins.create', module: 'admin.admins', description: 'Create new admins' } }),
    prisma.capability.create({ data: { name: 'admin.admins.edit', module: 'admin.admins', description: 'Edit admin profiles' } }),
    prisma.capability.create({ data: { name: 'admin.admins.delete', module: 'admin.admins', description: 'Delete admins' } }),

    // Statistics & reporting
    prisma.capability.create({ data: { name: 'admin.statistics.view', module: 'admin.statistics', description: 'View dashboard statistics' } }),
    prisma.capability.create({ data: { name: 'admin.logs.view', module: 'admin.logs', description: 'View activity logs' } }),

    // Donor capabilities
    prisma.capability.create({ data: { name: 'donor.profile.view', module: 'donor.profile', description: 'View own profile' } }),
    prisma.capability.create({ data: { name: 'donor.profile.edit', module: 'donor.profile', description: 'Edit own profile' } }),
    prisma.capability.create({ data: { name: 'donor.payments.view', module: 'donor.payments', description: 'View own payment history' } }),
  ]);
  console.log(`  ✓ Created ${capabilities.length} capabilities`);

  // ─── Roles ──────────────────────────────────────────────────────────────────
  const role_admin = await prisma.role.create({
    data: {
      name: 'admin',
      description: 'Full administrator access',
      roleCapabilities: {
        create: capabilities.map(cap => ({
          capabilityId: cap.id,
        })),
      },
    },
  });
  console.log(`  ✓ Role: ${role_admin.name}`);

  const role_moderator = await prisma.role.create({
    data: {
      name: 'moderator',
      description: 'Moderator with request approval capabilities',
      roleCapabilities: {
        create: [
          { capabilityId: capabilities.find(c => c.name === 'admin.donors.view').id },
          { capabilityId: capabilities.find(c => c.name === 'admin.requests.view').id },
          { capabilityId: capabilities.find(c => c.name === 'admin.requests.approve').id },
          { capabilityId: capabilities.find(c => c.name === 'admin.requests.reject').id },
          { capabilityId: capabilities.find(c => c.name === 'admin.statistics.view').id },
        ],
      },
    },
  });
  console.log(`  ✓ Role: ${role_moderator.name}`);

  const role_donor = await prisma.role.create({
    data: {
      name: 'donor',
      description: 'Donor with limited access to own data',
      roleCapabilities: {
        create: [
          { capabilityId: capabilities.find(c => c.name === 'donor.profile.view').id },
          { capabilityId: capabilities.find(c => c.name === 'donor.profile.edit').id },
          { capabilityId: capabilities.find(c => c.name === 'donor.payments.view').id },
        ],
      },
    },
  });
  console.log(`  ✓ Role: ${role_donor.name}`);


  // ─── Admin ──────────────────────────────────────────────────────────────────
  const adminHash = await bcrypt.hash('admin123', BCRYPT_ROUNDS);
  const admin = await prisma.admin.create({
    data: {
      name: 'Imam Abdallah',
      email: 'admin@masjid.com',
      passwordHash: adminHash,
      adminRoles: {
        create: {
          roleId: role_admin.id,
        },
      },
    },
  });
  console.log(`  ✓ Admin: ${admin.email} (role: ${role_admin.name})`);

  // ─── Donors ─────────────────────────────────────────────────────────────────
  const donorHash = await bcrypt.hash('demo123', BCRYPT_ROUNDS);

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
      donorRoles: {
        create: {
          roleId: role_donor.id,
        },
      },
    },
    include: { engagement: true, payments: true },
  });
  console.log(`  ✓ Donor: ${ahmed.email} (${ahmed.payments.length} payments, role: ${role_donor.name})`);

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
  console.log(`  ✓ Donor: ${fatima.email} (${fatima.payments.length} payments, role: ${role_donor.name})`);

  const youssef = await prisma.donor.create({
    data: {
      name: 'Youssef Mansour',
      email: 'youssef@example.com',
      phoneNumber: '+1-555-0123',
      address: '123 Main Street',
      city: 'Toronto',
      country: 'Canada',
      postalCode: 'M1A 1A1',
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
      donorRoles: {
        create: {
          roleId: role_donor.id,
        },
      },
    },
    include: { engagement: true, payments: true },
  });
  console.log(`  ✓ Donor: ${youssef.email} (${youssef.payments.length} payment, role: ${role_donor.name})`);

  // ─── Requests ───────────────────────────────────────────────────────────────
  const req1 = await prisma.request.create({
    data: {
      type: 'account_creation',
      name: 'Hassan Al-Farsi',
      email: 'hassan@example.com',
      message: 'I would like to register as a donor and commit to a $500 pledge.',
      status: 'pending',
    },
  });

  const req2 = await prisma.request.create({
    data: {
      type: 'payment_upload',
      name: ahmed.name,
      email: ahmed.email,
      message: 'I made a $300 cash payment during the Friday prayer last week.',
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
  console.log(`  ✓ Requests: ${[req1, req2, req3].length} created`);

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
