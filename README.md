# Zirat Loan App

Multi-currency loan pre-approval demo: a React landing page with a live instalment
calculator and a validated application form, backed by a small Express API.

**Live:** <https://amberline-web-production.up.railway.app> · Railway project `amberline-loan-demo`,
service `amberline-web`, environment `production`.

> **Demonstration only.** This application is not a lender, is not authorised to provide
> credit, and makes no credit decisions. It never contacts a credit bureau. Every figure it
> shows is an estimate.

## Stack

| Layer | Choice |
|---|---|
| UI | React 19, Vite 8, Tailwind CSS 4, lucide-react |
| API | Express 5 (ESM) |
| Storage | Postgres via `pg` when `DATABASE_URL` is set, otherwise in-memory |
| Tests | Node assertions for shared logic, Vitest + Testing Library for components |

## Getting started

```bash
npm install
cp .env.example .env      # optional: set contact details, database, rate
npm run dev               # Vite on :5173, proxying /api to :3000
```

For a single-process production-style run:

```bash
npm run build
npm start                 # Express serves dist/ plus the API on :3000
```

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Vite dev server with API proxy |
| `npm run build` | Production bundle into `dist/` |
| `npm start` | Express serving `dist/` and the API |
| `npm test` | Shared-logic assertions, then the component suite |
| `npm run preview` | Serve the built bundle with Vite |

## Structure

```
index.html                 Vite entry
src/
  App.jsx                  Section composition and shared calculator/form state
  components/              AnnouncementBar, Navbar, Hero, TrustBar, HowItWorks,
                           LoanCalculator, ApplicationForm, Testimonials, Footer,
                           Modal, LegalModal, ContactModal, SuccessModal
  config/site.js           Brand and contact details, read from the environment
  data/testimonials.js     Illustrative sample reviews
  lib/analytics.js         Consent-safe lead event, no personal data
  lib/pixels.js            Loads Meta/GA only when IDs are configured
  lib/scroll.js            Section navigation helper
lib/validation.js          Shared validation, checksum, instalment maths
server.js                  Express API and static hosting
test/                      Node assertions and Vitest component tests
docs/requirements.md       Product requirements this build follows
```

## API

| Method | Path | Notes |
|---|---|---|
| `GET` | `/healthz` | Liveness probe |
| `GET` | `/api/config` | Rate, term, amount bounds, currencies, consent version |
| `POST` | `/api/applications` | Validates server-side, stores a record, returns `ZIR-…` reference |

`POST /api/applications` accepts `fullName`, `phone`, `nationalId`, `amount`, `currency`,
`consent`. Invalid input returns `422` with a per-field `errors` object. Requests are rate
limited to ten submissions per IP per ten minutes, and cross-origin posts are rejected.

Only the **last four digits** of the national ID are persisted; the full value is used for
the checksum check and then discarded.

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `3000` | API and static server port |
| `DATABASE_URL` | – | Enables Postgres storage; in-memory otherwise |
| `MONTHLY_RATE` | `2.49` | Monthly rate used by the calculator, in percent |
| `TERM_MONTHS` | `36` | Default term in months |
| `CONSENT_VERSION` | `2026-11-zirat-v1` | Stored with each application |
| `VITE_CONTACT_PHONE` / `_EMAIL` / `_ADDRESS` / `_WHATSAPP` | demo fixtures | Contact details shown in the UI |
| `VITE_SUPPORT_HOURS` | `Mon–Fri, 09:00–18:00 GMT` | Banner and contact hours |
| `VITE_FB_PIXEL_ID`, `VITE_GA_ID` | – | Analytics, loaded only when set |

The fallback contact details are Ofcom drama-range fixtures and are labelled as
demonstration data in the contact dialog. Replace them before publishing.

## Behaviour

- **Calculator** — TRY/USD/EUR/GBP, amount input plus slider (100,000–50,000,000), term
  select, amortised instalment with the formula disclosed on screen. The rate comes from
  `/api/config`, so it is never hard-coded in the copy.
- **Form** — name, Turkish mobile, TC Kimlik with checksum validation, amount, currency and
  an explicit consent checkbox. Errors are announced per field and the first invalid field
  receives focus. A synthetic `99…` ID can be generated for testing; it cannot collide with
  a real ID.
- **Sync** — amount and currency live in `App`, so the calculator and form always agree.
- **Testimonials** — three sample reviews, five-second rotation, pause on hover or focus,
  previous/next and dot controls.
- **Modals** — privacy, KVKK, UK GDPR, contact and success dialogs trap focus, close on
  Escape or backdrop click, and restore focus to the trigger.

## Tests

```bash
npm test
```

`test/validation.test.js` covers the TC Kimlik checksum, phone formats, name rules, amount
bounds, consent and instalment maths. `test/app.test.jsx` covers rendering, currency
conversion, calculator/form sync, the carousel, modal dismissal and the full submit path
including the reference dialog.

## Deploying to Railway

`railway.json` pins the whole pipeline, so a connected repo deploys without extra setup:

| Setting | Value |
|---|---|
| Service | `amberline-web` (project `amberline-loan-demo`) |
| Build | `npm install --include=dev && npm run build` |
| Start | `npm start` |
| Health check | `/healthz` (120 s timeout, restarts on failure) |
| Node | 22 (`.nvmrc`) |

1. In Railway: **New Project → Deploy from GitHub repo → `olybless89-cyber/zirat-loan-app`**, branch `main`.
2. Add **New → Database → PostgreSQL**. Railway injects `DATABASE_URL` into the service; the app creates its `applications` table on first boot.
3. Set the service variables:

   ```
   MONTHLY_RATE=2.49
   TERM_MONTHS=36
   CONSENT_VERSION=2026-11-zirat-v1
   VITE_CONTACT_PHONE=+44 ...
   VITE_CONTACT_EMAIL=applications@...
   VITE_CONTACT_ADDRESS=...
   VITE_SUPPORT_HOURS=Mon–Fri, 09:00–18:00 GMT
   ```

   `VITE_*` values are baked in at build time, so set them before the first deploy — changing them needs a redeploy.
4. Generate a domain under **Settings → Networking**. `PORT` is provided by Railway and read by `server.js`.

Every push to `main` redeploys automatically. Without `DATABASE_URL` the app still boots, but submissions live in memory and disappear on restart.

## Deployment

Any Node 20+ host works. Build, then run the server with `DATABASE_URL` set:

```bash
npm ci && npm run build && PORT=8080 npm start
```

Set the `VITE_*` variables at build time; they are baked into the bundle. Serve over HTTPS —
the form handles personal data.

## Out of scope

No credit bureau integration, no underwriting, no payments, no user accounts and no
back-office tooling. Legal notices are templates and need review before any live use.
