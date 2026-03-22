# Volunteering Activities Feature

## Overview

The Volunteering Activities feature allows mosque admins to create and manage volunteer activities (e.g. cleaning days, events, fundraisers), publish schedules for those activities, track sign-ups from donors, and host a per-activity discussion thread. Donors can browse activities, sign up or cancel for specific schedule slots, and participate in discussions.

The feature is **completely hidden** behind a feature toggle. When the toggle is disabled, no UI elements, API routes, or sidebar entries are visible. No existing functionality is affected in any way.

---

## Feature Toggle

### How it works

Two independent environment variables control the feature:

| Variable | Location | Default | Purpose |
|---|---|---|---|
| `FEATURE_VOLUNTEERING` | `backend/.env` | `false` | Enables the backend API routes |
| `NEXT_PUBLIC_FEATURE_VOLUNTEERING` | `mosque-app/.env` | `false` | Enables the frontend UI elements |

Both must be set to `true` to fully enable the feature.

### Enabling the feature

**Backend** (`mosque-app/backend/.env`):
```
FEATURE_VOLUNTEERING=true
```

**Frontend** (`mosque-app/.env`):
```
NEXT_PUBLIC_FEATURE_VOLUNTEERING=true
```

Restart both services after changing env vars.

### How the toggle is enforced

**Backend:** The `featureFlag` middleware factory (`backend/src/middleware/featureFlag.js`) reads from `backend/src/config/features.js` (which reads the env var at startup). All volunteering routes — both admin and donor — are guarded with `featureFlag('VOLUNTEERING')` as the first middleware. If the flag is `false`, the route returns `404 Not Found`.

**Frontend:** `constants/features.js` exports `FEATURES.VOLUNTEERING` (evaluated at build time from `process.env.NEXT_PUBLIC_FEATURE_VOLUNTEERING`). Every UI entry point checks this flag:
- `components/AdminSidebar.jsx` — the "Volunteering" tab is conditionally included in `mainTabs`
- `app/admin/dashboard/page.jsx` — `<VolunteeringSection>` is only rendered when flag is `true`
- `app/donor/dashboard/page.jsx` — the volunteering sidenav button and `<VolunteeringTab>` section are only rendered when flag is `true`
- `VolunteeringSection.jsx` and `VolunteeringTab.jsx` — each has an early `if (!FEATURES.VOLUNTEERING) return null` guard

---

## Database Changes

Schema file: `backend/prisma/schema.prisma`

### New models

All new. No existing models were modified structurally (only non-breaking back-relations were added to `Donor` and `Admin`).

#### `VolunteerActivity`
Represents a recurring volunteer activity definition.

| Field | Type | Notes |
|---|---|---|
| `id` | Int PK | |
| `title` | String | |
| `description` | String? | |
| `skills` | String? | Comma-separated tags |
| `maxVolunteers` | Int | 0 = unlimited |
| `recurrenceType` | String | `none`, `weekly`, `custom` |
| `recurrenceNote` | String? | Human-readable recurrence description |
| `isActive` | Boolean | Default true |
| `createdById` | Int | FK → Admin |
| `createdAt` | DateTime | |
| `updatedAt` | DateTime | |

#### `ActivitySchedule`
A specific date/time occurrence of a `VolunteerActivity`.

| Field | Type | Notes |
|---|---|---|
| `id` | Int PK | |
| `activityId` | Int | FK → VolunteerActivity |
| `scheduledAt` | DateTime | |
| `location` | String? | |
| `notes` | String? | |
| `maxVolunteers` | Int? | Overrides parent activity's limit (null = use parent) |
| `status` | String | `upcoming`, `completed`, `cancelled` |
| `createdAt` | DateTime | |

#### `ActivitySignup`
A donor's sign-up for a specific `ActivitySchedule`.

| Field | Type | Notes |
|---|---|---|
| `id` | Int PK | |
| `scheduleId` | Int | FK → ActivitySchedule |
| `donorId` | Int | FK → Donor |
| `status` | String | `signed_up`, `cancelled`, `attended` |
| `note` | String? | Donor's optional note |
| `createdAt` | DateTime | |
| `updatedAt` | DateTime | |

Unique constraint: `@@unique([scheduleId, donorId])` — one signup per donor per schedule.

#### `ActivityDiscussion`
A discussion message posted on a `VolunteerActivity` thread.

| Field | Type | Notes |
|---|---|---|
| `id` | Int PK | |
| `activityId` | Int | FK → VolunteerActivity |
| `authorName` | String | Stored display name at time of posting |
| `authorRole` | String | `admin` or `donor` |
| `message` | String | |
| `createdAt` | DateTime | |

### Applying schema changes

```bash
cd mosque-app/backend
npx prisma db push
```

> **Note:** `prisma db push` is the project's standard workflow (no migration files). Run this when the database server is available.

---

## API Endpoints

Base URL: `http://localhost:3001`

All endpoints require the `FEATURE_VOLUNTEERING` flag to be `true` on the backend, otherwise they return `404`.

### Admin endpoints

Prefix: `/api/admin/volunteering`  
Auth: requires admin session cookie (`requireAdmin`)

| Method | Path | Description |
|---|---|---|
| `GET` | `/` | List all activities (includes schedules) |
| `POST` | `/` | Create a new activity |
| `GET` | `/:id` | Get single activity with schedules, signups, discussions |
| `PATCH` | `/:id` | Update activity fields |
| `DELETE` | `/:id` | Deactivate activity (sets `isActive = false`) |
| `POST` | `/:id/schedules` | Add a schedule to an activity |
| `PATCH` | `/:id/schedules/:scheduleId` | Update a schedule |
| `DELETE` | `/:id/schedules/:scheduleId` | Delete a schedule (only if no signups) |
| `GET` | `/:id/signups` | List all signups for an activity |
| `POST` | `/:id/discussion` | Post a discussion message as admin |

### Donor endpoints

Prefix: `/api/volunteering`  
Auth: requires donor session cookie (`requireDonor`)

| Method | Path | Description |
|---|---|---|
| `GET` | `/` | List active activities with upcoming schedules |
| `GET` | `/:id` | Get activity detail with schedules and donor's own signup status |
| `GET` | `/my-signups` | List the donor's own signups (all statuses) |
| `POST` | `/signups` | Sign up for a schedule (`{ scheduleId, note? }`) |
| `DELETE` | `/signups/:scheduleId` | Cancel own signup for a schedule |
| `PATCH` | `/signups/:scheduleId/note` | Update own note on a signup |
| `POST` | `/:id/discussion` | Post a discussion message as donor |

---

## File Map

### New files

| File | Purpose |
|---|---|
| `backend/src/config/features.js` | Feature flag config (reads env vars) |
| `backend/src/middleware/featureFlag.js` | Middleware factory that 404s when flag is off |
| `backend/src/modules/volunteering/volunteering.service.js` | All business logic (14 functions) |
| `backend/src/modules/volunteering/volunteering.schema.js` | Zod validation schemas |
| `backend/src/modules/volunteering/volunteering.admin.controller.js` | Admin request handlers |
| `backend/src/modules/volunteering/volunteering.admin.routes.js` | Admin Express router |
| `backend/src/modules/volunteering/volunteering.donor.controller.js` | Donor request handlers |
| `backend/src/modules/volunteering/volunteering.donor.routes.js` | Donor Express router |
| `constants/features.js` | Frontend feature flag (reads `NEXT_PUBLIC_*` env var) |
| `lib/volunteeringApi.js` | Frontend fetch helpers (admin + donor) |
| `app/admin/dashboard/VolunteeringSection.jsx` | Admin UI component |
| `app/donor/dashboard/VolunteeringTab.jsx` | Donor UI component |
| `app/styles/_volunteering.scss` | All volunteering-specific styles |
| `documentation/06-volunteering-feature.md` | This file |

### Modified files (minimal, additive changes only)

| File | What changed |
|---|---|
| `backend/prisma/schema.prisma` | Added 4 new models + 2 non-breaking back-relations |
| `backend/src/app.js` | Mounted 2 new route modules |
| `components/AdminSidebar.jsx` | Added volunteering tab entry + SVG icon (feature-flagged) |
| `app/admin/dashboard/page.jsx` | Added `<VolunteeringSection>` render + `'volunteering'` to tab whitelist |
| `app/donor/dashboard/page.jsx` | Added volunteering sidenav button + `<VolunteeringTab>` section |
| `app/page.scss` | Added `@import 'styles/volunteering'` |
| `translations/en.js` | Added volunteering keys to both `admin:` and `donor:` sections |
| `backend/.env` | Added `FEATURE_VOLUNTEERING=false` |
| `mosque-app/.env` | Added `NEXT_PUBLIC_FEATURE_VOLUNTEERING=false` |

---

## Capacity Logic

Volunteer capacity is checked in `volunteering.service.js → signUp()`:

1. If `schedule.maxVolunteers` is not null, it overrides the activity-level limit.
2. If `schedule.maxVolunteers` is null, the activity's `maxVolunteers` is used.
3. If the effective limit is `0`, capacity is unlimited.
4. Otherwise, an active signup count (status = `signed_up`) is compared to the limit. If at capacity, an `AppError('Activity schedule is full', 409, 'CONFLICT')` is thrown.

---

## Extending the Feature

- **Add a new activity field:** Add to `VolunteerActivity` in `schema.prisma`, update `createActivitySchema` / `updateActivitySchema` in `volunteering.schema.js`, update `createActivity` / `updateActivity` in `volunteering.service.js`, and update the form in `VolunteeringSection.jsx`.
- **Add admin status management for signups:** Add a `PATCH /api/admin/volunteering/:id/signups/:signupId` route that calls a new `updateSignupStatus` service function. Update the admin signups table accordingly.
- **Email notifications on sign-up:** Call the existing email service from `volunteering.service.js → signUp()` after the Prisma create.
- **Disable the feature entirely:** Set both env vars back to `false` and restart. No data is deleted.
