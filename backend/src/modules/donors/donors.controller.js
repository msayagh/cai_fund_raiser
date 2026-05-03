'use strict';

const service = require('./donors.service');
const { sendSuccess } = require('../../utils/response');
const { getRequestActor } = require('../../utils/requestActor');

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
    const actor = getRequestActor(req);
    const data = await service.adminUpdateDonor(actor.id, actor.name, req.params.id, req.body);
    sendSuccess(res, data, 'Donor updated');
  } catch (err) { next(err); }
};

const adminDelete = async (req, res, next) => {
  try {
    const actor = getRequestActor(req);
    await service.adminDeleteDonor(actor.id, actor.name, req.params.id);
    sendSuccess(res, null, 'Donor deleted');
  } catch (err) { next(err); }
};

const adminAddPayment = async (req, res, next) => {
  try {
    const actor = getRequestActor(req);
    const data = await service.adminAddPayment(actor.id, actor.name, req.params.id, req.body);
    sendSuccess(res, data, 'Payment recorded', 201);
  } catch (err) { next(err); }
};

const adminUpdatePayment = async (req, res, next) => {
  try {
    const actor = getRequestActor(req);
    const data = await service.adminUpdatePayment(actor.id, actor.name, req.params.id, req.params.paymentId, req.body);
    sendSuccess(res, data, 'Payment updated');
  } catch (err) { next(err); }
};

const adminDeletePayment = async (req, res, next) => {
  try {
    const actor = getRequestActor(req);
    await service.adminDeletePayment(actor.id, actor.name, req.params.id, req.params.paymentId);
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
    const actor = getRequestActor(req);
    const data = await service.adminCreateDonor(actor.id, actor.name, req.body);
    sendSuccess(res, data, 'Donor created', 201);
  } catch (err) { next(err); }
};

const adminDeactivate = async (req, res, next) => {
  try {
    const actor = getRequestActor(req);
    const data = await service.adminUpdateDonor(actor.id, actor.name, req.params.id, { isActive: false });
    sendSuccess(res, data, 'Donor deactivated');
  } catch (err) { next(err); }
};

const adminReactivate = async (req, res, next) => {
  try {
    const actor = getRequestActor(req);
    const data = await service.adminUpdateDonor(actor.id, actor.name, req.params.id, { isActive: true });
    sendSuccess(res, data, 'Donor reactivated');
  } catch (err) { next(err); }
};

const adminSetEngagement = async (req, res, next) => {
  try {
    const actor = getRequestActor(req);
    const data = await service.adminSetEngagement(actor.id, actor.name, req.params.id, req.body);
    sendSuccess(res, data, 'Engagement set', 201);
  } catch (err) { next(err); }
};

const adminGetPaymentConfirmation = async (req, res, next) => {
  try {
    const actor = getRequestActor(req);
    const stream = await service.generatePaymentConfirmation(req.params.id, req.params.paymentId, actor.id);
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
    const actor = getRequestActor(req);
    const data = await service.uploadPaymentReceipt(actor.id, actor.name, req.params.id, req.params.paymentId, req.file);
    sendSuccess(res, data, 'Receipt uploaded', 200);
  } catch (err) { next(err); }
};

const adminImportPaymentsCsv = async (req, res, next) => {
  try {
    if (!req.file?.buffer) {
      return res.status(400).json({ success: false, message: 'No CSV file provided' });
    }
    const actor = getRequestActor(req);
    const data = await service.adminImportPaymentsCsv(actor.id, actor.name, req.file.buffer);
    sendSuccess(res, data, 'CSV payments import completed', 200);
  } catch (err) { next(err); }
};

const adminUpsertDonorPayment = async (req, res, next) => {
  try {
    const actor = getRequestActor(req);
    const data = await service.adminUpsertDonorPayment(actor.id, actor.name, req.body);
    sendSuccess(res, data, data.donorCreated ? 'Donor created and payment recorded' : 'Payment recorded for existing donor', data.donorCreated ? 201 : 200);
  } catch (err) { next(err); }
};

const downloadPaymentConfirmation = async (req, res, next) => {
  try {
    await service.downloadPaymentConfirmation(req.params.id, req.params.paymentId, res);
  } catch (err) { next(err); }
};

module.exports = {
  getMe, updateMe,
  getMyEngagement, createEngagement, updateEngagement,
  getMyPayments, getMyRequests,
  list, getById, adminUpdate, adminDelete, adminGetPayments, adminAddPayment, adminUpdatePayment, adminDeletePayment, adminCreate, adminDeactivate, adminReactivate, adminSetEngagement, adminGetPaymentConfirmation, uploadPaymentReceipt, downloadPaymentConfirmation,
  adminImportPaymentsCsv, adminUpsertDonorPayment,
};
