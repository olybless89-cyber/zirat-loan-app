import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App.jsx';

function stubFetch({ onPost } = {}) {
  const fetchMock = vi.fn(async (url, options = {}) => {
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

const instalment = () => screen.getByTestId('instalment').textContent;

describe('landing page', () => {
  it('renders the hero and the primary call to action', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/personal & business loans/i);
    expect(screen.getByRole('button', { name: /Get Free Pre-Approval/i })).toBeInTheDocument();
  });

  it('renders every section from the brief', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /How Your Application Is Processed/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Calculate Your Repayments/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Submit Your Request/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Client Testimonials/i })).toBeInTheDocument();
  });

  it('converts the estimate when the currency changes', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(instalment()).toMatch(/^₺/);
    await user.click(screen.getByRole('button', { name: /GBP/i }));
    expect(instalment()).toMatch(/^£/);
  });

  it('keeps the application form in step with the calculator', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /EUR/i }));

    expect(screen.getByLabelText('Currency', { selector: 'select' })).toHaveValue('EUR');
    expect(screen.getByLabelText(/Loan Amount/i, { selector: '#form-amount' })).toHaveValue(2500000);
  });

  it('applies a quick-select amount to both calculator and form', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: '₺10,000,000' }));

    expect(screen.getByLabelText('Loan Amount', { selector: '#calc-amount' })).toHaveValue(10000000);
    expect(screen.getByLabelText(/Loan Amount/i, { selector: '#form-amount' })).toHaveValue(10000000);
  });

  it('advances the testimonial carousel', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByText('Emre K.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Next testimonial/i }));
    expect(screen.getByText('Zeynep A.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Previous testimonial/i }));
    expect(screen.getByText('Emre K.')).toBeInTheDocument();
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

    await user.click(screen.getByRole('button', { name: /Submit & Continue/i }));

    expect(screen.getByText('Full name is required.')).toBeInTheDocument();
    expect(screen.getByText('Telephone number is required.')).toBeInTheDocument();
    expect(screen.getByText('National ID is required.')).toBeInTheDocument();
    expect(
      screen.getByText('You must accept the privacy and data processing notice.'),
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects an invalid national ID checksum', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText(/Full Name/i), 'Ayşe Yılmaz');
    await user.type(screen.getByLabelText(/Turkish Mobile Phone Number/i), '0532 123 4567');
    await user.type(screen.getByLabelText(/Turkish ID Number/i), '10000000147');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /Submit & Continue/i }));

    expect(screen.getByText(/11th digit is invalid/i)).toBeInTheDocument();
  });

  it('submits a valid application and shows the reference', async () => {
    const user = userEvent.setup();
    const posts = [];
    stubFetch({ onPost: (options) => posts.push(JSON.parse(options.body)) });
    render(<App />);

    await user.type(screen.getByLabelText(/Full Name/i), 'Ayşe Yılmaz');
    await user.type(screen.getByLabelText(/Turkish Mobile Phone Number/i), '0532 123 4567');
    await user.click(screen.getByRole('button', { name: /Fill Valid Demo ID/i }));
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /Submit & Continue/i }));

    await waitFor(() => expect(screen.getByText(/ZIR-TEST-0001/)).toBeInTheDocument());
    expect(posts).toHaveLength(1);
    expect(posts[0]).toMatchObject({ fullName: 'Ayşe Yılmaz', currency: 'TRY', consent: true });
    expect(posts[0].nationalId).toMatch(/^\d{11}$/);
  });
});
