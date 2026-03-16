const DEFAULT_API_BASE_URL = 'http://localhost:3001';
const REFRESH_TOKEN_KEY = 'mosque_refresh_token';
const ACCESS_TOKEN_KEY = 'mosque_access_token';
const REQUEST_TIMEOUT_MS = 10000;

let accessToken = null;
let refreshPromise = null;

export function getApiBaseUrl() {
    return process.env.NEXT_PUBLIC_API_URL?.trim() || DEFAULT_API_BASE_URL;
}

function hasWindow() {
    return typeof window !== 'undefined';
}

export function setAccessToken(token) {
    accessToken = token ?? null;
    // Also store in sessionStorage for persistence across page reloads
    if (!hasWindow()) return;
    if (!token) {
        window.sessionStorage.removeItem(ACCESS_TOKEN_KEY);
        return;
    }
    window.sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function getAccessToken() {
    // Return in-memory token if available
    if (accessToken) return accessToken;
    // Otherwise, try to restore from sessionStorage (e.g., after page reload)
    if (!hasWindow()) return null;
    const storedToken = window.sessionStorage.getItem(ACCESS_TOKEN_KEY);
    if (storedToken) {
        accessToken = storedToken; // Cache in memory
        return storedToken;
    }
    return null;
}

export function setRefreshToken(token) {
    if (!hasWindow()) return;
    if (!token) {
        window.localStorage.removeItem(REFRESH_TOKEN_KEY);
        return;
    }
    window.localStorage.setItem(REFRESH_TOKEN_KEY, token);
}

export function getRefreshToken() {
    if (!hasWindow()) return null;
    return window.localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function hasRefreshToken() {
    return Boolean(getRefreshToken());
}

export function clearTokens() {
    accessToken = null;
    if (!hasWindow()) return;
    window.localStorage.removeItem(REFRESH_TOKEN_KEY);
    window.sessionStorage.removeItem(ACCESS_TOKEN_KEY);
}

async function parseJsonSafely(response) {
    try {
        return await response.json();
    } catch {
        return {};
    }
}

function createTimeoutController() {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    return {
        signal: controller.signal,
        cleanup() {
            clearTimeout(timeoutId);
        },
    };
}

function toApiError(error, fallbackMessage) {
    if (error?.name === 'AbortError') {
        return {
            code: 'API_TIMEOUT',
            message: `Request timed out after ${REQUEST_TIMEOUT_MS / 1000} seconds. Make sure the backend is running at ${getApiBaseUrl()}.`,
        };
    }

    if (error instanceof TypeError) {
        return {
            code: 'API_UNREACHABLE',
            message: `Unable to reach the backend at ${getApiBaseUrl()}. Make sure the server is running and accessible.`,
        };
    }

    return {
        code: 'API_ERROR',
        message: fallbackMessage,
    };
}

function createApiError({ code = 'API_ERROR', message = 'An error occurred while contacting the API.', details, status } = {}) {
    const apiError = new Error(message);
    apiError.code = code;
    apiError.details = details;
    apiError.status = status;
    return apiError;
}

export async function refreshAccessToken() {
    if (refreshPromise) {
        return refreshPromise;
    }

    const refreshToken = getRefreshToken();
    if (!refreshToken) {
        throw new Error('No refresh token available');
    }

    refreshPromise = (async () => {
        const { signal, cleanup } = createTimeoutController();
        let response;

        try {
            response = await fetch(`${getApiBaseUrl()}/api/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken }),
                signal,
            });
        } catch (error) {
            clearTokens();
            throw toApiError(error, 'Session refresh failed.');
        } finally {
            cleanup();
        }

        const payload = await parseJsonSafely(response);
        if (!response.ok || !payload?.success) {
            clearTokens();
            throw new Error(payload?.error?.message || 'Session expired');
        }

        setAccessToken(payload.data.accessToken);
        setRefreshToken(payload.data.refreshToken);
        return payload.data.accessToken;
    })();

    try {
        return await refreshPromise;
    } finally {
        refreshPromise = null;
    }
}

export async function apiFetch(path, options = {}, retry = false) {
    const isAuthPath = path.startsWith('/api/auth/');
    const headers = {
        'Content-Type': 'application/json',
        ...(options.headers ?? {}),
    };

    if (!isAuthPath && getAccessToken()) {
        headers.Authorization = `Bearer ${getAccessToken()}`;
    }

    const { signal, cleanup } = createTimeoutController();
    let response;

    try {
        response = await fetch(`${getApiBaseUrl()}${path}`, {
            ...options,
            headers,
            signal,
        });
    } catch (error) {
        throw toApiError(error, 'An error occurred while contacting the API.');
    } finally {
        cleanup();
    }

    const payload = await parseJsonSafely(response);

    if (response.status === 401 && !retry && !isAuthPath) {
        try {
            await refreshAccessToken();
            return apiFetch(path, options, true);
        } catch (error) {
            clearTokens();
            throw createApiError({
                code: 'UNAUTHORIZED',
                message: error?.message || 'Session expired. Please log in again.',
                status: 401,
            });
        }
    }

    if (!response.ok || payload?.success === false) {
        const error = payload?.error ?? {};
        throw createApiError({
            code: error.code || 'API_ERROR',
            message: error.message || 'An error occurred while contacting the API.',
            details: error.details,
            status: response.status,
        });
    }

    return payload.data;
}

export async function tryAutoLogin() {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return null;

    try {
        return await refreshAccessToken();
    } catch {
        clearTokens();
        return null;
    }
}
