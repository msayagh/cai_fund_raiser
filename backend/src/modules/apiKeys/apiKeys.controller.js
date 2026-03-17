'use strict';

const service = require('./apiKeys.service');
const { sendSuccess } = require('../../utils/response');

const list = async (req, res, next) => {
  try {
    const data = await service.listApiKeys();
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const data = await service.createApiKey(req.admin.id, req.admin.name, req.body);
    sendSuccess(res, data, 'API key created', 201);
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const data = await service.updateApiKey(req.admin.id, req.admin.name, req.params.id, req.body);
    sendSuccess(res, data, 'API key updated');
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    await service.deleteApiKey(req.admin.id, req.admin.name, req.params.id);
    sendSuccess(res, null, 'API key deleted');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  list,
  create,
  update,
  remove,
};
