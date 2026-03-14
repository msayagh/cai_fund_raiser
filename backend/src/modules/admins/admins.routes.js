'use strict';

const { Router } = require('express');
const { requireAdmin } = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const ctrl = require('./admins.controller');
const { createAdminSchema, updateAdminSchema } = require('./admins.schema');

const router = Router();

router.get('/', requireAdmin, ctrl.list);
router.post('/', requireAdmin, validate(createAdminSchema), ctrl.create);
router.put('/:id', requireAdmin, validate(updateAdminSchema), ctrl.update);
router.delete('/:id', requireAdmin, ctrl.remove);

module.exports = router;
