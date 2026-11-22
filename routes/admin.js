import express from 'express';
import { requireRole, sameOriginOnly } from '../lib/auth.js';
import {
  STATUSES,
  addEvent,
  applicationStats,
  findApplicationByReference,
  listAllApplications,
  listApplications,
  listEvents,
  updateApplicationStatus,
} from '../lib/store.js';
import { buildEstimate } from '../lib/estimate.js';

function csvCell(value) {
  const text = value === null || value === undefined ? '' : String(value);
  const guarded = /^[=@\t\r]/.test(text) ? `'${text}` : text;
  return `"${guarded.replace(/"/g, '""')}"`;
}

export function createAdminRoutes(config) {
  const router = express.Router();
  router.use(requireRole('admin'));

  async function detail(application) {
    return {
      application,
      events: await listEvents(application.reference),
      estimate: buildEstimate(application, config.monthlyRate),
    };
  }

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
