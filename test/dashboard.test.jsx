import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Router from '../src/Router.jsx';
import { AuthProvider } from '../src/lib/session.jsx';

const REFERENCE = 'ZIR-20261122-A1B2C3';

const APPLICATION = {
  reference: REFERENCE,
  fullName: 'Ayşe Yılmaz',
  phone: '+905321234567',
  nationalIdLast4: '0146',
  amount: 2500000,
  currency: 'TRY',
  termMonths: 36,
  consentVersion: 'test-v1',
  status: 'under_review',
  createdAt: '2026-11-20T09:00:00.000Z',
  updatedAt: '2026-11-21T11:30:00.000Z',
};

const ESTIMATE = {
  monthlyRate: 2.49,
  termMonths: 36,
  monthly: 105964.69,
  total: 3814728.84,
  interest: 1314728.84,
};

const EVENTS = [
  {
    id: 1,
    reference: REFERENCE,
    status: 'received',
    note: 'Application submitted.',
    actor: 'applicant',
    visibility: 'public',
    createdAt: '2026-11-20T09:00:00.000Z',
  },
  {
    id: 2,
    reference: REFERENCE,
    status: 'under_review',
    note: 'Documents received.',
    actor: 'admin',
    visibility: 'public',
    createdAt: '2026-11-21T11:30:00.000Z',
  },
];

function response(data, { ok = true, status = 200 } = {}) {
  return { ok, status, json: async () => data };
}

function stubApi(routes) {
  const fetchMock = vi.fn(async (url, options = {}) => {
    const path = String(url);
    const method = options.method || 'GET';
    const key = `${method} ${path.split('?')[0]}`;
    const handler = routes[key];
    if (!handler) throw new Error(`Unexpected request: ${key}`);
    return handler(options, path);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function renderAt(path) {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[path]}>
        <Router />
      </MemoryRouter>
    </AuthProvider>,
  );
}

const anonymous = () =>
  response({ authenticated: false, role: null, subject: null, adminUsesGeneratedPassword: false });

beforeEach(() => {
  vi.stubGlobal('scrollTo', vi.fn());
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('applicant portal', () => {
  it('validates the sign-in form and opens the dashboard on success', async () => {
    const fetchMock = stubApi({
      'GET /api/auth/session': anonymous,
      'POST /api/auth/applicant/login': () =>
        response({ ok: true, role: 'applicant', subject: REFERENCE }),
      'GET /api/applicant/application': () =>
        response({ ok: true, application: APPLICATION, events: EVENTS, estimate: ESTIMATE }),
    });

    const user = userEvent.setup();
    renderAt('/login');

    expect(await screen.findByRole('heading', { name: 'Sign in to track' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^Sign in$/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/reference number/i);

    await user.type(screen.getByLabelText('Application reference'), REFERENCE);
    await user.type(screen.getByLabelText('Telephone number'), '+90 532 123 4567');
    await user.click(screen.getByRole('button', { name: /^Sign in$/ }));

    expect(
      await screen.findByRole('heading', { level: 1, name: /Hello, Ayşe/i }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(REFERENCE).length).toBeGreaterThan(0);
    expect(screen.getByText('Documents received.')).toBeInTheDocument();
    expect(screen.getByText(/105,964\.69/)).toBeInTheDocument();

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/auth/applicant/login',
        expect.objectContaining({ method: 'POST' }),
      ),
    );
    const loginCall = fetchMock.mock.calls.find(([url]) => url === '/api/auth/applicant/login');
    expect(JSON.parse(loginCall[1].body)).toEqual({
      reference: REFERENCE,
      phone: '+90 532 123 4567',
    });
  });

  it('sends an applicant to the sign-in page when the session is missing', async () => {
    stubApi({ 'GET /api/auth/session': anonymous });
    renderAt('/dashboard');

    expect(await screen.findByRole('heading', { name: 'Sign in to track' })).toBeInTheDocument();
  });
});

describe('document title', () => {
  it('names the page for the current route', async () => {
    stubApi({ 'GET /api/auth/session': anonymous });
    renderAt('/login');

    await screen.findByRole('heading', { name: 'Sign in to track' });
    expect(document.title).toBe('Track your application — Zirat Bank');
  });
});

describe('staff console', () => {
  it('lists applications and records a decision', async () => {
    const admin = () =>
      response({ authenticated: true, role: 'admin', subject: 'staff@example.test' });
    const detail = () =>
      response({ ok: true, application: APPLICATION, events: EVENTS, estimate: ESTIMATE });

    const fetchMock = stubApi({
      'GET /api/auth/session': admin,
      'GET /api/admin/stats': () =>
        response({
          ok: true,
          stats: {
            total: 1,
            active: 1,
            last7Days: 1,
            byStatus: { received: 0, under_review: 1, approved: 0, declined: 0, withdrawn: 0 },
            valueByCurrency: { TRY: 2500000 },
          },
        }),
      'GET /api/admin/applications': () =>
        response({ ok: true, items: [APPLICATION], total: 1, page: 1, pages: 1, pageSize: 10 }),
      [`GET /api/admin/applications/${REFERENCE}`]: detail,
      [`PATCH /api/admin/applications/${REFERENCE}`]: () =>
        response({
          ok: true,
          application: { ...APPLICATION, status: 'approved' },
          events: [
            ...EVENTS,
            {
              id: 3,
              reference: REFERENCE,
              status: 'approved',
              note: 'Approved in principle.',
              actor: 'admin',
              visibility: 'public',
              createdAt: '2026-11-22T10:00:00.000Z',
            },
          ],
          estimate: ESTIMATE,
        }),
    });

    const user = userEvent.setup();
    renderAt('/admin');

    expect(await screen.findByRole('heading', { name: 'Applications overview' })).toBeInTheDocument();
    expect(await screen.findByText('Awaiting review')).toBeInTheDocument();
    expect((await screen.findAllByText('Ayşe Yılmaz')).length).toBeGreaterThan(0);

    await user.click(screen.getAllByRole('button', { name: 'Review' })[0]);
    expect(await screen.findByText('History')).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Status'), 'approved');
    await user.type(screen.getByLabelText(/Note \(optional/), 'Approved in principle.');
    await user.click(screen.getByRole('button', { name: 'Save update' }));

    expect(await screen.findByText(/updated to Approved/)).toBeInTheDocument();

    const patchCall = fetchMock.mock.calls.find(([, options]) => options?.method === 'PATCH');
    expect(JSON.parse(patchCall[1].body)).toEqual({
      status: 'approved',
      note: 'Approved in principle.',
      notifyApplicant: true,
    });
  });

  it('keeps anonymous visitors out of the console', async () => {
    stubApi({ 'GET /api/auth/session': anonymous });
    renderAt('/admin');

    expect(await screen.findByRole('heading', { name: 'Staff sign in' })).toBeInTheDocument();
  });
});

const SETTINGS = {
  monthlyRate: 2.49,
  termMonths: 36,
  minAmount: 100000,
  maxAmount: 50000000,
  currencies: ['TRY', 'USD', 'EUR', 'GBP'],
  consentVersion: 'test-v1',
  announcement: '',
  acceptingApplications: true,
  contact: {
    phone: '+44 20 7600 4985',
    email: 'applications@ziraatbank.com',
    whatsapp: '+44 7349 4349 42',
    hours: 'Mon–Fri, 09:00–18:00 GMT',
    address: '45–47 Cornhill, London',
  },
};

const STAFF = {
  id: 1,
  email: 'owner@example.test',
  role: 'owner',
  active: true,
  createdAt: '2026-11-01T09:00:00.000Z',
  lastLoginAt: '2026-11-22T08:00:00.000Z',
};

const signedIn = (subject = 'owner@example.test') => () =>
  response({ authenticated: true, role: 'admin', subject });

describe('admin users and settings', () => {
  it('lists staff, creates an account and manages applicants', async () => {
    const fetchMock = stubApi({
      'GET /api/auth/session': signedIn(),
      'GET /api/admin/me': () => response({ ok: true, user: STAFF }),
      'GET /api/admin/users': () =>
        response({ ok: true, users: [STAFF], currentUser: STAFF.id }),
      'GET /api/admin/applications': () =>
        response({ ok: true, items: [APPLICATION], total: 1, page: 1, pages: 1, pageSize: 50 }),
      'POST /api/admin/users': () =>
        response(
          {
            ok: true,
            user: { id: 2, email: 'new@example.test', role: 'admin', active: true },
          },
          { status: 201 },
        ),
    });

    const user = userEvent.setup();
    renderAt('/admin/users');

    expect(await screen.findByRole('heading', { name: 'Users and access' })).toBeInTheDocument();
    expect((await screen.findAllByText('owner@example.test')).length).toBeGreaterThan(0);
    expect(screen.getByText('Ayşe Yılmaz')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Add staff/ }));
    await user.type(screen.getByLabelText('Email'), 'new@example.test');
    await user.type(screen.getByLabelText('Temporary password'), 'new-staff-passphrase');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText(/can now sign in/)).toBeInTheDocument();

    const postCall = fetchMock.mock.calls.find(([, options]) => options?.method === 'POST');
    expect(postCall[0]).toBe('/api/admin/users');
    expect(JSON.parse(postCall[1].body)).toEqual({
      email: 'new@example.test',
      password: 'new-staff-passphrase',
      role: 'admin',
    });
  });

  it('changes a staff sign-in email', async () => {
    const fetchMock = stubApi({
      'GET /api/auth/session': signedIn(),
      'GET /api/admin/me': () => response({ ok: true, user: STAFF }),
      'GET /api/admin/users': () =>
        response({ ok: true, users: [STAFF], currentUser: STAFF.id }),
      'GET /api/admin/applications': () =>
        response({ ok: true, items: [APPLICATION], total: 1, page: 1, pages: 1, pageSize: 50 }),
      [`PATCH /api/admin/users/${STAFF.id}`]: () =>
        response({ ok: true, user: { ...STAFF, email: 'desk@ziratbank.com' } }),
    });

    const user = userEvent.setup();
    renderAt('/admin/users');

    await user.click(await screen.findByRole('button', { name: 'Email' }));

    const field = screen.getByLabelText('Sign-in email');
    expect(field).toHaveValue('owner@example.test');
    await user.clear(field);
    await user.type(field, 'Desk@ziratbank.com');
    await user.click(screen.getByRole('button', { name: 'Save email' }));

    expect(await screen.findByText(/Sign-in email changed to desk@ziratbank.com/)).toBeInTheDocument();

    const patchCall = fetchMock.mock.calls.find(([, options]) => options?.method === 'PATCH');
    expect(patchCall[0]).toBe(`/api/admin/users/${STAFF.id}`);
    expect(JSON.parse(patchCall[1].body)).toEqual({ email: 'Desk@ziratbank.com' });
  });

  it('shows read-only controls to a non-owner admin', async () => {
    stubApi({
      'GET /api/auth/session': signedIn('reviewer@example.test'),
      'GET /api/admin/me': () =>
        response({ ok: true, user: { ...STAFF, id: 2, email: 'reviewer@example.test', role: 'admin' } }),
      'GET /api/admin/users': () =>
        response({ ok: true, users: [STAFF], currentUser: 2 }),
      'GET /api/admin/applications': () =>
        response({ ok: true, items: [], total: 0, page: 1, pages: 1, pageSize: 50 }),
    });

    renderAt('/admin/users');

    expect(
      await screen.findByText(/Only the owner account can add staff/),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Add staff/ })).not.toBeInTheDocument();
  });

  it('saves site settings as the owner', async () => {
    const fetchMock = stubApi({
      'GET /api/auth/session': signedIn(),
      'GET /api/admin/me': () => response({ ok: true, user: STAFF }),
      'GET /api/admin/settings': () =>
        response({ ok: true, settings: SETTINGS, updatedAt: null }),
      'PUT /api/admin/settings': () =>
        response({
          ok: true,
          settings: { ...SETTINGS, monthlyRate: 3.25, currencies: ['TRY', 'GBP'] },
          updatedAt: '2026-11-22T12:00:00.000Z',
        }),
    });

    const user = userEvent.setup();
    renderAt('/admin/settings');

    expect(await screen.findByRole('heading', { name: 'Site settings' })).toBeInTheDocument();

    const rate = await screen.findByLabelText('Monthly interest rate (%)');
    await user.clear(rate);
    await user.type(rate, '3.25');
    await user.click(screen.getByRole('checkbox', { name: /USD/ }));
    await user.click(screen.getByRole('switch', { name: 'Accept new applications' }));
    await user.click(screen.getByRole('button', { name: /Save settings/ }));

    expect(await screen.findByText(/Site settings saved/)).toBeInTheDocument();

    const putCall = fetchMock.mock.calls.find(([, options]) => options?.method === 'PUT');
    const body = JSON.parse(putCall[1].body);
    expect(body.monthlyRate).toBe(3.25);
    expect(body.currencies).toEqual(['TRY', 'EUR', 'GBP']);
    expect(body.acceptingApplications).toBe(false);
    expect(body.contact.email).toBe('applications@ziraatbank.com');
  });
});
