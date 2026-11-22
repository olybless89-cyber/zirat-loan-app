import express from 'express';
import { validateApplication, validateTerm } from '../lib/validation.js';
import { createApplication, isPersistent, loadSettings } from '../lib/store.js';
import { rateLimiter, sameOriginOnly } from '../lib/auth.js';
import { mergeSettings, publicSettings } from '../lib/settings.js';

export function createPublicRoutes(config) {
  const router = express.Router();
  const submitLimiter = rateLimiter({
    windowMs: 10 * 60 * 1000,
    max: 10,
    message: 'Too many submissions. Please try again later.',
  });

  async function currentSettings() {
    const stored = await loadSettings();
    return mergeSettings(config.defaults, stored?.data);
  }

  router.get('/config', async (req, res) => {
    const settings = await currentSettings();
    res.json({
      ...publicSettings(settings),
      storage: isPersistent() ? 'postgres' : 'memory',
    });
  });

  router.post('/applications', submitLimiter, sameOriginOnly, async (req, res) => {
    const settings = await currentSettings();
    if (!settings.acceptingApplications) {
      return res.status(503).json({
        ok: false,
        message: 'The branch is not accepting new applications right now. Please try again later.',
      });
    }

    const body = req.body || {};
    const input = {
      fullName: typeof body.fullName === 'string' ? body.fullName.trim().replace(/\s+/g, ' ') : '',
      phone: typeof body.phone === 'string' ? body.phone : '',
      nationalId: typeof body.nationalId === 'string' ? body.nationalId.trim() : '',
      amount: body.amount,
      currency: body.currency,
      termMonths: body.termMonths,
      consent: body.consent === true,
    };

    const errors = validateApplication(input);
    const termError = input.termMonths === undefined ? null : validateTerm(input.termMonths);
    if (termError) errors.termMonths = termError;
    if (input.currency && !settings.currencies.includes(input.currency)) {
      errors.currency = 'That currency is not available right now.';
    }
    if (Object.keys(errors).length) return res.status(422).json({ ok: false, errors });

    try {
      const record = await createApplication({
        fullName: input.fullName,
        phone: input.phone,
        nationalIdLast4: input.nationalId.slice(-4),
        amount: Number(input.amount),
        currency: input.currency,
        termMonths: input.termMonths === undefined ? settings.termMonths : Number(input.termMonths),
        consentVersion: settings.consentVersion,
      });

      return res.status(201).json({
        ok: true,
        reference: record.reference,
        summary: {
          fullName: record.fullName,
          amount: record.amount,
          currency: record.currency,
          termMonths: record.termMonths,
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

  return router;
}
