'use strict';

const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const PDFDocument = require('pdfkit');
const prisma = require('../../db/client');
const AppError = require('../../utils/AppError');
const { createLog } = require('../logs/logs.service');
const mailService = require('../mail/mail.service');
const { calculateTotalFromPillars, validatePillars } = require('../../config/pillars');

const BCRYPT_ROUNDS = 12;

const stripPassword = ({ passwordHash, ...rest }) => rest;
const normalizeEmail = (email) => String(email || '').trim().toLowerCase();
const generateTemporaryPassword = () => crypto.randomBytes(9).toString('base64url');
const isTruthyNumber = (value) => typeof value === 'number' && Number.isFinite(value) && value > 0;

const parseCsvLine = (line) => {
  const cells = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      const next = line[i + 1];
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      cells.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }

  cells.push(current.trim());
  return cells;
};

const parseCsvContent = (csvContent) => {
  const lines = String(csvContent || '')
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    throw new AppError('CSV file must contain a header and at least one data row', 400, 'CSV_EMPTY');
  }

  const headers = parseCsvLine(lines[0]).map((header) => header.toLowerCase());
  const rows = lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ?? '';
    });
    return row;
  });

  return { headers, rows };
};

const parseAmount = (raw) => {
  const normalized = String(raw || '').replace(/[^0-9.-]/g, '');
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new AppError('Amount must be a positive number', 400, 'INVALID_AMOUNT');
  }
  return amount;
};

const parseOptionalPositiveAmount = (raw, fieldLabel) => {
  if (raw === undefined || raw === null || String(raw).trim() === '') return null;

  const normalized = String(raw).replace(/[^0-9.-]/g, '');
  const value = Number(normalized);
  if (!Number.isFinite(value) || value <= 0) {
    throw new AppError(`${fieldLabel} must be a positive number`, 400, 'INVALID_AMOUNT');
  }
  return value;
};

const parseDateValue = (raw) => {
  if (!raw) return new Date();
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    throw new AppError('Date is invalid', 400, 'INVALID_DATE');
  }
  return parsed;
};

const normalizePaymentMethod = (raw) => {
  const method = String(raw || '').trim().toLowerCase();
  if (!method) {
    throw new AppError('Method is required (cash, card, zeffy)', 400, 'METHOD_REQUIRED');
  }
  if (['cash', 'card', 'zeffy'].includes(method)) return method;
  throw new AppError('Method must be one of: cash, card, zeffy', 400, 'INVALID_METHOD');
};

// ─── Self-service ─────────────────────────────────────────────────────────────

const getMe = async (donorId) => {
  const donor = await prisma.donor.findUnique({
    where: { id: donorId },
    include: { engagement: true },
  });
  return stripPassword(donor);
};

const updateMe = async (donorId, { name, email, phoneNumber, address, city, country, postalCode, dateOfBirth, taxNumber, companyName }) => {
  const normalizedEmail = email !== undefined ? normalizeEmail(email) : undefined;

  if (email) {
    const existing = await prisma.donor.findFirst({ where: { email: normalizedEmail, NOT: { id: donorId } } });
    if (existing) throw new AppError('Email already in use', 409, 'EMAIL_TAKEN');
  }

  const updateData = {};
  if (name !== undefined) updateData.name = name;
  if (email !== undefined) updateData.email = normalizedEmail;
  if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
  if (address !== undefined) updateData.address = address;
  if (city !== undefined) updateData.city = city;
  if (country !== undefined) updateData.country = country;
  if (postalCode !== undefined) updateData.postalCode = postalCode;
  if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;
  if (taxNumber !== undefined) updateData.taxNumber = taxNumber;
  if (companyName !== undefined) updateData.companyName = companyName;

  const donor = await prisma.donor.update({
    where: { id: donorId },
    data: updateData,
  });

  await createLog({
    actor: `Donor: ${donor.name}`,
    actorType: 'donor',
    actorId: donorId,
    action: 'donor_profile_updated',
    details: `Profile updated`,
    donorId,
  });

  return stripPassword(donor);
};

const updateMyPassword = async (donorId, { currentPassword, newPassword }) => {
  const donor = await prisma.donor.findUnique({ where: { id: donorId } });
  const valid = await bcrypt.compare(currentPassword, donor.passwordHash);
  if (!valid) throw new AppError('Current password is incorrect', 400, 'INVALID_PASSWORD');

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await prisma.donor.update({ where: { id: donorId }, data: { passwordHash } });

  await createLog({
    actor: `Donor: ${donor.name}`,
    actorType: 'donor',
    actorId: donorId,
    action: 'donor_password_changed',
    details: 'Password changed',
    donorId,
  });
};

const getMyEngagement = async (donorId) => {
  const engagement = await prisma.engagement.findUnique({ where: { donorId } });
  if (!engagement) throw new AppError('No engagement found', 404, 'NOT_FOUND');
  return engagement;
};

const createEngagement = async (donorId, { totalPledge, pillars, startDate, endDate }) => {
  const existing = await prisma.engagement.findUnique({ where: { donorId } });
  if (existing) throw new AppError('Engagement already exists. Use PUT to update.', 409, 'CONFLICT');

  // Calculate total from pillars if provided; otherwise use totalPledge
  let finalTotal = totalPledge;
  if (pillars && Object.keys(pillars).length > 0) {
    if (!validatePillars(pillars)) {
      throw new AppError('Invalid pillars data', 400, 'INVALID_PILLARS');
    }
    finalTotal = calculateTotalFromPillars(pillars);
  } else if (!totalPledge) {
    throw new AppError('Either totalPledge or pillars must be provided', 400, 'MISSING_PLEDGE_DATA');
  }

  const engagement = await prisma.engagement.create({
    data: {
      donorId,
      totalPledge: finalTotal,
      startDate: startDate ? new Date(startDate) : new Date(),
      endDate: endDate ? new Date(endDate) : null,
    },
  });

  const donor = await prisma.donor.findUnique({ where: { id: donorId } });
  await createLog({
    actor: `Donor: ${donor.name}`,
    actorType: 'donor',
    actorId: donorId,
    action: 'engagement_created',
    details: `Engagement created with pledge $${finalTotal}`,
    donorId,
  });

  // Send engagement confirmation email
  try {
    await mailService.sendEngagementConfirmation(donor.email, donor.name, {
      totalPledge: finalTotal,
      startDate: engagement.startDate,
      endDate: engagement.endDate,
    });
  } catch (error) {
    console.error('Failed to send engagement confirmation email:', error);
    // Don't throw error - engagement was created successfully
  }

  return engagement;
};

const updateEngagement = async (donorId, { totalPledge, pillars, endDate }) => {
  const existing = await prisma.engagement.findUnique({ where: { donorId } });
  if (!existing) throw new AppError('No engagement found', 404, 'NOT_FOUND');

  // If pillars are provided, validate and calculate total
  let updateData = {};
  if (pillars !== undefined && Object.keys(pillars).length > 0) {
    if (!validatePillars(pillars)) {
      throw new AppError('Invalid pillars data', 400, 'INVALID_PILLARS');
    }
    updateData.totalPledge = calculateTotalFromPillars(pillars);
  } else if (totalPledge !== undefined) {
    updateData.totalPledge = totalPledge;
  }

  if (endDate !== undefined) {
    updateData.endDate = endDate ? new Date(endDate) : null;
  }

  const updated = await prisma.engagement.update({
    where: { donorId },
    data: updateData,
  });

  const donor = await prisma.donor.findUnique({ where: { id: donorId } });
  await createLog({
    actor: `Donor: ${donor.name}`,
    actorType: 'donor',
    actorId: donorId,
    action: 'engagement_updated',
    details: 'Engagement updated',
    donorId,
  });

  // Send engagement confirmation email
  try {
    await mailService.sendEngagementConfirmation(donor.email, donor.name, {
      totalPledge: updated.totalPledge,
      startDate: updated.startDate,
      endDate: updated.endDate,
    });
  } catch (error) {
    console.error('Failed to send engagement confirmation email:', error);
    // Don't throw error - engagement was updated successfully
  }

  return updated;
};

const getMyPayments = async (donorId) => {
  return prisma.payment.findMany({
    where: { donorId },
    orderBy: { date: 'desc' },
    include: { recordedByAdmin: { select: { id: true, name: true } } },
  });
};

const getMyRequests = async (donorId) => {
  return prisma.request.findMany({
    where: { donorId },
    orderBy: { createdAt: 'desc' },
    include: { attachments: true },
  });
};

// ─── Admin donor management ───────────────────────────────────────────────────

const listDonors = async ({ search, sortBy = 'createdAt', sortDir = 'desc', page = 1, limit = 20 } = {}) => {
  const safeLimit = Math.min(Number(limit) || 20, 100);
  const safePage = Math.max(Number(page) || 1, 1);
  const skip = (safePage - 1) * safeLimit;

  const allowedSort = ['name', 'email', 'createdAt'];
  const orderField = allowedSort.includes(sortBy) ? sortBy : 'createdAt';
  const orderDir = sortDir === 'asc' ? 'asc' : 'desc';

  const where = search
    ? { OR: [{ name: { contains: search } }, { email: { contains: search } }] }
    : {};

  const [total, donors] = await Promise.all([
    prisma.donor.count({ where }),
    prisma.donor.findMany({
      where,
      orderBy: { [orderField]: orderDir },
      skip,
      take: safeLimit,
      include: {
        engagement: true,
        payments: { select: { amount: true } },
        _count: { select: { payments: true } },
      },
    }),
  ]);

  return {
    total,
    page: safePage,
    limit: safeLimit,
    items: donors.map(({ passwordHash, payments, ...d }) => ({
      ...d,
      paidAmount: payments.reduce((s, p) => s + p.amount, 0),
    })),
  };
};

const getDonorById = async (id) => {
  const donor = await prisma.donor.findUnique({
    where: { id },
    include: {
      engagement: true,
      payments: {
        orderBy: { date: 'desc' },
        include: { recordedByAdmin: { select: { id: true, name: true } } },
      },
      requests: { orderBy: { createdAt: 'desc' }, include: { attachments: true } },
      _count: { select: { payments: true } },
    },
  });
  if (!donor) throw new AppError('Donor not found', 404, 'NOT_FOUND');
  const { passwordHash, ...rest } = donor;
  return rest;
};

const adminUpdateDonor = async (adminId, adminName, id, { name, email, accountCreated, isActive, phoneNumber, address, city, country, postalCode, dateOfBirth, taxNumber, companyName }) => {
  const donor = await prisma.donor.findUnique({ where: { id } });
  if (!donor) throw new AppError('Donor not found', 404, 'NOT_FOUND');

  const normalizedEmail = email !== undefined ? normalizeEmail(email) : undefined;

  if (email && email !== donor.email) {
    const conflict = await prisma.donor.findFirst({ where: { email: normalizedEmail, NOT: { id } } });
    if (conflict) throw new AppError('Email already in use', 409, 'EMAIL_TAKEN');
  }

  const updateData = {};
  if (name !== undefined) updateData.name = name;
  if (email !== undefined) updateData.email = normalizedEmail;
  if (accountCreated !== undefined) updateData.accountCreated = accountCreated;
  if (isActive !== undefined) updateData.isActive = isActive;
  if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
  if (address !== undefined) updateData.address = address;
  if (city !== undefined) updateData.city = city;
  if (country !== undefined) updateData.country = country;
  if (postalCode !== undefined) updateData.postalCode = postalCode;
  if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;
  if (taxNumber !== undefined) updateData.taxNumber = taxNumber;
  if (companyName !== undefined) updateData.companyName = companyName;

  const updated = await prisma.donor.update({
    where: { id },
    data: updateData,
  });

  const action = isActive === false ? 'admin_donor_deactivated' : isActive === true ? 'admin_donor_reactivated' : 'admin_donor_updated';
  const details = isActive === false ? `Admin deactivated donor: ${updated.email}` : isActive === true ? `Admin reactivated donor: ${updated.email}` : `Admin updated donor profile for ${updated.email}`;

  await createLog({
    actor: `Admin: ${adminName}`,
    actorType: 'admin',
    actorId: adminId,
    action,
    details,
    donorId: id,
    adminId,
  });

  // Send deactivation notice email if donor was deactivated
  if (isActive === false) {
    try {
      await mailService.sendDonorDeactivationNotice(
        updated.email,
        updated.name,
        'Your account has been deactivated by an administrator.'
      );
    } catch (error) {
      console.error('Failed to send deactivation notice email:', error);
      // Don't throw error - donor was updated successfully
    }
  }

  return stripPassword(updated);
};

const adminDeleteDonor = async (adminId, adminName, id) => {
  const donor = await prisma.donor.findUnique({ where: { id } });
  if (!donor) throw new AppError('Donor not found', 404, 'NOT_FOUND');

  await prisma.donor.delete({ where: { id } });

  await createLog({
    actor: `Admin: ${adminName}`,
    actorType: 'admin',
    actorId: adminId,
    action: 'admin_donor_deleted',
    details: `Admin deleted donor: ${donor.email}`,
    adminId,
  });
};

const adminUpdateDonorPassword = async (adminId, adminName, donorId, newPassword) => {
  const donor = await prisma.donor.findUnique({ where: { id: donorId } });
  if (!donor) throw new AppError('Donor not found', 404, 'NOT_FOUND');

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await prisma.donor.update({ where: { id: donorId }, data: { passwordHash } });

  await createLog({
    actor: `Admin: ${adminName}`,
    actorType: 'admin',
    actorId: adminId,
    action: 'admin_donor_password_changed',
    details: `Admin changed password for donor: ${donor.email}`,
    donorId,
    adminId,
  });
};

const adminGetDonorPayments = async (donorId) => {
  const donor = await prisma.donor.findUnique({ where: { id: donorId } });
  if (!donor) throw new AppError('Donor not found', 404, 'NOT_FOUND');

  return prisma.payment.findMany({
    where: { donorId },
    orderBy: { date: 'desc' },
    include: { recordedByAdmin: { select: { id: true, name: true } } },
  });
};

const adminSetEngagement = async (adminId, adminName, donorId, { totalPledge, pillars, startDate, endDate }) => {
  const donor = await prisma.donor.findUnique({ where: { id: donorId } });
  if (!donor) throw new AppError('Donor not found', 404, 'NOT_FOUND');

  const existing = await prisma.engagement.findUnique({ where: { donorId } });

  // Calculate total from pillars if provided; otherwise use totalPledge
  let finalTotal = totalPledge;
  if (pillars && Object.keys(pillars).length > 0) {
    if (!validatePillars(pillars)) {
      throw new AppError('Invalid pillars data', 400, 'INVALID_PILLARS');
    }
    finalTotal = calculateTotalFromPillars(pillars);
  } else if (!totalPledge) {
    throw new AppError('Either totalPledge or pillars must be provided', 400, 'MISSING_PLEDGE_DATA');
  }

  let engagement;
  if (existing) {
    // Update existing engagement
    engagement = await prisma.engagement.update({
      where: { donorId },
      data: {
        totalPledge: finalTotal,
        startDate: startDate ? new Date(startDate) : existing.startDate,
        endDate: endDate ? new Date(endDate) : existing.endDate,
      },
    });
  } else {
    // Create new engagement
    engagement = await prisma.engagement.create({
      data: {
        donorId,
        totalPledge: finalTotal,
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : null,
      },
    });
  }

  await createLog({
    actor: `Admin: ${adminName}`,
    actorType: 'admin',
    actorId: adminId,
    action: existing ? 'admin_engagement_updated' : 'admin_engagement_created',
    details: `Admin ${existing ? 'updated' : 'created'} engagement with pledge $${finalTotal} for donor: ${donor.email}`,
    donorId,
    adminId,
  });

  // Send engagement confirmation email
  try {
    await mailService.sendEngagementConfirmation(donor.email, donor.name, {
      totalPledge: engagement.totalPledge,
      startDate: engagement.startDate,
      endDate: engagement.endDate,
    });
  } catch (error) {
    console.error('Failed to send engagement confirmation email:', error);
    // Don't throw error - engagement was created/updated successfully
  }

  return engagement;
};

const adminAddPayment = async (adminId, adminName, donorId, { amount, date, method, note }) => {
  const donor = await prisma.donor.findUnique({ where: { id: donorId } });
  if (!donor) throw new AppError('Donor not found', 404, 'NOT_FOUND');

  const payment = await prisma.payment.create({
    data: {
      donorId,
      amount,
      date: new Date(date),
      method,
      note: note ?? null,
      recordedByAdminId: adminId,
    },
    include: { recordedByAdmin: { select: { id: true, name: true } } },
  });

  await createLog({
    actor: `Admin: ${adminName}`,
    actorType: 'admin',
    actorId: adminId,
    action: 'payment_recorded',
    details: `Payment of $${amount} recorded for donor: ${donor.email} via ${method}`,
    donorId,
    adminId,
  });

  // Send payment confirmation email
  try {
    const allPayments = await prisma.payment.findMany({
      where: { donorId },
    });
    const totalPaid = allPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

    const engagement = await prisma.engagement.findUnique({ where: { donorId } });

    await mailService.sendPaymentConfirmation(donor.email, donor.name, {
      amount,
      date: payment.date,
      method,
      paymentId: payment.id,
      totalPaid,
      pledgeAmount: engagement?.totalPledge,
    });
  } catch (error) {
    console.error('Failed to send payment confirmation email:', error);
    // Don't throw error - payment was recorded successfully
  }

  return payment;
};

const adminUpdatePayment = async (adminId, adminName, donorId, paymentId, { amount, date, method, note }) => {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      donor: { select: { id: true, email: true } },
    },
  });

  if (!payment || payment.donorId !== donorId) {
    throw new AppError('Payment not found', 404, 'PAYMENT_NOT_FOUND');
  }

  const updatedPayment = await prisma.payment.update({
    where: { id: paymentId },
    data: {
      ...(amount !== undefined ? { amount } : {}),
      ...(date !== undefined ? { date: new Date(date) } : {}),
      ...(method !== undefined ? { method } : {}),
      ...(note !== undefined ? { note: note || null } : {}),
      recordedByAdminId: adminId,
    },
    include: { recordedByAdmin: { select: { id: true, name: true } } },
  });

  await createLog({
    actor: `Admin: ${adminName}`,
    actorType: 'admin',
    actorId: adminId,
    action: 'payment_updated',
    details: `Payment ${paymentId} updated for donor: ${payment.donor?.email || donorId}`,
    donorId,
    adminId,
  });

  return updatedPayment;
};

const adminDeletePayment = async (adminId, adminName, donorId, paymentId) => {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      donor: { select: { id: true, email: true } },
    },
  });

  if (!payment || payment.donorId !== donorId) {
    throw new AppError('Payment not found', 404, 'PAYMENT_NOT_FOUND');
  }

  await prisma.payment.delete({ where: { id: paymentId } });

  await createLog({
    actor: `Admin: ${adminName}`,
    actorType: 'admin',
    actorId: adminId,
    action: 'payment_deleted',
    details: `Payment ${paymentId} deleted for donor: ${payment.donor?.email || donorId}`,
    donorId,
    adminId,
  });
};

const adminImportPaymentsCsv = async (adminId, adminName, fileBuffer) => {
  if (!fileBuffer || !Buffer.isBuffer(fileBuffer)) {
    throw new AppError('CSV file is required', 400, 'CSV_FILE_REQUIRED');
  }

  const { rows } = parseCsvContent(fileBuffer.toString('utf8'));

  let importedPayments = 0;
  let createdDonors = 0;
  const errors = [];

  for (let i = 0; i < rows.length; i += 1) {
    const rowNumber = i + 2;
    const row = rows[i];

    try {
      const email = normalizeEmail(row.email || row.donoremail || row['donor_email']);
      if (!email) {
        throw new AppError('Email is required', 400, 'EMAIL_REQUIRED');
      }

      const amount = parseAmount(row.amount);
      const date = parseDateValue(row.date || row.paymentdate || row['payment_date']);
      const method = normalizePaymentMethod(row.method || row.paymentmethod || row['payment_method']);
      const note = (row.note || row.message || row.details || '').trim() || null;
      const donorName = (row.name || row.donorname || row['donor_name'] || '').trim();
      const engagementAmount = parseOptionalPositiveAmount(
        row.engagement || row.pledge || row.totalpledge || row['total_pledge'],
        'Engagement',
      );
      const defaultEngagementEndDate = new Date(new Date().getFullYear(), 11, 31, 23, 59, 59, 999);

      let donor = await prisma.donor.findUnique({ where: { email } });

      if (!donor) {
        const fallbackName = email.split('@')[0].replace(/[._-]+/g, ' ').trim() || 'Imported Donor';
        const placeholderHash = await bcrypt.hash(`placeholder:${email}:${Date.now()}:${rowNumber}`, BCRYPT_ROUNDS);
        donor = await prisma.donor.create({
          data: {
            name: donorName || fallbackName,
            email,
            passwordHash: placeholderHash,
            accountCreated: false,
          },
        });
        createdDonors += 1;
      }

      if (engagementAmount !== null) {
        const existingEngagement = await prisma.engagement.findUnique({ where: { donorId: donor.id } });
        if (existingEngagement) {
          await prisma.engagement.update({
            where: { donorId: donor.id },
            data: {
              totalPledge: engagementAmount,
              endDate: defaultEngagementEndDate,
            },
          });
        } else {
          await prisma.engagement.create({
            data: {
              donorId: donor.id,
              totalPledge: engagementAmount,
              startDate: new Date(),
              endDate: defaultEngagementEndDate,
            },
          });
        }
      }

      await prisma.payment.create({
        data: {
          donorId: donor.id,
          amount,
          date,
          method,
          note,
          recordedByAdminId: adminId,
        },
      });

      importedPayments += 1;
    } catch (error) {
      errors.push({
        row: rowNumber,
        message: error?.message || 'Unknown row import error',
      });
    }
  }

  await createLog({
    actor: `Admin: ${adminName}`,
    actorType: 'admin',
    actorId: adminId,
    action: 'admin_payments_csv_imported',
    details: `CSV import complete: ${importedPayments} payment(s), ${createdDonors} donor(s) created, ${errors.length} row error(s)`,
    adminId,
  });

  return {
    importedPayments,
    createdDonors,
    totalRows: rows.length,
    failedRows: errors.length,
    errors,
  };
};

const adminCreateDonor = async (adminId, adminName, { name, email, accountCreated, password, pledgeAmount }) => {
  const normalizedEmail = normalizeEmail(email);
  const existing = await prisma.donor.findUnique({ where: { email: normalizedEmail } });
  if (existing) throw new AppError('Email already in use', 409, 'EMAIL_TAKEN');

  const normalizedPassword = typeof password === 'string' ? password.trim() : '';
  const shouldCreateAccount = accountCreated !== undefined
    ? accountCreated
    : normalizedPassword.length >= 8;
  const resolvedPassword = shouldCreateAccount
    ? (normalizedPassword.length >= 8 ? normalizedPassword : generateTemporaryPassword())
    : null;

  const passwordHash = await bcrypt.hash(
    shouldCreateAccount ? resolvedPassword : `placeholder:${normalizedEmail}:${Date.now()}`,
    BCRYPT_ROUNDS,
  );

  const donor = await prisma.donor.create({
    data: {
      name,
      email: normalizedEmail,
      passwordHash,
      accountCreated: shouldCreateAccount,
      ...(pledgeAmount && {
        engagement: {
          create: {
            totalPledge: pledgeAmount,
            startDate: new Date(),
          },
        },
      }),
    },
    include: { engagement: true },
  });

  await createLog({
    actor: `Admin: ${adminName}`,
    actorType: 'admin',
    actorId: adminId,
    action: shouldCreateAccount ? 'admin_donor_created' : 'admin_donor_placeholder_created',
    details: shouldCreateAccount
      ? `Admin created donor account for ${normalizedEmail}`
      : `Admin created placeholder donor for ${normalizedEmail}`,
    donorId: donor.id,
    adminId,
  });

  if (shouldCreateAccount) {
    try {
      await mailService.sendDonorAccountCreation(donor.email, donor.name, resolvedPassword);
    } catch (error) {
      console.error('Failed to send donor account creation email:', error);
      // Don't throw error - donor was created successfully
    }
  }

  return stripPassword(donor);
};

const adminUpsertDonorPayment = async (adminId, adminName, { donor: donorInput, payment: paymentInput }) => {
  const normalizedEmail = normalizeEmail(donorInput.email);
  let donor = await prisma.donor.findUnique({
    where: { email: normalizedEmail },
    include: { engagement: true },
  });
  let donorCreated = false;

  if (!donor) {
    donor = await adminCreateDonor(adminId, adminName, {
      name: donorInput.name,
      email: normalizedEmail,
      accountCreated: donorInput.accountCreated,
      password: donorInput.password,
      pledgeAmount: donorInput.pledgeAmount,
    });
    donorCreated = true;
  } else {
    const donorUpdates = {};
    if (donorInput.name && donorInput.name !== donor.name) donorUpdates.name = donorInput.name;

    if (Object.keys(donorUpdates).length > 0) {
      donor = await prisma.donor.update({
        where: { id: donor.id },
        data: donorUpdates,
        include: { engagement: true },
      });
    }

    if (isTruthyNumber(donorInput.pledgeAmount) && !donor.engagement) {
      await prisma.engagement.create({
        data: {
          donorId: donor.id,
          totalPledge: donorInput.pledgeAmount,
          startDate: new Date(),
        },
      });
    }
  }

  const payment = await adminAddPayment(adminId, adminName, donor.id, paymentInput);

  return {
    donorCreated,
    donor: stripPassword(donor),
    payment,
  };
};

const generatePaymentConfirmation = async (donorId, paymentId, adminId) => {
  const [donor, payment] = await Promise.all([
    prisma.donor.findUnique({
      where: { id: donorId },
      include: { engagement: true },
    }),
    prisma.payment.findUnique({
      where: { id: paymentId },
      include: { recordedByAdmin: { select: { id: true, name: true } } },
    }),
  ]);

  if (!donor) throw new AppError('Donor not found', 404, 'NOT_FOUND');
  if (!payment) throw new AppError('Payment not found', 404, 'NOT_FOUND');
  if (payment.donorId !== donorId) throw new AppError('Payment does not belong to this donor', 400, 'INVALID_REQUEST');

  const doc = new PDFDocument();

  // Add title
  doc.fontSize(24).font('Helvetica-Bold').text('Payment Confirmation', { align: 'center' });
  doc.moveDown(0.5);

  // Add date
  doc.fontSize(10).font('Helvetica').text(`Generated: ${new Date().toLocaleDateString()}`, { align: 'right' });
  doc.moveDown(1);

  // Donor information section
  doc.fontSize(14).font('Helvetica-Bold').text('Donor Information');
  doc.fontSize(11).font('Helvetica');
  doc.text(`Name: ${donor.name}`, { indent: 20 });
  doc.text(`Email: ${donor.email}`, { indent: 20 });
  doc.moveDown(1);

  // Payment information section
  doc.fontSize(14).font('Helvetica-Bold').text('Payment Details');
  doc.fontSize(11).font('Helvetica');
  doc.text(`Payment ID: ${paymentId}`, { indent: 20 });
  doc.text(`Amount: $${Number(payment.amount).toLocaleString()}`, { indent: 20 });
  doc.text(`Date: ${new Date(payment.date).toLocaleDateString()}`, { indent: 20 });
  doc.text(`Method: ${payment.method}`, { indent: 20 });
  if (payment.note) {
    doc.text(`Note: ${payment.note}`, { indent: 20 });
  }
  doc.moveDown(1);

  // Pledge information section
  if (donor.engagement) {
    doc.fontSize(14).font('Helvetica-Bold').text('Pledge Information');
    doc.fontSize(11).font('Helvetica');
    doc.text(`Pledged Amount: $${Number(donor.engagement.totalPledge).toLocaleString()}`, { indent: 20 });

    const allPayments = await prisma.payment.findMany({
      where: { donorId },
    });
    const totalPaid = allPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    doc.text(`Total Paid: $${Number(totalPaid).toLocaleString()}`, { indent: 20 });
    doc.text(`Remaining: $${Math.max(0, Number(donor.engagement.totalPledge) - totalPaid).toLocaleString()}`, { indent: 20 });
  }

  doc.moveDown(2);

  // Footer
  doc.fontSize(9).font('Helvetica').text('This is an automated confirmation. Thank you for your generous support!', { align: 'center', color: '#666' });

  doc.end();
  return doc;
};

const uploadPaymentReceipt = async (adminId, adminName, donorId, paymentId, file) => {
  // Verify payment exists
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
  });

  if (!payment || payment.donorId !== donorId) {
    throw new AppError('Payment not found', 404, 'PAYMENT_NOT_FOUND');
  }

  // Store file path (e.g., /api/admin/uploads/receipts/{donorId}/{paymentId}/{filename})
  const receiptPath = `/api/admin/uploads/receipts/${donorId}/${paymentId}/${file.filename}`;

  // Update payment with receipt path
  const updatedPayment = await prisma.payment.update({
    where: { id: paymentId },
    data: { receiptPath },
  });

  await createLog({
    actor: `Admin: ${adminName}`,
    actorType: 'admin',
    actorId: adminId,
    action: 'admin_receipt_uploaded',
    details: `Receipt uploaded for payment ${paymentId}`,
    donorId,
    adminId,
  });

  return updatedPayment;
};

const downloadPaymentConfirmation = async (donorId, paymentId, res) => {
  // Verify payment exists and belongs to donor
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { donor: true },
  });

  if (!payment || payment.donorId !== donorId) {
    throw new AppError('Payment not found', 404, 'PAYMENT_NOT_FOUND');
  }

  // Generate PDF (placeholder - will use pdfkit library)
  const { Readable } = require('stream');
  const PDFDocument = require('pdfkit');

  const doc = new PDFDocument();
  const filename = `Payment-Confirmation-${paymentId}.pdf`;

  // Set response headers
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  // Pipe PDF to response
  doc.pipe(res);

  // Add content to PDF
  doc.fontSize(20).text('Payment Confirmation', { align: 'center' });
  doc.moveDown();
  doc.fontSize(12)
    .text(`Donor: ${payment.donor.name}`, { align: 'left' })
    .text(`Email: ${payment.donor.email}`)
    .text(`Payment ID: ${payment.id}`)
    .moveDown()
    .text(`Amount: $${payment.amount.toFixed(2)}`)
    .text(`Method: ${payment.method}`)
    .text(`Date: ${new Date(payment.paymentDate).toLocaleDateString()}`)
    .text(`Status: ${payment.status}`)
    .moveDown();

  if (payment.note) {
    doc.text(`Note: ${payment.note}`);
  }

  if (payment.receiptPath) {
    doc.moveDown();
    doc.text(`Receipt: Attached`);
  }

  doc.end();
};

module.exports = {
  getMe,
  updateMe,
  updateMyPassword,
  getMyEngagement,
  createEngagement,
  updateEngagement,
  getMyPayments,
  getMyRequests,
  listDonors,
  getDonorById,
  adminUpdateDonor,
  adminDeleteDonor,
  adminUpdateDonorPassword,
  adminGetDonorPayments,
  adminSetEngagement,
  adminAddPayment,
  adminUpdatePayment,
  adminDeletePayment,
  adminImportPaymentsCsv,
  adminCreateDonor,
  adminUpsertDonorPayment,
  generatePaymentConfirmation,
  uploadPaymentReceipt,
  downloadPaymentConfirmation,
};
