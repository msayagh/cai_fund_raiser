# Mosque App — Architecture Documentation

This folder explains how the system is built and how to find what you're looking for.

---

## Documents in this folder

| File | What it answers |
|------|----------------|
| [01-system-overview.md](./01-system-overview.md) | Big picture: two apps, how they talk, folder map |
| [02-request-lifecycle.md](./02-request-lifecycle.md) | Step-by-step: how a browser request travels to the database |
| [03-auth-flow.md](./03-auth-flow.md) | Login, JWT tokens, automatic refresh, logout |
| [04-file-map.md](./04-file-map.md) | "Where is the code for X?" — per-feature file index |
| [05-deployment.md](./05-deployment.md) | Docker, Traefik, ports, env vars, production setup |

---

## Quick orientation

```
mosque-app/               ← Next.js 16 frontend (port 3000)
├── app/                  ← Pages (App Router)
├── components/           ← Shared React components
├── lib/                  ← API client functions (what you call from pages)
├── hooks/                ← Custom React hooks
├── translations/         ← i18n strings (en, fr, ar, es, tr, ur, zh)
├── constants/            ← Global config (themes, pillar definitions)
└── documentation/        ← You are here

mosque-app/backend/       ← Express.js backend (port 3001)
├── src/app.js            ← Entry point: middleware + route mounting
├── src/modules/          ← Feature modules (donors, auth, requests…)
├── src/middleware/       ← Auth, validation, error handling
├── src/utils/            ← JWT, logger, response helpers
├── src/config/           ← Env vars, pillar config
├── src/db/client.js      ← Prisma singleton
└── prisma/schema.prisma  ← Database schema
```
