// Shared validation rules. Loaded by the server (CommonJS) and the browser (window.AmberValidation).
(function (root) {
  const MIN_AMOUNT = 100000;
  const MAX_AMOUNT = 50000000;
  const CURRENCIES = ['TRY', 'USD', 'EUR', 'GBP'];
  const NAME_RE = /^[A-Za-zğüşıöçĞÜŞİÖÇ]+(?: [A-Za-zğüşıöçĞÜŞİÖÇ]+)*$/;
  const PHONE_RE = /^(?:\+90|0)5\d{9}$/;

  function normalizePhone(v) {
    return String(v || '').replace(/[\s\-()]/g, '');
  }

  function validateName(v) {
    const s = String(v || '').trim().replace(/\s+/g, ' ');
    if (!s) return 'Full name is required.';
    if (s.length < 3 || s.length > 50) return 'Full name must be between 3 and 50 characters.';
    if (!NAME_RE.test(s)) return 'Full name may contain letters and spaces only.';
    return null;
  }

  function validatePhone(v) {
    const s = normalizePhone(v);
    if (!s) return 'Telephone number is required.';
    if (!PHONE_RE.test(s)) return 'Use Turkish mobile format: +90 5XX XXX XXXX or 0 5XX XXX XXXX.';
    return null;
  }

  // TC Kimlik No checksum rules.
  function tcChecksumError(v) {
    const s = String(v || '').trim();
    if (!s) return 'National ID is required.';
    if (!/^\d{11}$/.test(s)) return 'National ID must be exactly 11 digits.';
    if (s[0] === '0') return 'National ID cannot start with 0.';
    const d = s.split('').map(Number);
    const odd = d[0] + d[2] + d[4] + d[6] + d[8];
    const even = d[1] + d[3] + d[5] + d[7];
    const d10 = (((odd * 7 - even) % 10) + 10) % 10;
    if (d10 !== d[9]) return 'National ID failed checksum: 10th digit is invalid.';
    const d11 = d.slice(0, 10).reduce((a, b) => a + b, 0) % 10;
    if (d11 !== d[10]) return 'National ID failed checksum: 11th digit is invalid.';
    return null;
  }

  // Builds a synthetic, checksum-valid ID for testing (prefix 99 marks it as demo data).
  function generateDemoId() {
    const d = [9, 9];
    for (let i = 0; i < 7; i++) d.push(Math.floor(Math.random() * 10));
    const odd = d[0] + d[2] + d[4] + d[6] + d[8];
    const even = d[1] + d[3] + d[5] + d[7];
    d.push((((odd * 7 - even) % 10) + 10) % 10);
    d.push(d.reduce((a, b) => a + b, 0) % 10);
    return d.join('');
  }

  function validateAmount(v) {
    const n = Number(v);
    if (v === '' || v === null || v === undefined || !Number.isFinite(n)) return 'Loan amount is required.';
    if (n < MIN_AMOUNT || n > MAX_AMOUNT) return 'Amount must be between 100,000 and 50,000,000.';
    return null;
  }

  function validateCurrency(v) {
    return CURRENCIES.includes(v) ? null : 'Choose TRY, USD, EUR or GBP.';
  }

  function validateApplication(a) {
    const errors = {};
    const set = (k, e) => { if (e) errors[k] = e; };
    set('fullName', validateName(a.fullName));
    set('phone', validatePhone(a.phone));
    set('nationalId', tcChecksumError(a.nationalId));
    set('amount', validateAmount(a.amount));
    set('currency', validateCurrency(a.currency));
    if (a.consent !== true) errors.consent = 'You must accept the privacy and data processing notice.';
    return errors;
  }

  const api = {
    MIN_AMOUNT, MAX_AMOUNT, CURRENCIES,
    normalizePhone, validateName, validatePhone, tcChecksumError,
    generateDemoId, validateAmount, validateCurrency, validateApplication
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.AmberValidation = api;
})(typeof window !== 'undefined' ? window : globalThis);
