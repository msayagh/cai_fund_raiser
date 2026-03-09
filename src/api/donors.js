import { apiFetch } from './client.js';

export const getMe = () => apiFetch('/api/donors/me');
export const updateMe = (body) => apiFetch('/api/donors/me', { method: 'PUT', body: JSON.stringify(body) });
export const updateMyPassword = (body) => apiFetch('/api/donors/me/password', { method: 'PUT', body: JSON.stringify(body) });
export const getMyEngagement = () => apiFetch('/api/donors/me/engagement');
export const createEngagement = (body) => apiFetch('/api/donors/me/engagement', { method: 'POST', body: JSON.stringify(body) });
export const updateEngagement = (body) => apiFetch('/api/donors/me/engagement', { method: 'PUT', body: JSON.stringify(body) });
export const getMyPayments = () => apiFetch('/api/donors/me/payments');
export const getMyRequests = () => apiFetch('/api/donors/me/requests');
