import { refreshAccessToken, getAccessToken } from '@/lib/apiClient.js';

let refreshInterval = null;
let failureCount = 0;
const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // Refresh every 5 minutes (access token expires in 15 min)
const MAX_CONSECUTIVE_FAILURES = 3;

/**
 * Start periodic token refresh in the background
 * This keeps the user logged in even if they're not making API calls
 */
export function startTokenRefreshManager() {
    if (refreshInterval) return; // Already running

    if (typeof window === 'undefined') return; // Only in browser

    failureCount = 0;

    refreshInterval = setInterval(async () => {
        try {
            // Check if we have a stored token first
            if (!getAccessToken()) {
                console.debug('⚠️  No access token found - token refresh manager stopping');
                stopTokenRefreshManager();
                return;
            }

            await refreshAccessToken();
            failureCount = 0; // Reset on success
            console.debug('✓ Token refreshed (periodic)');
        } catch (error) {
            failureCount++;
            console.debug(
                `⚠️  Token refresh failed (attempt ${failureCount}/${MAX_CONSECUTIVE_FAILURES}):`,
                error?.message
            );

            // If too many consecutive failures, we might need to force re-authentication
            if (failureCount >= MAX_CONSECUTIVE_FAILURES) {
                console.error('🔴 Token refresh failed permanently - tokens may be invalid');
                // Don't clear tokens here - let the next API call handle the 401
                // The 401 handler will prompt user to re-login
            }
            // Don't log out here - let the next API call handle it if token is invalid
        }
    }, REFRESH_INTERVAL_MS);

    console.debug('✓ Token refresh manager started (interval: every 5 minutes)');
}

/**
 * Stop the periodic token refresh
 */
export function stopTokenRefreshManager() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
        refreshInterval = null;
        failureCount = 0;
        console.debug('✓ Token refresh manager stopped');
    }
}
