'use strict';

const service = require('./admins.service');
const { sendSuccess } = require('../../utils/response');

const list = async (req, res, next) => {
  try {
    const data = await service.listAdmins();
    sendSuccess(res, data);
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const data = await service.createAdmin(req.admin.id, req.admin.name, req.body);
    sendSuccess(res, data, 'Admin created', 201);
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const data = await service.updateAdmin(req.admin.id, req.admin.name, req.params.id, req.body);
    sendSuccess(res, data, 'Admin updated');
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    await service.deleteAdmin(req.admin.id, req.admin.name, req.params.id);
    sendSuccess(res, null, 'Admin deleted');
  } catch (err) { next(err); }
};

module.exports = { list, create, update, remove };
