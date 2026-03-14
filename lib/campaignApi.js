import { apiFetch } from '@/lib/apiClient.js';

export async function fetchCampaignSnapshotFromApi() {
    return apiFetch('/api/public/campaign', {
        method: 'GET',
    });
}
