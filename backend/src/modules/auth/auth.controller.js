'use strict';

const authService = require('./auth.service');
const { sendSuccess } = require('../../utils/response');

const donorLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.donorLogin(email, password);
    sendSuccess(res, result, 'Login successful');
  } catch (err) { next(err); }
};

const donorSendOtp = async (req, res, next) => {
  try {
    await authService.donorSendOtp(req.body.email);
    sendSuccess(res, null, 'OTP sent to your email address');
  } catch (err) { next(err); }
};

const donorVerifyOtp = async (req, res, next) => {
  try {
    const result = await authService.donorVerifyOtp(req.body.email, req.body.code);
    sendSuccess(res, result, 'Email verified');
  } catch (err) { next(err); }
};

const donorCompleteRegistration = async (req, res, next) => {
  try {
    const result = await authService.donorCompleteRegistration(req.body);
    sendSuccess(res, result, 'Registration complete', 201);
  } catch (err) { next(err); }
};

const donorSendForgotOtp = async (req, res, next) => {
  try {
    await authService.donorSendForgotOtp(req.body.email);
    // Always return same message to prevent user enumeration
    sendSuccess(res, null, 'If an account exists, a reset code has been sent');
  } catch (err) { next(err); }
};

const donorVerifyForgotOtp = async (req, res, next) => {
  try {
    const result = await authService.donorVerifyForgotOtp(req.body.email, req.body.code);
    sendSuccess(res, result, 'Code verified');
  } catch (err) { next(err); }
};

const donorResetPassword = async (req, res, next) => {
  try {
    const { email, code, newPassword } = req.body;
    await authService.donorResetPassword(email, code, newPassword);
    sendSuccess(res, null, 'Password reset successfully');
  } catch (err) { next(err); }
};

const adminLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.adminLogin(email, password);
    sendSuccess(res, result, 'Login successful');
  } catch (err) { next(err); }
};

const adminSetupStatus = async (_req, res, next) => {
  try {
    const result = await authService.getAdminSetupStatus();
    sendSuccess(res, result);
  } catch (err) { next(err); }
};

const adminBootstrap = async (req, res, next) => {
  try {
    const result = await authService.bootstrapInitialAdmin(req.body);
    sendSuccess(res, result, 'Initial admin created', 201);
  } catch (err) { next(err); }
};

const refresh = async (req, res, next) => {
  try {
    const tokens = await authService.refreshTokens(req.body.refreshToken);
    sendSuccess(res, tokens, 'Tokens refreshed');
  } catch (err) { next(err); }
};

const logout = async (req, res, next) => {
  try {
    await authService.logout(req.body.refreshToken);
    sendSuccess(res, null, 'Logged out successfully');
  } catch (err) { next(err); }
};

module.exports = {
  donorLogin,
  donorSendOtp,
  donorVerifyOtp,
  donorCompleteRegistration,
  donorSendForgotOtp,
  donorVerifyForgotOtp,
  donorResetPassword,
  adminSetupStatus,
  adminBootstrap,
  adminLogin,
  refresh,
  logout,
};
