'use strict';

const { sendSuccess } = require('../../utils/response');
const service = require('./logs.service');

const list = async (req, res, next) => {
  try {
    const data = await service.listLogs(req.query);
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  list,
};
