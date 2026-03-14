'use strict';

const service = require('./requests.service');
const { sendSuccess } = require('../../utils/response');

const list = async (req, res, next) => {
  try {
    const { status, type, page, limit } = req.query;
    const data = await service.listRequests({ status, type, page, limit });
    sendSuccess(res, data);
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const data = await service.getRequestById(req.params.id);
    sendSuccess(res, data);
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    // Attach donorId from authenticated donor if present
    const body = req.donor
      ? { ...req.body, donorId: req.donor.id }
      : req.body;
    const data = await service.createRequest(body);
    sendSuccess(res, data, 'Request submitted', 201);
  } catch (err) { next(err); }
};

const addAttachments = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return sendSuccess(res, [], 'No files uploaded');
    }
    const data = await service.addAttachments(req.params.id, req.files);
    sendSuccess(res, data, `${data.length} file(s) uploaded`, 201);
  } catch (err) { next(err); }
};

const approve = async (req, res, next) => {
  try {
    const data = await service.approveRequest(req.admin.id, req.admin.name, req.params.id, req.body);
    sendSuccess(res, data, 'Request approved');
  } catch (err) { next(err); }
};

const decline = async (req, res, next) => {
  try {
    const data = await service.declineRequest(req.admin.id, req.admin.name, req.params.id);
    sendSuccess(res, data, 'Request declined');
  } catch (err) { next(err); }
};

const hold = async (req, res, next) => {
  try {
    const data = await service.holdRequest(req.admin.id, req.admin.name, req.params.id);
    sendSuccess(res, data, 'Request placed on hold');
  } catch (err) { next(err); }
};

module.exports = { list, getById, create, addAttachments, approve, decline, hold };
