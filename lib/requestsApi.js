import { apiFetch, getApiBaseUrl, getAccessToken } from '@/lib/apiClient.js';

export function createRequest(body) {
    return apiFetch('/api/requests', {
        method: 'POST',
        body: JSON.stringify(body),
    });
}

export async function uploadRequestAttachments(requestId, files) {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));

    const headers = {};
    if (getAccessToken()) {
        headers.Authorization = `Bearer ${getAccessToken()}`;
    }

    const response = await fetch(`${getApiBaseUrl()}/api/requests/${requestId}/attachments`, {
        method: 'POST',
        body: formData,
        headers,
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload?.success === false) {
        throw new Error(payload?.error?.message || 'Failed to upload attachments.');
    }

    return payload.data;
}
