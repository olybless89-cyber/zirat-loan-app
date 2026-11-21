import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App.jsx';

const CONFIG = {
  monthlyRate: 2.49,
  termMonths: 36,
  minAmount: 100000,
  maxAmount: 50000000,
  currencies: ['TRY', 'USD', 'EUR', 'GBP'],
  consentVersion: 'test-v1',
};

function stubFetch({ onPost } = {}) {
  const fetchMock = vi.fn(async (url, options = {}) => {
    if (String(url).includes('/api/config')) {
      return { ok: true, json: async () => CONFIG };
    }
    onPost?.(options);
    return {
      ok: true,
      status: 201,
      json: async () => ({
        ok: true,
        reference: 'ZIR-TEST-0001',
        summary: {
          fullName: 'Ayşe Yılmaz',
          amount: 2500000,
          currency: 'TRY',
          status: 'received',
          createdAt: '2026-11-21T10:00:00.000Z',
        },
      }),
    };
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

beforeEach(() => stubFetch());
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('landing page', () => {
  it('renders the hero and the primary call to action', async () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/four currencies/i);
    expect(screen.getByRole('button', { name: /Start your application/i })).toBeInTheDocument();
    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/config'));
  });

  it('converts the estimate when the currency changes', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getAllByText('₺105,964.69').length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: /GBP/i }));

    expect(screen.getAllByText('£105,964.69').length).toBeGreaterThan(0);
    expect(screen.queryByText('₺105,964.69')).not.toBeInTheDocument();
  });

  it('keeps the application form in step with the calculator', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /EUR/i }));

    expect(screen.getByLabelText('Currency', { selector: 'select' })).toHaveValue('EUR');
    expect(screen.getByLabelText('Loan amount', { selector: '#form-amount' })).toHaveValue(2500000);
  });

  it('advances the testimonial carousel', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByText('Emre Kaya')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Next testimonial/i }));
    expect(screen.getByText('Zeynep Arslan')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Previous testimonial/i }));
    expect(screen.getByText('Emre Kaya')).toBeInTheDocument();
  });

  it('opens the contact dialog and closes it with Escape', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getAllByRole('button', { name: 'Contact' })[0]);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('application form', () => {
  it('blocks submission and explains each missing field', async () => {
    const user = userEvent.setup();
    const fetchMock = stubFetch();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /Submit application/i }));

    expect(screen.getByText('Full name is required.')).toBeInTheDocument();
    expect(screen.getByText('Telephone number is required.')).toBeInTheDocument();
    expect(screen.getByText('National ID is required.')).toBeInTheDocument();
    expect(
      screen.getByText('You must accept the privacy and data processing notice.'),
    ).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/api/applications'))).toBe(false);
  });

  it('rejects an invalid national ID checksum', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText('Full name'), 'Ayşe Yılmaz');
    await user.type(screen.getByLabelText('Telephone'), '0532 123 4567');
    await user.type(screen.getByLabelText(/National ID/), '10000000147');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /Submit application/i }));

    expect(screen.getByText(/11th digit is invalid/i)).toBeInTheDocument();
  });

  it('submits a valid application and shows the reference', async () => {
    const user = userEvent.setup();
    const posts = [];
    stubFetch({ onPost: (options) => posts.push(JSON.parse(options.body)) });
    render(<App />);

    await user.type(screen.getByLabelText('Full name'), 'Ayşe Yılmaz');
    await user.type(screen.getByLabelText('Telephone'), '0532 123 4567');
    await user.click(screen.getByRole('button', { name: /Fill demo ID/i }));
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /Submit application/i }));

    expect(await screen.findByText(/ZIR-TEST-0001/)).toBeInTheDocument();
    expect(posts).toHaveLength(1);
    expect(posts[0]).toMatchObject({
      fullName: 'Ayşe Yılmaz',
      currency: 'TRY',
      amount: 2500000,
      consent: true,
    });
    expect(posts[0].nationalId).toMatch(/^99\d{9}$/);
  });
});
