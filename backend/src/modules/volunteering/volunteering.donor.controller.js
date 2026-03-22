'use strict';

const service = require('./volunteering.service');
const { sendSuccess } = require('../../utils/response');

// ─── Public listing ───────────────────────────────────────────────────────────

const listActivities = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const data = await service.listPublicActivities({ page, limit });
    sendSuccess(res, data);
  } catch (err) { next(err); }
};

const getActivity = async (req, res, next) => {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    const data = await service.getPublicActivity(req.params.id, req.donor.id, { includeInactive });
    sendSuccess(res, data);
  } catch (err) { next(err); }
};

// ─── Signups ──────────────────────────────────────────────────────────────────

const signUp = async (req, res, next) => {
  try {
    const { id: activityId, sid: scheduleId } = req.params;
    const { note } = req.body;
    const data = await service.signUp(activityId, scheduleId, req.donor.id, note);
    sendSuccess(res, data, 'Signed up successfully', 201);
  } catch (err) { next(err); }
};

const cancelSignup = async (req, res, next) => {
  try {
    const { id: activityId, sid: scheduleId } = req.params;
    const data = await service.cancelSignup(activityId, scheduleId, req.donor.id);
    sendSuccess(res, data, 'Signup cancelled');
  } catch (err) { next(err); }
};

const updateSignupNote = async (req, res, next) => {
  try {
    const { id: activityId, sid: scheduleId } = req.params;
    const { note } = req.body;
    const data = await service.updateSignupNote(activityId, scheduleId, req.donor.id, note);
    sendSuccess(res, data, 'Note updated');
  } catch (err) { next(err); }
};

const getMySignups = async (req, res, next) => {
  try {
    const data = await service.getMySignups(req.donor.id);
    sendSuccess(res, data);
  } catch (err) { next(err); }
};

// ─── Discussions ──────────────────────────────────────────────────────────────

const postDiscussion = async (req, res, next) => {
  try {
    const { message } = req.body;
    const data = await service.postDiscussionMessage(
      req.params.id,
      req.donor.id,
      'donor',
      req.donor.name,
      message,
    );
    sendSuccess(res, data, 'Message posted', 201);
  } catch (err) { next(err); }
};

module.exports = {
  listActivities,
  getActivity,
  signUp,
  cancelSignup,
  updateSignupNote,
  getMySignups,
  postDiscussion,
};
