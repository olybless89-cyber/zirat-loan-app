import { CURRENCIES, MAX_AMOUNT, MIN_AMOUNT } from './validation.js';

export const ADMIN_ROLES = ['owner', 'admin'];

export const DEFAULT_SETTINGS = {
  monthlyRate: Number(process.env.MONTHLY_RATE || 2.49),
  termMonths: Number(process.env.TERM_MONTHS || 36),
  minAmount: MIN_AMOUNT,
  maxAmount: MAX_AMOUNT,
  currencies: [...CURRENCIES],
  consentVersion: process.env.CONSENT_VERSION || '2026-11-zirat-v1',
  announcement: '',
  acceptingApplications: true,
  contact: {
    phone: process.env.CONTACT_PHONE || '+44 20 7600 4985',
    email: process.env.CONTACT_EMAIL || 'applications@ziraatbank.com',
    whatsapp: process.env.CONTACT_WHATSAPP || '+44 7349 4349 42',
    hours: process.env.SUPPORT_HOURS || 'Mon–Fri, 09:00–18:00 GMT',
    address:
      process.env.CONTACT_ADDRESS ||
      'T.C. Ziraat Bankası A.Ş., London Branch, 45–47 Cornhill, London, EC3V 3PF, United Kingdom.',
  },
};

const LABELS = {
  monthlyRate: 'Monthly rate',
  termMonths: 'Default term',
  minAmount: 'Minimum amount',
  maxAmount: 'Maximum amount',
  consentVersion: 'Consent version',
  announcement: 'Announcement',
  acceptingApplications: 'Applications switch',
};

const LIMITS = {
  monthlyRate: { min: 0.01, max: 15 },
  termMonths: { min: 6, max: 120, integer: true },
  minAmount: { min: 1000, max: 10_000_000 },
  maxAmount: { min: 10_000, max: 100_000_000 },
};

const CONTACT_LIMITS = {
  phone: 40,
  email: 80,
  whatsapp: 40,
  hours: 60,
  address: 200,
};

const isPlainObject = (value) =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

export function mergeSettings(...layers) {
  const merged = { ...DEFAULT_SETTINGS };
  for (const layer of layers) {
    if (!isPlainObject(layer)) continue;
    for (const key of Object.keys(DEFAULT_SETTINGS)) {
      if (key === 'contact') continue;
      if (layer[key] !== undefined) merged[key] = layer[key];
    }
    if (isPlainObject(layer.contact)) {
      merged.contact = { ...merged.contact, ...layer.contact };
    }
  }
  return merged;
}

export function normalizeSettings(input, current = DEFAULT_SETTINGS) {
  const source = isPlainObject(input) ? input : {};
  const base = mergeSettings(current);
  const next = mergeSettings(current);
  const errors = {};

  for (const [key, limits] of Object.entries(LIMITS)) {
    const raw = source[key] === undefined ? base[key] : source[key];
    const value = Number(raw);
    const valid =
      Number.isFinite(value) &&
      value >= limits.min &&
      value <= limits.max &&
      (!limits.integer || Number.isInteger(value));
    if (!valid) {
      errors[key] = `${LABELS[key]} must be between ${limits.min} and ${limits.max}${
        limits.integer ? ', in whole numbers' : ''
      }.`;
      continue;
    }
    next[key] = limits.integer ? value : Math.round(value * 100) / 100;
  }

  if (next.minAmount !== undefined && next.maxAmount !== undefined && next.minAmount >= next.maxAmount) {
    errors.maxAmount = 'The maximum amount must be larger than the minimum.';
  }

  if (source.currencies !== undefined) {
    const requested = Array.isArray(source.currencies) ? source.currencies : [];
    const chosen = CURRENCIES.filter((code) => requested.includes(code));
    if (!chosen.length) errors.currencies = 'Keep at least one currency enabled.';
    else next.currencies = chosen;
  }

  if (source.consentVersion !== undefined) {
    const value = String(source.consentVersion).trim();
    if (!value || value.length > 40 || !/^[\w.-]+$/.test(value)) {
      errors.consentVersion = 'Use 1–40 letters, numbers, dots, dashes or underscores.';
    } else {
      next.consentVersion = value;
    }
  }

  if (source.announcement !== undefined) {
    const value = String(source.announcement).trim();
    if (value.length > 140) errors.announcement = 'Keep the announcement to 140 characters.';
    else next.announcement = value;
  }

  if (source.acceptingApplications !== undefined) {
    if (typeof source.acceptingApplications !== 'boolean') {
      errors.acceptingApplications = 'Choose whether the branch is accepting applications.';
    } else {
      next.acceptingApplications = source.acceptingApplications;
    }
  }

  if (source.contact !== undefined) {
    const contact = isPlainObject(source.contact) ? source.contact : {};
    const merged = { ...next.contact };
    for (const [field, max] of Object.entries(CONTACT_LIMITS)) {
      if (contact[field] === undefined) continue;
      const value = String(contact[field]).trim();
      if (value.length > max) {
        errors[`contact.${field}`] = `Keep this under ${max} characters.`;
      } else {
        merged[field] = value;
      }
    }
    if (merged.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(merged.email)) {
      errors['contact.email'] = 'Enter a valid email address.';
    }
    next.contact = merged;
  }

  return { settings: next, errors };
}

export function publicSettings(settings) {
  return {
    monthlyRate: settings.monthlyRate,
    termMonths: settings.termMonths,
    minAmount: settings.minAmount,
    maxAmount: settings.maxAmount,
    currencies: settings.currencies,
    consentVersion: settings.consentVersion,
    announcement: settings.announcement,
    acceptingApplications: settings.acceptingApplications,
    contact: settings.contact,
  };
}
