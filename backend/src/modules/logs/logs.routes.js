'use strict';

const { Router } = require('express');
const { requireAdminOrApiKey } = require('../../middleware/auth');
const { requireCapability } = require('../../middleware/authorization');
const ctrl = require('./logs.controller');

const router = Router();

router.get('/', requireAdminOrApiKey, requireCapability('admin.logs.view'), ctrl.list);

module.exports = router;
