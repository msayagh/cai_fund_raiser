/**
 * Google Apps Script for exporting donors + payments as JSON from the backend.
 *
 * Important:
 * - The backend accepts either:
 *   1) x-api-key: <cza_...>
 *   2) Authorization: Bearer <admin JWT>
 * - Store your token in Script Properties instead of hardcoding it
 *
 * Setup:
 * 1. In Apps Script, open Project Settings > Script Properties
 * 2. Add:
 *    API_BASE_URL = http://localhost:3001
 *    API_TOKEN = <your cza_... API key>
 *    ADMIN_BEARER_TOKEN = <optional admin access token fallback>
 *
 * Usage:
 * - Run saveDonorsAndPaymentsJsonToDrive()
 * - Or run logDonorsAndPaymentsJson()
 */

function getConfig_() {
  var props = PropertiesService.getScriptProperties();
  var baseUrl = (props.getProperty('API_BASE_URL') || 'http://localhost:3001').replace(/\/+$/, '');
  var apiToken = props.getProperty('API_TOKEN');
  var adminBearerToken = props.getProperty('ADMIN_BEARER_TOKEN');

  if (!apiToken && !adminBearerToken) {
    throw new Error('Missing API_TOKEN or ADMIN_BEARER_TOKEN in Script Properties.');
  }

  return {
    baseUrl: baseUrl,
    apiToken: apiToken,
    adminBearerToken: adminBearerToken
  };
}

function buildHeaders_(config) {
  var headers = {
    Accept: 'application/json'
  };

  if (config.apiToken) {
    headers['x-api-key'] = config.apiToken;
    return headers;
  }

  headers.Authorization = 'Bearer ' + config.adminBearerToken;
  return headers;
}

function fetchJson_(url, headers) {
  var response = UrlFetchApp.fetch(url, {
    method: 'get',
    headers: headers,
    muteHttpExceptions: true
  });

  var status = response.getResponseCode();
  var text = response.getContentText();
  var payload = text ? JSON.parse(text) : {};

  if (status < 200 || status >= 300 || payload.success === false) {
    var message =
      (payload && payload.error && payload.error.message) ||
      (payload && payload.message) ||
      ('Request failed with HTTP ' + status);
    throw new Error(message);
  }

  return payload.data;
}

function fetchAllDonors_() {
  var config = getConfig_();
  var headers = buildHeaders_(config);
  var allItems = [];
  var page = 1;
  var limit = 100;

  while (true) {
    var url = config.baseUrl + '/api/admin/donors?page=' + page + '&limit=' + limit;
    var data = fetchJson_(url, headers);
    var items = Array.isArray(data.items) ? data.items : [];

    allItems = allItems.concat(items);

    if (items.length < limit) {
      break;
    }

    page += 1;
  }

  return allItems;
}

function fetchPaymentsForDonor_(donorId, headers, baseUrl) {
  return fetchJson_(baseUrl + '/api/admin/donors/' + encodeURIComponent(donorId) + '/payments', headers);
}

function getDonorsAndPaymentsJson() {
  var config = getConfig_();
  var headers = buildHeaders_(config);
  var donors = fetchAllDonors_();

  var result = donors.map(function (donor) {
    var payments = fetchPaymentsForDonor_(donor.id, headers, config.baseUrl);

    return {
      donor: donor,
      payments: payments
    };
  });

  return {
    exportedAt: new Date().toISOString(),
    totalDonors: result.length,
    items: result
  };
}

function logDonorsAndPaymentsJson() {
  var payload = getDonorsAndPaymentsJson();
  Logger.log(JSON.stringify(payload, null, 2));
}

function saveDonorsAndPaymentsJsonToDrive() {
  var payload = getDonorsAndPaymentsJson();
  var fileName = 'donors-payments-export-' + new Date().toISOString().replace(/[:.]/g, '-') + '.json';
  var file = DriveApp.createFile(fileName, JSON.stringify(payload, null, 2), MimeType.PLAIN_TEXT);

  Logger.log('Saved JSON file: ' + file.getName());
  Logger.log('File URL: ' + file.getUrl());
}
