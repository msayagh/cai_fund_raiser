import { apiFetch } from '@/lib/apiClient.js';

export function getStats() {
    return apiFetch('/api/admin/stats');
}

export function listDonors(params = {}) {
    const query = new URLSearchParams(params).toString();
    return apiFetch(`/api/admin/donors${query ? `?${query}` : ''}`);
}

export function getDonor(id) {
    return apiFetch(`/api/admin/donors/${id}`);
}

export function createDonor(body) {
    return apiFetch('/api/admin/donors', {
        method: 'POST',
        body: JSON.stringify(body),
    });
}

export function updateDonor(id, body) {
    return apiFetch(`/api/admin/donors/${id}`, {
        method: 'PUT',
        body: JSON.stringify(body),
    });
}

export function deleteDonor(id) {
    return apiFetch(`/api/admin/donors/${id}`, {
        method: 'DELETE',
    });
}

export function resetDonorPassword(id, body) {
    return apiFetch(`/api/admin/donors/${id}/password`, {
        method: 'PUT',
        body: JSON.stringify(body),
    });
}

export function addPayment(id, body) {
    return apiFetch(`/api/admin/donors/${id}/payments`, {
        method: 'POST',
        body: JSON.stringify(body),
    });
}

export function listAdmins() {
    return apiFetch('/api/admin/admins');
}

export function createAdmin(body) {
    return apiFetch('/api/admin/admins', {
        method: 'POST',
        body: JSON.stringify(body),
    });
}

export function updateAdmin(id, body) {
    return apiFetch(`/api/admin/admins/${id}`, {
        method: 'PUT',
        body: JSON.stringify(body),
    });
}

export function deleteAdmin(id) {
    return apiFetch(`/api/admin/admins/${id}`, {
        method: 'DELETE',
    });
}

export function listRequests(params = {}) {
    const query = new URLSearchParams(params).toString();
    return apiFetch(`/api/admin/requests${query ? `?${query}` : ''}`);
}

export function approveRequest(id, body = {}) {
    return apiFetch(`/api/admin/requests/${id}/approve`, {
        method: 'PUT',
        body: JSON.stringify(body),
    });
}

export function declineRequest(id) {
    return apiFetch(`/api/admin/requests/${id}/decline`, {
        method: 'PUT',
        body: JSON.stringify({}),
    });
}

export function holdRequest(id) {
    return apiFetch(`/api/admin/requests/${id}/hold`, {
        method: 'PUT',
        body: JSON.stringify({}),
    });
}

export function getLogs(params = {}) {
    const query = new URLSearchParams(params).toString();
    return apiFetch(`/api/admin/logs${query ? `?${query}` : ''}`);
}
