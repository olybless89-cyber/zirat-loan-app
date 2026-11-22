# Zirat Bank London Branch

Multi-currency loan pre-approval demo: a React landing page with a live instalment
calculator and a validated application form, plus two signed-in areas — an applicant
portal for tracking a request and a staff console for reviewing it — backed by a small
Express API.

**Live:** <https://ziraatbank.up.railway.app> · Railway project `amberline-loan-demo`,
service `amberline-web`, environment `production`.

| Area | URL |
| --- | --- |
| Landing page | <https://ziraatbank.up.railway.app> |
| Applicant portal | <https://ziraatbank.up.railway.app/login> |
| Staff sign-in | <https://ziraatbank.up.railway.app/admin/login> |
| Admin — applications | <https://ziraatbank.up.railway.app/admin> |
| Admin — users | <https://ziraatbank.up.railway.app/admin/users> |
| Admin — site settings | <https://ziraatbank.up.railway.app/admin/settings> |

The first boot seeds one **owner** account from the Railway variables `ADMIN_EMAIL` and
`ADMIN_PASSWORD`; the password is stored only as a scrypt hash in the database. From then
on the owner signs in at `/admin/login` and manages every other staff account from
`/admin/users`. Set the variables on the `production` environment in Railway; they are
never committed to this repository. Those environment credentials are also a break-glass
login: they keep working if the owner password is changed in the console or the owner row
is deleted, so a redeploy cannot lock you out.

> **Demonstration only.** This application is not a lender, is not authorised to provide
> credit, and makes no credit decisions. It never contacts a credit bureau. Every figure it
> shows is an estimate.

## Stack

| Layer | Choice |
|---|---|
| UI | React 19, Vite 8, Tailwind CSS 4, lucide-react, React Router 7 |
| API | Express 5 (ESM) |
| Storage | Postgres via `pg` when `DATABASE_URL` is set, otherwise in-memory |
| Auth | HttpOnly session cookies, scrypt password hashing, server-side session records |
| Tests | Node assertions for shared logic and auth, Vitest + Testing Library for components |

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
| `npm test` | Shared-logic and auth assertions, then the component suite |
| `npm run test:api` | Node assertions only (validation, store, auth) |
| `npm run preview` | Serve the built bundle with Vite |

## Structure

```
index.html                 Vite entry
src/
  main.jsx                 Router and session provider
  Router.jsx               Route table and protected-route guard
  App.jsx                  Landing page: sections and shared calculator/form state
  components/              AnnouncementBar, Navbar, Hero, TrustBar, HowItWorks,
                           LoanCalculator, ApplicationForm, Testimonials, Footer,
                           Modal, LegalModal, ContactModal, SuccessModal
  components/dashboard/    AuthLayout, DashboardShell, StatCard, StatusBadge,
                           EventTimeline
  pages/                   ApplicantLogin, ApplicantDashboard, AdminLogin, AdminDashboard
  config/site.js           Brand and contact details, read from the environment
  data/testimonials.js     Illustrative sample reviews
  lib/api.js               Fetch wrapper with typed errors
  lib/session.jsx          Session context, sign-in/sign-out helpers
  lib/format.js            Status labels, dates
  lib/analytics.js         Consent-safe lead event, no personal data
  lib/pixels.js            Loads Meta/GA only when IDs are configured
  lib/scroll.js            Section navigation helper
lib/validation.js          Shared validation, checksum, instalment maths
lib/store.js               Applications, status history and sessions (Postgres or memory)
lib/auth.js                Password hashing, session cookies, rate limits, guards
lib/estimate.js            Instalment estimate shared by both dashboards
routes/                    Public, auth, applicant and admin API routers
server.js                  Express wiring and static hosting
test/                      Node assertions and Vitest component tests
docs/requirements.md       Product requirements this build follows
```

## API

| Method | Path | Notes |
|---|---|---|
| `GET` | `/healthz` | Liveness probe |
| `GET` | `/api/config` | Rate, term, amount bounds, currencies, consent version, storage mode |
| `POST` | `/api/applications` | Validates server-side, stores a record, returns `ZIR-…` reference |
| `GET` | `/api/auth/session` | Current role and subject, or anonymous |
| `POST` | `/api/auth/applicant/login` | Reference + telephone; opens an applicant session |
| `POST` | `/api/auth/admin/login` | Staff email + password; opens an eight-hour session |
| `POST` | `/api/auth/{applicant,admin}/logout` | Clears the session cookie and record |
| `GET` | `/api/applicant/application` | The signed-in applicant's record, public history and estimate |
| `PATCH` | `/api/applicant/application` | Update amount or telephone while the request is open |
| `POST` | `/api/applicant/application/withdraw` | Withdraw a request that is still under consideration |
| `GET` | `/api/admin/stats` | Counts by status, requested value per currency, last seven days |
| `GET` | `/api/admin/applications` | Paged list; filters `q`, `status`, `currency`, `page`, `pageSize` |
| `GET` | `/api/admin/applications/:reference` | One record with its full event history |
| `PATCH` | `/api/admin/applications/:reference` | Change status and/or add a note |
| `GET` | `/api/admin/export.csv` | The filtered list as CSV |
| `DELETE` | `/api/admin/applications/:reference` | Owner only: delete a record and its history |
| `GET` | `/api/admin/me` | The signed-in staff account and its role |
| `GET` | `/api/admin/users` | Staff accounts (never password hashes) |
| `POST` | `/api/admin/users` | Owner only: create a staff account |
| `PATCH` | `/api/admin/users/:id` | Owner only: role, active flag or password reset |
| `DELETE` | `/api/admin/users/:id` | Owner only: remove a staff account |
| `POST` | `/api/admin/users/me/password` | Change your own password with the current one |
| `GET` | `/api/admin/settings` | Current site settings and when they were last saved |
| `PUT` | `/api/admin/settings` | Owner only: validated pricing, currencies and contact details |

`POST /api/applications` accepts `fullName`, `phone`, `nationalId`, `amount`, `currency`,
an optional `termMonths` (6–84, defaulting to `TERM_MONTHS`) and `consent`. Invalid input returns `422` with a per-field `errors` object. Requests are rate
limited to ten submissions per IP per ten minutes, and cross-origin posts are rejected.

Only the **last four digits** of the national ID are persisted; the full value is used for
the checksum check and then discarded.

Sessions are httpOnly, SameSite=Lax cookies holding a random token; only its SHA-256 hash
is stored, so a database read cannot be replayed as a login. Every mutating request must
come from the same origin, and both sign-in endpoints are rate limited.

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `3000` | API and static server port |
| `DATABASE_URL` | – | Enables Postgres storage; in-memory otherwise |
| `MONTHLY_RATE` | `2.49` | Starting monthly rate; owners can change it in the console |
| `CONTACT_PHONE`, `CONTACT_EMAIL`, `CONTACT_WHATSAPP`, `CONTACT_HOURS`, `CONTACT_ADDRESS` | branch details | Starting contact details; owners can change them in the console |
| `TERM_MONTHS` | `36` | Default term in months |
| `CONSENT_VERSION` | `2026-11-zirat-v1` | Stored with each application |
| `ADMIN_EMAIL` | `admin@ziratbank.demo` | Staff console login |
| `ADMIN_PASSWORD` | generated at boot | Staff console password; when unset a one-off value is printed to the log |
| `VITE_CONTACT_PHONE` / `_EMAIL` / `_ADDRESS` / `_WHATSAPP` | branch details | Contact details shown in the UI |
| `VITE_SUPPORT_HOURS` | `Mon–Fri, 09:00–18:00 GMT` | Banner and contact hours |
| `VITE_FB_PIXEL_ID`, `VITE_GA_ID` | – | Analytics, loaded only when set |

The fallback contact details are the London branch's published phone, address and
WhatsApp number. Override them with the `VITE_CONTACT_*` variables if they change.

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

### Applicant portal (`/login`, `/dashboard`)

Sign in with the application reference and the telephone number on the request. Either
`+90 5XX…` or `0 5XX…` is accepted because numbers are compared on their last ten digits.
The portal shows the current status, a public timeline, the requested amount, term and
instalment estimate, and lets the applicant change the amount or telephone, withdraw the
request, print a summary, or copy the reference. Editing closes once a decision is
recorded.

### Staff console (`/admin/login`, `/admin`)

Sign in with the owner credentials from `ADMIN_EMAIL` and `ADMIN_PASSWORD`. The console has
three sections:

- **Applications** (`/admin`) — counts by status, requested value per currency, a
  searchable and filterable table with pagination, and a review dialog with the full event
  history. Staff move a request to `under_review`, `approved`, `declined` or `withdrawn`,
  attach a note and choose whether the applicant sees it. Every change is appended to the
  history with its actor, and the current filter exports as CSV.
- **Users** (`/admin/users`) — the staff accounts that can sign in, and every applicant on
  file. The owner adds accounts, resets passwords, switches roles, disables or deletes
  staff, and can delete an applicant record together with its history. A disabled account
  is signed out on its next request because every admin request re-checks the account.
- **Site settings** (`/admin/settings`) — monthly rate, default term, amount bounds,
  enabled currencies, consent version, announcement bar text, branch contact details and
  the switch that stops new applications. Saving writes one row to the `settings` table;
  `/api/config` and every estimate read it immediately.

Two roles exist. **Owner** accounts can change staff and settings; **admin** accounts can
review applications and see settings read-only. The console refuses to demote, disable or
delete the last active owner, and nobody can demote, disable or delete themselves.

## Tests

```bash
npm test
```

`test/validation.test.js` covers the TC Kimlik checksum, phone formats, name rules, amount
bounds, consent and instalment maths. `test/auth.test.js` covers password hashing, admin
credentials, cookie parsing, the in-memory store (applications, filters, stats, status
history, sessions) and term validation. `test/app.test.jsx` covers the landing page,
currency conversion, calculator/form sync, the carousel, modal dismissal and the full
submit path. `test/dashboard.test.jsx` covers applicant sign-in and the dashboard, the
protected-route redirect, the staff list, the review dialog and recording a decision.

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
   ADMIN_EMAIL=you@yourbranch.example
   ADMIN_PASSWORD=a-long-random-value
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

No credit bureau integration, no underwriting, no payments and no self-service account
registration — applicants identify themselves with their reference and telephone number,
and staff accounts come from the environment. Legal notices are templates and need review
before any live use.
