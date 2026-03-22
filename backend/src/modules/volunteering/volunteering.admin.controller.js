'use strict';

const service = require('./volunteering.service');
const { sendSuccess } = require('../../utils/response');

// ─── Activities ───────────────────────────────────────────────────────────────

const listActivities = async (req, res, next) => {
  try {
    const { page, limit, includeInactive } = req.query;
    const data = await service.listActivities({
      page,
      limit,
      includeInactive: includeInactive === 'true',
    });
    sendSuccess(res, data);
  } catch (err) { next(err); }
};

const getActivity = async (req, res, next) => {
  try {
    const data = await service.getActivity(req.params.id);
    sendSuccess(res, data);
  } catch (err) { next(err); }
};

const createActivity = async (req, res, next) => {
  try {
    const data = await service.createActivity(req.admin.id, req.body);
    sendSuccess(res, data, 'Activity created', 201);
  } catch (err) { next(err); }
};

const updateActivity = async (req, res, next) => {
  try {
    const data = await service.updateActivity(req.params.id, req.body);
    sendSuccess(res, data, 'Activity updated');
  } catch (err) { next(err); }
};

const deactivateActivity = async (req, res, next) => {
  try {
    await service.deactivateActivity(req.params.id);
    sendSuccess(res, null, 'Activity deactivated');
  } catch (err) { next(err); }
};

const deleteActivity = async (req, res, next) => {
  try {
    await service.deleteActivity(req.params.id);
    sendSuccess(res, null, 'Activity permanently deleted');
  } catch (err) { next(err); }
};

// ─── Schedules ────────────────────────────────────────────────────────────────

const addSchedule = async (req, res, next) => {
  try {
    const data = await service.addSchedule(req.params.id, req.body);
    sendSuccess(res, data, 'Schedule added', 201);
  } catch (err) { next(err); }
};

const updateSchedule = async (req, res, next) => {
  try {
    const data = await service.updateSchedule(req.params.id, req.params.sid, req.body);
    sendSuccess(res, data, 'Schedule updated');
  } catch (err) { next(err); }
};

const deleteSchedule = async (req, res, next) => {
  try {
    await service.deleteSchedule(req.params.id, req.params.sid);
    sendSuccess(res, null, 'Schedule deleted');
  } catch (err) { next(err); }
};

// ─── Signups ──────────────────────────────────────────────────────────────────

const listSignups = async (req, res, next) => {
  try {
    const data = await service.listSignupsForActivity(req.params.id);
    sendSuccess(res, data);
  } catch (err) { next(err); }
};

// ─── Discussions ──────────────────────────────────────────────────────────────

const postDiscussion = async (req, res, next) => {
  try {
    const { message } = req.body;
    const data = await service.postDiscussionMessage(
      req.params.id,
      req.admin.id,
      'admin',
      req.admin.name,
      message,
    );
    sendSuccess(res, data, 'Message posted', 201);
  } catch (err) { next(err); }
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
  listSignups,
  postDiscussion,
};
