'use strict';

const service = require('./donors.service');
const { sendSuccess } = require('../../utils/response');

// ─── Self-service ─────────────────────────────────────────────────────────────

const getMe = async (req, res, next) => {
  try {
    const data = await service.getMe(req.donor.id);
    sendSuccess(res, data);
  } catch (err) { next(err); }
};

const updateMe = async (req, res, next) => {
  try {
    const data = await service.updateMe(req.donor.id, req.body);
    sendSuccess(res, data, 'Profile updated');
  } catch (err) { next(err); }
};

const updateMyPassword = async (req, res, next) => {
  try {
    await service.updateMyPassword(req.donor.id, req.body);
    sendSuccess(res, null, 'Password updated');
  } catch (err) { next(err); }
};

const getMyEngagement = async (req, res, next) => {
  try {
    const data = await service.getMyEngagement(req.donor.id);
    sendSuccess(res, data);
  } catch (err) { next(err); }
};

const createEngagement = async (req, res, next) => {
  try {
    const data = await service.createEngagement(req.donor.id, req.body);
    sendSuccess(res, data, 'Engagement created', 201);
  } catch (err) { next(err); }
};

const updateEngagement = async (req, res, next) => {
  try {
    const data = await service.updateEngagement(req.donor.id, req.body);
    sendSuccess(res, data, 'Engagement updated');
  } catch (err) { next(err); }
};

const getMyPayments = async (req, res, next) => {
  try {
    const data = await service.getMyPayments(req.donor.id);
    sendSuccess(res, data);
  } catch (err) { next(err); }
};

const getMyRequests = async (req, res, next) => {
  try {
    const data = await service.getMyRequests(req.donor.id);
    sendSuccess(res, data);
  } catch (err) { next(err); }
};

// ─── Admin ────────────────────────────────────────────────────────────────────

const list = async (req, res, next) => {
  try {
    const { search, sortBy, sortDir, page, limit } = req.query;
    const data = await service.listDonors({ search, sortBy, sortDir, page, limit });
    sendSuccess(res, data);
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const data = await service.getDonorById(req.params.id);
    sendSuccess(res, data);
  } catch (err) { next(err); }
};

const adminUpdate = async (req, res, next) => {
  try {
    const data = await service.adminUpdateDonor(req.admin.id, req.admin.name, req.params.id, req.body);
    sendSuccess(res, data, 'Donor updated');
  } catch (err) { next(err); }
};

const adminDelete = async (req, res, next) => {
  try {
    await service.adminDeleteDonor(req.admin.id, req.admin.name, req.params.id);
    sendSuccess(res, null, 'Donor deleted');
  } catch (err) { next(err); }
};

const adminUpdatePassword = async (req, res, next) => {
  try {
    const { newPassword } = req.body;
    await service.adminUpdateDonorPassword(req.admin.id, req.admin.name, req.params.id, newPassword);
    sendSuccess(res, null, 'Password updated');
  } catch (err) { next(err); }
};

const adminAddPayment = async (req, res, next) => {
  try {
    const data = await service.adminAddPayment(req.admin.id, req.admin.name, req.params.id, req.body);
    sendSuccess(res, data, 'Payment recorded', 201);
  } catch (err) { next(err); }
};

const adminUpdatePayment = async (req, res, next) => {
  try {
    const data = await service.adminUpdatePayment(req.admin.id, req.admin.name, req.params.id, req.params.paymentId, req.body);
    sendSuccess(res, data, 'Payment updated');
  } catch (err) { next(err); }
};

const adminDeletePayment = async (req, res, next) => {
  try {
    await service.adminDeletePayment(req.admin.id, req.admin.name, req.params.id, req.params.paymentId);
    sendSuccess(res, null, 'Payment deleted');
  } catch (err) { next(err); }
};

const adminGetPayments = async (req, res, next) => {
  try {
    const data = await service.adminGetDonorPayments(req.params.id);
    sendSuccess(res, data);
  } catch (err) { next(err); }
};

const adminCreate = async (req, res, next) => {
  try {
    const data = await service.adminCreateDonor(req.admin.id, req.admin.name, req.body);
    sendSuccess(res, data, 'Donor created', 201);
  } catch (err) { next(err); }
};

const adminDeactivate = async (req, res, next) => {
  try {
    const data = await service.adminUpdateDonor(req.admin.id, req.admin.name, req.params.id, { isActive: false });
    sendSuccess(res, data, 'Donor deactivated');
  } catch (err) { next(err); }
};

const adminReactivate = async (req, res, next) => {
  try {
    const data = await service.adminUpdateDonor(req.admin.id, req.admin.name, req.params.id, { isActive: true });
    sendSuccess(res, data, 'Donor reactivated');
  } catch (err) { next(err); }
};

const adminSetEngagement = async (req, res, next) => {
  try {
    const data = await service.adminSetEngagement(req.admin.id, req.admin.name, req.params.id, req.body);
    sendSuccess(res, data, 'Engagement set', 201);
  } catch (err) { next(err); }
};

const adminGetPaymentConfirmation = async (req, res, next) => {
  try {
    const stream = await service.generatePaymentConfirmation(req.params.id, req.params.paymentId, req.admin.id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="payment-confirmation-${req.params.paymentId}.pdf"`);
    stream.pipe(res);
  } catch (err) { next(err); }
};

const uploadPaymentReceipt = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file provided' });
    }
    const data = await service.uploadPaymentReceipt(req.admin.id, req.admin.name, req.params.id, req.params.paymentId, req.file);
    sendSuccess(res, data, 'Receipt uploaded', 200);
  } catch (err) { next(err); }
};

const downloadPaymentConfirmation = async (req, res, next) => {
  try {
    await service.downloadPaymentConfirmation(req.params.id, req.params.paymentId, res);
  } catch (err) { next(err); }
};

module.exports = {
  getMe, updateMe, updateMyPassword,
  getMyEngagement, createEngagement, updateEngagement,
  getMyPayments, getMyRequests,
  list, getById, adminUpdate, adminDelete, adminUpdatePassword, adminGetPayments, adminAddPayment, adminUpdatePayment, adminDeletePayment, adminCreate, adminDeactivate, adminReactivate, adminSetEngagement, adminGetPaymentConfirmation, uploadPaymentReceipt, downloadPaymentConfirmation,
};
