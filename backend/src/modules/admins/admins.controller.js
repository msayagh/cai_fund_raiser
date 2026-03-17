'use strict';

const service = require('./admins.service');
const { sendSuccess } = require('../../utils/response');
const { getRequestActor } = require('../../utils/requestActor');

const list = async (req, res, next) => {
  try {
    const data = await service.listAdmins();
    sendSuccess(res, data);
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const actor = getRequestActor(req);
    const data = await service.createAdmin(actor.id, actor.name, req.body);
    sendSuccess(res, data, 'Admin created', 201);
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const actor = getRequestActor(req);
    const data = await service.updateAdmin(actor.id, actor.name, req.params.id, req.body);
    sendSuccess(res, data, 'Admin updated');
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    const actor = getRequestActor(req);
    await service.deleteAdmin(actor.id, actor.name, req.params.id);
    sendSuccess(res, null, 'Admin deleted');
  } catch (err) { next(err); }
};

module.exports = { list, create, update, remove };
