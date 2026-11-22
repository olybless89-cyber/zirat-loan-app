import express from 'express';
import { requireRole, sameOriginOnly } from '../lib/auth.js';
import {
  ACTIVE_STATUSES,
  findApplicationByReference,
  listEvents,
  updateApplicationDetails,
  updateApplicationStatus,
} from '../lib/store.js';
import { validateAmount, validatePhone } from '../lib/validation.js';
import { buildEstimate } from '../lib/estimate.js';

export function createApplicantRoutes(config) {
  const router = express.Router();
  router.use(requireRole('applicant'));

  async function currentApplication(req) {
    return findApplicationByReference(req.auth.subject);
  }

  router.get('/application', async (req, res) => {
    const application = await currentApplication(req);
    if (!application) {
      return res.status(404).json({ ok: false, message: 'That application no longer exists.' });
    }
    const events = await listEvents(application.reference, { visibility: 'public' });
    return res.json({
      ok: true,
      application,
      events,
      estimate: buildEstimate(application, config.monthlyRate),
    });
  });

  router.patch('/application', sameOriginOnly, async (req, res) => {
    const application = await currentApplication(req);
    if (!application) {
      return res.status(404).json({ ok: false, message: 'That application no longer exists.' });
    }
    if (!ACTIVE_STATUSES.includes(application.status)) {
      return res.status(409).json({
        ok: false,
        message: 'This application is already decided, so it can no longer be changed.',
      });
    }

    const body = req.body || {};
    const updates = {};
    const errors = {};

    if (body.amount !== undefined) {
      const error = validateAmount(body.amount);
      if (error) errors.amount = error;
      else updates.amount = Number(body.amount);
    }
    if (body.phone !== undefined) {
      const error = validatePhone(body.phone);
      if (error) errors.phone = error;
      else updates.phone = body.phone;
    }
    if (Object.keys(errors).length) return res.status(422).json({ ok: false, errors });
    if (!Object.keys(updates).length) {
      return res.status(422).json({ ok: false, message: 'Nothing to update.' });
    }

    const updated = await updateApplicationDetails(application.reference, updates);
    return res.json({
      ok: true,
      application: updated,
      estimate: buildEstimate(updated, config.monthlyRate),
    });
  });

  router.post('/application/withdraw', sameOriginOnly, async (req, res) => {
    const application = await currentApplication(req);
    if (!application) {
      return res.status(404).json({ ok: false, message: 'That application no longer exists.' });
    }
    if (!ACTIVE_STATUSES.includes(application.status)) {
      return res.status(409).json({
        ok: false,
        message: 'Only applications that are still under consideration can be withdrawn.',
      });
    }
    const updated = await updateApplicationStatus(application.reference, {
      status: 'withdrawn',
      actor: 'applicant',
      visibility: 'public',
      note: 'Withdrawn by the applicant.',
    });
    return res.json({ ok: true, application: updated });
  });

  return router;
}
