import { apiFetch, getAccessToken, getApiBaseUrl } from '@/lib/apiClient.js';

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

export function deactivateDonor(id) {
    return apiFetch(`/api/admin/donors/${id}/deactivate`, {
        method: 'PUT',
    });
}

export function reactivateDonor(id) {
    return apiFetch(`/api/admin/donors/${id}/reactivate`, {
        method: 'PUT',
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

export function updateDonorPayment(donorId, paymentId, body) {
    return apiFetch(`/api/admin/donors/${donorId}/payments/${paymentId}`, {
        method: 'PUT',
        body: JSON.stringify(body),
    });
}

export function deleteDonorPayment(donorId, paymentId) {
    return apiFetch(`/api/admin/donors/${donorId}/payments/${paymentId}`, {
        method: 'DELETE',
    });
}

export function uploadPaymentReceipt(donorId, paymentId, file) {
    const formData = new FormData();
    formData.append('file', file);

    return fetch(`/api/admin/donors/${donorId}/payments/${paymentId}/receipt`, {
        method: 'POST',
        body: formData,
        headers: {
            'Authorization': `Bearer ${getAccessToken()}`,
        },
    }).then(async (res) => {
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error?.message || 'Receipt upload failed');
        }
        return res.json();
    });
}

export function getDonorPayments(id) {
    return apiFetch(`/api/admin/donors/${id}/payments`);
}

export function setDonorEngagement(id, body) {
    return apiFetch(`/api/admin/donors/${id}/engagement`, {
        method: 'PUT',
        body: JSON.stringify(body),
    });
}

export function bulkUploadDonors(file) {
    const formData = new FormData();
    formData.append('file', file);

    return fetch('/api/admin/donors/bulk/upload', {
        method: 'POST',
        body: formData,
        headers: {
            'Authorization': `Bearer ${getAccessToken()}`,
        },
    }).then(async (res) => {
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error?.message || 'Bulk upload failed');
        }
        return res.json();
    });
}

export function importDonationsCsv(file, { onProgress } = {}) {
    const formData = new FormData();
    formData.append('file', file);

    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${getApiBaseUrl()}/api/admin/donors/bulk/upload`);

        const token = getAccessToken();
        if (token) {
            xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        }

        xhr.upload.onprogress = (event) => {
            if (!event.lengthComputable || typeof onProgress !== 'function') return;
            const pct = Math.max(0, Math.min(100, Math.round((event.loaded / event.total) * 100)));
            onProgress(pct);
        };

        xhr.onerror = () => {
            reject(new Error('CSV import failed - network error'));
        };

        xhr.onload = () => {
            const contentType = xhr.getResponseHeader('content-type') || '';
            const isJson = contentType.includes('application/json');
            const payload = isJson ? JSON.parse(xhr.responseText || '{}') : null;
            const textBody = isJson ? '' : String(xhr.responseText || '');

            if (xhr.status < 200 || xhr.status >= 300 || payload?.success === false) {
                const apiMessage = payload?.error?.message || payload?.message;
                const fallback = `CSV import failed (HTTP ${xhr.status})`;
                const message = apiMessage || fallback;
                const details = payload?.error?.details || textBody.slice(0, 300);
                const error = new Error(details ? `${message} - ${details}` : message);
                error.status = xhr.status;
                reject(error);
                return;
            }

            resolve(payload?.data);
        };

        xhr.send(formData);
    });
}

export function exportDonors() {
    return apiFetch('/api/admin/donors/bulk/export');
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

export function uploadAttachment(requestId, files) {
    const formData = new FormData();
    files.forEach((file) => {
        formData.append('files', file);
    });

    return fetch(`/api/requests/${requestId}/attachments`, {
        method: 'POST',
        body: formData,
        headers: {
            'Authorization': `Bearer ${getAccessToken()}`,
        },
    }).then(async (res) => {
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error?.message || 'Upload failed');
        }
        return res.json();
    });
}

export function getLogs(params = {}) {
    const query = new URLSearchParams(params).toString();
    return apiFetch(`/api/admin/logs${query ? `?${query}` : ''}`);
}

export async function downloadPaymentConfirmation(donorId, paymentId) {
    const token = getAccessToken();
    const response = await fetch(`/api/admin/donors/${donorId}/payments/${paymentId}/confirmation`, {
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        let errorMsg = `HTTP ${response.status}`;
        try {
            const errorData = await response.json();
            if (errorData.error?.message) {
                errorMsg = errorData.error.message;
            }
        } catch {
            // Response was not JSON, use default error message
            errorMsg = response.statusText || errorMsg;
        }
        throw new Error(errorMsg);
    }

    return response.blob();
}
