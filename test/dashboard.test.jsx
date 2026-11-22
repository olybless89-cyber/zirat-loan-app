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
