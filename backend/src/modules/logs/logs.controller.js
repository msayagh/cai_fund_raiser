'use strict';

const { getLogs } = require('./logs.service');
const { sendSuccess } = require('../../utils/response');

const list = async (req, res, next) => {
  try {
    const { donorId, action, dateFrom, dateTo, page, limit } = req.query;
    const result = await getLogs({ donorId, action, dateFrom, dateTo, page, limit });
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
};

module.exports = { list };
