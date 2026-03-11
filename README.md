# 🕌 Mosque App — Donation Tracker

A full-stack web application for tracking mosque donation pledges and payments.  
Built with **React + Vite** (frontend) and **Node.js + Express + Prisma** (backend).

---

## Architecture Overview

```
┌─────────────────────────────────┐      ┌──────────────────────────────────────────┐
│         React Frontend          │      │           Node.js / Express API           │
│  (Vite · port 5173)             │ HTTP │  (port 3001)                              │
│                                 │─────▶│                                           │
│  src/                           │      │  backend/src/                             │
│  ├── App.jsx          (router)  │      │  ├── modules/                             │
│  ├── pages/                     │      │  │   ├── auth/     (login, OTP, refresh)  │
│  │   ├── DonorPortal.jsx        │      │  │   ├── donors/   (self-service)         │
│  │   └── AdminDashboard.jsx     │      │  │   ├── admins/   (admin CRUD)           │
│  ├── api/                       │      │  │   ├── requests/ (submit, approve)      │
│  │   ├── client.js   (base)     │      │  │   └── logs/     (activity log)         │
│  │   ├── auth.js                │      │  ├── middleware/                          │
│  │   ├── donors.js              │      │  │   ├── auth.js   (JWT guard)            │
│  │   ├── admin.js               │      │  │   ├── validate.js (Zod schemas)        │
│  │   └── requests.js            │      │  │   ├── upload.js  (multipart files)     │
│  └── i18n/                      │      │  │   └── rateLimiter.js                   │
│      └── portalTranslations.js  │      │  └── utils/ (jwt, otp, email, logger)     │
│         (EN / FR / AR)          │      │                                           │
└─────────────────────────────────┘      └───────────────┬──────────────────────────┘
                                                         │ Prisma ORM
                                         ┌───────────────▼──────────────────────────┐
                                         │           SQLite (dev.db)                │
                                         │   Donor · Admin · Engagement · Payment   │
                                         │   Request · RequestAttachment            │
                                         │   ActivityLog · OtpCode · RefreshToken   │
                                         └──────────────────────────────────────────┘
```

### Key design decisions
- **JWT dual-token auth**: short-lived access tokens (15 min) + long-lived refresh tokens (7 days, rotated on every use, stored hashed in DB)
- **OTP email verification**: for donor registration and password reset; OTPs printed to console in dev (no SMTP required)
- **Modular backend**: each domain (auth / donors / admins / requests / logs) has its own `routes → controller → service` stack
- **Activity log**: every significant action writes a record (actor, action, details, timestamp, linked donor/admin)
- **File uploads**: multipart attachments stored under `backend/uploads/`, served at `/uploads/:filename`
- **SQLite (dev) → PostgreSQL (prod)**: one-line change in `schema.prisma`

---

## Quick Start

### Prerequisites
- Node.js 18+ and npm 9+

### 1. Backend

```bash
# From mosque-app/ (project root):
npm --prefix backend install
cp backend/.env.example backend/.env
npm --prefix backend run db:migrate   # create tables (name migration e.g. "init")
npm --prefix backend run db:seed      # optional: populate demo data
npm --prefix backend run dev          # or: npm --prefix backend start
```

`db:*` scripts live in `backend/package.json`. If you `cd backend` first, `npm run db:migrate` also works.
For production-like testing, skip `db:seed` and create your first admin from the frontend **Admin Setup** page.

Backend server runs on **http://localhost:3001**  
API base URL is **http://localhost:3001/api**  
Health check is **http://localhost:3001/health**

> **Generating strong JWT secrets:**
> ```bash
> node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
> ```
> Run twice and paste the two outputs into `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` in `.env`.

### 2. Frontend

```bash
# From project root
npm install
cp .env.example .env
npm run dev
```

Frontend runs on **http://localhost:5173**

---

## Test Credentials

| Role  | Email               | Password |
|-------|---------------------|----------|
| Admin | admin@masjid.com    | admin123 |
| Donor | ahmed@example.com   | demo123  |
| Donor | fatima@example.com  | demo123  |
| Donor | youssef@example.com | demo123  |

---

## Accessing the Database

### Option A — Prisma Studio (GUI, recommended)

```bash
npm --prefix backend run db:studio
```

Opens a browser-based table editor at **http://localhost:5555**.  
You can browse, filter, and edit every table with no SQL needed.

### Option B — SQLite shell

```bash
sqlite3 backend/prisma/dev.db
```

Useful commands:
```sql
.tables                          -- list all tables
.mode column
.headers on
SELECT * FROM Donor;
SELECT * FROM ActivityLog ORDER BY timestamp DESC LIMIT 20;
.quit
```

### Option C — Any SQLite GUI

Connect to the file: `backend/prisma/dev.db`  
Good tools: [TablePlus](https://tableplus.com/), [DB Browser for SQLite](https://sqlitebrowser.org/), [DBeaver](https://dbeaver.io/)

### Reset the database (wipes everything and re-seeds)

```bash
npm --prefix backend run db:reset    # drops + re-migrates + re-seeds
```

### Reset the database and keep it empty (no seed data)

```bash
cd backend
npx prisma migrate reset --force --skip-seed
```

---

## Features

### Donor Portal
- 🔐 Email OTP registration & forgot password
- 📊 Pledge progress dashboard (circular progress ring)
- 💳 Pay via Zeffy (link, coming soon) or upload payment receipt
- ✏️ Edit engagement (pledge amount & end date) — notifies admin
- ⚙️ Update profile (name, email) and change password
- 📬 Submit help requests to admin with file attachments

### Admin Panel
- 📋 Overview stats (total donors, total raised, active engagements, pending requests)
- 🔍 Search & sort donors by name, email, paid amount, pledge
- ✅ Type-aware request approval:
  - `account_creation` → opens creation modal (prefilled data, admin sets password + pledge)
  - `payment_upload` → confirm amount, date, method → recorded as payment
  - `engagement_change` → acknowledge or decline
- 📎 View uploaded file attachments on requests
- 👤 Add, edit (name/email/password), delete admin accounts
- 🔑 Reset any donor's password
- ➕ Manually record donor payments
- 📜 Activity log with filters: by donor, by event type, by date range

---

## API Reference

Full API documentation: [`backend/README.md`](./backend/README.md)

**Base URL:** `http://localhost:3001/api`

| Group | Routes |
|-------|--------|
| Auth | `POST /auth/donor/login`, `/auth/donor/google`, `/auth/admin/login`, `/auth/admin/google`, admin+donor forgot-password OTP flows, `/auth/refresh`, `/auth/logout` |
| Donor self-service | `GET/PUT /donors/me`, password, engagement, payments, requests |
| Public requests | `POST /requests`, `POST /requests/:id/attachments` |
| Admin – donors | List, get, update, delete, payments, reset password |
| Admin – requests | List, approve, decline |
| Admin – admins | List, create, update, delete |
| Admin – logs | `GET /admin/logs` (filter: donorId, action, from, to, page, limit) |

All protected routes require: `Authorization: Bearer <accessToken>`  
Access tokens expire in **15 min** — refresh with `POST /api/auth/refresh`.

---

## Development Notes

**OTP codes** are printed to the backend console (no SMTP needed in dev):
```
look for: OTP for ahmed@example.com: 123456
```

**File uploads** land in `backend/uploads/` and are served at `http://localhost:3001/uploads/<filename>`.

**Environment variables** (see `backend/.env.example`):
```
PORT, NODE_ENV, DATABASE_URL
JWT_ACCESS_SECRET, JWT_REFRESH_SECRET
SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM
FRONTEND_URL, GOOGLE_CLIENT_ID
```

**Frontend API base URL** defaults to `http://localhost:3001`. Override with:
```bash
VITE_API_URL=https://your-api.example.com npm run build
```

For Google sign-in in the frontend, set `VITE_GOOGLE_CLIENT_ID` in your frontend `.env`.

---

## Production Checklist

- [ ] Change `provider = "postgresql"` in `backend/prisma/schema.prisma`
- [ ] Set `DATABASE_URL` to a real PostgreSQL connection string
- [ ] Generate and set strong `JWT_ACCESS_SECRET` + `JWT_REFRESH_SECRET`
- [ ] Configure `SMTP_*` variables for email delivery
- [ ] Set `FRONTEND_URL` and `GOOGLE_CLIENT_ID` in backend `.env`
- [ ] Set `VITE_API_URL` in frontend `.env.production`
- [ ] Set `VITE_GOOGLE_CLIENT_ID` in frontend `.env.production`
- [ ] Run `npm --prefix backend run db:migrate` against prod database
