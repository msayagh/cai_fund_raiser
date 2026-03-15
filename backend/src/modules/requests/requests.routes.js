'use strict';

const { Router } = require('express');
const { requireAdmin, requireDonor } = require('../../middleware/auth');
const { requireCapability } = require('../../middleware/authorization');
const validate = require('../../middleware/validate');
const upload = require('../../middleware/upload');
const ctrl = require('./requests.controller');
const { createRequestSchema } = require('./requests.schema');

// ─── Public + donor routes (/api/requests) ────────────────────────────────────
const publicRouter = Router();

// Optionally authenticate donor for context, but don't require it
const optionalDonor = (req, res, next) => {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) {
    return requireDonor(req, res, (err) => {
      // Ignore auth errors — treat as unauthenticated
      if (err) req.donor = null;
      next();
    });
  }
  next();
};

publicRouter.post('/', optionalDonor, validate(createRequestSchema), ctrl.create);
publicRouter.post('/:id/attachments', upload.array('files', 5), ctrl.addAttachments);

// ─── Admin routes (/api/admin/requests) ───────────────────────────────────────
const adminRequestRouter = Router();

adminRequestRouter.get('/', requireAdmin, requireCapability('admin.requests.view'), ctrl.list);
adminRequestRouter.get('/:id', requireAdmin, requireCapability('admin.requests.view'), ctrl.getById);
adminRequestRouter.put('/:id/approve', requireAdmin, requireCapability('admin.requests.approve'), ctrl.approve);
adminRequestRouter.put('/:id/decline', requireAdmin, requireCapability('admin.requests.reject'), ctrl.decline);
adminRequestRouter.put('/:id/hold', requireAdmin, requireCapability('admin.requests.view'), ctrl.hold);

module.exports = publicRouter;
module.exports.adminRequestRouter = adminRequestRouter;
