const env = import.meta.env ?? {};
const read = (value) => (typeof value === 'string' && value.trim() ? value.trim() : '');

export const BRAND = {
  name: 'Zirat Bank',
  shortName: 'ZIRAT BANK',
  legalName: 'T.C. Ziraat Bankası A.Ş.',
  branch: 'London Branch',
  regulator: 'Financial Conduct Authority',
  regulatorShort: 'FCA',
  frn: '204439',
};

// Headline pricing shown in the hero. The calculator keeps its own
// configurable monthly rate from the API.
export const RATES = {
  annualPercent: 3.9,
  turnaroundHours: 48,
};

// Contact channels come from the environment so the build never ships invented
// details for a real branch. The fallbacks are Ofcom drama-range fixtures that
// cannot connect anywhere, and the UI labels them as demonstration data.
export const CONTACT = {
  phone: read(env.VITE_CONTACT_PHONE) || '+44 20 7946 0821',
  email: read(env.VITE_CONTACT_EMAIL) || 'applications@example.com',
  address: read(env.VITE_CONTACT_ADDRESS) || '1 Example Square, London E14 5AB',
  whatsapp: read(env.VITE_CONTACT_WHATSAPP),
  hours: read(env.VITE_SUPPORT_HOURS) || 'Mon–Fri, 09:00–18:00 GMT',
  isConfigured: Boolean(read(env.VITE_CONTACT_PHONE) || read(env.VITE_CONTACT_EMAIL)),
};

export const telHref = (phone) => `tel:${phone.replace(/[^\d+]/g, '')}`;

export const WHATSAPP_LINK = CONTACT.whatsapp
  ? `https://wa.me/${CONTACT.whatsapp.replace(/[^\d]/g, '')}`
  : null;
