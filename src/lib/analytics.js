// Analytics stays dormant unless a pixel is configured, and never receives
// personal data: only the currency and a coarse amount band.
export function trackLead({ currency, amount }) {
  if (typeof window === 'undefined') return;
  const band = amount >= 10000000 ? '10M+' : amount >= 1000000 ? '1M-10M' : '<1M';
  const payload = { currency, amount_band: band };

  if (typeof window.fbq === 'function') window.fbq('track', 'Lead', payload);
  if (typeof window.gtag === 'function') window.gtag('event', 'lead', payload);
}
