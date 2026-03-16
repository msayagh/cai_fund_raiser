# 03 — Authentication & Token Flow

How users log in, how JWTs work, and how the system keeps them logged in automatically.

---

## Overview

The app uses **two separate JWT tokens**:

| Token | Lifetime | Stored in | Purpose |
|-------|---------|-----------|---------|
| **Access token** | 15 minutes | `sessionStorage` | Sent with every API request |
| **Refresh token** | 7 days | `localStorage` | Used to get a new access token |

There are **two user types**, each with their own token `type` claim:
- `"type": "donor"` — donor accounts
- `"type": "admin"` — admin accounts

---

## Login flow

```
User enters email + password
          │
          ▼
lib/auth.js
  adminLogin(email, password)       ← admin
  donorLogin(email, password)       ← donor
          │
          │  POST /api/auth/admin/login
          │  or  POST /api/auth/donor/login
          │  body: { email, password }
          ▼
backend/src/modules/auth/auth.service.js
  1. Find user in DB (prisma.admin.findUnique or prisma.donor.findUnique)
  2. Compare password with bcrypt (12 rounds)
  3. Generate access token:  signAccessToken({ sub: id, type: 'admin' }, '15m')
  4. Generate refresh token: signRefreshToken({ sub: id, type: 'admin', jti: uuid }, '7d')
  5. Store refresh token in DB (RefreshToken table)
  6. Return { accessToken, refreshToken, user }
          │
          ▼
lib/auth.js  (client side)
  setAccessToken(accessToken)      → sessionStorage['mosque_access_token']
  setRefreshToken(refreshToken)    → localStorage['mosque_refresh_token']
  setStoredSession(user)           → localStorage['mosque_user_session']
          │
          ▼
Page redirects to dashboard
```

**Files involved:**
- [`lib/auth.js`](../lib/auth.js) — `adminLogin()`, `donorLogin()`
- [`lib/apiClient.js`](../lib/apiClient.js) — `setAccessToken()`, `setRefreshToken()`
- [`lib/session.js`](../lib/session.js) — `setStoredSession()`
- [`backend/src/modules/auth/auth.routes.js`](../backend/src/modules/auth/auth.routes.js) — route definitions
- [`backend/src/modules/auth/auth.service.js`](../backend/src/modules/auth/auth.service.js) — password check + token generation
- [`backend/src/utils/jwt.js`](../backend/src/utils/jwt.js) — `signAccessToken()`, `signRefreshToken()`

---

## Every authenticated request

Every API call automatically attaches the access token:

```
lib/apiClient.js → apiFetch(path, options)
    │
    │  headers = {
    │      Authorization: `Bearer ${getAccessToken()}`
    │  }
    │
    ▼
Express backend
    │
    ▼
backend/src/middleware/auth.js
    requireAdmin() or requireDonor()
    │
    │  1. Extract token from "Authorization: Bearer <token>"
    │  2. verifyAccessToken(token)        → from backend/src/utils/jwt.js
    │     throws if expired or tampered
    │  3. Check payload.type === 'admin'  (or 'donor')
    │  4. Load user from DB
    │  5. req.admin = admin  (or req.donor = donor)
    │
    ▼
Controller can now use req.admin / req.donor safely
```

---

## Token refresh (automatic)

When the access token expires after 15 minutes, the system refreshes it without requiring the user to log in again. There are **two mechanisms**:

### Mechanism 1: Reactive refresh (triggered by a 401)

```
apiFetch() gets a 401 response
          │
          ▼
lib/apiClient.js
  refreshAccessToken()
  │
  │  POST /api/auth/refresh
  │  body: { refreshToken: getRefreshToken() }
  │
  ▼
backend/src/modules/auth/auth.service.js
  1. Verify refresh token signature
  2. Look up refresh token in DB (check not revoked)
  3. Generate new access token + new refresh token (rotation)
  4. Delete old refresh token from DB
  5. Store new refresh token in DB
  6. Return { accessToken, refreshToken }
          │
          ▼
lib/apiClient.js
  setAccessToken(newAccessToken)
  setRefreshToken(newRefreshToken)
  ← Retry original request with new token
```

### Mechanism 2: Proactive refresh (background timer)

```
lib/tokenRefreshManager.js
  startTokenRefreshManager()
      │
      │  setInterval(every 5 minutes)
      │      refreshAccessToken()
      │
      ▼
  Token stays fresh — user never hits a 401 during active use
```

`startTokenRefreshManager()` is called when the dashboard mounts.
`stopTokenRefreshManager()` is called on logout.

**Files involved:**
- [`lib/apiClient.js`](../lib/apiClient.js) — `refreshAccessToken()`, `apiFetch()` with retry
- [`lib/tokenRefreshManager.js`](../lib/tokenRefreshManager.js) — periodic refresh
- [`backend/src/modules/auth/auth.routes.js`](../backend/src/modules/auth/auth.routes.js) — `POST /api/auth/refresh`
- [`backend/src/modules/auth/auth.service.js`](../backend/src/modules/auth/auth.service.js) — refresh token rotation

---

## Logout

```
lib/auth.js → logout()
    │
    │  POST /api/auth/logout
    │  body: { refreshToken }
    │
    ▼
backend: revoke refresh token in DB (delete row)
    │
    ▼
lib/apiClient.js → clearTokens()
    sessionStorage.removeItem('mosque_access_token')
    localStorage.removeItem('mosque_refresh_token')
    accessToken = null  (in-memory)
    │
    ▼
lib/session.js → clearStoredSession()
    localStorage.removeItem('mosque_user_session')
    │
    ▼
Page redirects to /login
```

---

## Auto-login on page reload

When a user refreshes the page, the in-memory `accessToken` variable is lost. The app recovers it:

```
lib/apiClient.js → getAccessToken()
    │
    │  1. Check in-memory: accessToken variable
    │  2. If null: check sessionStorage['mosque_access_token']
    │  3. If found: cache it in memory + return
    │  4. If not found: return null → triggers 401 → refresh flow
    │
    ▼
lib/auth.js → tryAutoLogin()
    │
    │  1. getStoredSession() from localStorage
    │  2. If session found: refreshAccessToken() to get fresh access token
    │  3. startTokenRefreshManager()
    │  4. Return user object
    │
    ▼
Dashboard mounts normally
```

---

## RBAC (Role-Based Access Control)

The current implementation is **simplified** — all authenticated admins have all capabilities.

```
backend/src/middleware/authorization.js → requireCapability(capabilityName)
    │
    │  if (!req.admin && !req.donor) → 401
    │  else → next()     ← capability check always passes
    │
    ▼
Controller runs
```

The `capabilityName` strings (`'admin.donors.view'`, `'admin.donors.edit'`, etc.) are documented as capability names for future granular RBAC. They are defined inline in [`backend/src/modules/donors/donors.routes.js`](../backend/src/modules/donors/donors.routes.js).

---

## Donor registration (OTP flow)

Donors go through a two-step email verification:

```
1. app/register/page.jsx
   → POST /api/auth/donor/send-otp  { email }
   → Backend generates 6-digit OTP, stores hash in DB, emails it

2. User enters OTP
   → POST /api/auth/donor/verify-otp  { email, otp }
   → Backend verifies OTP hash

3. User completes profile
   → POST /api/auth/donor/complete-registration  { email, name, password, otp }
   → Backend creates Donor, returns tokens
```

**Files:**
- [`app/register/page.jsx`](../app/register/page.jsx)
- [`backend/src/modules/auth/auth.routes.js`](../backend/src/modules/auth/auth.routes.js) — `/donor/send-otp`, `/donor/verify-otp`, `/donor/complete-registration`
- [`backend/src/modules/auth/auth.service.js`](../backend/src/modules/auth/auth.service.js)
- [`backend/src/utils/otp.js`](../backend/src/utils/otp.js)
- [`backend/src/modules/mail/mail.service.js`](../backend/src/modules/mail/mail.service.js) — `sendRegistrationConfirmation()`

---

## Admin bootstrap (first-time setup)

The very first admin is created via a protected endpoint that only works when **no admins exist yet**:

```
app/admin/setup/page.jsx
    → POST /api/auth/admin/bootstrap  { name, email, password }
    → Backend checks: if adminCount > 0 → reject
    → Creates first admin, returns tokens
```

**File:** [`backend/src/modules/auth/auth.service.js`](../backend/src/modules/auth/auth.service.js) — `adminBootstrap()`

---

## Token storage locations

| What | Where | Key |
|------|-------|-----|
| Access token | `sessionStorage` | `mosque_access_token` |
| Refresh token | `localStorage` | `mosque_refresh_token` |
| User session (name, role, etc.) | `localStorage` | `mosque_user_session` |

- `sessionStorage` → cleared when browser tab closes
- `localStorage` → persists across browser restarts (refresh token survives)
