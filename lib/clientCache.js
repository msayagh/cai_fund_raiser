const memoryCache = new Map();

function isBrowserStorageAvailable(storage) {
    try {
        if (typeof window === 'undefined' || !storage) return false;
        const probeKey = '__cache_probe__';
        storage.setItem(probeKey, '1');
        storage.removeItem(probeKey);
        return true;
    } catch {
        return false;
    }
}

function getStorage(persistent = true) {
    if (typeof window === 'undefined') return null;

    const preferred = persistent ? window.localStorage : window.sessionStorage;
    if (isBrowserStorageAvailable(preferred)) return preferred;

    const fallback = persistent ? window.sessionStorage : window.localStorage;
    return isBrowserStorageAvailable(fallback) ? fallback : null;
}

export function getCachedValue(key, { maxAgeMs, persistent = true } = {}) {
    const cached = memoryCache.get(key);
    const now = Date.now();

    if (cached && (!maxAgeMs || now - cached.timestamp <= maxAgeMs)) {
        return cached.value;
    }

    const storage = getStorage(persistent);
    if (!storage) return null;

    try {
        const raw = storage.getItem(key);
        if (!raw) return null;

        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return null;
        if (maxAgeMs && now - parsed.timestamp > maxAgeMs) {
            storage.removeItem(key);
            return null;
        }

        memoryCache.set(key, parsed);
        return parsed.value ?? null;
    } catch {
        return null;
    }
}

export function setCachedValue(key, value, { persistent = true } = {}) {
    const payload = {
        value,
        timestamp: Date.now(),
    };

    memoryCache.set(key, payload);

    const storage = getStorage(persistent);
    if (!storage) return;

    try {
        storage.setItem(key, JSON.stringify(payload));
    } catch {
        // Ignore storage quota or availability failures.
    }
}
