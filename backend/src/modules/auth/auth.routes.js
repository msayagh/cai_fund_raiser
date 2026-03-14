'use strict';

const { Router } = require('express');
const { authLimiter } = require('../../middleware/rateLimiter');
const validate = require('../../middleware/validate');
const ctrl = require('./auth.controller');
const {
  loginSchema,
  googleSignInSchema,
  bootstrapAdminSchema,
  sendOtpSchema,
  verifyOtpSchema,
  completeRegistrationSchema,
  resetPasswordSchema,
  refreshSchema,
  logoutSchema,
} = require('./auth.schema');

const router = Router();

// Donor auth
router.post('/donor/login', authLimiter, validate(loginSchema), ctrl.donorLogin);
router.post('/donor/google', authLimiter, validate(googleSignInSchema), ctrl.donorGoogleLogin);
router.post('/donor/register/send-otp', authLimiter, validate(sendOtpSchema), ctrl.donorSendOtp);
router.post('/donor/register/verify-otp', authLimiter, validate(verifyOtpSchema), ctrl.donorVerifyOtp);
router.post('/donor/register/complete', authLimiter, validate(completeRegistrationSchema), ctrl.donorCompleteRegistration);
router.post('/donor/forgot/send-otp', authLimiter, validate(sendOtpSchema), ctrl.donorSendForgotOtp);
router.post('/donor/forgot/verify-otp', authLimiter, validate(verifyOtpSchema), ctrl.donorVerifyForgotOtp);
router.post('/donor/forgot/reset', authLimiter, validate(resetPasswordSchema), ctrl.donorResetPassword);

// Admin auth
router.get('/admin/setup-status', ctrl.adminSetupStatus);
router.post('/admin/bootstrap', validate(bootstrapAdminSchema), ctrl.adminBootstrap);
router.post('/admin/login', authLimiter, validate(loginSchema), ctrl.adminLogin);
router.post('/admin/google', authLimiter, validate(googleSignInSchema), ctrl.adminGoogleLogin);
router.post('/admin/forgot/send-otp', authLimiter, validate(sendOtpSchema), ctrl.adminSendForgotOtp);
router.post('/admin/forgot/verify-otp', authLimiter, validate(verifyOtpSchema), ctrl.adminVerifyForgotOtp);
router.post('/admin/forgot/reset', authLimiter, validate(resetPasswordSchema), ctrl.adminResetPassword);

// Token management
router.post('/refresh', validate(refreshSchema), ctrl.refresh);
router.post('/logout', validate(logoutSchema), ctrl.logout);

module.exports = router;
