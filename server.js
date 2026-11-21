const express = require('express');
const path = require('path');
const crypto = require('crypto');
const V = require('./lib/validation');

const PORT = process.env.PORT || 3000;
const CONSENT_VERSION = process.env.CONSENT_VERSION || '2026-11-demo-v1';
const MONTHLY_RATE = Number(process.env.MONTHLY_RATE || 2.49); // percent per month, shown in the calculator
const TERM_MONTHS = Number(process.env.TERM_MONTHS || 36);

const app = express();
app.disable('x-powered-by');
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
  const { Pool } = require('pg');
  const url = process.env.DATABASE_URL;
  const internal = /\.railway\.internal|localhost|127\.0\.0\.1/.test(url);
  pool = new Pool({ connectionString: url, ssl: internal ? false : { rejectUnauthorized: false } });
  for (let attempt = 1; attempt <= 10; attempt++) {
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
    } catch (e) {
      console.error(`DB init attempt ${attempt} failed: ${e.message}`);
      await new Promise(r => setTimeout(r, 3000));
    }
  }
  throw new Error('Could not initialise the database.');
}

function makeReference() {
  const d = new Date();
  const ymd = d.toISOString().slice(0, 10).replace(/-/g, '');
  return `AMB-${ymd}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

// ---------- API ----------
app.get('/healthz', (req, res) => res.json({ ok: true }));

app.get('/api/config', (req, res) => {
  res.json({ monthlyRate: MONTHLY_RATE, termMonths: TERM_MONTHS, minAmount: V.MIN_AMOUNT, maxAmount: V.MAX_AMOUNT, currencies: V.CURRENCIES, consentVersion: CONSENT_VERSION });
});

app.post('/api/applications', async (req, res) => {
  const b = req.body || {};
  const input = {
    fullName: typeof b.fullName === 'string' ? b.fullName.trim().replace(/\s+/g, ' ') : '',
    phone: typeof b.phone === 'string' ? b.phone : '',
    nationalId: typeof b.nationalId === 'string' ? b.nationalId.trim() : '',
    amount: b.amount,
    currency: b.currency,
    consent: b.consent === true
  };
  const errors = V.validateApplication(input);
  if (Object.keys(errors).length) return res.status(422).json({ ok: false, errors });

  const record = {
    reference: makeReference(),
    fullName: input.fullName,
    phone: V.normalizePhone(input.phone),
    nationalIdLast4: input.nationalId.slice(-4), // full ID is never stored
    amount: Number(input.amount),
    currency: input.currency,
    consentVersion: CONSENT_VERSION,
    status: 'received',
    createdAt: new Date().toISOString()
  };

  try {
    if (pool) {
      await pool.query(
        `INSERT INTO applications (reference, full_name, phone, national_id_last4, amount, currency, consent_version, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [record.reference, record.fullName, record.phone, record.nationalIdLast4, record.amount, record.currency, record.consentVersion, record.status]
      );
    } else {
      memory.push(record);
    }
    res.status(201).json({
      ok: true,
      reference: record.reference,
      summary: { fullName: record.fullName, amount: record.amount, currency: record.currency, status: record.status, createdAt: record.createdAt }
    });
  } catch (e) {
    console.error('Insert failed:', e.message);
    res.status(500).json({ ok: false, message: 'We could not save your application right now. Please try again.' });
  }
});

app.use('/api', (req, res) => res.status(404).json({ ok: false, message: 'Not found' }));

// ---------- static ----------
app.get('/validation.js', (req, res) => res.sendFile(path.join(__dirname, 'lib', 'validation.js')));
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

initDb()
  .then(() => app.listen(PORT, '0.0.0.0', () => console.log(`Amberline demo listening on ${PORT}`)))
  .catch(e => { console.error(e); process.exit(1); });
