'use strict';

const { Router } = require('express');
const { requireAdmin } = require('../../middleware/auth');
const featureFlag = require('../../middleware/featureFlag');
const validate = require('../../middleware/validate');
const ctrl = require('./volunteering.admin.controller');
const {
  createActivitySchema,
  updateActivitySchema,
  addScheduleSchema,
  updateScheduleSchema,
  postDiscussionSchema,
} = require('./volunteering.schema');

const router = Router();

// All routes in this file require the feature to be enabled
router.use(featureFlag('VOLUNTEERING'));
router.use(requireAdmin);

// Activities
router.get('/activities', ctrl.listActivities);
router.post('/activities', validate(createActivitySchema), ctrl.createActivity);
router.get('/activities/:id', ctrl.getActivity);
router.patch('/activities/:id', validate(updateActivitySchema), ctrl.updateActivity);
router.delete('/activities/:id', ctrl.deleteActivity);

// Schedules
router.post('/activities/:id/schedules', validate(addScheduleSchema), ctrl.addSchedule);
router.patch('/activities/:id/schedules/:sid', validate(updateScheduleSchema), ctrl.updateSchedule);
router.delete('/activities/:id/schedules/:sid', ctrl.deleteSchedule);

// Signups
router.get('/activities/:id/signups', ctrl.listSignups);
router.post('/activities/:id/schedules/:sid/signups', ctrl.preAssignVolunteer);
router.delete('/activities/:id/schedules/:sid/signups/:signupId', ctrl.removeSignup);

// Discussions
router.post('/activities/:id/discussions', validate(postDiscussionSchema), ctrl.postDiscussion);

module.exports = router;
