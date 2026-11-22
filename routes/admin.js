import express from 'express';
import { hashPassword, requireOwner, requireRole, sameOriginOnly, verifyPassword } from '../lib/auth.js';
import {
  STATUSES,
  addEvent,
  applicationStats,
  createAdminUser,
  deleteAdminUser,
  deleteApplication,
  findApplicationByReference,
  listAdminUsers,
  listAllApplications,
  listApplications,
  listEvents,
  loadSettings,
  readAdminPasswordHash,
  saveSettings,
  updateAdminUser,
  updateApplicationStatus,
} from '../lib/store.js';
import { buildEstimate } from '../lib/estimate.js';
import { ADMIN_ROLES, mergeSettings, normalizeSettings, publicSettings } from '../lib/settings.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN = 10;

function validateAccount({ email, password, role }, { passwordRequired = true } = {}) {
  const errors = {};
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(cleanEmail) || cleanEmail.length > 80) {
    errors.email = 'Enter a valid email address.';
  }
  if (passwordRequired || password !== undefined) {
    const value = String(password || '');
    if (value.length < PASSWORD_MIN) {
      errors.password = `Use at least ${PASSWORD_MIN} characters.`;
    } else if (value.length > 200) {
      errors.password = 'Keep the password under 200 characters.';
    }
  }
  if (role !== undefined && !ADMIN_ROLES.includes(role)) {
    errors.role = 'Choose owner or admin.';
  }
  return { errors, email: cleanEmail };
}

async function activeOwnerCount() {
  const users = await listAdminUsers();
  return users.filter((user) => user.role === 'owner' && user.active).length;
}

function csvCell(value) {
  const text = value === null || value === undefined ? '' : String(value);
  const guarded = /^[=@\t\r]/.test(text) ? `'${text}` : text;
  return `"${guarded.replace(/"/g, '""')}"`;
}

export function createAdminRoutes(config) {
  const router = express.Router();
  router.use(requireRole('admin'));

  async function currentSettings() {
    const stored = await loadSettings();
    return mergeSettings(config.defaults, stored?.data);
  }

  async function detail(application) {
    const settings = await currentSettings();
    return {
      application,
      events: await listEvents(application.reference),
      estimate: buildEstimate(application, settings.monthlyRate),
    };
  }

  router.get('/me', async (req, res) => {
    const { adminUser } = req.auth;
    res.json({
      ok: true,
      user: {
        id: adminUser.id,
        email: adminUser.email,
        role: adminUser.role,
        active: adminUser.active,
        lastLoginAt: adminUser.lastLoginAt,
      },
    });
  });

  router.get('/users', async (req, res) => {
    const users = await listAdminUsers();
    res.json({
      ok: true,
      users: users.map(({ id, email, role, active, createdAt, lastLoginAt }) => ({
        id,
        email,
        role,
        active,
        createdAt,
        lastLoginAt,
      })),
      currentUser: req.auth.adminUser.id,
    });
  });

  router.post('/users', sameOriginOnly, requireOwner, async (req, res) => {
    const body = req.body || {};
    const role = body.role === undefined ? 'admin' : body.role;
    const { errors, email } = validateAccount({ email: body.email, password: body.password, role });
    if (Object.keys(errors).length) return res.status(422).json({ ok: false, errors });

    try {
      const user = await createAdminUser({
        email,
        passwordHash: hashPassword(body.password),
        role,
      });
      return res.status(201).json({
        ok: true,
        user: { id: user.id, email: user.email, role: user.role, active: user.active },
      });
    } catch (error) {
      if (error.code === 'EMAIL_TAKEN') {
        return res.status(409).json({ ok: false, message: error.message });
      }
      throw error;
    }
  });

  router.patch('/users/:id', sameOriginOnly, requireOwner, async (req, res) => {
    const targetId = Number(req.params.id);
    const target = (await listAdminUsers()).find((user) => user.id === targetId);
    if (!target) return res.status(404).json({ ok: false, message: 'Staff account not found.' });

    const body = req.body || {};
    const patch = {};

    if (body.role !== undefined) {
      if (!ADMIN_ROLES.includes(body.role)) {
        return res.status(422).json({ ok: false, errors: { role: 'Choose owner or admin.' } });
      }
      if (target.id === req.auth.adminUser.id && body.role !== target.role) {
        return res.status(409).json({ ok: false, message: 'You cannot change your own role.' });
      }
      if (target.role === 'owner' && body.role !== 'owner' && (await activeOwnerCount()) <= 1) {
        return res.status(409).json({ ok: false, message: 'Keep at least one active owner.' });
      }
      patch.role = body.role;
    }

    if (body.active !== undefined) {
      if (typeof body.active !== 'boolean') {
        return res.status(422).json({ ok: false, errors: { active: 'Choose active or disabled.' } });
      }
      if (target.id === req.auth.adminUser.id && body.active === false) {
        return res.status(409).json({ ok: false, message: 'You cannot disable your own account.' });
      }
      if (target.role === 'owner' && body.active === false && (await activeOwnerCount()) <= 1) {
        return res.status(409).json({ ok: false, message: 'Keep at least one active owner.' });
      }
      patch.active = body.active;
    }

    if (body.password !== undefined) {
      const { errors } = validateAccount({ email: target.email, password: body.password });
      if (errors.password) return res.status(422).json({ ok: false, errors });
      patch.passwordHash = hashPassword(body.password);
    }

    if (!Object.keys(patch).length) {
      return res.status(422).json({ ok: false, message: 'Nothing to update.' });
    }

    const updated = await updateAdminUser(target.id, patch);
    return res.json({
      ok: true,
      user: {
        id: updated.id,
        email: updated.email,
        role: updated.role,
        active: updated.active,
      },
    });
  });

  router.delete('/users/:id', sameOriginOnly, requireOwner, async (req, res) => {
    const targetId = Number(req.params.id);
    const target = (await listAdminUsers()).find((user) => user.id === targetId);
    if (!target) return res.status(404).json({ ok: false, message: 'Staff account not found.' });
    if (target.id === req.auth.adminUser.id) {
      return res.status(409).json({ ok: false, message: 'You cannot delete your own account.' });
    }
    if (target.role === 'owner' && (await activeOwnerCount()) <= 1) {
      return res.status(409).json({ ok: false, message: 'Keep at least one active owner.' });
    }
    await deleteAdminUser(target.id);
    return res.json({ ok: true });
  });

  router.post('/users/me/password', sameOriginOnly, async (req, res) => {
    const body = req.body || {};
    const me = req.auth.adminUser;
    const currentHash = await readAdminPasswordHash(me.email);
    if (!verifyPassword(String(body.currentPassword || ''), currentHash || '')) {
      return res.status(403).json({ ok: false, errors: { currentPassword: 'Current password is incorrect.' } });
    }
    const { errors } = validateAccount({ email: me.email, password: body.newPassword });
    if (errors.password) return res.status(422).json({ ok: false, errors });
    await updateAdminUser(me.id, { passwordHash: hashPassword(body.newPassword) });
    return res.json({ ok: true });
  });

  router.get('/settings', async (req, res) => {
    const stored = await loadSettings();
    res.json({
      ok: true,
      settings: publicSettings(mergeSettings(config.defaults, stored?.data)),
      updatedAt: stored?.updatedAt ?? null,
    });
  });

  router.put('/settings', sameOriginOnly, requireOwner, async (req, res) => {
    const current = await currentSettings();
    const { settings, errors } = normalizeSettings(req.body || {}, current);
    if (Object.keys(errors).length) return res.status(422).json({ ok: false, errors });
    const saved = await saveSettings(publicSettings(settings));
    return res.json({ ok: true, settings: saved.data, updatedAt: saved.updatedAt });
  });

  router.get('/stats', async (req, res) => {
    res.json({ ok: true, stats: await applicationStats() });
  });

  router.get('/applications', async (req, res) => {
    const { status, currency, q, page, pageSize } = req.query;
    const result = await listApplications({ status, currency, q, page, pageSize });
    res.json({ ok: true, ...result });
  });

  router.get('/applications/:reference', async (req, res) => {
    const application = await findApplicationByReference(req.params.reference);
    if (!application) {
      return res.status(404).json({ ok: false, message: 'Application not found.' });
    }
    return res.json({ ok: true, ...(await detail(application)) });
  });

  router.patch('/applications/:reference', sameOriginOnly, async (req, res) => {
    const application = await findApplicationByReference(req.params.reference);
    if (!application) {
      return res.status(404).json({ ok: false, message: 'Application not found.' });
    }

    const body = req.body || {};
    const status = body.status;
    const note = String(body.note || '').trim();
    const notifyApplicant = body.notifyApplicant === true;

    if (!STATUSES.includes(status)) {
      return res.status(422).json({ ok: false, message: 'Choose a valid status.' });
    }
    if (note.length > 500) {
      return res.status(422).json({ ok: false, message: 'The note must be 500 characters or fewer.' });
    }
    if (status === application.status && !note) {
      return res.status(422).json({ ok: false, message: 'Choose a new status or add a note.' });
    }

    if (status === application.status) {
      await addEvent(application.reference, {
        note,
        actor: 'admin',
        visibility: notifyApplicant ? 'public' : 'internal',
      });
      return res.json({ ok: true, ...(await detail(application)) });
    }

    const updated = await updateApplicationStatus(application.reference, {
      status,
      note: note || `Status set to ${status.replace('_', ' ')}.`,
      actor: 'admin',
      visibility: notifyApplicant ? 'public' : 'internal',
    });
    return res.json({ ok: true, ...(await detail(updated)) });
  });

  router.delete('/applications/:reference', sameOriginOnly, requireOwner, async (req, res) => {
    const removed = await deleteApplication(req.params.reference);
    if (!removed) return res.status(404).json({ ok: false, message: 'Application not found.' });
    return res.json({ ok: true });
  });

  router.get('/export.csv', async (req, res) => {
    const { status, currency, q } = req.query;
    const rows = await listAllApplications({ status, currency, q });
    const header = [
      'Reference',
      'Applicant',
      'Telephone',
      'Amount',
      'Currency',
      'Term (months)',
      'Status',
      'National ID last 4',
      'Received',
      'Last updated',
    ];
    const lines = [header.map(csvCell).join(',')];
    for (const row of rows) {
      lines.push(
        [
          row.reference,
          row.fullName,
          row.phone,
          row.amount,
          row.currency,
          row.termMonths,
          row.status,
          row.nationalIdLast4,
          row.createdAt,
          row.updatedAt,
        ]
          .map(csvCell)
          .join(','),
      );
    }
    const stamp = new Date().toISOString().slice(0, 10);
    res.set('Content-Type', 'text/csv; charset=utf-8');
    res.set('Content-Disposition', `attachment; filename="zirat-applications-${stamp}.csv"`);
    res.send(`${lines.join('\r\n')}\r\n`);
  });

  return router;
}
