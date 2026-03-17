'use strict';

const { Router } = require('express');
const { requireAdmin } = require('../../middleware/auth');
const { requireCapability } = require('../../middleware/authorization');
const validate = require('../../middleware/validate');
const ctrl = require('./apiKeys.controller');
const { createApiKeySchema, updateApiKeySchema } = require('./apiKeys.schema');

const router = Router();

router.get('/', requireAdmin, requireCapability('admin.apiKeys.view'), ctrl.list);
router.post('/', requireAdmin, requireCapability('admin.apiKeys.create'), validate(createApiKeySchema), ctrl.create);
router.put('/:id', requireAdmin, requireCapability('admin.apiKeys.edit'), validate(updateApiKeySchema), ctrl.update);
router.delete('/:id', requireAdmin, requireCapability('admin.apiKeys.delete'), ctrl.remove);

module.exports = router;
