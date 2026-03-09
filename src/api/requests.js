import { apiFetch } from './client.js';
export const createRequest = (body) => apiFetch('/api/requests', { method: 'POST', body: JSON.stringify(body) });
