import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Router from '../src/Router.jsx';
import { AuthProvider } from '../src/lib/session.jsx';

const THREAD = {
  id: 't1',
  subject: 'Question about my application',
  from: 'Ada Lovelace <ada@example.com>',
  to: ['admin@ziratbank.loan'],
  read: false,
  folder: 'inbox',
  emailCount: 1,
  hasAttachment: false,
  lastActiveAt: '2026-11-22T09:00:00.000Z',
};

const EMAIL = {
  id: 'e1',
  direction: 'inbound',
  from: 'Ada Lovelace <ada@example.com>',
  to: ['admin@ziratbank.loan'],
  subject: 'Question about my application',
  html: '<p>Hello</p><script>window.top.location = "https://evil.example"</script>',
  text: 'Hello',
  read: false,
  at: '2026-11-22T09:00:00.000Z',
  attachments: [],
};

function response(data, { ok = true, status = 200 } = {}) {
  return { ok, status, json: async () => data };
}

function stubApi(routes) {
  const fetchMock = vi.fn(async (url, options = {}) => {
    const method = options.method || 'GET';
    const key = `${method} ${String(url).split('?')[0]}`;
    const handler = routes[key];
    if (!handler) throw new Error(`Unexpected request: ${key}`);
    return handler(options, String(url));
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const adminSession = () =>
  response({ authenticated: true, role: 'admin', subject: 'admin@ziratbank.loan' });

function renderMail() {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/admin/mail']}>
        <Router />
      </MemoryRouter>
    </AuthProvider>,
  );
}

beforeEach(() => {
  vi.stubGlobal('scrollTo', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('admin mail', () => {
  it('shows the setup steps while the service has no Resend credentials', async () => {
    stubApi({
      'GET /api/auth/session': adminSession,
      'GET /api/admin/mail/status': () =>
        response({ ok: true, configured: false, missing: ['RESEND_API_KEY', 'MAIL_INBOX'] }),
    });

    renderMail();

    expect(await screen.findByText(/Email is not connected yet/i)).toBeInTheDocument();
    expect(screen.getByText('RESEND_API_KEY')).toBeInTheDocument();
    expect(screen.getByText(/Enable receiving for the domain/i)).toBeInTheDocument();
  });

  it('lists threads and reads one inside a sandboxed frame', async () => {
    stubApi({
      'GET /api/auth/session': adminSession,
      'GET /api/admin/mail/status': () =>
        response({ ok: true, configured: true, missing: [], inbox: 'admin@ziratbank.loan' }),
      'GET /api/admin/mail/threads': () =>
        response({ ok: true, folder: 'inbox', threads: [THREAD], hasMore: false }),
      'GET /api/admin/mail/threads/t1': () => response({ ok: true, thread: THREAD, emails: [EMAIL] }),
      'POST /api/admin/mail/threads/t1/read': () => response({ ok: true }),
    });

    const user = userEvent.setup();
    renderMail();

    const row = await screen.findByText('Question about my application');
    await user.click(row);

    const frame = await screen.findByTitle('Message from ada@example.com');
    const sandbox = frame.getAttribute('sandbox') || '';
    expect(sandbox).not.toMatch(/allow-scripts/);
    expect(sandbox).not.toMatch(/allow-same-origin/);
    expect(frame.getAttribute('srcdoc')).toContain('Hello');
    expect(screen.getByText('Received')).toBeInTheDocument();
  });

  it('sends a reply to the thread', async () => {
    const fetchMock = stubApi({
      'GET /api/auth/session': adminSession,
      'GET /api/admin/mail/status': () =>
        response({ ok: true, configured: true, missing: [], inbox: 'admin@ziratbank.loan' }),
      'GET /api/admin/mail/threads': () =>
        response({ ok: true, folder: 'inbox', threads: [THREAD], hasMore: false }),
      'GET /api/admin/mail/threads/t1': () => response({ ok: true, thread: THREAD, emails: [EMAIL] }),
      'POST /api/admin/mail/threads/t1/read': () => response({ ok: true }),
      'POST /api/admin/mail/threads/t1/reply': () => response({ ok: true }),
    });

    const user = userEvent.setup();
    renderMail();

    await user.click(await screen.findByText('Question about my application'));
    await user.type(await screen.findByLabelText(/Reply/i), 'We have your documents.');
    await user.click(screen.getByRole('button', { name: /Send reply/i }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/admin/mail/threads/t1/reply',
        expect.objectContaining({ method: 'POST' }),
      ),
    );
    const call = fetchMock.mock.calls.find(([url]) => url === '/api/admin/mail/threads/t1/reply');
    expect(JSON.parse(call[1].body)).toEqual({ text: 'We have your documents.' });
  });

  it('composes a new message and posts it to the send endpoint', async () => {
    const fetchMock = stubApi({
      'GET /api/auth/session': adminSession,
      'GET /api/admin/mail/status': () =>
        response({ ok: true, configured: true, missing: [], inbox: 'admin@ziratbank.loan' }),
      'GET /api/admin/mail/threads': () =>
        response({ ok: true, folder: 'inbox', threads: [THREAD], hasMore: false }),
      'POST /api/admin/mail/send': () => response({ ok: true }),
    });

    const user = userEvent.setup();
    renderMail();

    await user.click(await screen.findByRole('button', { name: /New message/i }));
    await user.type(screen.getByLabelText('To'), 'ada@example.com');
    await user.type(screen.getByLabelText('Subject'), 'Your application');
    await user.type(screen.getByLabelText('Message'), 'We need one more document.');
    await user.click(screen.getByRole('button', { name: /^Send$/i }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/admin/mail/send',
        expect.objectContaining({ method: 'POST' }),
      ),
    );
    const call = fetchMock.mock.calls.find(([url]) => url === '/api/admin/mail/send');
    expect(JSON.parse(call[1].body)).toEqual({
      to: 'ada@example.com',
      subject: 'Your application',
      text: 'We need one more document.',
    });
  });
});
