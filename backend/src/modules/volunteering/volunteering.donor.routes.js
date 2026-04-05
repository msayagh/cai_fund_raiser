'use strict';

const { Router } = require('express');
const { requireDonor } = require('../../middleware/auth');
const featureFlag = require('../../middleware/featureFlag');
const validate = require('../../middleware/validate');
const ctrl = require('./volunteering.donor.controller');
const { postDiscussionSchema, signupNoteSchema } = require('./volunteering.schema');

const router = Router();

// All routes in this file require the feature to be enabled
router.use(featureFlag('VOLUNTEERING'));
router.use(requireDonor);

// Browsing
router.get('/activities', ctrl.listActivities);
router.get('/activities/:id', ctrl.getActivity);

// Signups
router.get('/my-signups', ctrl.getMySignups);
router.post('/activities/:id/schedules/:sid/signup', validate(signupNoteSchema), ctrl.signUp);
router.delete('/activities/:id/schedules/:sid/signup', ctrl.cancelSignup);
router.patch('/activities/:id/schedules/:sid/signup', validate(signupNoteSchema), ctrl.updateSignupNote);

// Discussions
router.post('/activities/:id/discussions', validate(postDiscussionSchema), ctrl.postDiscussion);

// Checklist check / uncheck
router.post('/activities/:id/schedules/:sid/checklist/:itemId/check', ctrl.checkItem);
router.delete('/activities/:id/schedules/:sid/checklist/:itemId/check', ctrl.uncheckItem);

module.exports = router;
