const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

let _token = null;

export const setAccessToken = (t) => { _token = t; };
export const getAccessToken = () => _token;
export const setRefreshToken = (t) => localStorage.setItem('mosque_refresh_token', t);
export const getRefreshToken = () => localStorage.getItem('mosque_refresh_token');
export const clearTokens = () => {
  _token = null;
  localStorage.removeItem('mosque_refresh_token');
};

export const tryAutoLogin = async () => {
  const rt = getRefreshToken();
  if (!rt) return null;
  try {
    const res = await fetch(`${BASE}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: rt }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) { clearTokens(); return null; }
    setAccessToken(json.data.accessToken);
    setRefreshToken(json.data.refreshToken);
    return json.data;
  } catch { clearTokens(); return null; }
};

const _refresh = async () => {
  const rt = getRefreshToken();
  if (!rt) throw new Error('No refresh token');
  const res = await fetch(`${BASE}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: rt }),
  });
  const json = await res.json();
  if (!res.ok) { clearTokens(); throw new Error('Session expired'); }
  setAccessToken(json.data.accessToken);
  setRefreshToken(json.data.refreshToken);
  return json.data.accessToken;
};

export const apiFetch = async (path, opts = {}, _retry = false) => {
  const isAuthPath = path.startsWith('/api/auth/');
  const headers = { 'Content-Type': 'application/json', ...(opts.headers ?? {}) };
  if (_token && !isAuthPath) headers['Authorization'] = `Bearer ${_token}`;

  const res = await fetch(`${BASE}${path}`, { ...opts, headers });
  const json = await res.json().catch(() => ({}));

  if (res.status === 401 && !_retry && !isAuthPath) {
    try {
      await _refresh();
      return apiFetch(path, opts, true);
    } catch {
      clearTokens();
      throw { code: 'UNAUTHORIZED', message: 'Session expired. Please log in again.' };
    }
  }

  if (!res.ok) {
    const err = json?.error ?? {};
    throw { code: err.code ?? 'API_ERROR', message: err.message ?? 'An error occurred', details: err.details };
  }

  return json.data;
};
