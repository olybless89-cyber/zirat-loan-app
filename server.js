import express from 'express';
import path from 'node:path';
import crypto from 'node:crypto';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  CURRENCIES,
  MAX_AMOUNT,
  MIN_AMOUNT,
  normalizePhone,
  validateApplication,
} from './lib/validation.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const CONSENT_VERSION = process.env.CONSENT_VERSION || '2026-11-zirat-v1';
const MONTHLY_RATE = Number(process.env.MONTHLY_RATE || 2.49);
const TERM_MONTHS = Number(process.env.TERM_MONTHS || 36);
const DIST_DIR = path.join(__dirname, 'dist');
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 10;

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', true);
app.use(express.json({ limit: '20kb' }));
app.use((req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.set('X-Frame-Options', 'DENY');
  next();
});

// ---------- storage: Postgres when DATABASE_URL is set, otherwise memory ----------
let pool = null;
const memory = [];

async function initDb() {
  if (!process.env.DATABASE_URL) {
    console.log('DATABASE_URL not set: using in-memory storage (data resets on restart).');
    return;
  }
  const { Pool } = await import('pg');
  const url = process.env.DATABASE_URL;
  const internal = /\.railway\.internal|localhost|127\.0\.0\.1/.test(url);
  pool = new Pool({ connectionString: url, ssl: internal ? false : { rejectUnauthorized: false } });
  for (let attempt = 1; attempt <= 10; attempt += 1) {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS applications (
          id SERIAL PRIMARY KEY,
          reference TEXT UNIQUE NOT NULL,
          full_name TEXT NOT NULL,
          phone TEXT NOT NULL,
          national_id_last4 TEXT NOT NULL,
          amount NUMERIC(14,2) NOT NULL,
          currency TEXT NOT NULL,
          consent_version TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'received',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )`);
      console.log('Database ready.');
      return;
    } catch (error) {
      console.error(`DB init attempt ${attempt} failed: ${error.message}`);
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }
  throw new Error('Could not initialise the database.');
}

function makeReference() {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `ZIR-${stamp}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

// ---------- basic abuse protection ----------
const hits = new Map();
function rateLimit(req, res, next) {
  const key = req.ip || 'unknown';
  const now = Date.now();
  const entry = hits.get(key) || { count: 0, start: now };
  if (now - entry.start > RATE_LIMIT_WINDOW_MS) {
    entry.count = 0;
    entry.start = now;
  }
  entry.count += 1;
  hits.set(key, entry);
  if (entry.count > RATE_LIMIT_MAX) {
    return res.status(429).json({ ok: false, message: 'Too many submissions. Please try again later.' });
  }
  return next();
}

function sameOriginOnly(req, res, next) {
  const origin = req.get('origin');
  if (origin && !origin.startsWith(`${req.protocol}://${req.get('host')}`)) {
    return res.status(403).json({ ok: false, message: 'Request blocked.' });
  }
  return next();
}

// ---------- API ----------
app.get('/healthz', (req, res) => res.json({ ok: true }));

app.get('/api/config', (req, res) => {
  res.json({
    monthlyRate: MONTHLY_RATE,
    termMonths: TERM_MONTHS,
    minAmount: MIN_AMOUNT,
    maxAmount: MAX_AMOUNT,
    currencies: CURRENCIES,
    consentVersion: CONSENT_VERSION,
  });
});

app.post('/api/applications', rateLimit, sameOriginOnly, async (req, res) => {
  const body = req.body || {};
  const input = {
    fullName: typeof body.fullName === 'string' ? body.fullName.trim().replace(/\s+/g, ' ') : '',
    phone: typeof body.phone === 'string' ? body.phone : '',
    nationalId: typeof body.nationalId === 'string' ? body.nationalId.trim() : '',
    amount: body.amount,
    currency: body.currency,
    consent: body.consent === true,
  };

  const errors = validateApplication(input);
  if (Object.keys(errors).length) return res.status(422).json({ ok: false, errors });

  const record = {
    reference: makeReference(),
    fullName: input.fullName,
    phone: normalizePhone(input.phone),
    nationalIdLast4: input.nationalId.slice(-4),
    amount: Number(input.amount),
    currency: input.currency,
    consentVersion: CONSENT_VERSION,
    status: 'received',
    createdAt: new Date().toISOString(),
  };

  try {
    if (pool) {
      await pool.query(
        `INSERT INTO applications (reference, full_name, phone, national_id_last4, amount, currency, consent_version, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          record.reference,
          record.fullName,
          record.phone,
          record.nationalIdLast4,
          record.amount,
          record.currency,
          record.consentVersion,
          record.status,
        ],
      );
    } else {
      memory.push(record);
    }

    return res.status(201).json({
      ok: true,
      reference: record.reference,
      summary: {
        fullName: record.fullName,
        amount: record.amount,
        currency: record.currency,
        status: record.status,
        createdAt: record.createdAt,
      },
    });
  } catch (error) {
    console.error('Insert failed:', error.message);
    return res.status(500).json({
      ok: false,
      message: 'We could not save your application right now. Please try again.',
    });
  }
});

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

initDb()
  .then(() => app.listen(PORT, '0.0.0.0', () => console.log(`Zirat Loan App listening on ${PORT}`)))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
