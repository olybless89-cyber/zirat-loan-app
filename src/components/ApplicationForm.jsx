import { useRef, useState } from 'react';
import { AlertCircle, Check, Loader2, Send, ShieldCheck } from 'lucide-react';
import {
  CURRENCIES,
  CURRENCY_META,
  generateDemoId,
  validateApplication,
} from '../../lib/validation.js';

const EMPTY = { fullName: '', phone: '', nationalId: '', consent: false };

function Field({ id, label, hint, error, children }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-navy">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 flex items-start gap-1.5 text-xs font-medium text-brand">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="mt-1.5 text-xs text-slate-500">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

const inputClass = (invalid) =>
  `mt-2 w-full rounded-lg border bg-white px-3.5 py-3 text-sm text-navy shadow-sm transition placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
    invalid
      ? 'border-brand focus:border-brand focus:ring-brand/20'
      : 'border-slate-300 focus:border-brand focus:ring-brand/20'
  }`;

export default function ApplicationForm({
  amount,
  currency,
  term,
  onAmountChange,
  onCurrencyChange,
  min,
  max,
  onSuccess,
  onOpenLegal,
}) {
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const formRef = useRef(null);

  const update = (key) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const fillDemoId = () => {
    setValues((prev) => ({ ...prev, nationalId: generateDemoId() }));
    setErrors((prev) => ({ ...prev, nationalId: undefined }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setServerError('');

    const payload = { ...values, amount, currency };
    const nextErrors = validateApplication(payload);
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      const firstKey = Object.keys(nextErrors)[0];
      const map = {
        fullName: 'full-name',
        phone: 'phone',
        nationalId: 'national-id',
        amount: 'form-amount',
        consent: 'consent',
      };
      document.getElementById(map[firstKey])?.focus();
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: values.fullName,
          phone: values.phone,
          nationalId: values.nationalId,
          amount: Number(amount),
          currency,
          termMonths: term,
          consent: values.consent,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (data.errors) setErrors(data.errors);
        setServerError(
          data.message || 'We could not submit your application. Please check the form and retry.',
        );
        return;
      }

      setValues(EMPTY);
      onSuccess({ reference: data.reference, summary: data.summary, currency, amount: Number(amount) });
    } catch {
      setServerError('Network error. Check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="basvuru-form" className="scroll-mt-24 bg-white py-16 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <p className="text-xs font-bold uppercase tracking-widest text-brand">
              Pre-approval application
            </p>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-navy sm:text-3xl">
              Request pre-approval
            </h2>
            <p className="mt-3 max-w-xl text-sm text-slate-600">
              Five fields, about two minutes. The amount and currency stay linked to the calculator
              above.
            </p>

            <form ref={formRef} onSubmit={handleSubmit} noValidate className="mt-8 space-y-5">
              <Field id="full-name" label="Full name" error={errors.fullName} hint="As shown on your ID, 3–50 characters.">
                <input
                  id="full-name"
                  name="fullName"
                  type="text"
                  autoComplete="name"
                  value={values.fullName}
                  onChange={update('fullName')}
                  aria-invalid={Boolean(errors.fullName)}
                  aria-describedby={errors.fullName ? 'full-name-error' : 'full-name-hint'}
                  placeholder="e.g. Ayşe Yılmaz"
                  className={inputClass(errors.fullName)}
                />
              </Field>

              <Field id="phone" label="Telephone" error={errors.phone} hint="Turkish mobile: +90 5XX XXX XXXX or 0 5XX XXX XXXX.">
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  inputMode="tel"
                  value={values.phone}
                  onChange={update('phone')}
                  aria-invalid={Boolean(errors.phone)}
                  aria-describedby={errors.phone ? 'phone-error' : 'phone-hint'}
                  placeholder="+90 5XX XXX XXXX"
                  className={inputClass(errors.phone)}
                />
              </Field>

              <Field
                id="national-id"
                label="National ID (TC Kimlik No)"
                error={errors.nationalId}
                hint="11 digits, checksum verified. Only the last four digits are stored."
              >
                <div className="flex gap-2">
                  <input
                    id="national-id"
                    name="nationalId"
                    type="text"
                    inputMode="numeric"
                    maxLength={11}
                    value={values.nationalId}
                    onChange={update('nationalId')}
                    aria-invalid={Boolean(errors.nationalId)}
                    aria-describedby={errors.nationalId ? 'national-id-error' : 'national-id-hint'}
                    placeholder="11 digits"
                    className={inputClass(errors.nationalId)}
                  />
                  <button
                    type="button"
                    onClick={fillDemoId}
                    className="mt-2 shrink-0 rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-3 text-xs font-semibold text-slate-700 transition hover:border-brand hover:text-brand"
                  >
                    Fill demo ID
                  </button>
                </div>
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  id="form-amount"
                  label="Loan amount"
                  error={errors.amount}
                  hint={`Over ${term} months, matching the calculator.`}
                >
                  <input
                    id="form-amount"
                    name="amount"
                    type="number"
                    inputMode="numeric"
                    min={min}
                    max={max}
                    step={1000}
                    value={amount}
                    onChange={(event) => onAmountChange(Number(event.target.value))}
                    aria-invalid={Boolean(errors.amount)}
                    aria-describedby={errors.amount ? 'form-amount-error' : undefined}
                    className={inputClass(errors.amount)}
                  />
                </Field>

                <Field id="form-currency" label="Currency" error={errors.currency}>
                  <select
                    id="form-currency"
                    name="currency"
                    value={currency}
                    onChange={(event) => onCurrencyChange(event.target.value)}
                    className={inputClass(errors.currency)}
                  >
                    {CURRENCIES.map((code) => (
                      <option key={code} value={code}>
                        {code} — {CURRENCY_META[code].name}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <div>
                <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3.5">
                  <input
                    id="consent"
                    name="consent"
                    type="checkbox"
                    checked={values.consent}
                    onChange={update('consent')}
                    aria-invalid={Boolean(errors.consent)}
                    aria-describedby={errors.consent ? 'consent-error' : undefined}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 accent-brand"
                  />
                  <label htmlFor="consent" className="text-xs leading-relaxed text-slate-600">
                    I have read the{' '}
                    <button type="button" onClick={() => onOpenLegal('privacy')} className="font-semibold text-brand underline underline-offset-2">
                      Privacy Notice
                    </button>
                    ,{' '}
                    <button type="button" onClick={() => onOpenLegal('kvkk')} className="font-semibold text-brand underline underline-offset-2">
                      KVKK information
                    </button>{' '}
                    and{' '}
                    <button type="button" onClick={() => onOpenLegal('gdpr')} className="font-semibold text-brand underline underline-offset-2">
                      UK GDPR details
                    </button>
                    , and I consent to my details being used to assess this demonstration
                    application.
                  </label>
                </div>
                {errors.consent && (
                  <p id="consent-error" className="mt-1.5 flex items-start gap-1.5 text-xs font-medium text-brand">
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    {errors.consent}
                  </p>
                )}
              </div>

              {serverError && (
                <div role="alert" className="flex items-start gap-2 rounded-lg border border-brand/30 bg-red-50 p-3 text-xs font-medium text-brand">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  {serverError}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-6 py-4 text-sm font-bold text-white shadow-lg transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Submitting…
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" aria-hidden="true" />
                    Submit application
                  </>
                )}
              </button>
            </form>
          </div>

          <aside className="lg:col-span-5">
            <div className="space-y-4 rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-amber-700">Demo mode</p>
              <p className="text-sm leading-relaxed text-amber-900">
                This form stores test submissions only. No credit check is run, no decision is
                made and no money is lent. Use the “Fill demo ID” button and invented details
                rather than real personal data.
              </p>
            </div>

            <div className="mt-4 space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="flex items-center gap-2 text-sm font-bold text-navy">
                <ShieldCheck className="h-4 w-4 text-brand" aria-hidden="true" />
                What happens to your data
              </p>
              <ul className="space-y-2 text-xs leading-relaxed text-slate-600">
                {[
                  'Validated in the browser and again on the server.',
                  'Only the last four digits of the national ID are stored.',
                  'No data is sent to analytics or advertising pixels.',
                  'A reference number is returned so you can quote it to the branch.',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
