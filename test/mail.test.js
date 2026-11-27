import assert from 'node:assert/strict';
import {
  ResendError,
  createResendClient,
  emailView,
  mailConfig,
  normalizeFolder,
  parseRecipients,
  pickReplyTarget,
  replySubject,
  textToHtml,
  threadSummary,
  validateCompose,
} from '../lib/resend.js';

// --- configuration -----------------------------------------------------------

assert.deepEqual(mailConfig({}).missing, ['RESEND_API_KEY', 'MAIL_INBOX']);
assert.equal(mailConfig({}).configured, false);
const configured = mailConfig({ RESEND_API_KEY: 're_test', MAIL_INBOX: 'admin@ziratbank.loan' });
assert.equal(configured.configured, true);
assert.equal(configured.fromName, 'Zirat Bank London Branch');

// --- recipients and compose validation ---------------------------------------

assert.deepEqual(parseRecipients('a@example.com, b@example.com; c@example.com').addresses, [
  'a@example.com',
  'b@example.com',
  'c@example.com',
]);
assert.deepEqual(parseRecipients('not-an-address').invalid, ['not-an-address']);
assert.deepEqual(parseRecipients('a@example.com\r\nBcc: evil@example.com').invalid.length, 1);

assert.equal(validateCompose({ to: 'a@example.com', subject: 'Hi', text: 'Hello' }).errors.to, undefined);
assert.match(validateCompose({ to: '', subject: 'Hi', text: 'Hello' }).errors.to, /at least one/);
assert.match(validateCompose({ to: 'x@y', subject: 'Hi', text: 'Hello' }).errors.to, /valid address/);
assert.match(validateCompose({ to: 'a@example.com', subject: '  ', text: 'Hello' }).errors.subject, /subject/);
assert.match(validateCompose({ to: 'a@example.com', subject: 'Hi', text: ' ' }).errors.text, /Write a message/);
const many = Array.from({ length: 11 }, (_, index) => `a${index}@example.com`).join(',');
assert.match(validateCompose({ to: many, subject: 'Hi', text: 'Hello' }).errors.to, /at most 10/);

// --- body rendering ----------------------------------------------------------

assert.equal(
  textToHtml('Hello <script>alert(1)</script>\n\nSecond para'),
  '<p>Hello &lt;script&gt;alert(1)&lt;/script&gt;</p>\n<p>Second para</p>',
);
assert.equal(textToHtml('one\ntwo'), '<p>one<br>two</p>');

// --- subject and folder handling ---------------------------------------------

assert.equal(replySubject('Your application'), 'Re: Your application');
assert.equal(replySubject('Re: Your application'), 'Re: Your application');
assert.equal(replySubject(''), 'Re: Your enquiry');
assert.equal(replySubject('Hi\nBcc: evil@example.com'), 'Re: Hi Bcc: evil@example.com');

assert.equal(normalizeFolder('SENT'), 'sent');
assert.equal(normalizeFolder('nonsense'), 'inbox');
assert.equal(normalizeFolder(undefined), 'inbox');

// --- reply target ------------------------------------------------------------

const inbound = { id: 'e1', direction: 'inbound' };
const outbound = { id: 'e2', direction: 'outbound' };
const inboundLater = { id: 'e3', direction: 'inbound' };
assert.equal(pickReplyTarget([inbound, outbound, inboundLater]).id, 'e3');
assert.equal(pickReplyTarget([outbound, inbound]).id, 'e1');
assert.equal(pickReplyTarget([outbound]).id, 'e2');
assert.equal(pickReplyTarget([]), null);

// --- view models -------------------------------------------------------------

const summary = threadSummary({
  id: 't1',
  subject: null,
  from: 'Ada <ada@example.com>',
  read: false,
  folder: 'inbox',
  email_count: 3,
  has_attachment: true,
  received_at: '2026-11-22T09:00:00.000Z',
});
assert.equal(summary.subject, '(no subject)');
assert.equal(summary.read, false);
assert.equal(summary.emailCount, 3);
assert.equal(summary.hasAttachment, true);

const view = emailView({
  id: 'e1',
  direction: 'inbound',
  from: 'Ada <ada@example.com>',
  to: ['admin@ziratbank.loan'],
  html: '<p>Hi</p>',
  received_at: '2026-11-22T09:00:00.000Z',
  attachments: [{ id: 'a1', filename: 'id.pdf', size: 2048 }],
});
assert.equal(view.direction, 'inbound');
assert.equal(view.html, '<p>Hi</p>');
assert.deepEqual(view.attachments, [{ id: 'a1', filename: 'id.pdf', size: 2048 }]);

// --- client ----------------------------------------------------------------

{
  const calls = [];
  const client = createResendClient({
    apiKey: 're_test',
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      if (url.endsWith('/drafts')) return { ok: true, json: async () => ({ id: 'draft_1' }) };
      return { ok: true, json: async () => ({ id: 'email_1' }) };
    },
  });

  await client.sendNew('admin@ziratbank.loan', {
    to: ['a@example.com'],
    subject: 'Hello',
    text: 'Body',
    html: '<p>Body</p>',
  });

  assert.equal(calls.length, 2, 'a new message is a draft followed by a send');
  assert.equal(calls[0].url, 'https://api.resend.com/inboxes/admin%40ziratbank.loan/drafts');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer re_test');
  assert.equal(JSON.parse(calls[0].options.body).subject, 'Hello');
  assert.equal(
    calls[1].url,
    'https://api.resend.com/inboxes/admin%40ziratbank.loan/drafts/draft_1/send',
  );
}

{
  const client = createResendClient({
    apiKey: 're_test',
    fetchImpl: async () => ({ ok: false, status: 401, json: async () => ({ message: 'API key is invalid' }) }),
  });
  await assert.rejects(
    () => client.listThreads('admin@ziratbank.loan'),
    (error) => error instanceof ResendError && /RESEND_API_KEY/.test(error.message) && error.status === 401,
  );
}

{
  const client = createResendClient({
    apiKey: 're_test',
    fetchImpl: async () => {
      throw new Error('ECONNRESET');
    },
  });
  await assert.rejects(
    () => client.listThreads('admin@ziratbank.loan'),
    (error) => error.code === 'unreachable',
  );
}

{
  const client = createResendClient({ apiKey: '' });
  await assert.rejects(
    () => client.listThreads('admin@ziratbank.loan'),
    (error) => error.code === 'not_configured' && error.status === 503,
  );
}

console.log('mail tests passed');
