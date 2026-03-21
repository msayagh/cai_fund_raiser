'use strict';

const bcrypt = require('bcryptjs');
const prisma = require('../../db/client');
const AppError = require('../../utils/AppError');
const { createLog } = require('../logs/logs.service');
const mailService = require('../mail/mail.service');

const BCRYPT_ROUNDS = 12;

const listRequests = async ({ status, type, page = 1, limit = 20 } = {}) => {
  const safeLimit = Math.min(Number(limit) || 20, 100);
  const safePage = Math.max(Number(page) || 1, 1);
  const skip = (safePage - 1) * safeLimit;

  const where = {};
  if (status) where.status = status;
  if (type) where.type = type;

  const [total, items] = await Promise.all([
    prisma.request.count({ where }),
    prisma.request.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: safeLimit,
      include: { attachments: true },
    }),
  ]);

  return { total, page: safePage, limit: safeLimit, items };
};

const getRequestById = async (id) => {
  const req = await prisma.request.findUnique({
    where: { id },
    include: { attachments: true, donor: { select: { id: true, name: true, email: true } } },
  });
  if (!req) throw new AppError('Request not found', 404, 'NOT_FOUND');
  return req;
};

const createRequest = async ({ type, name, email, message, donorId }) => {
  return prisma.request.create({
    data: {
      type,
      name,
      email,
      message,
      donorId: donorId ?? null,
    },
  });
};

const addAttachments = async (requestId, files) => {
  const request = await prisma.request.findUnique({ where: { id: requestId } });
  if (!request) throw new AppError('Request not found', 404, 'NOT_FOUND');

  const attachments = await Promise.all(
    files.map((file) =>
      prisma.requestAttachment.create({
        data: {
          requestId,
          filename: file.originalname,
          mimeType: file.mimetype,
          filePath: file.path,
          fileSize: file.size,
        },
      })
    )
  );

  return attachments;
};

const approveRequest = async (adminId, adminName, id, body) => {
  const request = await prisma.request.findUnique({
    where: { id },
    include: { attachments: true },
  });
  if (!request) throw new AppError('Request not found', 404, 'NOT_FOUND');
  const canApprove =
    ['pending', 'on_hold'].includes(request.status) ||
    (request.type === 'payment_upload' && request.status === 'declined');

  if (!canApprove) {
    throw new AppError('Request has already been processed', 400, 'ALREADY_PROCESSED');
  }

  let extraData = null;

  if (request.type === 'account_creation') {
    const { password, pledgeAmount } = body;
    if (!password) throw new AppError('Password is required to approve account_creation', 400, 'VALIDATION_ERROR');

    const existing = await prisma.donor.findUnique({ where: { email: request.email } });
    if (existing) throw new AppError('An account with this email already exists', 409, 'EMAIL_TAKEN');

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const donor = await prisma.donor.create({
      data: {
        name: request.name,
        email: request.email,
        passwordHash,
        ...(pledgeAmount && {
          engagement: {
            create: { totalPledge: pledgeAmount, startDate: new Date() },
          },
        }),
      },
    });
    extraData = { donorId: donor.id };

    await prisma.request.update({ where: { id }, data: { donorId: donor.id } });

    await createLog({
      actor: `Admin: ${adminName}`,
      actorType: 'admin',
      actorId: adminId,
      action: 'donor_registered',
      details: `Account created via request approval for ${request.email}`,
      donorId: donor.id,
      adminId,
    });

    // Send account creation email with temporary password
    try {
      await mailService.sendDonorAccountCreation(donor.email, donor.name, password);
    } catch (error) {
      console.error('Failed to send donor account creation email:', error);
    }
  } else if (request.type === 'payment_upload') {
    const { amount, date, method, note, displayName, engagement, tier, quantity: quantityRaw } = body;
    if (!amount || !date || !method) {
      throw new AppError('amount, date, and method are required to approve payment_upload', 400, 'VALIDATION_ERROR');
    }

    let donorId = request.donorId;
    if (!donorId) {
      const donor = await prisma.donor.findUnique({ where: { email: request.email } });
      if (!donor) throw new AppError('No donor account found for this email', 404, 'NOT_FOUND');
      donorId = donor.id;
    }

    const normalizedTier = typeof tier === 'string' && tier.trim() ? tier.trim() : 'General';
    const parsedEngagement = Number(engagement);
    const normalizedEngagement = Number.isFinite(parsedEngagement) ? parsedEngagement : 0;

    const parsedQty = Number(quantityRaw);
    const quantity = Number.isFinite(parsedQty) && parsedQty >= 1 ? Math.floor(parsedQty) : 1;

    const payment = await prisma.payment.create({
      data: {
        donor: { connect: { id: donorId } },
        amount,
        quantity,
        date: new Date(date),
        method,
        note: note ?? null,
        displayName: displayName ?? null,
        tier: normalizedTier,
        recordedByAdmin: { connect: { id: adminId } },
        engagement: normalizedEngagement,
      },
    });
    extraData = { paymentId: payment.id };

    await createLog({
      actor: `Admin: ${adminName}`,
      actorType: 'admin',
      actorId: adminId,
      action: 'payment_recorded',
      details: `Payment of $${amount} recorded via request approval for ${request.email}`,
      donorId,
      adminId,
    });

    // Send payment confirmation email
    try {
      const donor = await prisma.donor.findUnique({
        where: { id: donorId },
        include: { engagement: true },
      });
      const allPayments = await prisma.payment.findMany({
        where: { donorId },
      });
      const totalPaid = allPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

      await mailService.sendPaymentConfirmation(donor.email, donor.name, {
        amount,
        date: payment.date,
        method,
        paymentId: payment.id,
        totalPaid,
        pledgeAmount: donor.engagement?.totalPledge,
      });
    } catch (error) {
      console.error('Failed to send payment confirmation email:', error);
    }
  } else if (request.type === 'engagement_change') {
    await createLog({
      actor: `Admin: ${adminName}`,
      actorType: 'admin',
      actorId: adminId,
      action: 'engagement_change_approved',
      details: `Engagement change request approved for ${request.email}`,
      donorId: request.donorId ?? null,
      adminId,
    });
  } else {
    await createLog({
      actor: `Admin: ${adminName}`,
      actorType: 'admin',
      actorId: adminId,
      action: 'request_approved',
      details: `Request (${request.type}) approved for ${request.email}`,
      donorId: request.donorId ?? null,
      adminId,
    });
  }

  const updated = await prisma.request.update({
    where: { id },
    data: { status: 'approved' },
    include: { attachments: true },
  });

  // Send generic request status update email
  try {
    await mailService.sendRequestStatusUpdate(request.email, request.name, {
      type: request.type,
      status: 'approved',
      message: `Your ${request.type.replace(/_/g, ' ')} request has been approved.`,
    });
  } catch (error) {
    console.error('Failed to send request status update email:', error);
  }

  return { request: updated, ...(extraData && { extraData }) };
};

const declineRequest = async (adminId, adminName, id) => {
  const request = await prisma.request.findUnique({ where: { id } });
  if (!request) throw new AppError('Request not found', 404, 'NOT_FOUND');
  const canDecline =
    ['pending', 'on_hold'].includes(request.status) ||
    (request.type === 'payment_upload' && request.status === 'approved');

  if (!canDecline) {
    throw new AppError('Request has already been processed', 400, 'ALREADY_PROCESSED');
  }

  const updated = await prisma.request.update({
    where: { id },
    data: { status: 'declined' },
  });

  await createLog({
    actor: `Admin: ${adminName}`,
    actorType: 'admin',
    actorId: adminId,
    action: 'request_declined',
    details: `Request (${request.type}) declined for ${request.email}`,
    donorId: request.donorId ?? null,
    adminId,
  });

  // Send request status update email
  try {
    await mailService.sendRequestStatusUpdate(request.email, request.name, {
      type: request.type,
      status: 'declined',
      message: `Your ${request.type.replace(/_/g, ' ')} request has been declined. Please contact us for more information.`,
    });
  } catch (error) {
    console.error('Failed to send request status update email:', error);
  }

  return updated;
};

const holdRequest = async (adminId, adminName, id) => {
  const request = await prisma.request.findUnique({ where: { id } });
  if (!request) throw new AppError('Request not found', 404, 'NOT_FOUND');
  if (request.status !== 'pending') {
    throw new AppError('Only pending requests can be placed on hold', 400, 'ALREADY_PROCESSED');
  }

  const updated = await prisma.request.update({
    where: { id },
    data: { status: 'on_hold' },
  });

  await createLog({
    actor: `Admin: ${adminName}`,
    actorType: 'admin',
    actorId: adminId,
    action: 'request_on_hold',
    details: `Request (${request.type}) placed on hold for ${request.email}`,
    donorId: request.donorId ?? null,
    adminId,
  });

  // Send request status update email
  try {
    await mailService.sendRequestStatusUpdate(request.email, request.name, {
      type: request.type,
      status: 'on_hold',
      message: `Your ${request.type.replace(/_/g, ' ')} request is currently being reviewed. We'll notify you with an update soon.`,
    });
  } catch (error) {
    console.error('Failed to send request status update email:', error);
  }

  return updated;
};

const getAttachment = async (requestId, attachmentId) => {
  const att = await prisma.requestAttachment.findFirst({
    where: { id: attachmentId, requestId },
  });
  if (!att) throw new AppError('Attachment not found', 404, 'NOT_FOUND');
  return att;
};

module.exports = {
  listRequests,
  getRequestById,
  createRequest,
  addAttachments,
  getAttachment,
  approveRequest,
  declineRequest,
  holdRequest,
};
