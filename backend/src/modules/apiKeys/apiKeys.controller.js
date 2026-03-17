'use strict';

const service = require('./apiKeys.service');
const { sendSuccess } = require('../../utils/response');
const { getRequestActor } = require('../../utils/requestActor');

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
    const actor = getRequestActor(req);
    const data = await service.createApiKey(actor.id, actor.name, req.body);
    sendSuccess(res, data, 'API key created', 201);
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const actor = getRequestActor(req);
    const data = await service.updateApiKey(actor.id, actor.name, req.params.id, req.body);
    sendSuccess(res, data, 'API key updated');
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    const actor = getRequestActor(req);
    await service.deleteApiKey(actor.id, actor.name, req.params.id);
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
