import { apiFetch, setAccessToken, setRefreshToken, clearTokens, getRefreshToken } from './client.js';

const storeTokens = ({ accessToken, refreshToken }) => {
  setAccessToken(accessToken);
  setRefreshToken(refreshToken);
};

export const donorLogin = async (email, password) => {
  const data = await apiFetch('/api/auth/donor/login', {
    method: 'POST', body: JSON.stringify({ email, password }),
  });
  storeTokens(data.tokens);
  return data.donor;
};

export const donorSendOtp = (email) =>
  apiFetch('/api/auth/donor/register/send-otp', { method: 'POST', body: JSON.stringify({ email }) });

export const donorVerifyOtp = (email, code) =>
  apiFetch('/api/auth/donor/register/verify-otp', { method: 'POST', body: JSON.stringify({ email, code }) });

export const donorCompleteRegistration = async ({ email, name, password, pledge }) => {
  const data = await apiFetch('/api/auth/donor/register/complete', {
    method: 'POST',
    body: JSON.stringify({ email, name, password, ...(pledge ? { pledge } : {}) }),
  });
  storeTokens(data.tokens);
  return data.donor;
};

export const donorForgotSendOtp = (email) =>
  apiFetch('/api/auth/donor/forgot/send-otp', { method: 'POST', body: JSON.stringify({ email }) });

export const donorForgotVerifyOtp = (email, code) =>
  apiFetch('/api/auth/donor/forgot/verify-otp', { method: 'POST', body: JSON.stringify({ email, code }) });

export const donorForgotReset = (email, newPassword) =>
  apiFetch('/api/auth/donor/forgot/reset', { method: 'POST', body: JSON.stringify({ email, newPassword }) });

export const adminLogin = async (email, password) => {
  const data = await apiFetch('/api/auth/admin/login', {
    method: 'POST', body: JSON.stringify({ email, password }),
  });
  storeTokens(data.tokens);
  return data.admin;
};

export const getAdminSetupStatus = () => apiFetch('/api/auth/admin/setup-status');

export const bootstrapAdmin = async ({ name, email, password }) => {
  const data = await apiFetch('/api/auth/admin/bootstrap', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });
  storeTokens(data.tokens);
  return data.admin;
};

export const logout = async () => {
  const rt = getRefreshToken();
  if (rt) {
    try { await apiFetch('/api/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken: rt }) }); }
    catch { /* ignore */ }
  }
  clearTokens();
};
