import { captureException } from "./monitoring.js";
import { fetchCampaignSnapshotFromApi } from "./campaignApi.js";

export async function fetchCampaignSnapshot() {
    try {
        return await fetchCampaignSnapshotFromApi();
    } catch (error) {
        captureException(error, { source: 'fetchCampaignSnapshot' });
        return null;
    }
}
