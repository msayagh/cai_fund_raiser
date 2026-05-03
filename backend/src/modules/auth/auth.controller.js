'use strict';

const authService = require('./auth.service');
const { sendSuccess } = require('../../utils/response');

const donorSendLoginOtp = async (req, res, next) => {
  try {
    await authService.donorSendLoginOtp(req.body.email);
    sendSuccess(res, null, 'Login code sent to your email address');
  } catch (err) { next(err); }
};

const donorVerifyLoginOtp = async (req, res, next) => {
  try {
    const result = await authService.donorVerifyLoginOtp(req.body.email, req.body.code);
    sendSuccess(res, result, 'Login successful');
  } catch (err) { next(err); }
};

const donorGoogleLogin = async (req, res, next) => {
  try {
    const result = await authService.donorGoogleLogin(req.body.credential);
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

const adminSendLoginOtp = async (req, res, next) => {
  try {
    await authService.adminSendLoginOtp(req.body.email);
    sendSuccess(res, null, 'Login code sent to your email address');
  } catch (err) { next(err); }
};

const adminVerifyLoginOtp = async (req, res, next) => {
  try {
    const result = await authService.adminVerifyLoginOtp(req.body.email, req.body.code);
    sendSuccess(res, result, 'Login successful');
  } catch (err) { next(err); }
};

const adminGoogleLogin = async (req, res, next) => {
  try {
    const result = await authService.adminGoogleLogin(req.body.credential);
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
  donorSendLoginOtp,
  donorVerifyLoginOtp,
  donorGoogleLogin,
  donorSendOtp,
  donorVerifyOtp,
  donorCompleteRegistration,
  adminSetupStatus,
  adminBootstrap,
  adminSendLoginOtp,
  adminVerifyLoginOtp,
  adminGoogleLogin,
  refresh,
  logout,
};
