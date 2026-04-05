'use strict';

const prisma = require('../../db/client');
const AppError = require('../../utils/AppError');

// ─── Activity helpers ─────────────────────────────────────────────────────────

const activityWithCounts = {
  schedules: {
    orderBy: { scheduledAt: 'asc' },
    include: {
      _count: { select: { signups: true } },
    },
  },
  _count: { select: { signups: true, discussions: true } },
  checklistItems: { orderBy: { order: 'asc' } },
};

// ─── Admin: activities ────────────────────────────────────────────────────────

const listActivities = async ({ page = 1, limit = 20, includeInactive = false } = {}) => {
  const safeLimit = Math.min(Number(limit) || 20, 100);
  const safePage = Math.max(Number(page) || 1, 1);
  const skip = (safePage - 1) * safeLimit;
  const where = includeInactive ? {} : { isActive: true };

  const [total, items] = await Promise.all([
    prisma.volunteerActivity.count({ where }),
    prisma.volunteerActivity.findMany({
      where,
      skip,
      take: safeLimit,
      orderBy: { createdAt: 'desc' },
      include: activityWithCounts,
    }),
  ]);

  return { total, page: safePage, limit: safeLimit, items };
};

const getActivity = async (id) => {
  const activity = await prisma.volunteerActivity.findUnique({
    where: { id },
    include: {
      schedules: {
        orderBy: { scheduledAt: 'asc' },
        include: {
          signups: {
            include: {
              donor: { select: { id: true, name: true, email: true } },
              checklistProgress: { select: { checklistItemId: true } },
            },
          },
        },
      },
      discussions: { orderBy: { createdAt: 'asc' } },
      checklistItems: { orderBy: { order: 'asc' } },
      _count: { select: { signups: true } },
    },
  });
  if (!activity) throw new AppError('Activity not found', 404, 'NOT_FOUND');
  return activity;
};

const createActivity = async (adminId, data) => {
  return prisma.volunteerActivity.create({
    data: {
      title: data.title,
      description: data.description,
      skills: data.skills ?? null,
      recurrenceType: data.recurrenceType ?? 'none',
      recurrenceNote: data.recurrenceNote ?? null,
      maxVolunteers: data.maxVolunteers ?? 0,
      estimatedMinutes: data.estimatedMinutes ?? null,
      createdByAdminId: adminId,
    },
  });
};

const updateActivity = async (id, data) => {
  const activity = await prisma.volunteerActivity.findUnique({ where: { id } });
  if (!activity) throw new AppError('Activity not found', 404, 'NOT_FOUND');

  return prisma.volunteerActivity.update({
    where: { id },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.skills !== undefined && { skills: data.skills }),
      ...(data.recurrenceType !== undefined && { recurrenceType: data.recurrenceType }),
      ...(data.recurrenceNote !== undefined && { recurrenceNote: data.recurrenceNote }),
      ...(data.maxVolunteers !== undefined && { maxVolunteers: data.maxVolunteers }),
      ...(data.estimatedMinutes !== undefined && { estimatedMinutes: data.estimatedMinutes }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
  });
};

const deactivateActivity = async (id) => {
  const activity = await prisma.volunteerActivity.findUnique({ where: { id } });
  if (!activity) throw new AppError('Activity not found', 404, 'NOT_FOUND');
  return prisma.volunteerActivity.update({ where: { id }, data: { isActive: false } });
};

const deleteActivity = async (id) => {
  const activity = await prisma.volunteerActivity.findUnique({ where: { id } });
  if (!activity) throw new AppError('Activity not found', 404, 'NOT_FOUND');
  await prisma.volunteerActivity.delete({ where: { id } }); // cascades to schedules, signups, discussions
};

// ─── Admin: schedules ─────────────────────────────────────────────────────────

const addSchedule = async (activityId, data) => {
  const activity = await prisma.volunteerActivity.findUnique({ where: { id: activityId } });
  if (!activity) throw new AppError('Activity not found', 404, 'NOT_FOUND');

  return prisma.activitySchedule.create({
    data: {
      activityId,
      scheduledAt: new Date(data.scheduledAt),
      location: data.location,
      notes: data.notes ?? null,
      maxVolunteers: data.maxVolunteers ?? null,
    },
  });
};

const updateSchedule = async (activityId, scheduleId, data) => {
  const schedule = await prisma.activitySchedule.findFirst({
    where: { id: scheduleId, activityId },
  });
  if (!schedule) throw new AppError('Schedule not found', 404, 'NOT_FOUND');

  return prisma.activitySchedule.update({
    where: { id: scheduleId },
    data: {
      ...(data.scheduledAt !== undefined && { scheduledAt: new Date(data.scheduledAt) }),
      ...(data.location !== undefined && { location: data.location }),
      ...(data.notes !== undefined && { notes: data.notes }),
      ...(data.maxVolunteers !== undefined && { maxVolunteers: data.maxVolunteers }),
      ...(data.status !== undefined && { status: data.status }),
    },
  });
};

const deleteSchedule = async (activityId, scheduleId) => {
  const schedule = await prisma.activitySchedule.findFirst({
    where: { id: scheduleId, activityId },
  });
  if (!schedule) throw new AppError('Schedule not found', 404, 'NOT_FOUND');
  await prisma.activitySchedule.delete({ where: { id: scheduleId } });
};

// ─── Admin: signup management ─────────────────────────────────────────────────

const adminRemoveSignup = async (activityId, scheduleId, signupId) => {
  const signup = await prisma.activitySignup.findFirst({
    where: { id: signupId, scheduleId, activityId },
  });
  if (!signup) throw new AppError('Signup not found', 404, 'NOT_FOUND');
  await prisma.activitySignup.delete({ where: { id: signupId } });
};

const adminPreAssignVolunteer = async (activityId, scheduleId, donorEmail, note) => {
  const donor = await prisma.donor.findUnique({
    where: { email: donorEmail.toLowerCase().trim() },
  });
  if (!donor) throw new AppError('No donor found with that email', 404, 'NOT_FOUND');

  const schedule = await prisma.activitySchedule.findFirst({
    where: { id: scheduleId, activityId },
  });
  if (!schedule) throw new AppError('Schedule not found', 404, 'NOT_FOUND');

  const existing = await prisma.activitySignup.findUnique({
    where: { scheduleId_donorId: { scheduleId, donorId: donor.id } },
  });

  if (existing) {
    if (existing.status === 'signed_up') throw new AppError('Donor is already signed up', 409, 'CONFLICT');
    return prisma.activitySignup.update({
      where: { id: existing.id },
      data: { status: 'signed_up', note: note ?? existing.note },
    });
  }

  return prisma.activitySignup.create({
    data: { activityId, scheduleId, donorId: donor.id, note: note ?? null, status: 'signed_up' },
  });
};

// ─── Admin: signups list ──────────────────────────────────────────────────────

const listSignupsForActivity = async (activityId) => {
  const activity = await prisma.volunteerActivity.findUnique({ where: { id: activityId } });
  if (!activity) throw new AppError('Activity not found', 404, 'NOT_FOUND');

  return prisma.activitySignup.findMany({
    where: { activityId },
    include: {
      donor: { select: { id: true, name: true, email: true } },
      schedule: { select: { id: true, scheduledAt: true, location: true } },
    },
    orderBy: { createdAt: 'asc' },
  });
};

// ─── Admin: checklist items ──────────────────────────────────────────────────

const addChecklistItem = async (activityId, title, order) => {
  const activity = await prisma.volunteerActivity.findUnique({ where: { id: activityId } });
  if (!activity) throw new AppError('Activity not found', 404, 'NOT_FOUND');

  // Default order: append after existing items
  let itemOrder = order;
  if (itemOrder === undefined || itemOrder === null) {
    const last = await prisma.activityChecklistItem.findFirst({
      where: { activityId },
      orderBy: { order: 'desc' },
    });
    itemOrder = (last?.order ?? -1) + 1;
  }

  return prisma.activityChecklistItem.create({
    data: { activityId, title, order: itemOrder },
  });
};

const updateChecklistItem = async (activityId, itemId, data) => {
  const item = await prisma.activityChecklistItem.findFirst({
    where: { id: itemId, activityId },
  });
  if (!item) throw new AppError('Checklist item not found', 404, 'NOT_FOUND');

  return prisma.activityChecklistItem.update({
    where: { id: itemId },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.order !== undefined && { order: data.order }),
    },
  });
};

const deleteChecklistItem = async (activityId, itemId) => {
  const item = await prisma.activityChecklistItem.findFirst({
    where: { id: itemId, activityId },
  });
  if (!item) throw new AppError('Checklist item not found', 404, 'NOT_FOUND');
  await prisma.activityChecklistItem.delete({ where: { id: itemId } });
};

// ─── Shared: discussions ──────────────────────────────────────────────────────

const postDiscussionMessage = async (activityId, authorId, authorType, authorName, message) => {
  const activity = await prisma.volunteerActivity.findUnique({ where: { id: activityId } });
  if (!activity || !activity.isActive) throw new AppError('Activity not found', 404, 'NOT_FOUND');

  return prisma.activityDiscussion.create({
    data: { activityId, authorId, authorType, authorName, message },
  });
};

// ─── Donor: public activities ─────────────────────────────────────────────────

// ─── Donor: checklist check / uncheck ───────────────────────────────────────

const checkItem = async (activityId, scheduleId, donorId, itemId) => {
  const signup = await prisma.activitySignup.findUnique({
    where: { scheduleId_donorId: { scheduleId, donorId } },
  });
  if (!signup || signup.activityId !== activityId || signup.status !== 'signed_up') {
    throw new AppError('Active signup not found', 404, 'NOT_FOUND');
  }

  const item = await prisma.activityChecklistItem.findFirst({
    where: { id: itemId, activityId },
  });
  if (!item) throw new AppError('Checklist item not found', 404, 'NOT_FOUND');

  return prisma.signupChecklist.upsert({
    where: { signupId_checklistItemId: { signupId: signup.id, checklistItemId: itemId } },
    create: { signupId: signup.id, checklistItemId: itemId },
    update: { checkedAt: new Date() },
  });
};

const uncheckItem = async (activityId, scheduleId, donorId, itemId) => {
  const signup = await prisma.activitySignup.findUnique({
    where: { scheduleId_donorId: { scheduleId, donorId } },
  });
  if (!signup || signup.activityId !== activityId) {
    throw new AppError('Signup not found', 404, 'NOT_FOUND');
  }

  await prisma.signupChecklist.deleteMany({
    where: { signupId: signup.id, checklistItemId: itemId },
  });
};

const listPublicActivities = async ({ page = 1, limit = 20 } = {}) => {
  const safeLimit = Math.min(Number(limit) || 20, 100);
  const safePage = Math.max(Number(page) || 1, 1);
  const skip = (safePage - 1) * safeLimit;
  const where = { isActive: true };

  const [total, items] = await Promise.all([
    prisma.volunteerActivity.count({ where }),
    prisma.volunteerActivity.findMany({
      where,
      skip,
      take: safeLimit,
      orderBy: { createdAt: 'desc' },
      include: {
        schedules: {
          where: { status: 'upcoming', scheduledAt: { gte: new Date() } },
          orderBy: { scheduledAt: 'asc' },
          include: { _count: { select: { signups: true } } },
        },
        _count: { select: { discussions: true, checklistItems: true } },
      },
    }),
  ]);

  return { total, page: safePage, limit: safeLimit, items };
};

const getPublicActivity = async (id, donorId, { includeInactive = false } = {}) => {
  const where = includeInactive ? { id } : { id, isActive: true };
  const activity = await prisma.volunteerActivity.findFirst({
    where,
    include: {
      schedules: {
        orderBy: { scheduledAt: 'asc' },
        include: {
          _count: { select: { signups: true } },
          signups: donorId
            ? {
                where: { donorId },
                select: {
                  id: true,
                  status: true,
                  note: true,
                  checklistProgress: { select: { checklistItemId: true } },
                },
              }
            : false,
        },
      },
      discussions: { orderBy: { createdAt: 'asc' } },
      checklistItems: { orderBy: { order: 'asc' } },
    },
  });
  if (!activity) throw new AppError('Activity not found', 404, 'NOT_FOUND');
  return activity;
};

// ─── Donor: signups ───────────────────────────────────────────────────────────

const signUp = async (activityId, scheduleId, donorId, note) => {
  const schedule = await prisma.activitySchedule.findFirst({
    where: { id: scheduleId, activityId, status: 'upcoming' },
    include: {
      activity: true,
      _count: { select: { signups: { where: { status: 'signed_up' } } } },
    },
  });
  if (!schedule) throw new AppError('Schedule not found or not available', 404, 'NOT_FOUND');

  // Check capacity – activity-level maxVolunteers or schedule override (0 = unlimited)
  const cap = schedule.maxVolunteers ?? schedule.activity.maxVolunteers;
  if (cap > 0 && schedule._count.signups >= cap) {
    throw new AppError('This schedule is full', 409, 'CONFLICT');
  }

  const existing = await prisma.activitySignup.findUnique({
    where: { scheduleId_donorId: { scheduleId, donorId } },
  });
  if (existing) {
    if (existing.status === 'signed_up') throw new AppError('Already signed up', 409, 'CONFLICT');
    // Re-activate a cancelled signup
    return prisma.activitySignup.update({
      where: { id: existing.id },
      data: { status: 'signed_up', note: note ?? existing.note },
    });
  }

  return prisma.activitySignup.create({
    data: { activityId, scheduleId, donorId, note: note ?? null },
  });
};

const cancelSignup = async (activityId, scheduleId, donorId) => {
  const signup = await prisma.activitySignup.findUnique({
    where: { scheduleId_donorId: { scheduleId, donorId } },
  });
  if (!signup || signup.activityId !== activityId) {
    throw new AppError('Signup not found', 404, 'NOT_FOUND');
  }
  return prisma.activitySignup.update({
    where: { id: signup.id },
    data: { status: 'cancelled' },
  });
};

const updateSignupNote = async (activityId, scheduleId, donorId, note) => {
  const signup = await prisma.activitySignup.findUnique({
    where: { scheduleId_donorId: { scheduleId, donorId } },
  });
  if (!signup || signup.activityId !== activityId) {
    throw new AppError('Signup not found', 404, 'NOT_FOUND');
  }
  return prisma.activitySignup.update({
    where: { id: signup.id },
    data: { note },
  });
};

const getMySignups = async (donorId) => {
  return prisma.activitySignup.findMany({
    where: { donorId },
    include: {
      activity: { select: { id: true, title: true, isActive: true } },
      schedule: { select: { id: true, scheduledAt: true, location: true, status: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
};

module.exports = {
  listActivities,
  getActivity,
  createActivity,
  updateActivity,
  deactivateActivity,
  deleteActivity,
  addSchedule,
  updateSchedule,
  deleteSchedule,
  adminRemoveSignup,
  adminPreAssignVolunteer,
  listSignupsForActivity,
  addChecklistItem,
  updateChecklistItem,
  deleteChecklistItem,
  postDiscussionMessage,
  listPublicActivities,
  getPublicActivity,
  signUp,
  cancelSignup,
  updateSignupNote,
  getMySignups,
  checkItem,
  uncheckItem,
};
