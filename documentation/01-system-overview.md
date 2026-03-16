# 01 — System Overview

## Two applications, one domain

```
                        ┌──────────────────────────────────────────────┐
                        │              Traefik (reverse proxy)          │
                        │         portal.ccai-stjean.org  (HTTPS)       │
                        └──────────────┬──────────────┬────────────────┘
                                       │              │
                    All other paths    │              │  PathPrefix: /api
                    (pages, assets)    │              │  (API calls)
                                       ▼              ▼
                        ┌──────────────────┐  ┌──────────────────────┐
                        │   Next.js 16     │  │    Express.js         │
                        │   port 3000      │  │    port 3001          │
                        │   (frontend)     │  │    (backend)          │
                        └──────────────────┘  └──────────┬───────────┘
                                                          │
                                               ┌──────────▼───────────┐
                                               │   SQLite / MySQL      │
                                               │   (Prisma ORM)        │
                                               └──────────────────────┘
```

In **local development**, the browser hits:
- `localhost:3000` → Next.js dev server
- `localhost:3001/api/...` → Express backend directly

In **production**, everything goes through `portal.ccai-stjean.org`:
- Any request **without** `/api` prefix → Traefik → Next.js container
- Any request **with** `/api` prefix → Traefik → Express container

> This is why all API URLs on the frontend use relative paths like `/api/admin/donors`.
> In dev, `NEXT_PUBLIC_API_URL=http://localhost:3001` prefixes them.
> In production, the path is relative to the current origin, so Traefik routes correctly.

---

## Frontend folder map

```
mosque-app/
├── app/                            ← Next.js App Router pages
│   ├── layout.jsx                  ← Root layout (fonts, global providers)
│   ├── page.jsx                    ← Public landing page
│   ├── login/page.jsx              ← Login for donors AND admins
│   ├── register/page.jsx           ← Donor self-registration
│   ├── forgot-password/page.jsx    ← Password reset request
│   ├── admin/
│   │   ├── dashboard/page.jsx      ← Main admin panel (donors, payments, requests, logs)
│   │   └── setup/page.jsx          ← First-time admin bootstrap
│   ├── donor/
│   │   ├── dashboard/page.jsx      ← Donor self-service portal
│   │   └── profile/edit/page.jsx   ← Edit profile
│   └── api/
│       └── admin/donors/bulk/
│           └── upload/route.js     ← Next.js proxy for CSV upload (local dev only)
│
├── components/                     ← Reusable UI components
│   ├── Header.jsx                  ← Navigation bar
│   ├── Footer.jsx                  ← Footer
│   ├── Sidebars.jsx                ← Left/right sidebar layout
│   ├── AdminSidebar.jsx            ← Admin navigation links
│   ├── DonationDialog.jsx          ← Public donation modal
│   ├── DonationsList.jsx           ← Donor payment list
│   ├── StatisticsScreen.jsx        ← Campaign stats / raised amount
│   ├── CampaignPie.jsx             ← Pie chart for campaign progress
│   ├── PillarSelector.jsx          ← Interactive pillar/tier UI
│   ├── QRCode.jsx                  ← QR code display
│   ├── SitePreloader.jsx           ← Loading screen
│   ├── Mosque/                     ← 3D mosque visualization (SVG/canvas)
│   └── Tier/TierCard.jsx           ← Tier card display
│
├── lib/                            ← API calls and utilities (browser-side)
│   ├── apiClient.js                ← Core HTTP client: fetch + JWT + auto-refresh
│   ├── auth.js                     ← Login / logout / auto-login entry points
│   ├── adminApi.js                 ← All admin-only API calls
│   ├── donorApi.js                 ← Donor self-service API calls
│   ├── requestsApi.js              ← Support request submission
│   ├── campaignApi.js              ← Public campaign snapshot
│   ├── settingsApi.js              ← Settings read/write
│   ├── session.js                  ← localStorage session management
│   ├── tokenRefreshManager.js      ← Background token refresh (every 5 min)
│   ├── bulkDonorUtils.js           ← CSV parsing + validation utilities
│   ├── clientCache.js              ← Client-side cache layer
│   ├── dataFetching.js             ← Data fetch helpers
│   ├── seoUtils.js                 ← meta tag helpers
│   └── translationUtils.js         ← i18n helper functions
│
├── hooks/
│   └── useFirstVisitPreloader.js   ← Show preloader only on first visit
│
├── translations/                   ← i18n string objects (JSX/ES modules)
│   ├── en.jsx                      ← English
│   ├── ar.jsx                      ← Arabic
│   ├── fr.jsx                      ← French
│   ├── es.jsx                      ← Spanish
│   ├── tr.jsx                      ← Turkish
│   ├── ur.jsx                      ← Urdu
│   └── zh.jsx                      ← Chinese
│
└── constants/config.js             ← THEMES, TIER_CONFIG, INITIAL_TIERS,
                                       fundraising targets, mobile breakpoint
```

---

## Backend folder map

```
backend/
├── server.js                       ← Entry point: start Express + graceful shutdown
├── prisma/
│   ├── schema.prisma               ← Database models (Donor, Payment, Admin…)
│   └── migrations/                 ← Auto-generated migration SQL files
│
└── src/
    ├── app.js                      ← Middleware stack + route mounting (READ THIS FIRST)
    │
    ├── config/
    │   ├── env.js                  ← All env vars validated with Zod
    │   ├── pillars.js              ← PILLARS_CONFIG, calculateTotalFromPillars()
    │   └── campaign.js             ← Campaign configuration
    │
    ├── db/
    │   └── client.js               ← Prisma singleton (import this everywhere)
    │
    ├── middleware/
    │   ├── auth.js                 ← requireAdmin(), requireDonor() — JWT verification
    │   ├── authorization.js        ← requireCapability() — RBAC checks
    │   ├── validate.js             ← validate(schema) — Zod body validation
    │   ├── errorHandler.js         ← notFound(), errorHandler() — centralized errors
    │   ├── rateLimiter.js          ← generalLimiter, authLimiter
    │   └── upload.js               ← Multer file upload middleware
    │
    ├── modules/                    ← Feature modules (one folder per domain)
    │   ├── auth/                   ← Login, register, OTP, password reset, tokens
    │   ├── donors/                 ← Donor CRUD, payments, engagements, CSV import
    │   ├── admins/                 ← Admin CRUD, role management
    │   ├── requests/               ← Support tickets + attachments
    │   ├── settings/               ← Global goal, campaigns
    │   ├── public/                 ← Public stats (no auth required)
    │   ├── logs/                   ← Activity audit trail
    │   └── mail/                   ← Email templates and sending
    │
    └── utils/
        ├── jwt.js                  ← signAccessToken(), verifyAccessToken()
        ├── AppError.js             ← AppError class (operational errors)
        ├── response.js             ← sendSuccess() — standardized { success, data }
        └── logger.js               ← Winston logger → logs/app.log
```

---

## Module internal structure

Every module under `src/modules/` follows the same 4-file pattern:

```
modules/donors/
├── donors.routes.js     ← URL definitions + middleware chain + controller binding
├── donors.controller.js ← Parse request → call service → sendSuccess / next(err)
├── donors.service.js    ← Business logic → Prisma queries
└── donors.schema.js     ← Zod validation schemas for this module
```

> **Rule:** Controllers never touch Prisma directly. Services never touch `res` or `req`.

---

## Database models (summary)

| Model | Key fields | Relations |
|-------|-----------|-----------|
| **Donor** | id, name, email, passwordHash, accountCreated | → Engagement, Payment[], Request[], ActivityLog[], RefreshToken[] |
| **Admin** | id, name, email, passwordHash | → Payment[] (recorded), ActivityLog[], RefreshToken[] |
| **Engagement** | id, donorId (unique), totalPledge, startDate, endDate | → Donor |
| **Payment** | id, donorId, amount, date, method, note, recordedByAdminId | → Donor, Admin |
| **Request** | id, type, donorId?, name, email, message, status | → RequestAttachment[] |
| **RequestAttachment** | id, requestId, filename, path | → Request |
| **ActivityLog** | id, adminId, action, targetType, targetId, metadata | → Admin |
| **RefreshToken** | id, token (unique), userId, userType, expiresAt | — |
| **GlobalGoal** | id, target, raised | — |
| **Campaign** | id, name, pillars (JSON), goal, raised | — |
| **Setting** | id, key (unique), value | — |

Full schema: [`backend/prisma/schema.prisma`](../backend/prisma/schema.prisma)
