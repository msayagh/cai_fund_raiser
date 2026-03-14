'use strict';

const { Router } = require('express');
const { requireAdmin } = require('../../middleware/auth');
const ctrl = require('./logs.controller');

const router = Router();

router.get('/', requireAdmin, ctrl.list);

module.exports = router;
