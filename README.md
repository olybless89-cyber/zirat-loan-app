# Amberline Credit (demo)

Fictional multi-currency loan landing page with a calculator and a pre-approval form. Amberline Credit is not a real lender. The site says so in its banner, footer and modals.

## Stack
- Node 18+, Express
- Postgres via `DATABASE_URL` (falls back to in-memory storage when unset)
- One static page in `public/index.html`, with validation shared with the server in `lib/validation.js`

## Run locally
```
npm install
npm test
npm start   # http://localhost:3000
```

## Environment
| Variable | Default | Purpose |
|---|---|---|
| `DATABASE_URL` | — | Postgres connection string |
| `MONTHLY_RATE` | `2.49` | Monthly interest % used by the calculator |
| `CONSENT_VERSION` | `2026-11-demo-v1` | Stored with each submission |

## API
- `GET /api/config`: calculator settings
- `POST /api/applications`: validates and stores an application, returns `{ reference, summary }`
- `GET /healthz`: health check

The full national ID is never stored. Only the last four digits are kept.
