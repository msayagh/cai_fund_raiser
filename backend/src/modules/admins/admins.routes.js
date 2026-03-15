'use strict';

const { Router } = require('express');
const { requireAdmin } = require('../../middleware/auth');
const { requireCapability } = require('../../middleware/authorization');
const validate = require('../../middleware/validate');
const ctrl = require('./admins.controller');
const { createAdminSchema, updateAdminSchema } = require('./admins.schema');

const router = Router();

router.get('/', requireAdmin, requireCapability('admin.admins.view'), ctrl.list);
router.post('/', requireAdmin, requireCapability('admin.admins.create'), validate(createAdminSchema), ctrl.create);
router.put('/:id', requireAdmin, requireCapability('admin.admins.edit'), validate(updateAdminSchema), ctrl.update);
router.delete('/:id', requireAdmin, requireCapability('admin.admins.delete'), ctrl.remove);

module.exports = router;
