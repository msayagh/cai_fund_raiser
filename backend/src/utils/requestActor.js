'use strict';

const getRequestActor = (req) => ({
  id: req.admin?.id ?? req.apiKey?.createdByAdminId ?? null,
  name: req.admin?.name || req.apiKey?.createdByAdmin?.name || `API Key: ${req.apiKey?.title || 'Unknown'}`,
  email: req.admin?.email ?? req.apiKey?.createdByAdmin?.email ?? null,
  isApiKey: Boolean(req.apiKey),
});

module.exports = { getRequestActor };
