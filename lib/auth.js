import crypto from 'node:crypto';
import { createSession, deleteSession, findSession } from './store.js';

const SCRYPT_COST = 16384;
const KEY_LENGTH = 64;
const SESSION_COOKIE = 'zirat_session';

export const SESSION_TTL = {
  admin: 8 * 60 * 60 * 1000,
  applicant: 7 * 24 * 60 * 60 * 1000,
};

export function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const derived = crypto.scryptSync(String(password), salt, KEY_LENGTH, {
    N: SCRYPT_COST,
    r: 8,
    p: 1,
  });
  return `scrypt$${SCRYPT_COST}$${salt.toString('base64url')}$${derived.toString('base64url')}`;
}

export function verifyPassword(password, stored) {
  try {
    const [scheme, cost, salt, hash] = String(stored || '').split('$');
    if (scheme !== 'scrypt' || !salt || !hash) return false;
    const expected = Buffer.from(hash, 'base64url');
    const derived = crypto.scryptSync(String(password || ''), Buffer.from(salt, 'base64url'), expected.length, {
      N: Number(cost) || SCRYPT_COST,
      r: 8,
      p: 1,
    });
    return expected.length === derived.length && crypto.timingSafeEqual(expected, derived);
  } catch {
    return false;
  }
}

// Verifying against a real hash even when the email is unknown keeps the
// response time of a failed login independent of whether the account exists.
const TIMING_DECOY = hashPassword(crypto.randomBytes(16).toString('hex'));

function readAdminConfig() {
  const configured = Boolean(process.env.ADMIN_PASSWORD);
  const email = (process.env.ADMIN_EMAIL || 'admin@ziratbank.demo').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || crypto.randomBytes(9).toString('base64url');
  return { email, password, hash: hashPassword(password), generated: !configured };
}

const ADMIN = readAdminConfig();

export const adminProfile = {
  email: ADMIN.email,
  generatedPassword: ADMIN.generated,
};

export function describeAdminAccess() {
  if (ADMIN.generated) {
    console.warn(
      [
        '',
        '  Admin console credentials (ADMIN_PASSWORD is not set, so a one-off password was generated):',
        `    email:    ${ADMIN.email}`,
        `    password: ${ADMIN.password}`,
        '  Set ADMIN_EMAIL and ADMIN_PASSWORD to keep a stable login across restarts.',
        '',
      ].join('\n'),
    );
    return;
  }
  console.log(`Admin console enabled for ${ADMIN.email}.`);
}

export function checkAdminCredentials(email, password) {
  const emailMatches =
    String(email || '').trim().toLowerCase() === ADMIN.email;
  if (!emailMatches) {
    verifyPassword(String(password || ''), TIMING_DECOY);
    return false;
  }
  return verifyPassword(password, ADMIN.hash);
}

export function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

export function parseCookies(header = '') {
  const jar = {};
  for (const part of String(header).split(';')) {
    const index = part.indexOf('=');
    if (index < 1) continue;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (key) jar[key] = decodeURIComponent(value);
  }
  return jar;
}

function cookieOptions(req, maxAge) {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: Boolean(req.secure),
    path: '/',
    maxAge,
  };
}

export async function issueSession(req, res, { role, subject }) {
  const token = crypto.randomBytes(32).toString('base64url');
  const ttl = SESSION_TTL[role] ?? SESSION_TTL.applicant;
  await createSession({
    tokenHash: hashToken(token),
    role,
    subject,
    expiresAt: new Date(Date.now() + ttl),
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  res.cookie(SESSION_COOKIE, token, cookieOptions(req, ttl));
  return token;
}

export async function endSession(req, res) {
  const token = parseCookies(req.headers.cookie)[SESSION_COOKIE];
  if (token) await deleteSession(hashToken(token));
  res.clearCookie(SESSION_COOKIE, { path: '/', httpOnly: true, sameSite: 'lax' });
}

export async function readSession(req) {
  const token = parseCookies(req.headers.cookie)[SESSION_COOKIE];
  if (!token) return null;
  return findSession(hashToken(token));
}

export function requireRole(role) {
  return async (req, res, next) => {
    try {
      const session = await readSession(req);
      if (!session) {
        return res.status(401).json({ ok: false, message: 'Sign in to continue.' });
      }
      if (role && session.role !== role) {
        return res.status(403).json({ ok: false, message: 'This account cannot open that area.' });
      }
      req.auth = session;
      return next();
    } catch (error) {
      return next(error);
    }
  };
}

export function sameOriginOnly(req, res, next) {
  const origin = req.get('origin');
  if (origin && !origin.startsWith(`${req.protocol}://${req.get('host')}`)) {
    return res.status(403).json({ ok: false, message: 'Request blocked.' });
  }
  return next();
}

export function rateLimiter({ windowMs, max, message }) {
  const hits = new Map();
  return (req, res, next) => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    const entry = hits.get(key);
    if (!entry || now - entry.start > windowMs) {
      hits.set(key, { count: 1, start: now });
      return next();
    }
    entry.count += 1;
    if (entry.count > max) {
      return res.status(429).json({ ok: false, message });
    }
    return next();
  };
}
