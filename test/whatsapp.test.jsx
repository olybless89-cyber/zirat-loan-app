import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import WhatsAppButton from '../src/components/WhatsAppButton.jsx';
import { waHref } from '../src/lib/contact.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('waHref', () => {
  it('strips spaces and the plus from the branch number', () => {
    expect(waHref('+44 7349 4349 42')).toBe(
      'https://wa.me/447349434942?text=Hello%20Zirat%20Bank%2C%20I%20would%20like%20to%20ask%20about%20a%20loan.',
    );
  });

  it('keeps only digits from a formatted number', () => {
    expect(waHref('(44) 7349-4349-42', 'Hi')).toBe('https://wa.me/447349434942?text=Hi');
  });

  it('returns null when there is no number to dial', () => {
    expect(waHref('')).toBeNull();
    expect(waHref(undefined)).toBeNull();
    expect(waHref('n/a')).toBeNull();
  });
});

describe('WhatsAppButton', () => {
  it('opens the branch WhatsApp chat in a new tab', async () => {
    // The component asks /api/config for the number the console has saved; jsdom
    // cannot resolve a relative URL, so it falls back to the number in site.js.
    render(<WhatsAppButton />);

    const link = await screen.findByRole('link', { name: /whatsapp/i });

    expect(link).toHaveAttribute('href', expect.stringContaining('https://wa.me/447349434942'));
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('tells assistive tech what the button does', async () => {
    render(<WhatsAppButton />);

    const link = await screen.findByRole('link', { name: /chat with the london branch on whatsapp/i });
    expect(link).toBeInTheDocument();
  });
});
