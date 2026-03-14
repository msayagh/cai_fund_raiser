# Centre Zad Al-Imane Fundraiser

Next.js fundraiser site for Centre Zad Al-Imane, with multilingual campaign pages, donation tracking, statistics, sitemap support, and accessibility features.

## Scripts

- `npm run dev`: generate SCSS variables and start the local dev server
- `npm run build`: generate SCSS variables and build the app
- `npm run start`: start the production server
- `npm run lint`: lint the whole repo
- `npm run lint:source`: lint app source files only

## CI/CD

GitHub Actions is configured in [.github/workflows/ci-cd.yml](/Users/asimkhan/projects/cai_fund_raiser/.github/workflows/ci-cd.yml).

- Pull requests and pushes run `npm run lint:source` and `npm run build`
- Pushes to `main` or `master` can deploy automatically to Vercel when these GitHub secrets are set:
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

## Monitoring

Browser-side Sentry bootstrap is wired through:

- [components/SentryInit.jsx](/Users/asimkhan/projects/cai_fund_raiser/components/SentryInit.jsx)
- [lib/monitoring.js](/Users/asimkhan/projects/cai_fund_raiser/lib/monitoring.js)
- [app/global-error.jsx](/Users/asimkhan/projects/cai_fund_raiser/app/global-error.jsx)

Set these environment variables to enable Sentry in production:

- `NEXT_PUBLIC_SENTRY_DSN`
- `NEXT_PUBLIC_SENTRY_ENVIRONMENT`
- `NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE`
- `NEXT_PUBLIC_SENTRY_REPLAYS_SESSION_SAMPLE_RATE`
- `NEXT_PUBLIC_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE`

If no DSN is configured, monitoring falls back to structured console logging.

## Google Sheets

Funded tier syncing is optional and stays disabled unless `NEXT_PUBLIC_GOOGLE_SHEET_APP_URL` is set.

Optional environment variables:

- `NEXT_PUBLIC_GOOGLE_SHEET_APP_URL`
- `NEXT_PUBLIC_GOOGLE_SHEET_FUNDED_TIERS_GID`
- `NEXT_PUBLIC_GOOGLE_DONATIONS_SHEET_URL`
- `NEXT_PUBLIC_GOOGLE_SHEET_DONATIONS_GID`

## Caching

Client-side caching now covers:

- translations in [lib/translationUtils.js](/Users/asimkhan/projects/cai_fund_raiser/lib/translationUtils.js)
- funded tier data and donation rows in [hooks/index.js](/Users/asimkhan/projects/cai_fund_raiser/hooks/index.js)
- cache storage helpers in [lib/clientCache.js](/Users/asimkhan/projects/cai_fund_raiser/lib/clientCache.js)

This cache uses in-memory storage plus browser storage with TTLs so the UI can paint from fresh cached data first, then refresh in the background.
