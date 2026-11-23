import crypto from 'node:crypto';
import { normalizePhone, phoneKey } from './validation.js';
import { databaseSslConfig } from './db-config.js';

export const STATUSES = ['received', 'under_review', 'approved', 'declined', 'withdrawn'];
export const ACTIVE_STATUSES = ['received', 'under_review'];
export const DEFAULT_TERM_MONTHS = 36;

const SCHEMA = `
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
  );
  ALTER TABLE applications ADD COLUMN IF NOT EXISTS term_months INTEGER NOT NULL DEFAULT 36;
  ALTER TABLE applications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  CREATE INDEX IF NOT EXISTS applications_status_idx ON applications (status);
  CREATE INDEX IF NOT EXISTS applications_created_idx ON applications (created_at DESC);

  CREATE TABLE IF NOT EXISTS application_events (
    id SERIAL PRIMARY KEY,
    reference TEXT NOT NULL,
    status TEXT,
    note TEXT,
    actor TEXT NOT NULL,
    visibility TEXT NOT NULL DEFAULT 'internal',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS application_events_reference_idx ON application_events (reference, created_at);

  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    role TEXT NOT NULL,
    subject TEXT NOT NULL,
    ip TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
  );
  CREATE INDEX IF NOT EXISTS sessions_expires_idx ON sessions (expires_at);

  CREATE TABLE IF NOT EXISTS admin_users (
    id SERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin',
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMPTZ
  );

  CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY,
    data JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
`;

let pool = null;
const memory = {
  applications: [],
  events: [],
  sessions: [],
  adminUsers: [],
  settings: null,
  nextEventId: 1,
  nextAdminUserId: 1,
};

const toIso = (value) => (value instanceof Date ? value.toISOString() : value);

function mapApplication(row) {
  if (!row) return null;
  return {
    reference: row.reference,
    fullName: row.full_name,
    phone: row.phone,
    nationalIdLast4: row.national_id_last4,
    amount: Number(row.amount),
    currency: row.currency,
    termMonths: Number(row.term_months ?? DEFAULT_TERM_MONTHS),
    consentVersion: row.consent_version,
    status: row.status,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at ?? row.created_at),
  };
}

function mapEvent(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    reference: row.reference,
    status: row.status,
    note: row.note,
    actor: row.actor,
    visibility: row.visibility,
    createdAt: toIso(row.created_at),
  };
}

export function isPersistent() {
  return Boolean(pool);
}

export async function initStore(databaseUrl = process.env.DATABASE_URL) {
  if (!databaseUrl) {
    console.log('DATABASE_URL not set: using in-memory storage (data resets on restart).');
    return false;
  }
  const { Pool } = await import('pg');
  pool = new Pool({ connectionString: databaseUrl, ssl: databaseSslConfig(databaseUrl) });
  for (let attempt = 1; attempt <= 10; attempt += 1) {
    try {
      await pool.query(SCHEMA);
      console.log('Database ready.');
      return true;
    } catch (error) {
      console.error(`DB init attempt ${attempt} failed: ${error.message}`);
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }
  throw new Error('Could not initialise the database.');
}

export function makeReference() {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `ZIR-${stamp}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

export function normalizeReference(value) {
  return String(value || '').trim().toUpperCase();
}

async function insertEvent(reference, { status = null, note = null, actor, visibility = 'internal' }) {
  const cleanNote = note ? String(note).slice(0, 500) : null;
  if (pool) {
    const { rows } = await pool.query(
      `INSERT INTO application_events (reference, status, note, actor, visibility)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [reference, status, cleanNote, actor, visibility],
    );
    return mapEvent(rows[0]);
  }
  const event = {
    id: memory.nextEventId,
    reference,
    status,
    note: cleanNote,
    actor,
    visibility,
    createdAt: new Date().toISOString(),
  };
  memory.nextEventId += 1;
  memory.events.push(event);
  return event;
}

export async function addEvent(reference, payload) {
  return insertEvent(reference, payload);
}

export async function createApplication(input) {
  const now = new Date().toISOString();
  const record = {
    reference: makeReference(),
    fullName: input.fullName,
    phone: normalizePhone(input.phone),
    nationalIdLast4: input.nationalIdLast4,
    amount: Number(input.amount),
    currency: input.currency,
    termMonths: Number(input.termMonths) || DEFAULT_TERM_MONTHS,
    consentVersion: input.consentVersion,
    status: 'received',
    createdAt: now,
    updatedAt: now,
  };

  if (pool) {
    const { rows } = await pool.query(
      `INSERT INTO applications
         (reference, full_name, phone, national_id_last4, amount, currency, term_months, consent_version, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [
        record.reference,
        record.fullName,
        record.phone,
        record.nationalIdLast4,
        record.amount,
        record.currency,
        record.termMonths,
        record.consentVersion,
        record.status,
      ],
    );
    await insertEvent(record.reference, {
      status: 'received',
      actor: 'applicant',
      visibility: 'public',
      note: 'Application submitted.',
    });
    return mapApplication(rows[0]);
  }

  memory.applications.push(record);
  await insertEvent(record.reference, {
    status: 'received',
    actor: 'applicant',
    visibility: 'public',
    note: 'Application submitted.',
  });
  return record;
}

export async function findApplicationByReference(reference) {
  const ref = normalizeReference(reference);
  if (!ref) return null;
  if (pool) {
    const { rows } = await pool.query('SELECT * FROM applications WHERE reference = $1', [ref]);
    return mapApplication(rows[0]);
  }
  return memory.applications.find((item) => item.reference === ref) || null;
}

export async function findApplicationByReferenceAndPhone(reference, phone) {
  const ref = normalizeReference(reference);
  const key = phoneKey(phone);
  if (!ref || !key) return null;
  if (pool) {
    const { rows } = await pool.query(
      `SELECT * FROM applications
       WHERE reference = $1 AND RIGHT(regexp_replace(phone, '\\D', '', 'g'), 10) = $2`,
      [ref, key],
    );
    return mapApplication(rows[0]);
  }
  return (
    memory.applications.find(
      (item) => item.reference === ref && phoneKey(item.phone) === key,
    ) || null
  );
}

function buildFilters({ status, currency, q } = {}) {
  const where = [];
  const params = [];
  if (status && STATUSES.includes(status)) {
    params.push(status);
    where.push(`status = $${params.length}`);
  }
  if (currency) {
    params.push(currency);
    where.push(`currency = $${params.length}`);
  }
  const term = String(q || '').trim();
  if (term) {
    params.push(`%${term}%`);
    where.push(
      `(reference ILIKE $${params.length} OR full_name ILIKE $${params.length} OR phone ILIKE $${params.length})`,
    );
  }
  return { clause: where.length ? `WHERE ${where.join(' AND ')}` : '', params, term };
}

function matchesFilters(item, { status, currency, q }) {
  if (status && item.status !== status) return false;
  if (currency && item.currency !== currency) return false;
  const term = String(q || '').trim().toLowerCase();
  if (!term) return true;
  return (
    item.reference.toLowerCase().includes(term) ||
    item.fullName.toLowerCase().includes(term) ||
    item.phone.toLowerCase().includes(term)
  );
}

export async function listApplications({ status, currency, q, page = 1, pageSize = 10 } = {}) {
  const pageNum = Math.max(1, Number(page) || 1);
  const size = Math.min(50, Math.max(1, Number(pageSize) || 10));

  if (pool) {
    const { clause, params } = buildFilters({ status, currency, q });
    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total FROM applications ${clause}`,
      params,
    );
    const total = countResult.rows[0]?.total ?? 0;
    const { rows } = await pool.query(
      `SELECT * FROM applications ${clause}
       ORDER BY created_at DESC, id DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, size, (pageNum - 1) * size],
    );
    return {
      items: rows.map(mapApplication),
      total,
      page: pageNum,
      pageSize: size,
      pages: Math.max(1, Math.ceil(total / size)),
    };
  }

  const filtered = memory.applications
    .filter((item) => matchesFilters(item, { status, currency, q }))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const total = filtered.length;
  return {
    items: filtered.slice((pageNum - 1) * size, pageNum * size),
    total,
    page: pageNum,
    pageSize: size,
    pages: Math.max(1, Math.ceil(total / size)),
  };
}

export async function listAllApplications({ status, currency, q } = {}) {
  if (pool) {
    const { clause, params } = buildFilters({ status, currency, q });
    const { rows } = await pool.query(
      `SELECT * FROM applications ${clause} ORDER BY created_at DESC, id DESC LIMIT 5000`,
      params,
    );
    return rows.map(mapApplication);
  }
  return memory.applications
    .filter((item) => matchesFilters(item, { status, currency, q }))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, 5000);
}

export async function applicationStats() {
  const empty = {
    total: 0,
    active: 0,
    last7Days: 0,
    byStatus: Object.fromEntries(STATUSES.map((status) => [status, 0])),
    valueByCurrency: {},
  };

  if (pool) {
    const [byStatus, byCurrency, recent] = await Promise.all([
      pool.query('SELECT status, COUNT(*)::int AS count FROM applications GROUP BY status'),
      pool.query(
        `SELECT currency, COALESCE(SUM(amount), 0) AS total
         FROM applications WHERE status <> 'withdrawn' GROUP BY currency`,
      ),
      pool.query(
        `SELECT COUNT(*)::int AS count FROM applications WHERE created_at > NOW() - INTERVAL '7 days'`,
      ),
    ]);
    const stats = { ...empty, byStatus: { ...empty.byStatus } };
    for (const row of byStatus.rows) {
      stats.byStatus[row.status] = row.count;
      stats.total += row.count;
    }
    for (const row of byCurrency.rows) {
      stats.valueByCurrency[row.currency] = Number(row.total);
    }
    stats.active = (stats.byStatus.received || 0) + (stats.byStatus.under_review || 0);
    stats.last7Days = recent.rows[0]?.count ?? 0;
    return stats;
  }

  const stats = { ...empty, byStatus: { ...empty.byStatus } };
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  for (const item of memory.applications) {
    stats.total += 1;
    stats.byStatus[item.status] = (stats.byStatus[item.status] || 0) + 1;
    if (item.status !== 'withdrawn') {
      stats.valueByCurrency[item.currency] =
        (stats.valueByCurrency[item.currency] || 0) + item.amount;
    }
    if (new Date(item.createdAt).getTime() > weekAgo) stats.last7Days += 1;
  }
  stats.active = (stats.byStatus.received || 0) + (stats.byStatus.under_review || 0);
  return stats;
}

export async function updateApplicationStatus(
  reference,
  { status, note = null, actor = 'admin', visibility = 'public' },
) {
  if (!STATUSES.includes(status)) throw new Error(`Unknown status: ${status}`);
  const ref = normalizeReference(reference);
  const now = new Date().toISOString();

  if (pool) {
    const { rows } = await pool.query(
      'UPDATE applications SET status = $2, updated_at = NOW() WHERE reference = $1 RETURNING *',
      [ref, status],
    );
    if (!rows.length) return null;
    await insertEvent(ref, { status, note, actor, visibility });
    return mapApplication(rows[0]);
  }

  const record = memory.applications.find((item) => item.reference === ref);
  if (!record) return null;
  record.status = status;
  record.updatedAt = now;
  await insertEvent(ref, { status, note, actor, visibility });
  return record;
}

export async function updateApplicationDetails(reference, { amount, phone }) {
  const ref = normalizeReference(reference);
  const now = new Date().toISOString();

  if (pool) {
    const { rows } = await pool.query(
      `UPDATE applications
       SET amount = COALESCE($2, amount), phone = COALESCE($3, phone), updated_at = NOW()
       WHERE reference = $1 RETURNING *`,
      [ref, amount ?? null, phone ? normalizePhone(phone) : null],
    );
    if (!rows.length) return null;
    await insertEvent(ref, {
      status: null,
      actor: 'applicant',
      visibility: 'public',
      note: 'Applicant updated the request details.',
    });
    return mapApplication(rows[0]);
  }

  const record = memory.applications.find((item) => item.reference === ref);
  if (!record) return null;
  if (amount !== undefined && amount !== null) record.amount = Number(amount);
  if (phone) record.phone = normalizePhone(phone);
  record.updatedAt = now;
  await insertEvent(ref, {
    status: null,
    actor: 'applicant',
    visibility: 'public',
    note: 'Applicant updated the request details.',
  });
  return record;
}

export async function listEvents(reference, { visibility = null } = {}) {
  const ref = normalizeReference(reference);
  if (!ref) return [];
  if (pool) {
    const { rows } = visibility
      ? await pool.query(
          'SELECT * FROM application_events WHERE reference = $1 AND visibility = $2 ORDER BY created_at ASC, id ASC',
          [ref, visibility],
        )
      : await pool.query(
          'SELECT * FROM application_events WHERE reference = $1 ORDER BY created_at ASC, id ASC',
          [ref],
        );
    return rows.map(mapEvent);
  }
  return memory.events
    .filter((event) => event.reference === ref && (!visibility || event.visibility === visibility))
    .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
}

export async function createSession({ tokenHash, role, subject, expiresAt, ip, userAgent }) {
  const expires = expiresAt instanceof Date ? expiresAt.toISOString() : expiresAt;
  if (pool) {
    await pool.query(
      `INSERT INTO sessions (token_hash, role, subject, ip, user_agent, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [tokenHash, role, subject, ip || null, userAgent || null, expires],
    );
    return;
  }
  memory.sessions.push({
    tokenHash,
    role,
    subject,
    ip: ip || null,
    userAgent: userAgent || null,
    createdAt: new Date().toISOString(),
    expiresAt: expires,
  });
}

export async function findSession(tokenHash) {
  if (!tokenHash) return null;
  if (pool) {
    const { rows } = await pool.query('SELECT * FROM sessions WHERE token_hash = $1', [tokenHash]);
    const row = rows[0];
    if (!row) return null;
    if (new Date(row.expires_at).getTime() <= Date.now()) {
      await pool.query('DELETE FROM sessions WHERE token_hash = $1', [tokenHash]);
      return null;
    }
    return { role: row.role, subject: row.subject, expiresAt: toIso(row.expires_at) };
  }
  const session = memory.sessions.find((item) => item.tokenHash === tokenHash);
  if (!session) return null;
  if (new Date(session.expiresAt).getTime() <= Date.now()) {
    memory.sessions = memory.sessions.filter((item) => item.tokenHash !== tokenHash);
    return null;
  }
  return { role: session.role, subject: session.subject, expiresAt: session.expiresAt };
}

export async function deleteSession(tokenHash) {
  if (!tokenHash) return;
  if (pool) {
    await pool.query('DELETE FROM sessions WHERE token_hash = $1', [tokenHash]);
    return;
  }
  memory.sessions = memory.sessions.filter((item) => item.tokenHash !== tokenHash);
}

export async function purgeExpiredSessions() {
  if (pool) {
    await pool.query('DELETE FROM sessions WHERE expires_at < NOW()');
    return;
  }
  const now = Date.now();
  memory.sessions = memory.sessions.filter(
    (item) => new Date(item.expiresAt).getTime() > now,
  );
}

// ---------- staff accounts ----------

function mapAdminUser(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    email: row.email,
    role: row.role,
    active: Boolean(row.active),
    createdAt: toIso(row.created_at),
    lastLoginAt: toIso(row.last_login_at ?? null),
  };
}

export async function listAdminUsers() {
  if (pool) {
    const { rows } = await pool.query('SELECT * FROM admin_users ORDER BY created_at ASC, id ASC');
    return rows.map(mapAdminUser);
  }
  return memory.adminUsers.map((user) => ({ ...user }));
}

export async function countAdminUsers() {
  if (pool) {
    const { rows } = await pool.query('SELECT COUNT(*)::int AS total FROM admin_users');
    return rows[0]?.total ?? 0;
  }
  return memory.adminUsers.length;
}

export async function findAdminUserByEmail(email) {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized) return null;
  if (pool) {
    const { rows } = await pool.query('SELECT * FROM admin_users WHERE email = $1', [normalized]);
    return mapAdminUser(rows[0]);
  }
  const user = memory.adminUsers.find((item) => item.email === normalized);
  return user ? { ...user } : null;
}

// The hash never leaves the server through a route; only the password check reads it.
export async function readAdminPasswordHash(email) {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized) return null;
  if (pool) {
    const { rows } = await pool.query('SELECT password_hash FROM admin_users WHERE email = $1', [
      normalized,
    ]);
    return rows[0]?.password_hash ?? null;
  }
  return memory.adminUsers.find((item) => item.email === normalized)?.passwordHash ?? null;
}

export async function createAdminUser({ email, passwordHash, role = 'admin', active = true }) {
  const normalized = String(email || '').trim().toLowerCase();
  if (pool) {
    try {
      const { rows } = await pool.query(
        `INSERT INTO admin_users (email, password_hash, role, active)
         VALUES ($1,$2,$3,$4) RETURNING *`,
        [normalized, passwordHash, role, active],
      );
      return mapAdminUser(rows[0]);
    } catch (error) {
      if (error.code === '23505') {
        const conflict = new Error('An account with that email already exists.');
        conflict.code = 'EMAIL_TAKEN';
        throw conflict;
      }
      throw error;
    }
  }
  if (memory.adminUsers.some((item) => item.email === normalized)) {
    const conflict = new Error('An account with that email already exists.');
    conflict.code = 'EMAIL_TAKEN';
    throw conflict;
  }
  const user = {
    id: memory.nextAdminUserId,
    email: normalized,
    passwordHash,
    role,
    active,
    createdAt: new Date().toISOString(),
    lastLoginAt: null,
  };
  memory.nextAdminUserId += 1;
  memory.adminUsers.push(user);
  return { ...user };
}

export async function updateAdminUser(id, { email, role, active, passwordHash } = {}) {
  const numericId = Number(id);
  const nextEmail = email === undefined ? null : String(email).trim().toLowerCase();
  if (pool) {
    try {
      const { rows } = await pool.query(
        `UPDATE admin_users
         SET email = COALESCE($2, email),
             role = COALESCE($3, role),
             active = COALESCE($4, active),
             password_hash = COALESCE($5, password_hash)
         WHERE id = $1 RETURNING *`,
        [numericId, nextEmail, role ?? null, active ?? null, passwordHash ?? null],
      );
      return mapAdminUser(rows[0]);
    } catch (error) {
      if (error.code === '23505') {
        const conflict = new Error('An account with that email already exists.');
        conflict.code = 'EMAIL_TAKEN';
        throw conflict;
      }
      throw error;
    }
  }
  const user = memory.adminUsers.find((item) => item.id === numericId);
  if (!user) return null;
  if (nextEmail) {
    if (memory.adminUsers.some((item) => item.id !== numericId && item.email === nextEmail)) {
      const conflict = new Error('An account with that email already exists.');
      conflict.code = 'EMAIL_TAKEN';
      throw conflict;
    }
    user.email = nextEmail;
  }
  if (role !== undefined) user.role = role;
  if (active !== undefined) user.active = active;
  if (passwordHash !== undefined) user.passwordHash = passwordHash;
  return { ...user };
}

export async function deleteAdminUser(id) {
  const numericId = Number(id);
  if (pool) {
    const { rowCount } = await pool.query('DELETE FROM admin_users WHERE id = $1', [numericId]);
    return rowCount > 0;
  }
  const before = memory.adminUsers.length;
  memory.adminUsers = memory.adminUsers.filter((item) => item.id !== numericId);
  return memory.adminUsers.length < before;
}

export async function touchAdminLogin(id) {
  const numericId = Number(id);
  if (pool) {
    await pool.query('UPDATE admin_users SET last_login_at = NOW() WHERE id = $1', [numericId]);
    return;
  }
  const user = memory.adminUsers.find((item) => item.id === numericId);
  if (user) user.lastLoginAt = new Date().toISOString();
}

export async function deleteApplication(reference) {
  const ref = normalizeReference(reference);
  if (pool) {
    const { rowCount } = await pool.query('DELETE FROM applications WHERE reference = $1', [ref]);
    if (!rowCount) return false;
    await pool.query('DELETE FROM application_events WHERE reference = $1', [ref]);
    await pool.query('DELETE FROM sessions WHERE role = $1 AND subject = $2', ['applicant', ref]);
    return true;
  }
  const before = memory.applications.length;
  memory.applications = memory.applications.filter((item) => item.reference !== ref);
  if (memory.applications.length === before) return false;
  memory.events = memory.events.filter((event) => event.reference !== ref);
  memory.sessions = memory.sessions.filter(
    (session) => !(session.role === 'applicant' && session.subject === ref),
  );
  return true;
}

// ---------- site settings ----------

export async function loadSettings() {
  if (pool) {
    const { rows } = await pool.query('SELECT data, updated_at FROM settings WHERE id = 1');
    if (!rows.length) return null;
    return { data: rows[0].data, updatedAt: toIso(rows[0].updated_at) };
  }
  return memory.settings ? { ...memory.settings } : null;
}

export async function saveSettings(data) {
  if (pool) {
    const { rows } = await pool.query(
      `INSERT INTO settings (id, data, updated_at) VALUES (1, $1, NOW())
       ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()
       RETURNING data, updated_at`,
      [data],
    );
    return { data: rows[0].data, updatedAt: toIso(rows[0].updated_at) };
  }
  const record = { data, updatedAt: new Date().toISOString() };
  memory.settings = record;
  return { ...record };
}
