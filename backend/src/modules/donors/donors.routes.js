'use strict';

const { Router } = require('express');
const { requireDonor, requireAdminOrApiKey } = require('../../middleware/auth');
const { requireCapability } = require('../../middleware/authorization');
const validate = require('../../middleware/validate');
const ctrl = require('./donors.controller');
const {
  updateProfileSchema,
  updatePasswordSchema,
  createEngagementSchema,
  updateEngagementSchema,
  upsertDonorPaymentSchema,
} = require('./donors.schema');
const { z } = require('zod');
const multer = require('multer');

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
  method: z.enum(['cash', 'card', 'zeffy']),
  note: z.string().max(500).optional(),
});

const adminUpdatePaymentSchema = z.object({
  amount: z.number().positive().optional(),
  date: z.string().refine((val) => /^\d{4}-\d{2}-\d{2}$/.test(val), 'Date must be in YYYY-MM-DD format').optional(),
  method: z.enum(['cash', 'card', 'zeffy']).optional(),
  note: z.string().max(500).nullable().optional(),
}).refine((data) => data.amount !== undefined || data.date !== undefined || data.method !== undefined || data.note !== undefined, {
  message: 'At least one field is required',
});

const adminCreateDonorSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  accountCreated: z.boolean().optional(),
  password: z.string().min(8).optional(),
  pledgeAmount: z.number().positive().optional(),
});

const adminUpdateDonorSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  accountCreated: z.boolean().optional(),
}).refine((d) => d.name !== undefined || d.email !== undefined || d.accountCreated !== undefined, {
  message: 'At least one field required',
});

const adminEngagementSchema = z.object({
  totalPledge: z.number().positive('Pledge must be greater than 0'),
  startDate: z.string().datetime({ offset: true }).optional(),
  endDate: z.string().datetime({ offset: true }).optional(),
});

const adminDonorRouter = Router();
const csvUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedMimes = ['text/csv', 'application/csv', 'application/vnd.ms-excel', 'text/plain'];
    const isCsvName = String(file.originalname || '').toLowerCase().endsWith('.csv');
    if (allowedMimes.includes(file.mimetype) || isCsvName) {
      cb(null, true);
      return;
    }
    cb(new Error('Only CSV files are allowed'));
  },
});

adminDonorRouter.get('/', requireAdminOrApiKey, requireCapability('admin.donors.view'), ctrl.list);
adminDonorRouter.post('/bulk/upload', requireAdminOrApiKey, requireCapability('admin.donors.create'), csvUpload.single('file'), ctrl.adminImportPaymentsCsv);
adminDonorRouter.post('/bulk/import', requireAdminOrApiKey, requireCapability('admin.donors.create'), csvUpload.single('file'), ctrl.adminImportPaymentsCsv);
adminDonorRouter.post('/import/csv', requireAdminOrApiKey, requireCapability('admin.donors.create'), csvUpload.single('file'), ctrl.adminImportPaymentsCsv);
adminDonorRouter.post('/upsert-payment', requireAdminOrApiKey, requireCapability('admin.donors.create'), validate(upsertDonorPaymentSchema), ctrl.adminUpsertDonorPayment);
adminDonorRouter.post('/', requireAdminOrApiKey, requireCapability('admin.donors.create'), validate(adminCreateDonorSchema), ctrl.adminCreate);
adminDonorRouter.get('/:id', requireAdminOrApiKey, requireCapability('admin.donors.view'), ctrl.getById);
adminDonorRouter.get('/:id/payments', requireAdminOrApiKey, requireCapability('admin.donors.view'), ctrl.adminGetPayments);
adminDonorRouter.get('/:id/payments/:paymentId/confirmation', requireAdminOrApiKey, requireCapability('admin.donors.view'), ctrl.adminGetPaymentConfirmation);
adminDonorRouter.put('/:id/engagement', requireAdminOrApiKey, requireCapability('admin.donors.edit'), validate(adminEngagementSchema), ctrl.adminSetEngagement);
adminDonorRouter.put('/:id/deactivate', requireAdminOrApiKey, requireCapability('admin.donors.deactivate'), ctrl.adminDeactivate);
adminDonorRouter.put('/:id/reactivate', requireAdminOrApiKey, requireCapability('admin.donors.deactivate'), ctrl.adminReactivate);
adminDonorRouter.put('/:id/password', requireAdminOrApiKey, requireCapability('admin.donors.edit'), validate(adminDonorPasswordSchema), ctrl.adminUpdatePassword);
adminDonorRouter.put('/:id', requireAdminOrApiKey, requireCapability('admin.donors.edit'), validate(adminUpdateDonorSchema), ctrl.adminUpdate);
adminDonorRouter.delete('/:id', requireAdminOrApiKey, requireCapability('admin.donors.delete'), ctrl.adminDelete);
adminDonorRouter.post('/:id/payments', requireAdminOrApiKey, requireCapability('admin.donors.edit'), validate(adminPaymentSchema), ctrl.adminAddPayment);
adminDonorRouter.put('/:id/payments/:paymentId', requireAdminOrApiKey, requireCapability('admin.donors.edit'), validate(adminUpdatePaymentSchema), ctrl.adminUpdatePayment);
adminDonorRouter.delete('/:id/payments/:paymentId', requireAdminOrApiKey, requireCapability('admin.donors.edit'), ctrl.adminDeletePayment);
adminDonorRouter.post('/:id/payments/:paymentId/receipt', requireAdminOrApiKey, requireCapability('admin.donors.edit'), ctrl.uploadPaymentReceipt);

module.exports.adminDonorRouter = adminDonorRouter;
