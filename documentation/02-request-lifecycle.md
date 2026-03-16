# 02 — Request Lifecycle

How a request travels from the browser all the way to the database and back.

Two concrete examples are traced below:
1. **GET /api/admin/donors** — fetch a list of donors (read)
2. **POST /api/admin/donors/:id/payments** — record a payment (write)

---

## Visual flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                          BROWSER (React)                            │
│                                                                     │
│  app/admin/dashboard/page.jsx                                       │
│      calls  →  lib/adminApi.js : listDonors()                      │
│                    calls  →  lib/apiClient.js : apiFetch()          │
└───────────────────────────────┬─────────────────────────────────────┘
                                │  HTTP request
                                │  GET /api/admin/donors
                                │  Authorization: Bearer <accessToken>
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     TRAEFIK (production only)                       │
│  Host: portal.ccai-stjean.org && PathPrefix: /api                   │
│      routes to → Express backend (port 3001)                        │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        EXPRESS (backend)                            │
│                     backend/src/app.js                              │
│                                                                     │
│  Middleware executed in order:                                      │
│  1. helmet()          → security headers                            │
│  2. cors()            → check Origin against FRONTEND_URLS          │
│  3. compression()     → gzip                                        │
│  4. express.json()    → parse body                                  │
│  5. generalLimiter    → rate limit (100 req/15 min)                 │
│  6. morgan()          → log request to logs/app.log                 │
│                                                                     │
│  Route matched:                                                     │
│  app.use('/api/admin/donors', adminDonorRouter)                     │
│                                                                     │
│  Route-level middleware (in donors.routes.js):                      │
│  7. requireAdmin()    → verify JWT, attach req.admin                │
│  8. requireCapability('admin.donors.view')  → RBAC check           │
│  9. [validate(schema) for POST/PUT only]                            │
│                                                                     │
│  Handler:                                                           │
│  10. donors.controller.js : list()                                  │
│                                                                     │
│  Service:                                                           │
│  11. donors.service.js : list()                                     │
│                                                                     │
│  Database:                                                          │
│  12. prisma.donor.findMany(...)                                     │
│                                                                     │
│  Response:                                                          │
│  13. sendSuccess(res, data)  →  { success: true, data: [...] }      │
└───────────────────────────────┬─────────────────────────────────────┘
                                │  JSON response
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    BROWSER (React) — continued                      │
│                                                                     │
│  lib/apiClient.js:                                                  │
│    • If 401 → refresh token → retry once                            │
│    • If ok → return payload.data                                    │
│                                                                     │
│  app/admin/dashboard/page.jsx:                                      │
│    • setState(donors)  → re-render donor list                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Step-by-step with exact file locations

### Step 1 — Page triggers the call

**File:** [`app/admin/dashboard/page.jsx`](../app/admin/dashboard/page.jsx)

The dashboard calls `listDonors()` inside a `loadAllData` function (usually on mount or after a mutation):
```js
const donors = await listDonors({ page: 1, limit: 50 });
setDonors(donors);
```

---

### Step 2 — API wrapper function

**File:** [`lib/adminApi.js`](../lib/adminApi.js)

All admin API calls live here. Every function calls `apiFetch()`:
```js
export function listDonors(params = {}) {
    const query = new URLSearchParams(params).toString();
    return apiFetch(`/api/admin/donors${query ? `?${query}` : ''}`);
}
```

Other functions you'll find here:
- `getDonor(id)`, `createDonor(body)`, `updateDonor(id, body)`, `deleteDonor(id)`
- `addPayment(id, body)`, `updateDonorPayment(...)`, `deleteDonorPayment(...)`
- `importDonationsCsv(file, { onProgress })` — XHR with progress events
- `bulkUploadDonors(file)` — fetch-based CSV upload
- `listAdmins()`, `createAdmin(body)`, `listRequests()`, `getLogs()`

---

### Step 3 — Core HTTP client

**File:** [`lib/apiClient.js`](../lib/apiClient.js)

This is the central piece. It:
- Reads `NEXT_PUBLIC_API_URL` to build the full URL
- Adds `Authorization: Bearer <token>` header
- Sets a 10-second request timeout
- On **401**: automatically calls `refreshAccessToken()` and retries once
- Returns `payload.data` (unwraps the `{ success, data }` envelope)

```js
export async function apiFetch(path, options = {}, retry = false) {
    const url = `${getApiBaseUrl()}${path}`;
    const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getAccessToken()}`,
    };
    // ... timeout, fetch, 401 handling, return payload.data
}
```

> **`getApiBaseUrl()`** returns `process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'`

---

### Step 4 — Express receives the request

**File:** [`backend/src/app.js`](../backend/src/app.js)

This file mounts every route. To understand what handles a given URL, find the `app.use()` line:

```js
app.use('/api/auth',           authRoutes);
app.use('/api/public',         publicRoutes);       // ← no auth
app.use('/api/donors',         donorRoutes);        // ← donor self-service
app.use('/api/requests',       requestRoutes);
app.use('/api/settings',       settingsRoutes);
app.use('/api/admin/donors',   adminDonorRouter);   // ← admin donor management
app.use('/api/admin/admins',   adminRoutes);
app.use('/api/admin/requests', adminRequestRouter);
app.use('/api/admin/logs',     logRoutes);
```

At the bottom: `app.use(notFound)` then `app.use(errorHandler)` catch everything unmatched.

---

### Step 5 — Route definition

**File:** [`backend/src/modules/donors/donors.routes.js`](../backend/src/modules/donors/donors.routes.js)

The route file defines the URL shape and its middleware chain:

```js
// GET /api/admin/donors
adminDonorRouter.get('/',
    requireAdmin,
    requireCapability('admin.donors.view'),
    ctrl.list
);

// POST /api/admin/donors/:id/payments
adminDonorRouter.post('/:id/payments',
    requireAdmin,
    requireCapability('admin.donors.edit'),
    validate(adminPaymentSchema),     // ← Zod validation
    ctrl.adminAddPayment
);
```

> Each route in this file maps a URL + HTTP method to a controller function.
> The middleware runs **left to right** before the controller gets called.

---

### Step 6 — Auth middleware

**File:** [`backend/src/middleware/auth.js`](../backend/src/middleware/auth.js)

`requireAdmin` does three things:
1. Extracts the `Bearer <token>` from the `Authorization` header
2. Verifies the JWT signature and expiry (throws 401 if invalid)
3. Loads the admin from the database and attaches it to `req.admin`

After this middleware, controllers can safely read `req.admin.id`, `req.admin.name`, etc.

```js
const requireAdmin = async (req, res, next) => {
    const token = extractBearer(req);
    const payload = verifyAccessToken(token);      // From backend/src/utils/jwt.js
    if (payload.type !== 'admin') throw new AppError('Access denied', 403, 'FORBIDDEN');
    const admin = await prisma.admin.findUnique({ where: { id: payload.sub } });
    if (!admin) throw new AppError('Admin not found', 401, 'UNAUTHORIZED');
    req.admin = admin;
    next();
};
```

---

### Step 7 — Validation middleware (POST/PUT only)

**File:** [`backend/src/middleware/validate.js`](../backend/src/middleware/validate.js)

Parses `req.body` against a Zod schema. If invalid, returns a 400 with field errors before the controller runs:

```js
// validate() middleware
const result = schema.safeParse(req.body);
if (!result.success) {
    return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', details: result.error.flatten() }
    });
}
req.body = result.data;   // Replace body with sanitized/coerced data
next();
```

Schemas are defined in: [`backend/src/modules/donors/donors.routes.js`](../backend/src/modules/donors/donors.routes.js) (inline in routes file using Zod `z.object()`).

---

### Step 8 — Controller

**File:** [`backend/src/modules/donors/donors.controller.js`](../backend/src/modules/donors/donors.controller.js)

Controllers are thin. They:
- Extract data from `req.body`, `req.params`, `req.query`, `req.admin`, `req.file`
- Call the service
- Send the response via `sendSuccess()`

```js
const adminAddPayment = async (req, res, next) => {
    try {
        const { id } = req.params;
        const data = await service.addPayment(id, req.body, req.admin.id);
        sendSuccess(res, data, 'Payment recorded', 201);
    } catch (err) {
        next(err);    // ← Always pass errors to errorHandler
    }
};
```

---

### Step 9 — Service

**File:** [`backend/src/modules/donors/donors.service.js`](../backend/src/modules/donors/donors.service.js)

Services contain the business logic:
- Run Prisma queries
- Hash passwords
- Parse CSV
- Call mail service
- Call log service

```js
const addPayment = async (donorId, body, adminId) => {
    const donor = await prisma.donor.findUnique({ where: { id: donorId } });
    if (!donor) throw new AppError('Donor not found', 404, 'NOT_FOUND');

    const payment = await prisma.payment.create({
        data: { donorId, amount: body.amount, date: body.date,
                method: body.method, note: body.note, recordedByAdminId: adminId }
    });

    // Side effects
    await mailService.sendPaymentConfirmation(donor, payment);
    await logService.createLog({ adminId, action: 'PAYMENT_ADDED', ... });

    return payment;
};
```

---

### Step 10 — Database query

**File:** [`backend/src/db/client.js`](../backend/src/db/client.js)

Exports a singleton Prisma client. All services import it:
```js
const prisma = require('../../db/client');
```

Prisma translates the method calls into SQL and executes against SQLite (dev) or MySQL (prod).

---

### Step 11 — Response

**File:** [`backend/src/utils/response.js`](../backend/src/utils/response.js)

Every successful response is wrapped the same way:
```js
// sendSuccess(res, data, message?, statusCode?)
res.status(200).json({
    success: true,
    data: payment,          // ← The actual payload
    message: 'Payment recorded'
});
```

---

### Step 12 — Error handling

**File:** [`backend/src/middleware/errorHandler.js`](../backend/src/middleware/errorHandler.js)

If any middleware or controller calls `next(err)`, the error handler catches it and sends:
```json
{
  "success": false,
  "error": { "code": "NOT_FOUND", "message": "Donor not found" }
}
```

Special cases handled automatically:
- Prisma `P2002` (unique constraint) → 409 Conflict
- Prisma `P2025` (record not found) → 404 Not Found
- Multer `LIMIT_FILE_SIZE` → 400 File too large
- `AppError` (operational) → uses `err.statusCode`
- Any other error → 500 Internal Server Error

---

## POST example: recording a payment

```
Page: app/admin/dashboard/page.jsx
  │  calls addPayment(donorId, { amount, date, method })
  │
  ▼
lib/adminApi.js  →  addPayment(id, body)
  │  return apiFetch(`/api/admin/donors/${id}/payments`, { method: 'POST', body: JSON.stringify(body) })
  │
  ▼
lib/apiClient.js  →  apiFetch()
  │  POST http://localhost:3001/api/admin/donors/abc123/payments
  │  Authorization: Bearer eyJhbGci...
  │
  ▼
backend/src/app.js
  │  app.use('/api/admin/donors', adminDonorRouter)
  │
  ▼
backend/src/modules/donors/donors.routes.js
  │  adminDonorRouter.post('/:id/payments', requireAdmin, requireCapability(...), validate(schema), ctrl.adminAddPayment)
  │  → requireAdmin: reads token, attaches req.admin
  │  → validate: checks amount/date/method with Zod
  │
  ▼
donors.controller.js  →  adminAddPayment()
  │  calls service.addPayment(req.params.id, req.body, req.admin.id)
  │
  ▼
donors.service.js  →  addPayment()
  │  prisma.payment.create({ data: {...} })
  │  mailService.sendPaymentConfirmation(...)
  │  logService.createLog(...)
  │
  ▼
Prisma  →  INSERT INTO Payment (...)
  │
  ▼
Response: { success: true, data: { id, amount, date, method, ... } }
  │
  ▼
lib/apiClient.js  →  returns payload.data (the new payment object)
  │
  ▼
Page: setState → UI shows "Payment recorded"
```
