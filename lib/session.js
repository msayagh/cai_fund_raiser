const STORAGE_USER_KEY = 'mosque_user_session';
const SESSION_EVENT = 'mosque-session-change';

function hasWindow() {
    return typeof window !== 'undefined';
}

export function getSessionStorageKey() {
    return STORAGE_USER_KEY;
}

export function getStoredSession() {
    if (!hasWindow()) return null;

    const raw = window.localStorage.getItem(STORAGE_USER_KEY);
    if (!raw) return null;

    try {
        return JSON.parse(raw);
    } catch {
        window.localStorage.removeItem(STORAGE_USER_KEY);
        return null;
    }
}

export function setStoredSession(session) {
    if (!hasWindow()) return;
    window.localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(session));
    window.dispatchEvent(new Event(SESSION_EVENT));
}

export function clearStoredSession() {
    if (!hasWindow()) return;
    window.localStorage.removeItem(STORAGE_USER_KEY);
    window.dispatchEvent(new Event(SESSION_EVENT));
}

export function subscribeToSessionChange(callback) {
    if (!hasWindow()) return () => {};

    const handleChange = () => callback(getStoredSession());
    window.addEventListener(SESSION_EVENT, handleChange);
    window.addEventListener('storage', handleChange);

    return () => {
        window.removeEventListener(SESSION_EVENT, handleChange);
        window.removeEventListener('storage', handleChange);
    };
}
