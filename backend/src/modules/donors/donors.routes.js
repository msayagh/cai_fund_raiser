'use strict';

const { Router } = require('express');
const { requireDonor, requireAdmin } = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const ctrl = require('./donors.controller');
const {
  updateProfileSchema,
  updatePasswordSchema,
  createEngagementSchema,
  updateEngagementSchema,
} = require('./donors.schema');
const { z } = require('zod');

const router = Router();

// ─── Donor self-service (/api/donors) ─────────────────────────────────────────
router.get('/me', requireDonor, ctrl.getMe);
router.put('/me', requireDonor, validate(updateProfileSchema), ctrl.updateMe);
router.put('/me/password', requireDonor, validate(updatePasswordSchema), ctrl.updateMyPassword);
router.get('/me/engagement', requireDonor, ctrl.getMyEngagement);
router.post('/me/engagement', requireDonor, validate(createEngagementSchema), ctrl.createEngagement);
router.put('/me/engagement', requireDonor, validate(updateEngagementSchema), ctrl.updateEngagement);
router.get('/me/payments', requireDonor, ctrl.getMyPayments);
router.get('/me/requests', requireDonor, ctrl.getMyRequests);

module.exports = router;

// ─── Admin donor routes (mounted separately at /api/admin/donors) ──────────────
const adminDonorPasswordSchema = z.object({
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

const adminPaymentSchema = z.object({
  amount: z.number().positive(),
  date: z.string().refine((val) => /^\d{4}-\d{2}-\d{2}$/.test(val), 'Date must be in YYYY-MM-DD format'),
  method: z.enum(['card', 'bank_transfer', 'cash', 'check']),
  note: z.string().max(500).optional(),
});

const adminCreateDonorSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8),
  pledgeAmount: z.number().positive().optional(),
});

const adminUpdateDonorSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
}).refine((d) => d.name || d.email, { message: 'At least one field required' });

const adminEngagementSchema = z.object({
  totalPledge: z.number().positive('Pledge must be greater than 0'),
  startDate: z.string().datetime({ offset: true }).optional(),
  endDate: z.string().datetime({ offset: true }).optional(),
});

const adminDonorRouter = Router();

adminDonorRouter.get('/', requireAdmin, ctrl.list);
adminDonorRouter.post('/', requireAdmin, validate(adminCreateDonorSchema), ctrl.adminCreate);
adminDonorRouter.get('/:id', requireAdmin, ctrl.getById);
adminDonorRouter.get('/:id/payments', requireAdmin, ctrl.adminGetPayments);
adminDonorRouter.get('/:id/payments/:paymentId/confirmation', requireAdmin, ctrl.adminGetPaymentConfirmation);
adminDonorRouter.put('/:id/engagement', requireAdmin, validate(adminEngagementSchema), ctrl.adminSetEngagement);
adminDonorRouter.put('/:id/deactivate', requireAdmin, ctrl.adminDeactivate);
adminDonorRouter.put('/:id/reactivate', requireAdmin, ctrl.adminReactivate);
adminDonorRouter.put('/:id/password', requireAdmin, validate(adminDonorPasswordSchema), ctrl.adminUpdatePassword);
adminDonorRouter.put('/:id', requireAdmin, validate(adminUpdateDonorSchema), ctrl.adminUpdate);
adminDonorRouter.delete('/:id', requireAdmin, ctrl.adminDelete);
adminDonorRouter.post('/:id/payments', requireAdmin, validate(adminPaymentSchema), ctrl.adminAddPayment);
adminDonorRouter.post('/:id/payments/:paymentId/receipt', requireAdmin, ctrl.uploadPaymentReceipt);

module.exports.adminDonorRouter = adminDonorRouter;
