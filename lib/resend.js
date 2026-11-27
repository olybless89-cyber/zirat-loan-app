const API_BASE = 'https://api.resend.com';
export const FOLDERS = ['inbox', 'sent', 'archive', 'spam', 'trash'];
export const MAX_RECIPIENTS = 10;
export const MAX_SUBJECT = 200;
export const MAX_BODY = 20000;

export class ResendError extends Error {
  constructor(message, { status = 0, code = '' } = {}) {
    super(message);
    this.name = 'ResendError';
    this.status = status;
    this.code = code;
  }
}

export function mailConfig(env = process.env) {
  const apiKey = String(env.RESEND_API_KEY || '').trim();
  const inbox = String(env.MAIL_INBOX || '').trim();
  const missing = [];
  if (!apiKey) missing.push('RESEND_API_KEY');
  if (!inbox) missing.push('MAIL_INBOX');
  return {
    apiKey,
    inbox,
    fromName: String(env.MAIL_FROM_NAME || 'Zirat Bank London Branch').trim(),
    configured: missing.length === 0,
    missing,
  };
}

export function createResendClient({
  apiKey,
  baseUrl = process.env.RESEND_API_BASE || API_BASE,
  fetchImpl = fetch,
  timeoutMs = 15000,
} = {}) {
  async function request(path, { method = 'GET', body } = {}) {
    if (!apiKey) {
      throw new ResendError('Email is not configured on this service.', { status: 503, code: 'not_configured' });
    }

    let response;
    try {
      response = await fetchImpl(`${baseUrl}${path}`, {
        method,
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch {
      throw new ResendError('Resend did not respond. Try again in a moment.', { code: 'unreachable' });
    }

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      // 401 means the key is wrong or revoked: say so instead of "something went wrong".
      const message =
        response.status === 401
          ? 'Resend rejected the API key. Check RESEND_API_KEY on the service.'
          : payload?.message || `Resend rejected the request (${response.status}).`;
      throw new ResendError(message, { status: response.status, code: payload?.name || '' });
    }
    return payload;
  }

  const box = (inbox) => encodeURIComponent(inbox);

  return {
    request,
    listInboxes: () => request('/inboxes?limit=100'),
    listThreads: (inbox, { folder = 'inbox', limit = 30, read } = {}) => {
      const params = new URLSearchParams({ folders: folder, limit: String(limit) });
      if (read !== undefined) params.set('read', String(read));
      return request(`/inboxes/${box(inbox)}/threads?${params}`);
    },
    searchThreads: (inbox, query) =>
      request(`/inboxes/${box(inbox)}/threads/search?${new URLSearchParams({ query })}`),
    getThread: (inbox, threadId) => request(`/inboxes/${box(inbox)}/threads/${encodeURIComponent(threadId)}`),
    listEmails: (inbox, threadId) =>
      request(`/inboxes/${box(inbox)}/threads/${encodeURIComponent(threadId)}/emails?limit=100`),
    markThread: (inbox, threadId, patch) =>
      request(`/inboxes/${box(inbox)}/threads/${encodeURIComponent(threadId)}`, {
        method: 'PATCH',
        body: patch,
      }),
    reply: (inbox, threadId, emailId, message) =>
      request(
        `/inboxes/${box(inbox)}/threads/${encodeURIComponent(threadId)}/emails/${encodeURIComponent(emailId)}/reply`,
        { method: 'POST', body: message },
      ),
    // Resend threads outbound mail with the inbox when it is created as a draft and
    // then sent, which is why sending is two calls rather than one POST /emails.
    sendNew: async (inbox, message) => {
      const draft = await request(`/inboxes/${box(inbox)}/drafts`, { method: 'POST', body: message });
      const id = draft?.id;
      if (!id) throw new ResendError('Resend accepted the draft but returned no id.', { code: 'bad_response' });
      return request(`/inboxes/${box(inbox)}/drafts/${encodeURIComponent(id)}/send`, { method: 'POST' });
    },
  };
}

export function normalizeFolder(folder) {
  const value = String(folder || '').trim().toLowerCase();
  return FOLDERS.includes(value) ? value : 'inbox';
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function textToHtml(text) {
  const blocks = String(text ?? '')
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);
  return blocks.map((block) => `<p>${escapeHtml(block).replace(/\n/g, '<br>')}</p>`).join('\n');
}

export function replySubject(subject) {
  const clean = sanitizeHeader(subject) || 'Your enquiry';
  return /^re:/i.test(clean) ? clean : `Re: ${clean}`;
}

export function sanitizeHeader(value) {
  return String(value ?? '')
    .replace(/[\r\n]+/g, ' ')
    .trim()
    .slice(0, MAX_SUBJECT);
}

export function parseRecipients(input) {
  const raw = Array.isArray(input) ? input : String(input ?? '').split(/[,;]/);
  const addresses = [];
  const invalid = [];
  for (const entry of raw) {
    const value = String(entry).trim();
    if (!value) continue;
    if (/^[^\s@<>,;"]+@[^\s@<>,;"]+\.[^\s@<>,;"]+$/.test(value) && !/[\r\n]/.test(value)) {
      addresses.push(value);
    } else {
      invalid.push(value);
    }
  }
  return { addresses, invalid };
}

export function validateCompose({ to, subject, text } = {}) {
  const errors = {};
  const { addresses, invalid } = parseRecipients(to);
  if (invalid.length) errors.to = `Not a valid address: ${invalid[0]}`;
  else if (!addresses.length) errors.to = 'Add at least one recipient.';
  else if (addresses.length > MAX_RECIPIENTS) errors.to = `Use at most ${MAX_RECIPIENTS} recipients.`;

  const cleanSubject = sanitizeHeader(subject);
  if (!cleanSubject) errors.subject = 'Add a subject.';

  const body = String(text ?? '').trim();
  if (!body) errors.text = 'Write a message.';
  else if (body.length > MAX_BODY) errors.text = `Keep the message under ${MAX_BODY} characters.`;

  return { errors, to: addresses, subject: cleanSubject, text: body };
}

// Reply to the newest message the customer sent; a thread of only outbound mail
// still replies to its last message.
export function pickReplyTarget(emails = []) {
  return [...emails].reverse().find((email) => email.direction === 'inbound') || emails[emails.length - 1] || null;
}

export function threadSummary(thread) {
  return {
    id: thread.id,
    subject: thread.subject || '(no subject)',
    from: thread.from || '',
    to: thread.to || [],
    read: thread.read !== false,
    folder: thread.folder || 'inbox',
    emailCount: thread.email_count ?? 1,
    hasAttachment: Boolean(thread.has_attachment),
    lastActiveAt: thread.received_at || thread.created_at || null,
  };
}

export function emailView(email) {
  return {
    id: email.id,
    direction: email.direction === 'outbound' ? 'outbound' : 'inbound',
    from: email.from || '',
    to: email.to || [],
    cc: email.cc || [],
    subject: email.subject || '(no subject)',
    html: email.html || '',
    text: email.text || '',
    read: email.read !== false,
    at: email.received_at || email.created_at || null,
    attachments: (email.attachments || []).map((file) => ({
      id: file.id,
      filename: file.filename || 'attachment',
      size: file.size ?? null,
    })),
  };
}
