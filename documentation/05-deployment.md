# 05 — Deployment & Production Setup

How the system runs in production and how to configure it.

---

## Production architecture

```
Internet
    │  HTTPS (port 443)
    ▼
┌──────────────────────────────────────────────────────────┐
│  Traefik (reverse proxy, TLS termination)                │
│  runs in Docker on the same host                         │
│  network: root_default                                   │
└────────────────┬─────────────────────┬───────────────────┘
                 │                     │
   all paths     │                     │  PathPrefix: /api
                 ▼                     ▼
    ┌────────────────────┐  ┌──────────────────────────┐
    │  mosque-frontend   │  │  mosque-backend-1         │
    │  Next.js           │  │  Express                  │
    │  Container port    │  │  Container port 3001      │
    │  3000              │  │  Host port 3001 mapped    │
    └────────────────────┘  └──────────────────────────┘
                                       │
                            ┌──────────▼───────────┐
                            │  SQLite (dev) or      │
                            │  MySQL (prod)         │
                            │  Volume: backend_     │
                            │  sqlite_data          │
                            └──────────────────────┘
```

---

## Docker containers

### Frontend — [`docker-compose.yml`](../docker-compose.yml)

```yaml
services:
  frontend:
    build:
      context: ./
      dockerfile: Dockerfile       # mosque-app/Dockerfile
    container_name: mosque-frontend
    expose:
      - "3000"                     # Only visible inside Docker network
    env_file:
      - .env                       # Includes NEXT_PUBLIC_API_URL
    labels:
      - "traefik.http.routers.portal.rule=Host(`portal.ccai-stjean.org`)"
      - "traefik.http.services.portal.loadbalancer.server.port=3000"
    networks:
      - root_default               # Traefik's network
```

### Backend — [`backend/docker-compose.dev.yml`](../backend/docker-compose.dev.yml)

```yaml
services:
  backend:
    build:
      context: ./
      dockerfile: Dockerfile       # backend/Dockerfile
    container_name: mosque-backend-1
    expose:
      - "3001"
    ports:
      - "3001:3001"                # Also mapped to host for direct dev access
    env_file:
      - .env                       # Backend secrets (JWT, SMTP, DB URL)
    labels:
      - "traefik.http.routers.portal-api.rule=Host(`portal.ccai-stjean.org`) && PathPrefix(`/api`)"
      - "traefik.http.services.portal-api.loadbalancer.server.port=3001"
    volumes:
      - backend_sqlite_data:/app/data      # Database file persistence
      - backend_uploads:/app/uploads       # Uploaded files
      - backend_logs:/app/logs             # Application logs
```

---

## Dockerfile walkthrough

### Frontend — [`Dockerfile`](../Dockerfile)

```dockerfile
FROM node:20-alpine

WORKDIR /portal
COPY package*.json ./
RUN npm install

COPY . .
COPY .env .env         # Bakes NEXT_PUBLIC_* vars into the build

RUN npm run build      # next build (Turbopack)

EXPOSE 3000
CMD ["npm", "run", "start"]   # next start
```

> **Important:** `NEXT_PUBLIC_*` variables are baked into the JS bundle at build time.
> If you change `NEXT_PUBLIC_API_URL`, you must rebuild the frontend image.

### Backend — [`backend/Dockerfile`](../backend/Dockerfile)

```dockerfile
FROM node:20-bookworm-slim

WORKDIR /app
RUN apt-get install -y openssl ca-certificates  # Prisma binary deps

COPY package*.json ./
RUN npm ci              # Clean install (no devDeps in prod)

COPY . .
RUN npm run db:generate             # Generate Prisma client
RUN mkdir -p /app/data /app/uploads /app/logs

ENV NODE_ENV=production

EXPOSE 3001
CMD ["./scripts/docker-start.sh"]  # Runs migrations then server.js
```

### Backend startup script — `backend/scripts/docker-start.sh`

This script runs **every time the container starts**:
1. `npx prisma migrate deploy` — apply any pending migrations
2. `node server.js` — start Express

---

## Environment variables

### Frontend — `mosque-app/.env`

| Variable | Example | Purpose |
|----------|---------|---------|
| `NEXT_PUBLIC_API_URL` | `https://portal.ccai-stjean.org` | Base URL for API calls from browser. **Do not include `/api` suffix.** |
| `NEXT_PUBLIC_SITE_URL` | `https://portal.ccai-stjean.org` | Used for SEO meta tags |
| `NEXT_PUBLIC_GOOGLE_SHEET_APP_URL` | `https://docs.google.com/...` | Public Google Sheet URL |

> In production, `NEXT_PUBLIC_API_URL` should be the root domain (no `/api` suffix)
> because the frontend uses relative paths like `/api/admin/donors`.
> Traefik handles routing `/api/*` to Express.

### Backend — `backend/.env`

| Variable | Required | Purpose |
|----------|----------|---------|
| `PORT` | No (default: 3001) | Express listen port |
| `NODE_ENV` | Yes | `development` or `production` |
| `DATABASE_URL` | Yes | Full Prisma connection string |
| `DB_PROVIDER` | Yes | `sqlite` or `mysql` |
| `JWT_ACCESS_SECRET` | Yes | Min 32 chars — signs access tokens |
| `JWT_REFRESH_SECRET` | Yes | Min 32 chars — signs refresh tokens |
| `SMTP_HOST` | Yes | Email server hostname |
| `SMTP_PORT` | Yes | `587` (TLS) or `465` (SSL) |
| `SMTP_USER` | Yes | SMTP username |
| `SMTP_PASS` | Yes | SMTP password / app password |
| `EMAIL_FROM` | Yes | `"Mosque App <noreply@mosque.com>"` |
| `FRONTEND_URL` | Yes | `https://portal.ccai-stjean.org` (CORS allowlist) |

All variables are validated at startup using **Zod** in [`backend/src/config/env.js`](../backend/src/config/env.js).
If any required variable is missing, the backend **refuses to start** and prints the error.

---

## Database

### Provider selection

The backend supports two databases, selected via `DB_PROVIDER`:

| `DB_PROVIDER` | `DATABASE_URL` format | Use case |
|----------|------|---------|
| `sqlite` | `file:/app/data/dev.db` | Development, simple deployments |
| `mysql` | `mysql://user:pass@host:3306/db` | Production, multi-instance |

Database config: [`backend/src/config/database.js`](../backend/src/config/database.js)

### Migrations

Migrations are auto-generated SQL files stored in `backend/prisma/migrations/`.

```bash
# Generate a new migration after editing schema.prisma:
cd backend
npx prisma migrate dev --name <migration_name>

# Apply migrations in production (done automatically on container start):
npx prisma migrate deploy

# Open Prisma Studio (visual DB browser):
npx prisma studio
```

### Volumes (data persistence)

| Volume | Container path | Contains |
|--------|---------------|---------|
| `backend_sqlite_data` | `/app/data` | SQLite database file |
| `backend_uploads` | `/app/uploads` | Uploaded files (request attachments, receipts) |
| `backend_logs` | `/app/logs` | Winston log files (`app.log`) |

---

## Local development

### Starting the backend

```bash
cd backend
cp .env.example .env      # Fill in your values
npm install
npx prisma migrate dev    # Create/update DB
npm run dev               # nodemon with hot reload
```

Backend runs on: `http://localhost:3001`

### Starting the frontend

```bash
cd mosque-app
cp .env.example .env      # Set NEXT_PUBLIC_API_URL=http://localhost:3001
npm install
npm run dev               # Next.js dev server with Turbopack
```

Frontend runs on: `http://localhost:3000`

### How CSS upload works locally

In local dev, `NEXT_PUBLIC_API_URL` is `http://localhost:3001`. Because of CORS, the browser **cannot** send multipart data directly to `localhost:3001` (the XHR uses a relative URL `/api/admin/donors/bulk/upload`).

The Next.js API route at [`app/api/admin/donors/bulk/upload/route.js`](../app/api/admin/donors/bulk/upload/route.js) acts as a **server-side proxy**:

```
Browser XHR (relative URL)
  POST /api/admin/donors/bulk/upload
        ↓
  Next.js server (localhost:3000)
  app/api/admin/donors/bulk/upload/route.js
        ↓  server-to-server (localhost:3001 reachable)
  Express backend
  POST /api/admin/donors/bulk/upload
```

In production, Traefik routes `/api/*` directly to Express — the proxy route is never hit.

---

## Traefik routing rules

| Rule | Target | Purpose |
|------|--------|---------|
| `Host(portal.ccai-stjean.org)` | mosque-frontend:3000 | All frontend pages |
| `Host(portal.ccai-stjean.org) && PathPrefix(/api)` | mosque-backend-1:3001 | All API calls |

> **The `/api` PathPrefix goes to Express**, so in production all API URLs
> in the browser are relative to the current origin and work without any CORS issues.

---

## Deploying a new version

### Frontend change

```bash
# On the server:
cd mosque-app
git pull
docker compose build frontend
docker compose up -d frontend
```

> Images bake in the `.env` vars at build time — ensure `.env` is up to date before building.

### Backend change

```bash
cd mosque-app/backend
git pull
docker compose -f docker-compose.dev.yml build backend
docker compose -f docker-compose.dev.yml up -d backend
# Migrations run automatically on container start
```

### Schema change (new migration)

```bash
# Locally first:
cd backend
npx prisma migrate dev --name <name>
git add prisma/migrations
git commit -m "feat: add migration <name>"
git push

# On the server, rebuild + restart backend (migration applies on startup)
```

---

## Log files

Application logs are written by Winston to Docker volumes and the console:

| Log | Location | Contains |
|-----|----------|---------|
| HTTP access log | Console + `logs/app.log` | Every incoming request (Morgan combined format) |
| Application log | `logs/app.log` | Info, warnings, errors from the app |
| Error details | `logs/app.log` | Stack traces in development, messages only in production |

Read logs:
```bash
docker logs mosque-backend-1              # Container stdout
docker exec mosque-backend-1 tail -f /app/logs/app.log   # Log file
```
