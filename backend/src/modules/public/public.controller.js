'use strict';

const { sendSuccess } = require('../../utils/response');
const service = require('./public.service');

const getCampaignSnapshot = async (_req, res, next) => {
  try {
    const data = await service.getCampaignSnapshot();
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getCampaignSnapshot,
};
