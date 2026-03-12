'use strict';

const { Router } = require('express');
const { requireAdmin } = require('../../middleware/auth');
const { list } = require('./logs.controller');

const router = Router();

router.get('/', requireAdmin, list);

module.exports = router;
