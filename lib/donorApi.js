import { apiFetch } from '@/lib/apiClient.js';

export function getMe() {
    return apiFetch('/api/donors/me');
}

export function updateMe(body) {
    return apiFetch('/api/donors/me', {
        method: 'PUT',
        body: JSON.stringify(body),
    });
}

export function updateMyPassword(body) {
    return apiFetch('/api/donors/me/password', {
        method: 'PUT',
        body: JSON.stringify(body),
    });
}

export function getMyEngagement() {
    return apiFetch('/api/donors/me/engagement');
}

export function createEngagement(body) {
    return apiFetch('/api/donors/me/engagement', {
        method: 'POST',
        body: JSON.stringify(body),
    });
}

export function updateEngagement(body) {
    return apiFetch('/api/donors/me/engagement', {
        method: 'PUT',
        body: JSON.stringify(body),
    });
}

export function getMyPayments() {
    return apiFetch('/api/donors/me/payments');
}

export function getMyRequests() {
    return apiFetch('/api/donors/me/requests');
}
