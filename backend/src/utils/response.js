'use strict';

/**
 * Sends a consistent success response.
 * @param {import('express').Response} res
 * @param {*} data
 * @param {string} [message]
 * @param {number} [statusCode=200]
 */
const sendSuccess = (res, data, message, statusCode = 200) => {
  const body = { success: true, data };
  if (message) body.message = message;
  return res.status(statusCode).json(body);
};

module.exports = { sendSuccess };
