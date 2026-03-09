# Mosque App — Backend API

REST API for the Mosque Donation Tracking app, built with Node.js + Express + Prisma (SQLite).

## Prerequisites

- Node.js 18+
- npm 9+

## Setup

### 1. Install dependencies

```bash
cd backend
npm install
```

From the repository root (`mosque-app/`), you can run backend scripts without `cd`:

```bash
npm --prefix backend install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env and set your JWT secrets (minimum 32 characters each)
```

At minimum, set strong random secrets for `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`:

```bash
# Quick way to generate secrets (run in terminal):
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### 3. Run database migrations

```bash
npm run db:migrate
# When prompted, give the migration a name e.g. "init"
```

If you are in the repository root (`mosque-app/`), use:

```bash
npm --prefix backend run db:migrate
```

### 4. Seed with sample data

```bash
npm run db:seed
```

From repo root:

```bash
npm --prefix backend run db:seed
```

This creates:
- **Admin**: `admin@masjid.com` / `admin123`
- **Donors**: `ahmed@example.com`, `fatima@example.com`, `youssef@example.com` (all password: `demo123`)
- Sample payments, engagements, requests, and activity logs

This step is optional. For production-like testing, keep the database empty and bootstrap the first admin from the frontend Admin Setup page.

### 5. Start the server

```bash
# Development (auto-restart on file changes)
npm run dev

# Production
npm start
```

The server runs on `http://localhost:3001` by default.  
API base URL: `http://localhost:3001/api`  
Health check: `http://localhost:3001/health`

---

## API Overview

### Base URL
```
http://localhost:3001/api
```

### Authentication

All protected routes require:
```
Authorization: Bearer <accessToken>
```

Access tokens expire in **15 minutes**. Use `POST /api/auth/refresh` with your refresh token to get a new pair.

---

### Auth Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/donor/login` | Donor login |
| POST | `/auth/donor/register/send-otp` | Start donor registration |
| POST | `/auth/donor/register/verify-otp` | Verify email OTP |
| POST | `/auth/donor/register/complete` | Complete registration |
| POST | `/auth/donor/forgot/send-otp` | Request password reset OTP |
| POST | `/auth/donor/forgot/verify-otp` | Verify reset OTP |
| POST | `/auth/donor/forgot/reset` | Set new password |
| GET  | `/auth/admin/setup-status` | Check whether any admin exists |
| POST | `/auth/admin/bootstrap` | Create initial admin (only when no admins exist) |
| POST | `/auth/admin/login` | Admin login |
| POST | `/auth/refresh` | Rotate token pair |
| POST | `/auth/logout` | Revoke refresh token |

### Donor Self-Service (requireDonor)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/donors/me` | Get own profile |
| PUT | `/donors/me` | Update profile |
| PUT | `/donors/me/password` | Change password |
| GET | `/donors/me/engagement` | Get engagement |
| POST | `/donors/me/engagement` | Create engagement |
| PUT | `/donors/me/engagement` | Update engagement |
| GET | `/donors/me/payments` | List own payments |
| GET | `/donors/me/requests` | List own requests |

### Public Requests

| Method | Path | Description |
|--------|------|-------------|
| POST | `/requests` | Submit a request |
| POST | `/requests/:id/attachments` | Upload attachments (multipart, field: `files`) |

### Admin — Donors (requireAdmin)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/donors` | List donors (search, sort, paginate) |
| POST | `/admin/donors` | Create donor account |
| GET | `/admin/donors/:id` | Get donor details |
| PUT | `/admin/donors/:id` | Update donor |
| DELETE | `/admin/donors/:id` | Delete donor |
| PUT | `/admin/donors/:id/password` | Reset donor password |
| POST | `/admin/donors/:id/payments` | Record payment |

### Admin — Admins (requireAdmin)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/admins` | List admins |
| POST | `/admin/admins` | Create admin |
| PUT | `/admin/admins/:id` | Update admin |
| DELETE | `/admin/admins/:id` | Delete admin |

### Admin — Requests (requireAdmin)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/requests` | List requests (filter, paginate) |
| GET | `/admin/requests/:id` | Get request |
| PUT | `/admin/requests/:id/approve` | Approve request |
| PUT | `/admin/requests/:id/decline` | Decline request |

### Admin — Logs & Stats (requireAdmin)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/logs` | Activity logs (filter, paginate) |
| GET | `/admin/stats` | Dashboard stats |

---

## Response Format

**Success:**
```json
{
  "success": true,
  "data": { ... },
  "message": "optional message"
}
```

**Error:**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message"
  }
}
```

---

## Database Scripts

```bash
# Run these inside backend/, or use npm --prefix backend run <script> from mosque-app/
npm run db:migrate    # Run pending migrations
npm run db:generate   # Regenerate Prisma client
npm run db:seed       # Seed with sample data
npm run db:studio     # Open Prisma Studio (visual DB browser)
npm run db:reset      # Reset DB and re-seed (destructive!)
npx prisma migrate reset --force --skip-seed  # Reset DB and keep it empty
```

## Switching to PostgreSQL (production)

In `prisma/schema.prisma`, change:
```prisma
datasource db {
  provider = "postgresql"   # ← change from "sqlite"
  url      = env("DATABASE_URL")
}
```

Then update `DATABASE_URL` in your `.env`:
```
DATABASE_URL="postgresql://user:password@localhost:5432/mosque_app"
```

## SMTP / Email

If `SMTP_HOST`, `SMTP_USER`, and `SMTP_PASS` are set, OTP emails are sent via SMTP.  
Otherwise (development), OTPs are logged to the console — check your terminal output.

## File Uploads

Uploaded files are stored in `backend/uploads/`. The directory is gitignored except for `.gitkeep`.  
Maximum file size: **5 MB**. Allowed types: images (JPEG, PNG, GIF, WebP), PDF, DOC, DOCX.
