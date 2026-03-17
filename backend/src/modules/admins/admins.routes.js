'use strict';

const { Router } = require('express');
const { requireAdminOrApiKey } = require('../../middleware/auth');
const { requireCapability } = require('../../middleware/authorization');
const validate = require('../../middleware/validate');
const ctrl = require('./admins.controller');
const { createAdminSchema, updateAdminSchema } = require('./admins.schema');

const router = Router();

router.get('/', requireAdminOrApiKey, requireCapability('admin.admins.view'), ctrl.list);
router.post('/', requireAdminOrApiKey, requireCapability('admin.admins.create'), validate(createAdminSchema), ctrl.create);
router.put('/:id', requireAdminOrApiKey, requireCapability('admin.admins.edit'), validate(updateAdminSchema), ctrl.update);
router.delete('/:id', requireAdminOrApiKey, requireCapability('admin.admins.delete'), ctrl.remove);

module.exports = router;
