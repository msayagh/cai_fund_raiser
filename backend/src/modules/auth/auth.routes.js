'use strict';

const { Router } = require('express');
const { authLimiter } = require('../../middleware/rateLimiter');
const validate = require('../../middleware/validate');
const ctrl = require('./auth.controller');
const {
  googleSignInSchema,
  bootstrapAdminSchema,
  sendOtpSchema,
  verifyOtpSchema,
  completeRegistrationSchema,
  refreshSchema,
  logoutSchema,
} = require('./auth.schema');

const router = Router();

// Donor auth (passwordless OTP)
router.post('/donor/login/send-otp', authLimiter, validate(sendOtpSchema), ctrl.donorSendLoginOtp);
router.post('/donor/login/verify-otp', authLimiter, validate(verifyOtpSchema), ctrl.donorVerifyLoginOtp);
router.post('/donor/google', authLimiter, validate(googleSignInSchema), ctrl.donorGoogleLogin);
router.post('/donor/register/send-otp', authLimiter, validate(sendOtpSchema), ctrl.donorSendOtp);
router.post('/donor/register/verify-otp', authLimiter, validate(verifyOtpSchema), ctrl.donorVerifyOtp);
router.post('/donor/register/complete', authLimiter, validate(completeRegistrationSchema), ctrl.donorCompleteRegistration);

// Admin auth (passwordless OTP)
router.get('/admin/setup-status', ctrl.adminSetupStatus);
router.post('/admin/bootstrap', validate(bootstrapAdminSchema), ctrl.adminBootstrap);
router.post('/admin/login/send-otp', authLimiter, validate(sendOtpSchema), ctrl.adminSendLoginOtp);
router.post('/admin/login/verify-otp', authLimiter, validate(verifyOtpSchema), ctrl.adminVerifyLoginOtp);
router.post('/admin/google', authLimiter, validate(googleSignInSchema), ctrl.adminGoogleLogin);

// Token management
router.post('/refresh', validate(refreshSchema), ctrl.refresh);
router.post('/logout', validate(logoutSchema), ctrl.logout);

module.exports = router;
