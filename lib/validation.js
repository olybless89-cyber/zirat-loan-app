export const MIN_AMOUNT = 100000;
export const MAX_AMOUNT = 50000000;
export const CURRENCIES = ['TRY', 'USD', 'EUR', 'GBP'];

export const CURRENCY_META = {
  TRY: { symbol: '₺', name: 'Turkish Lira' },
  USD: { symbol: '$', name: 'US Dollar' },
  EUR: { symbol: '€', name: 'Euro' },
  GBP: { symbol: '£', name: 'British Pound' },
};

const NAME_RE = /^[A-Za-zğüşıöçĞÜŞİÖÇ]+(?: [A-Za-zğüşıöçĞÜŞİÖÇ]+)*$/;
const PHONE_RE = /^(?:\+90|0)5\d{9}$/;

export function normalizePhone(value) {
  return String(value || '').replace(/[\s\-()]/g, '');
}

export function validateName(value) {
  const name = String(value || '').trim().replace(/\s+/g, ' ');
  if (!name) return 'Full name is required.';
  if (name.length < 3 || name.length > 50) return 'Full name must be between 3 and 50 characters.';
  if (!NAME_RE.test(name)) return 'Full name may contain letters and spaces only.';
  return null;
}

export function validatePhone(value) {
  const phone = normalizePhone(value);
  if (!phone) return 'Telephone number is required.';
  if (!PHONE_RE.test(phone)) return 'Use a Turkish mobile number: +90 5XX XXX XXXX or 0 5XX XXX XXXX.';
  return null;
}

export function tcChecksumError(value) {
  const id = String(value || '').trim();
  if (!id) return 'National ID is required.';
  if (!/^\d{11}$/.test(id)) return 'National ID must be exactly 11 digits.';
  if (id[0] === '0') return 'National ID cannot start with 0.';
  const digits = id.split('').map(Number);
  const odd = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];
  const even = digits[1] + digits[3] + digits[5] + digits[7];
  const tenth = (((odd * 7 - even) % 10) + 10) % 10;
  if (tenth !== digits[9]) return 'National ID failed the checksum: 10th digit is invalid.';
  const eleventh = digits.slice(0, 10).reduce((sum, d) => sum + d, 0) % 10;
  if (eleventh !== digits[10]) return 'National ID failed the checksum: 11th digit is invalid.';
  return null;
}

// Synthetic ID for testing only: the 99 prefix cannot collide with a real TR ID.
export function generateDemoId() {
  const digits = [9, 9];
  for (let i = 0; i < 7; i += 1) digits.push(Math.floor(Math.random() * 10));
  const odd = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];
  const even = digits[1] + digits[3] + digits[5] + digits[7];
  digits.push((((odd * 7 - even) % 10) + 10) % 10);
  digits.push(digits.reduce((sum, d) => sum + d, 0) % 10);
  return digits.join('');
}

export function validateAmount(value) {
  const amount = Number(value);
  if (value === '' || value === null || value === undefined || !Number.isFinite(amount)) {
    return 'Loan amount is required.';
  }
  if (amount < MIN_AMOUNT || amount > MAX_AMOUNT) {
    return 'Loan amount must be between 100,000 and 50,000,000.';
  }
  return null;
}

export function validateCurrency(value) {
  return CURRENCIES.includes(value) ? null : 'Choose TRY, USD, EUR or GBP.';
}

export function validateApplication(application) {
  const errors = {};
  const set = (key, error) => {
    if (error) errors[key] = error;
  };
  set('fullName', validateName(application.fullName));
  set('phone', validatePhone(application.phone));
  set('nationalId', tcChecksumError(application.nationalId));
  set('amount', validateAmount(application.amount));
  set('currency', validateCurrency(application.currency));
  if (application.consent !== true) {
    errors.consent = 'You must accept the privacy and data processing notice.';
  }
  return errors;
}

// Amortised instalment: M = P · r(1+r)^n / ((1+r)^n − 1)
export function monthlyInstalment(principal, monthlyRatePercent, months) {
  const P = Number(principal);
  const rate = Number(monthlyRatePercent) / 100;
  const n = Number(months);
  if (![P, rate, n].every(Number.isFinite) || P <= 0 || n <= 0 || rate < 0) return null;
  if (rate === 0) return P / n;
  const growth = (1 + rate) ** n;
  return (P * rate * growth) / (growth - 1);
}

export function formatMoney(value, currency, options = {}) {
  const symbol = CURRENCY_META[currency]?.symbol ?? '';
  const formatted = Number(value).toLocaleString('en-GB', {
    minimumFractionDigits: options.decimals ?? 0,
    maximumFractionDigits: options.decimals ?? 0,
  });
  return `${symbol}${formatted}`;
}
