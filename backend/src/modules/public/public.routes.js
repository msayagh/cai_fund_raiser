'use strict';

const { Router } = require('express');
const ctrl = require('./public.controller');

const router = Router();

router.get('/campaign', ctrl.getCampaignSnapshot);

module.exports = router;
