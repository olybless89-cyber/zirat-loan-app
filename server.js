import express from 'express';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { initStore, purgeExpiredSessions } from './lib/store.js';
import { describeAdminAccess, ensureBootstrapAdmin } from './lib/auth.js';
import { DEFAULT_SETTINGS } from './lib/settings.js';
import { createPublicRoutes } from './routes/public.js';
import { createAuthRoutes } from './routes/auth.js';
import { createApplicantRoutes } from './routes/applicant.js';
import { createAdminRoutes } from './routes/admin.js';
import { createMailRoutes } from './routes/mail.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const DIST_DIR = path.join(__dirname, 'dist');

// Stored settings win; these defaults apply until an owner saves a change.
const config = { defaults: DEFAULT_SETTINGS };

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', true);
app.use(express.json({ limit: '128kb' }));
app.use((req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.set('X-Frame-Options', 'DENY');
  next();
});

app.get('/healthz', (req, res) => res.json({ ok: true }));

app.use('/api', createPublicRoutes(config));
app.use('/api', createAuthRoutes());
app.use('/api/applicant', createApplicantRoutes(config));
app.use('/api/admin/mail', createMailRoutes(config));
app.use('/api/admin', createAdminRoutes(config));
app.use('/api', (req, res) => res.status(404).json({ ok: false, message: 'Not found' }));

// ---------- static build ----------
if (existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR, { index: false }));
  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    return res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
} else {
  app.get('/', (req, res) =>
    res
      .status(503)
      .type('text/plain')
      .send('Frontend build not found. Run "npm run build" (or "npm run dev" for the dev server).'),
  );
}

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  console.error('Unhandled error:', error.message);
  return res.status(500).json({ ok: false, message: 'Something went wrong. Please try again.' });
});

initStore()
  .then(() => ensureBootstrapAdmin())
  .then(() => {
    describeAdminAccess();
    setInterval(() => {
      purgeExpiredSessions().catch(() => {});
    }, 60 * 60 * 1000).unref();
    app.listen(PORT, '0.0.0.0', () => console.log(`Zirat Bank listening on ${PORT}`));
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
