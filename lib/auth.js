import {
    apiFetch,
    clearTokens,
    getRefreshToken,
    setAccessToken,
    setRefreshToken,
    tryAutoLogin,
} from '@/lib/apiClient.js';
import { clearStoredSession, setStoredSession } from '@/lib/session.js';

function storeTokens(tokens) {
    setAccessToken(tokens.accessToken);
    setRefreshToken(tokens.refreshToken);
}

export { tryAutoLogin, clearTokens };

export async function donorLogin(email, password) {
    const data = await apiFetch('/api/auth/donor/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
    });
    storeTokens(data.tokens);
    setStoredSession({ ...data.donor, role: 'donor' });
    return data.donor;
}

export async function adminLogin(email, password) {
    const data = await apiFetch('/api/auth/admin/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
    });
    storeTokens(data.tokens);
    setStoredSession({ ...data.admin, role: 'admin' });
    return data.admin;
}

export function getAdminSetupStatus() {
    return apiFetch('/api/auth/admin/setup-status');
}

export async function bootstrapAdmin({ name, email, password }) {
    const data = await apiFetch('/api/auth/admin/bootstrap', {
        method: 'POST',
        body: JSON.stringify({ name, email, password }),
    });
    storeTokens(data.tokens);
    setStoredSession({ ...data.admin, role: 'admin' });
    return data.admin;
}

export async function logout() {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
        try {
            await apiFetch('/api/auth/logout', {
                method: 'POST',
                body: JSON.stringify({ refreshToken }),
            });
        } catch {
            // Ignore logout API errors and clear local state anyway.
        }
    }

    clearTokens();
    clearStoredSession();
}
