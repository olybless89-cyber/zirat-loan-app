import { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Save,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import AdminNav from '../components/admin/AdminNav.jsx';
import DashboardShell from '../components/dashboard/DashboardShell.jsx';
import { api } from '../lib/api.js';
import { formatDateTime } from '../lib/format.js';
import { useAuth } from '../lib/session.jsx';
import { CURRENCIES, CURRENCY_META } from '../../lib/validation.js';

const inputClass =
  'mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-navy placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:bg-slate-50 disabled:text-slate-500';

function Field({ id, label, hint, error, children }) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-slate-600">
        {label}
      </label>
      {children}
      {error ? (
        <p className="mt-1 text-xs font-medium text-brand">{error}</p>
      ) : (
        hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>
      )}
    </div>
  );
}

const toForm = (settings) => ({
  monthlyRate: String(settings.monthlyRate),
  termMonths: String(settings.termMonths),
  minAmount: String(settings.minAmount),
  maxAmount: String(settings.maxAmount),
  currencies: settings.currencies,
  consentVersion: settings.consentVersion,
  announcement: settings.announcement,
  acceptingApplications: settings.acceptingApplications,
  contact: { ...settings.contact },
});

export default function AdminSettings() {
  const { subject } = useAuth();
  const [me, setMe] = useState(null);
  const [form, setForm] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const isOwner = me?.role === 'owner';
  const disabled = !isOwner || saving;

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [settingsResult, meResult] = await Promise.all([
        api('/api/admin/settings'),
        api('/api/admin/me'),
      ]);
      setMe(meResult.user);
      setForm(toForm(settingsResult.settings));
      setUpdatedAt(settingsResult.updatedAt);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const update = (key) => (event) =>
    setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const updateContact = (key) => (event) =>
    setForm((prev) => ({ ...prev, contact: { ...prev.contact, [key]: event.target.value } }));

  const toggleCurrency = (code) =>
    setForm((prev) => ({
      ...prev,
      currencies: prev.currencies.includes(code)
        ? prev.currencies.filter((item) => item !== code)
        : [...prev.currencies, code],
    }));

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setErrors({});
    setFormError('');
    setNotice('');
    try {
      const result = await api('/api/admin/settings', {
        method: 'PUT',
        body: {
          monthlyRate: Number(form.monthlyRate),
          termMonths: Number(form.termMonths),
          minAmount: Number(form.minAmount),
          maxAmount: Number(form.maxAmount),
          currencies: form.currencies,
          consentVersion: form.consentVersion,
          announcement: form.announcement,
          acceptingApplications: form.acceptingApplications,
          contact: form.contact,
        },
      });
      setForm(toForm(result.settings));
      setUpdatedAt(result.updatedAt);
      setNotice('Site settings saved. The landing page picks them up on the next load.');
    } catch (requestError) {
      setErrors(requestError.errors || {});
      setFormError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardShell
      role="admin"
      subject={subject ?? 'Staff'}
      eyebrow="Staff console"
      title="Site settings"
      description="Pricing, currencies and branch details used across the public site."
      actions={
        <button
          type="button"
          onClick={load}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-navy"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
          Reload
        </button>
      }
    >
      <div className="space-y-6">
        <AdminNav />

        {!isOwner && me && (
          <p className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            These values are read-only for your account. Only the owner can change site settings.
          </p>
        )}

        {notice && (
          <div
            role="status"
            className="flex items-start justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
          >
            <span className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              {notice}
            </span>
            <button
              type="button"
              onClick={() => setNotice('')}
              className="text-xs font-semibold underline underline-offset-2"
            >
              Dismiss
            </button>
          </div>
        )}

        {error && (
          <div role="alert" className="flex items-start gap-2 rounded-xl bg-red-50 p-4 text-sm text-brand">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {error}
          </div>
        )}

        {loading || !form ? (
          <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Loading settings…
          </div>
        ) : (
          <form onSubmit={save} className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-bold text-navy">Loan pricing</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                These values drive the calculator, the application form and every estimate.
              </p>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field
                  id="monthlyRate"
                  label="Monthly interest rate (%)"
                  hint="Shown on the calculator and used for instalments."
                  error={errors.monthlyRate}
                >
                  <input
                    id="monthlyRate"
                    type="number"
                    step="0.01"
                    min="0.01"
                    max="15"
                    value={form.monthlyRate}
                    onChange={update('monthlyRate')}
                    disabled={disabled}
                    className={inputClass}
                  />
                </Field>

                <Field
                  id="termMonths"
                  label="Default term (months)"
                  hint="Pre-selected when the page loads."
                  error={errors.termMonths}
                >
                  <input
                    id="termMonths"
                    type="number"
                    step="1"
                    min="6"
                    max="120"
                    value={form.termMonths}
                    onChange={update('termMonths')}
                    disabled={disabled}
                    className={inputClass}
                  />
                </Field>

                <Field
                  id="minAmount"
                  label="Minimum amount"
                  hint="Lower bound of the amount slider."
                  error={errors.minAmount}
                >
                  <input
                    id="minAmount"
                    type="number"
                    step="1000"
                    min="1000"
                    max="10000000"
                    value={form.minAmount}
                    onChange={update('minAmount')}
                    disabled={disabled}
                    className={inputClass}
                  />
                </Field>

                <Field
                  id="maxAmount"
                  label="Maximum amount"
                  hint="Upper bound of the amount slider."
                  error={errors.maxAmount}
                >
                  <input
                    id="maxAmount"
                    type="number"
                    step="1000"
                    min="10000"
                    max="100000000"
                    value={form.maxAmount}
                    onChange={update('maxAmount')}
                    disabled={disabled}
                    className={inputClass}
                  />
                </Field>
              </div>

              <fieldset className="mt-5">
                <legend className="text-xs font-semibold text-slate-600">Currencies on offer</legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {CURRENCIES.map((code) => {
                    const checked = form.currencies.includes(code);
                    return (
                      <label
                        key={code}
                        className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                          checked
                            ? 'border-brand bg-red-50 text-brand'
                            : 'border-slate-200 bg-white text-slate-600'
                        } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleCurrency(code)}
                          disabled={disabled}
                          className="h-3.5 w-3.5 rounded border-slate-300 accent-brand"
                        />
                        {CURRENCY_META[code].symbol} {code}
                      </label>
                    );
                  })}
                </div>
                {errors.currencies && (
                  <p className="mt-1 text-xs font-medium text-brand">{errors.currencies}</p>
                )}
              </fieldset>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-bold text-navy">Site and branch details</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Shown in the announcement bar, the footer and the application consent line.
              </p>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field
                  id="announcement"
                  label="Announcement bar"
                  hint="Leave empty to show the standard pre-approval line."
                  error={errors.announcement}
                >
                  <input
                    id="announcement"
                    type="text"
                    maxLength={140}
                    value={form.announcement}
                    onChange={update('announcement')}
                    disabled={disabled}
                    className={inputClass}
                    placeholder="e.g. Festive hours: 09:00-16:00 until 5 January."
                  />
                </Field>

                <Field
                  id="consentVersion"
                  label="Consent version"
                  hint="Stored with each new application."
                  error={errors.consentVersion}
                >
                  <input
                    id="consentVersion"
                    type="text"
                    maxLength={40}
                    value={form.consentVersion}
                    onChange={update('consentVersion')}
                    disabled={disabled}
                    className={inputClass}
                  />
                </Field>

                <Field id="contact-phone" label="Phone" error={errors['contact.phone']}>
                  <input
                    id="contact-phone"
                    type="tel"
                    value={form.contact.phone}
                    onChange={updateContact('phone')}
                    disabled={disabled}
                    className={inputClass}
                  />
                </Field>

                <Field id="contact-email" label="Email" error={errors['contact.email']}>
                  <input
                    id="contact-email"
                    type="email"
                    value={form.contact.email}
                    onChange={updateContact('email')}
                    disabled={disabled}
                    className={inputClass}
                  />
                </Field>

                <Field id="contact-whatsapp" label="WhatsApp" error={errors['contact.whatsapp']}>
                  <input
                    id="contact-whatsapp"
                    type="tel"
                    value={form.contact.whatsapp}
                    onChange={updateContact('whatsapp')}
                    disabled={disabled}
                    className={inputClass}
                  />
                </Field>

                <Field id="contact-hours" label="Support hours" error={errors['contact.hours']}>
                  <input
                    id="contact-hours"
                    type="text"
                    value={form.contact.hours}
                    onChange={updateContact('hours')}
                    disabled={disabled}
                    className={inputClass}
                  />
                </Field>

                <div className="sm:col-span-2">
                  <Field id="contact-address" label="Branch address" error={errors['contact.address']}>
                    <textarea
                      id="contact-address"
                      rows={2}
                      value={form.contact.address}
                      onChange={updateContact('address')}
                      disabled={disabled}
                      className={inputClass}
                    />
                  </Field>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-navy">Accept new applications</h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Turning this off keeps the site online but stops new submissions.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={form.acceptingApplications}
                  aria-label="Accept new applications"
                  disabled={disabled}
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      acceptingApplications: !prev.acceptingApplications,
                    }))
                  }
                  className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition disabled:opacity-60 ${
                    form.acceptingApplications
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {form.acceptingApplications ? (
                    <ToggleRight className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <ToggleLeft className="h-4 w-4" aria-hidden="true" />
                  )}
                  {form.acceptingApplications ? 'Open' : 'Closed'}
                </button>
              </div>
              {errors.acceptingApplications && (
                <p className="mt-2 text-xs font-medium text-brand">{errors.acceptingApplications}</p>
              )}
            </section>

            {formError && (
              <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm font-medium text-brand">
                {formError}
              </p>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-slate-500">
                {updatedAt ? `Last saved ${formatDateTime(updatedAt)}` : 'Using built-in defaults.'}
              </p>
              <button
                type="submit"
                disabled={disabled}
                className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-bold text-white disabled:opacity-70"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Save className="h-4 w-4" aria-hidden="true" />
                )}
                Save settings
              </button>
            </div>
          </form>
        )}
      </div>
    </DashboardShell>
  );
}
