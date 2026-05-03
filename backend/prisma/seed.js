'use strict';

const path = require('node:path');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { PrismaClient } = require('@prisma/client');
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

async function main() {
  console.log('🌱 Seeding database…');

  // ─── Clean existing data ────────────────────────────────────────────────────
  // Order matters: child rows first, then parents (FKs without cascade).
  await prisma.signupChecklist.deleteMany();
  await prisma.activitySignup.deleteMany();
  await prisma.activityChecklistItem.deleteMany();
  await prisma.activityDiscussion.deleteMany();
  await prisma.activitySchedule.deleteMany();
  await prisma.volunteerActivity.deleteMany();
  await prisma.apiKey.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.requestAttachment.deleteMany();
  await prisma.request.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.engagement.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.otpCode.deleteMany();
  await prisma.donor.deleteMany();
  // Break the Admin self-reference (AdminHierarchy) before bulk-delete.
  await prisma.admin.updateMany({ data: { addedById: null } });
  await prisma.admin.deleteMany();


  // ─── Admin ──────────────────────────────────────────────────────────────────
  const admin = await prisma.admin.create({
    data: {
      name: 'Imam Abdallah',
      email: 'qasim.engr@yahoo.com',
    },
  });
  console.log(`  ✓ Admin: ${admin.email}`);

  console.log('\n✅ Seed complete!');
  console.log('\nSign in via OTP at the admin login page.');
}

main()
  .catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
