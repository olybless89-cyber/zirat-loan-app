import assert from 'node:assert/strict';

const { DEFAULT_SETTINGS, mergeSettings, normalizeSettings, publicSettings } = await import(
  '../lib/settings.js'
);

assert.deepEqual(DEFAULT_SETTINGS.currencies, ['TRY', 'USD', 'EUR', 'GBP']);
assert.equal(typeof DEFAULT_SETTINGS.monthlyRate, 'number');

// A partial update keeps every other value.
const partial = normalizeSettings({ monthlyRate: 3.1 }, DEFAULT_SETTINGS);
assert.deepEqual(partial.errors, {});
assert.equal(partial.settings.monthlyRate, 3.1);
assert.equal(partial.settings.termMonths, DEFAULT_SETTINGS.termMonths);
assert.equal(partial.settings.contact.phone, DEFAULT_SETTINGS.contact.phone);

// Rates round to two decimals.
assert.equal(normalizeSettings({ monthlyRate: 2.4999 }, DEFAULT_SETTINGS).settings.monthlyRate, 2.5);

// Invalid numbers are rejected with a per-field message.
const bad = normalizeSettings(
  {
    monthlyRate: 99,
    termMonths: 3.5,
    minAmount: 9_000_000,
    maxAmount: 100_000,
    currencies: [],
    consentVersion: 'not allowed!',
    announcement: 'x'.repeat(141),
  },
  DEFAULT_SETTINGS,
);
for (const field of ['monthlyRate', 'termMonths', 'currencies', 'consentVersion', 'announcement', 'maxAmount']) {
  assert.ok(bad.errors[field], `${field} should report an error`);
}
assert.equal(bad.settings.monthlyRate, DEFAULT_SETTINGS.monthlyRate, 'rejected values are not applied');

// Currencies are filtered to the known set and keep their canonical order.
const currencies = normalizeSettings({ currencies: ['GBP', 'NOPE', 'TRY'] }, DEFAULT_SETTINGS);
assert.deepEqual(currencies.settings.currencies, ['TRY', 'GBP']);

// Contact details merge field by field and the email is validated.
const contact = normalizeSettings(
  { contact: { phone: '+44 20 7600 1234', email: 'not-an-email' } },
  DEFAULT_SETTINGS,
);
assert.equal(contact.settings.contact.phone, '+44 20 7600 1234');
assert.equal(contact.settings.contact.hours, DEFAULT_SETTINGS.contact.hours);
assert.ok(contact.errors['contact.email']);

assert.equal(
  normalizeSettings({ contact: { address: 'x'.repeat(201) } }, DEFAULT_SETTINGS).errors['contact.address'],
  'Keep this under 200 characters.',
);

// The accepting switch must be a boolean.
assert.ok(normalizeSettings({ acceptingApplications: 'yes' }, DEFAULT_SETTINGS).errors.acceptingApplications);
assert.equal(normalizeSettings({ acceptingApplications: false }, DEFAULT_SETTINGS).settings.acceptingApplications, false);

// Unknown keys never leak into stored settings.
const merged = mergeSettings(DEFAULT_SETTINGS, { bogus: 'value', contact: { phone: '+1' } });
assert.equal(merged.bogus, undefined);
assert.equal(merged.contact.phone, '+1');
assert.equal(merged.contact.email, DEFAULT_SETTINGS.contact.email);

// The public shape is explicit, so admin-only fields can never be exposed by accident.
assert.deepEqual(Object.keys(publicSettings(DEFAULT_SETTINGS)).sort(), [
  'acceptingApplications',
  'announcement',
  'consentVersion',
  'contact',
  'currencies',
  'maxAmount',
  'minAmount',
  'monthlyRate',
  'termMonths',
]);

console.log('settings tests passed');
