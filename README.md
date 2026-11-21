# Zirat Loan App

Multi-currency loan landing page with an interactive calculator and an online pre-approval form. Zirat Loan App is a demonstration: no real loans are offered, no credit decisions are made, and the site is not authorised by any regulator. The site says so in its announcement bar, footer and modals.

Requirements: [`docs/requirements.md`](docs/requirements.md).

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
| `TERM_MONTHS` | `36` | Default term shown in `/api/config` |
| `CONSENT_VERSION` | `2026-11-zirat-v1` | Stored with each submission |

## API
- `GET /api/config`: calculator settings
- `POST /api/applications`: validates and stores an application, returns `{ reference, summary }`
- `GET /healthz`: health check

## Data handling
- Application references use the `ZIR-YYYYMMDD-XXXXXX` format.
- The full national ID is never stored. Only the last four digits are kept.
- Client-side analytics events exclude the national ID and telephone number.

## Branding
Brand name, branch details and contact details live in `public/index.html`. Update them there when deploying for a different branch or operator.
