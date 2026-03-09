import { apiFetch } from './client.js';

export const getStats = () => apiFetch('/api/admin/stats');

export const listDonors = (params = {}) => {
  const q = new URLSearchParams(params).toString();
  return apiFetch(`/api/admin/donors${q ? '?' + q : ''}`);
};
export const createDonor = (body) => apiFetch('/api/admin/donors', { method: 'POST', body: JSON.stringify(body) });
export const updateDonor = (id, body) => apiFetch(`/api/admin/donors/${id}`, { method: 'PUT', body: JSON.stringify(body) });
export const deleteDonor = (id) => apiFetch(`/api/admin/donors/${id}`, { method: 'DELETE' });
export const resetDonorPassword = (id, body) => apiFetch(`/api/admin/donors/${id}/password`, { method: 'PUT', body: JSON.stringify(body) });
export const addPayment = (id, body) => apiFetch(`/api/admin/donors/${id}/payments`, { method: 'POST', body: JSON.stringify(body) });

export const listAdmins = () => apiFetch('/api/admin/admins');
export const createAdmin = (body) => apiFetch('/api/admin/admins', { method: 'POST', body: JSON.stringify(body) });
export const updateAdmin = (id, body) => apiFetch(`/api/admin/admins/${id}`, { method: 'PUT', body: JSON.stringify(body) });
export const deleteAdmin = (id) => apiFetch(`/api/admin/admins/${id}`, { method: 'DELETE' });

export const listRequests = (params = {}) => {
  const q = new URLSearchParams(params).toString();
  return apiFetch(`/api/admin/requests${q ? '?' + q : ''}`);
};
export const approveRequest = (id, body = {}) => apiFetch(`/api/admin/requests/${id}/approve`, { method: 'PUT', body: JSON.stringify(body) });
export const declineRequest = (id) => apiFetch(`/api/admin/requests/${id}/decline`, { method: 'PUT', body: JSON.stringify({}) });

export const getLogs = (params = {}) => {
  const q = new URLSearchParams(params).toString();
  return apiFetch(`/api/admin/logs${q ? '?' + q : ''}`);
};
