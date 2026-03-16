# 04 — File Map: "Where is the code for X?"

Use this as a lookup table. Find the feature you want, and it tells you exactly which files to open.

---

## How to read this table

Each row shows:
1. **Frontend call** — the `lib/` function you call from a page/component
2. **Backend route** — HTTP method + URL path that receives the request
3. **Controller** — function in `*controller.js` that handles the request
4. **Service** — function in `*service.js` that contains business logic
5. **DB model** — Prisma model(s) touched

---

## Authentication

| Feature | Frontend | Route | Controller | Service | DB model |
|---------|----------|-------|-----------|---------|----------|
| Admin login | `lib/auth.js` → `adminLogin()` | `POST /api/auth/admin/login` | `auth.controller.js:adminLogin()` | `auth.service.js:adminLogin()` | `Admin`, `RefreshToken` |
| Donor login | `lib/auth.js` → `donorLogin()` | `POST /api/auth/donor/login` | `auth.controller.js:donorLogin()` | `auth.service.js:donorLogin()` | `Donor`, `RefreshToken` |
| Refresh token | `lib/apiClient.js` → `refreshAccessToken()` | `POST /api/auth/refresh` | `auth.controller.js:refresh()` | `auth.service.js:refresh()` | `RefreshToken` |
| Logout | `lib/auth.js` → `logout()` | `POST /api/auth/logout` | `auth.controller.js:logout()` | — | `RefreshToken` |
| Register (send OTP) | `app/register/page.jsx` | `POST /api/auth/donor/send-otp` | `auth.controller.js:donorSendOtp()` | `auth.service.js` | `Donor` |
| Register (verify OTP) | `app/register/page.jsx` | `POST /api/auth/donor/verify-otp` | `auth.controller.js:donorVerifyOtp()` | `auth.service.js` | `Donor` |
| Complete registration | `app/register/page.jsx` | `POST /api/auth/donor/complete-registration` | `auth.controller.js:donorCompleteRegistration()` | `auth.service.js` | `Donor` |
| First admin setup | `app/admin/setup/page.jsx` | `POST /api/auth/admin/bootstrap` | `auth.controller.js:adminBootstrap()` | `auth.service.js:adminBootstrap()` | `Admin` |
| Forgot password | `app/forgot-password/page.jsx` | `POST /api/auth/admin/forgot-password` or `donor/forgot-password` | `auth.controller.js` | `auth.service.js` + `mail.service.js` | `Admin`/`Donor` |

**Route file:** [`backend/src/modules/auth/auth.routes.js`](../backend/src/modules/auth/auth.routes.js)

---

## Donor management (admin side)

| Feature | Frontend | Route | Controller | Service | DB |
|---------|----------|-------|-----------|---------|-----|
| List all donors | `lib/adminApi.js` → `listDonors()` | `GET /api/admin/donors` | `donors.controller.js:list()` | `donors.service.js:list()` | `Donor` |
| Get single donor | `lib/adminApi.js` → `getDonor(id)` | `GET /api/admin/donors/:id` | `donors.controller.js:getById()` | `donors.service.js:getById()` | `Donor`, `Engagement`, `Payment[]` |
| Create donor | `lib/adminApi.js` → `createDonor(body)` | `POST /api/admin/donors` | `donors.controller.js:adminCreate()` | `donors.service.js:adminCreate()` | `Donor` |
| Update donor | `lib/adminApi.js` → `updateDonor(id, body)` | `PUT /api/admin/donors/:id` | `donors.controller.js:adminUpdate()` | `donors.service.js:adminUpdate()` | `Donor` |
| Delete donor | `lib/adminApi.js` → `deleteDonor(id)` | `DELETE /api/admin/donors/:id` | `donors.controller.js:adminDelete()` | `donors.service.js:adminDelete()` | `Donor` |
| Deactivate donor | `lib/adminApi.js` → `deactivateDonor(id)` | `PUT /api/admin/donors/:id/deactivate` | `donors.controller.js:adminDeactivate()` | `donors.service.js` | `Donor` |
| Reactivate donor | `lib/adminApi.js` → `reactivateDonor(id)` | `PUT /api/admin/donors/:id/reactivate` | `donors.controller.js:adminReactivate()` | `donors.service.js` | `Donor` |
| Reset donor password | `lib/adminApi.js` → `resetDonorPassword(id, body)` | `PUT /api/admin/donors/:id/password` | `donors.controller.js:adminUpdatePassword()` | `donors.service.js` | `Donor` |
| Set engagement pledge | `lib/adminApi.js` → `setDonorEngagement(id, body)` | `PUT /api/admin/donors/:id/engagement` | `donors.controller.js:adminSetEngagement()` | `donors.service.js` | `Engagement` |
| Export donors CSV | `lib/adminApi.js` → `exportDonors()` | `GET /api/admin/donors/bulk/export` | `donors.controller.js` | `donors.service.js` | `Donor` |
| Import donors CSV | `lib/adminApi.js` → `importDonationsCsv(file)` | `POST /api/admin/donors/bulk/upload` | `donors.controller.js:adminImportPaymentsCsv()` | `donors.service.js:adminImportPaymentsCsv()` | `Donor`, `Payment` |

**Route file:** [`backend/src/modules/donors/donors.routes.js`](../backend/src/modules/donors/donors.routes.js)

---

## Payments (admin side)

| Feature | Frontend | Route | Controller | Service | DB |
|---------|----------|-------|-----------|---------|-----|
| List donor payments | `lib/adminApi.js` → `getDonorPayments(id)` | `GET /api/admin/donors/:id/payments` | `donors.controller.js:adminGetPayments()` | `donors.service.js` | `Payment` |
| Add payment | `lib/adminApi.js` → `addPayment(id, body)` | `POST /api/admin/donors/:id/payments` | `donors.controller.js:adminAddPayment()` | `donors.service.js:addPayment()` | `Payment` |
| Update payment | `lib/adminApi.js` → `updateDonorPayment(donorId, paymentId, body)` | `PUT /api/admin/donors/:id/payments/:paymentId` | `donors.controller.js:adminUpdatePayment()` | `donors.service.js` | `Payment` |
| Delete payment | `lib/adminApi.js` → `deleteDonorPayment(donorId, paymentId)` | `DELETE /api/admin/donors/:id/payments/:paymentId` | `donors.controller.js:adminDeletePayment()` | `donors.service.js` | `Payment` |
| Upload receipt | `lib/adminApi.js` → `uploadPaymentReceipt(donorId, paymentId, file)` | `POST /api/admin/donors/:id/payments/:paymentId/receipt` | `donors.controller.js:uploadPaymentReceipt()` | `donors.service.js` | `Payment` |
| Download confirmation | `app/admin/dashboard/` PaymentPanel | `GET /api/admin/donors/:id/payments/:paymentId/confirmation` | `donors.controller.js:adminGetPaymentConfirmation()` | `donors.service.js` | `Payment` |

---

## Donor self-service

| Feature | Frontend | Route | Controller | Service | DB |
|---------|----------|-------|-----------|---------|-----|
| Get own profile | `lib/donorApi.js` → `getMe()` | `GET /api/donors/me` | `donors.controller.js:getMe()` | `donors.service.js:getMe()` | `Donor` |
| Update own profile | `lib/donorApi.js` → `updateMe(body)` | `PUT /api/donors/me` | `donors.controller.js:updateMe()` | `donors.service.js` | `Donor` |
| Change own password | `lib/donorApi.js` → `updateMyPassword(body)` | `PUT /api/donors/me/password` | `donors.controller.js:updateMyPassword()` | `donors.service.js` | `Donor` |
| Get my engagement | `lib/donorApi.js` → `getMyEngagement()` | `GET /api/donors/me/engagement` | `donors.controller.js:getMyEngagement()` | `donors.service.js` | `Engagement` |
| Create engagement | `lib/donorApi.js` → `createEngagement(body)` | `POST /api/donors/me/engagement` | `donors.controller.js:createEngagement()` | `donors.service.js` | `Engagement` |
| Update engagement | `lib/donorApi.js` → `updateEngagement(body)` | `PUT /api/donors/me/engagement` | `donors.controller.js:updateEngagement()` | `donors.service.js` | `Engagement` |
| See my payments | `lib/donorApi.js` → `getMyPayments()` | `GET /api/donors/me/payments` | `donors.controller.js:getMyPayments()` | `donors.service.js` | `Payment` |
| See my requests | `lib/donorApi.js` → `getMyRequests()` | `GET /api/donors/me/requests` | `donors.controller.js:getMyRequests()` | `donors.service.js` | `Request` |

**Route file:** [`backend/src/modules/donors/donors.routes.js`](../backend/src/modules/donors/donors.routes.js) (top section, `router` object)

---

## Admin management

| Feature | Frontend | Route | Controller | Service | DB |
|---------|----------|-------|-----------|---------|-----|
| List admins | `lib/adminApi.js` → `listAdmins()` | `GET /api/admin/admins` | `admins.controller.js:list()` | `admins.service.js` | `Admin` |
| Create admin | `lib/adminApi.js` → `createAdmin(body)` | `POST /api/admin/admins` | `admins.controller.js:create()` | `admins.service.js` | `Admin` |
| Update admin | `lib/adminApi.js` → `updateAdmin(id, body)` | `PUT /api/admin/admins/:id` | `admins.controller.js:update()` | `admins.service.js` | `Admin` |
| Delete admin | `lib/adminApi.js` → `deleteAdmin(id)` | `DELETE /api/admin/admins/:id` | `admins.controller.js:delete()` | `admins.service.js` | `Admin` |

**Route file:** [`backend/src/modules/admins/admins.routes.js`](../backend/src/modules/admins/admins.routes.js)

---

## Support requests

| Feature | Frontend | Route | Controller | Service | DB |
|---------|----------|-------|-----------|---------|-----|
| Submit request | `lib/requestsApi.js` → `createRequest(body)` | `POST /api/requests` | `requests.controller.js:create()` | `requests.service.js` | `Request` |
| Upload attachments | `lib/requestsApi.js` → `uploadRequestAttachments(id, files)` | `POST /api/requests/:id/attachments` | `requests.controller.js:addAttachments()` | `requests.service.js` | `RequestAttachment` |
| List requests (admin) | `lib/adminApi.js` → `listRequests()` | `GET /api/admin/requests` | `requests.controller.js:list()` | `requests.service.js` | `Request` |
| Get request (admin) | `lib/adminApi.js` → (direct apiFetch) | `GET /api/admin/requests/:id` | `requests.controller.js:getById()` | `requests.service.js` | `Request` |
| Approve request | `lib/adminApi.js` → `approveRequest(id)` | `PUT /api/admin/requests/:id/approve` | `requests.controller.js:approve()` | `requests.service.js` + `mail.service.js` | `Request` |
| Decline request | `lib/adminApi.js` → `declineRequest(id)` | `PUT /api/admin/requests/:id/decline` | `requests.controller.js:decline()` | `requests.service.js` + `mail.service.js` | `Request` |
| Hold request | `lib/adminApi.js` → `holdRequest(id)` | `PUT /api/admin/requests/:id/hold` | `requests.controller.js:hold()` | `requests.service.js` | `Request` |

**Route file:** [`backend/src/modules/requests/requests.routes.js`](../backend/src/modules/requests/requests.routes.js)

---

## Settings & campaign

| Feature | Frontend | Route | Controller | Service | DB |
|---------|----------|-------|-----------|---------|-----|
| Get public campaign data | `lib/campaignApi.js` → `fetchCampaignSnapshotFromApi()` | `GET /api/public/campaign` | `public.controller.js:getCampaignSnapshot()` | `public.service.js` | `Campaign`, `Payment` |
| Get public stats | — | `GET /api/public/stats` | `public.controller.js:getPublicStats()` | `public.service.js` | `Donor`, `Payment` |
| Get/update global goal | `lib/settingsApi.js` | `GET /api/settings`, `PUT /api/settings` | `settings.controller.js` | `settings.service.js` | `GlobalGoal` |
| Admin stats | `lib/adminApi.js` → `getStats()` | `GET /api/admin/stats` | (in `app.js` inline) | Prisma direct | `Donor`, `Payment` |

---

## Email notifications

All emails originate in the service layer and call `mail.service.js`. There is no frontend involvement.

| Trigger | When | Function |
|---------|------|----------|
| Donor registered | Donor completes OTP registration | `mail.service.js:sendRegistrationConfirmation()` |
| Password reset | Forgot-password form submitted | `mail.service.js:sendPasswordReset()` |
| Payment added | Admin records a payment | `mail.service.js:sendPaymentConfirmation()` |
| Request approved | Admin approves a request | `mail.service.js:sendRequestStatusUpdate()` |
| Request declined | Admin declines a request | `mail.service.js:sendRequestStatusUpdate()` |
| New admin created | Admin creates another admin | `mail.service.js:sendAdminAccountCreation()` |
| Admin created donor account | Admin creates donor with account | `mail.service.js:sendDonorAccountCreation()` |
| Donor deactivated | Admin deactivates a donor | `mail.service.js:sendDonorDeactivationNotice()` |
| Engagement confirmed | | `mail.service.js:sendEngagementConfirmation()` |

**Files:**
- [`backend/src/modules/mail/mail.service.js`](../backend/src/modules/mail/mail.service.js) — sending logic
- [`backend/src/modules/mail/mail.templates.js`](../backend/src/modules/mail/mail.templates.js) — HTML templates
- SMTP config: [`backend/src/config/env.js`](../backend/src/config/env.js) `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`

---

## Activity logs

The audit trail records what admins do.

| Feature | Where | Function |
|---------|-------|----------|
| Create a log entry | Called from service layer | `logs.service.js:createLog({ adminId, action, targetType, targetId, metadata })` |
| View logs (admin UI) | `lib/adminApi.js` → `getLogs()` | `GET /api/admin/logs` → `logs.controller.js:list()` |

**Files:**
- [`backend/src/modules/logs/logs.service.js`](../backend/src/modules/logs/logs.service.js)
- [`backend/src/modules/logs/logs.routes.js`](../backend/src/modules/logs/logs.routes.js)
- [`backend/src/modules/logs/logs.controller.js`](../backend/src/modules/logs/logs.controller.js)

---

## UI components: where to find them

| UI feature | Component file | Used in page |
|------------|---------------|--------------|
| Add/edit donor modal | `app/admin/dashboard/AddDonorModal.jsx` | `app/admin/dashboard/page.jsx` |
| Payment panel | `app/admin/dashboard/PaymentPanel.jsx` | `app/admin/dashboard/page.jsx` |
| Campaign section | `app/admin/dashboard/CampaignsSection.jsx` | `app/admin/dashboard/page.jsx` |
| Global goal section | `app/admin/dashboard/GlobalGoalSection.jsx` | `app/admin/dashboard/page.jsx` |
| Pillars overview | `app/admin/dashboard/PillarsOverview.jsx` | `app/admin/dashboard/page.jsx` |
| Donation dialog (public) | `components/DonationDialog.jsx` | `app/page.jsx` |
| Mosque visualization | `components/Mosque/MosqueViz.jsx` | `app/page.jsx` |
| Tier cards | `components/Tier/TierCard.jsx` | `app/page.jsx` |
| Statistics | `components/StatisticsScreen.jsx` | `app/page.jsx` |
| Campaign pie chart | `components/CampaignPie.jsx` | `app/page.jsx` |
| Pillar selector | `components/PillarSelector.jsx` | `app/page.jsx` |
| Donor overview tab | `app/donor/dashboard/OverviewTab.jsx` | `app/donor/dashboard/page.jsx` |
| Donor payments tab | `app/donor/dashboard/PaymentsTab.jsx` | `app/donor/dashboard/page.jsx` |
| Donor profile tab | `app/donor/dashboard/ProfileTab.jsx` | `app/donor/dashboard/page.jsx` |
| Donor requests tab | `app/donor/dashboard/RequestsTab.jsx` | `app/donor/dashboard/page.jsx` |

---

## Validation schemas

Every input is validated on the backend before reaching the controller. Zod schemas are defined **in the routes file** for each module:

| Module | Schema location | Schemas |
|--------|---------------|---------|
| Auth | `backend/src/modules/auth/auth.schema.js` | login, registration, OTP, password reset, refresh |
| Donors (self) | `backend/src/modules/donors/donors.schema.js` | updateProfileSchema, updatePasswordSchema, engagementSchema |
| Donors (admin) | `backend/src/modules/donors/donors.routes.js` (inline) | adminPaymentSchema, adminCreateDonorSchema, adminUpdateDonorSchema, adminEngagementSchema |
| Admins | `backend/src/modules/admins/admins.schema.js` | create, update |
| Requests | `backend/src/modules/requests/requests.schema.js` | create |
| Settings | `backend/src/modules/settings/settings.schema.js` | goal update |

---

## Error codes reference

These are the `error.code` values you'll see in API error responses:

| Code | HTTP | Meaning |
|------|------|---------|
| `UNAUTHORIZED` | 401 | No token or invalid token |
| `FORBIDDEN` | 403 | Token valid but wrong user type |
| `NOT_FOUND` | 404 | Record not found |
| `CONFLICT` | 409 | Unique constraint (email already exists) |
| `VALIDATION_ERROR` | 400 | Zod validation failed |
| `FILE_TOO_LARGE` | 400 | Upload > 2MB |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

Defined in: [`backend/src/middleware/errorHandler.js`](../backend/src/middleware/errorHandler.js), [`backend/src/utils/AppError.js`](../backend/src/utils/AppError.js)
