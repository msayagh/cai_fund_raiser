'use strict';

const { Router } = require('express');
const { requireAdmin } = require('../../middleware/auth');
const { requireCapability } = require('../../middleware/authorization');
const ctrl = require('./logs.controller');

const router = Router();

router.get('/', requireAdmin, requireCapability('admin.logs.view'), ctrl.list);

module.exports = router;
