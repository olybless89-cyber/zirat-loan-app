import express from 'express';
import { rateLimiter, requireRole, sameOriginOnly } from '../lib/auth.js';
import {
  MAX_BODY,
  ResendError,
  createResendClient,
  emailView,
  mailConfig,
  normalizeFolder,
  pickReplyTarget,
  replySubject,
  textToHtml,
  threadSummary,
  validateCompose,
} from '../lib/resend.js';

export function createMailRoutes(config, { env = process.env, clientFactory = createResendClient } = {}) {
  const router = express.Router();
  const settings = mailConfig(env);
  const client = settings.configured ? clientFactory({ apiKey: settings.apiKey }) : null;
  const sendLimiter = rateLimiter({
    windowMs: 10 * 60 * 1000,
    max: 40,
    message: 'Too many messages in a short time. Wait a few minutes before sending again.',
  });

  router.use(requireRole('admin'));

  function configured(res) {
    if (client) return true;
    res.status(503).json({
      ok: false,
      message: 'Email is not configured on this service.',
      missing: settings.missing,
    });
    return false;
  }

  function fail(res, error) {
    if (!(error instanceof ResendError)) throw error;
    const status = error.status === 404 ? 404 : 502;
    return res.status(status).json({ ok: false, message: error.message });
  }

  async function threadEmails(threadId) {
    const payload = await client.listEmails(settings.inbox, threadId);
    return payload.data || [];
  }

  router.get('/status', (req, res) => {
    res.json({
      ok: true,
      configured: settings.configured,
      missing: settings.missing,
      inbox: settings.configured ? settings.inbox : null,
      fromName: settings.fromName,
    });
  });

  router.get('/threads', async (req, res) => {
    if (!configured(res)) return;
    const folder = normalizeFolder(req.query.folder);
    const limit = Math.min(Math.max(Number(req.query.limit) || 30, 1), 50);
    const query = String(req.query.q || '').trim().slice(0, 120);

    try {
      const payload = query
        ? await client.searchThreads(settings.inbox, query)
        : await client.listThreads(settings.inbox, { folder, limit });
      const threads = (payload.data || [])
        .map(threadSummary)
        .filter((thread) => query || thread.folder === folder);
      res.json({ ok: true, folder, query, threads, hasMore: Boolean(payload.has_more) });
    } catch (error) {
      return fail(res, error);
    }
  });

  router.get('/threads/:id', async (req, res) => {
    if (!configured(res)) return;
    const threadId = String(req.params.id);
    try {
      const [thread, emails] = await Promise.all([
        client.getThread(settings.inbox, threadId),
        threadEmails(threadId),
      ]);
      res.json({
        ok: true,
        thread: threadSummary(thread),
        emails: emails.map(emailView),
      });
    } catch (error) {
      return fail(res, error);
    }
  });

  router.post('/threads/:id/read', sameOriginOnly, async (req, res) => {
    if (!configured(res)) return;
    try {
      await client.markThread(settings.inbox, String(req.params.id), { read: req.body?.read !== false });
      res.json({ ok: true });
    } catch (error) {
      return fail(res, error);
    }
  });

  router.post('/threads/:id/folder', sameOriginOnly, async (req, res) => {
    if (!configured(res)) return;
    const folder = normalizeFolder(req.body?.folder);
    if (folder === 'sent') {
      return res.status(400).json({ ok: false, message: 'Resend assigns the sent folder automatically.' });
    }
    try {
      await client.markThread(settings.inbox, String(req.params.id), { folder });
      res.json({ ok: true, folder });
    } catch (error) {
      return fail(res, error);
    }
  });

  router.post('/threads/:id/reply', sameOriginOnly, sendLimiter, async (req, res) => {
    if (!configured(res)) return;
    const text = String(req.body?.text || '').trim();
    if (!text) {
      return res.status(400).json({ ok: false, message: 'Write a reply.', errors: { text: 'Write a reply.' } });
    }
    if (text.length > MAX_BODY) {
      return res.status(400).json({
        ok: false,
        message: `Keep the reply under ${MAX_BODY} characters.`,
        errors: { text: `Keep the reply under ${MAX_BODY} characters.` },
      });
    }

    const threadId = String(req.params.id);
    try {
      const [thread, emails] = await Promise.all([
        client.getThread(settings.inbox, threadId),
        threadEmails(threadId),
      ]);
      const target = pickReplyTarget(emails);
      if (!target) {
        return res.status(400).json({ ok: false, message: 'This thread has no message to reply to.' });
      }
      await client.reply(settings.inbox, threadId, target.id, {
        text,
        html: textToHtml(text),
        subject: replySubject(thread.subject),
      });
      res.json({ ok: true });
    } catch (error) {
      return fail(res, error);
    }
  });

  router.post('/send', sameOriginOnly, sendLimiter, async (req, res) => {
    if (!configured(res)) return;
    const { errors, to, subject, text } = validateCompose(req.body);
    if (Object.keys(errors).length) {
      return res.status(400).json({ ok: false, message: 'Check the highlighted fields.', errors });
    }

    try {
      await client.sendNew(settings.inbox, { to, subject, text, html: textToHtml(text) });
      res.json({ ok: true });
    } catch (error) {
      return fail(res, error);
    }
  });

  return router;
}
