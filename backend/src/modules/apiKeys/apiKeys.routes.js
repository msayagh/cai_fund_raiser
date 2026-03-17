'use strict';

const { Router } = require('express');
const { requireAdminOrApiKey } = require('../../middleware/auth');
const { requireCapability } = require('../../middleware/authorization');
const validate = require('../../middleware/validate');
const ctrl = require('./apiKeys.controller');
const { createApiKeySchema, updateApiKeySchema } = require('./apiKeys.schema');

const router = Router();

router.get('/', requireAdminOrApiKey, requireCapability('admin.apiKeys.view'), ctrl.list);
router.post('/', requireAdminOrApiKey, requireCapability('admin.apiKeys.create'), validate(createApiKeySchema), ctrl.create);
router.put('/:id', requireAdminOrApiKey, requireCapability('admin.apiKeys.edit'), validate(updateApiKeySchema), ctrl.update);
router.delete('/:id', requireAdminOrApiKey, requireCapability('admin.apiKeys.delete'), ctrl.remove);

module.exports = router;
