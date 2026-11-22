import express from 'express';
import {
  adminProfile,
  checkAdminCredentials,
  endSession,
  issueSession,
  rateLimiter,
  readSession,
  sameOriginOnly,
} from '../lib/auth.js';
import { findApplicationByReferenceAndPhone } from '../lib/store.js';

export function createAuthRoutes() {
  const router = express.Router();

  const adminLimiter = rateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: 'Too many sign-in attempts. Wait 15 minutes before trying again.',
  });
  const applicantLimiter = rateLimiter({
    windowMs: 10 * 60 * 1000,
    max: 8,
    message: 'Too many sign-in attempts. Wait 10 minutes before trying again.',
  });

  router.get('/auth/session', async (req, res) => {
    const session = await readSession(req);
    res.json({
      authenticated: Boolean(session),
      role: session?.role ?? null,
      subject: session?.subject ?? null,
      adminUsesGeneratedPassword: adminProfile.generatedPassword,
    });
  });

  router.post('/auth/admin/login', adminLimiter, sameOriginOnly, async (req, res) => {
    const { email, password } = req.body || {};
    if (!checkAdminCredentials(email, password)) {
      return res.status(401).json({ ok: false, message: 'Email or password is incorrect.' });
    }
    await issueSession(req, res, { role: 'admin', subject: adminProfile.email });
    return res.json({ ok: true, role: 'admin', subject: adminProfile.email });
  });

  router.post('/auth/admin/logout', sameOriginOnly, async (req, res) => {
    await endSession(req, res);
    res.json({ ok: true });
  });

  router.post('/auth/applicant/login', applicantLimiter, sameOriginOnly, async (req, res) => {
    const { reference, phone } = req.body || {};
    const application = await findApplicationByReferenceAndPhone(reference, phone);
    if (!application) {
      return res.status(401).json({
        ok: false,
        message: 'We could not find an application with that reference and telephone number.',
      });
    }
    await issueSession(req, res, { role: 'applicant', subject: application.reference });
    return res.json({
      ok: true,
      role: 'applicant',
      subject: application.reference,
    });
  });

  router.post('/auth/applicant/logout', sameOriginOnly, async (req, res) => {
    await endSession(req, res);
    res.json({ ok: true });
  });

  return router;
}
