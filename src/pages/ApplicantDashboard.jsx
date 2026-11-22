import { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  ClipboardCopy,
  Coins,
  Loader2,
  PencilLine,
  Printer,
  RefreshCw,
  ShieldAlert,
  Timer,
  Wallet,
  XCircle,
} from 'lucide-react';
import DashboardShell from '../components/dashboard/DashboardShell.jsx';
import EventTimeline from '../components/dashboard/EventTimeline.jsx';
import StatCard from '../components/dashboard/StatCard.jsx';
import StatusBadge from '../components/dashboard/StatusBadge.jsx';
import Modal from '../components/Modal.jsx';
import { api } from '../lib/api.js';
import { formatDate } from '../lib/format.js';
import { useAuth } from '../lib/session.jsx';
import { CURRENCY_META, formatMoney } from '../../lib/validation.js';

const ACTIVE = ['received', 'under_review'];

const OUTCOMES = {
  approved: {
    tone: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    icon: CheckCircle2,
    title: 'Pre-approval granted',
    body: 'The branch has approved this request in principle. A colleague will contact you to complete the paperwork. This remains an estimate, not a binding offer.',
  },
  declined: {
    tone: 'border-red-200 bg-red-50 text-red-900',
    icon: XCircle,
    title: 'Request declined',
    body: 'The branch could not approve this request. Contact the branch if you would like the decision reviewed or want to discuss other options.',
  },
  withdrawn: {
    tone: 'border-slate-200 bg-slate-50 text-slate-700',
    icon: ShieldAlert,
    title: 'Application withdrawn',
    body: 'You withdrew this application, so it is no longer under review. You are welcome to submit a new request at any time.',
  },
};

function DetailRow({ label, children }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-slate-100 py-2.5 last:border-0">
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="text-right text-sm font-semibold text-navy">{children}</dd>
    </div>
  );
}

export default function ApplicantDashboard() {
  const { subject } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [form, setForm] = useState({ amount: '', phone: '' });
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api('/api/applicant/application');
      setData(result);
      setError('');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const application = data?.application;
  const estimate = data?.estimate;
  const canEdit = application && ACTIVE.includes(application.status);

  const openEdit = () => {
    setForm({
      amount: String(application.amount),
      phone: application.phone,
    });
    setFormErrors({});
    setEditOpen(true);
  };

  const saveEdit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFormErrors({});
    try {
      await api('/api/applicant/application', {
        method: 'PATCH',
        body: { amount: Number(form.amount), phone: form.phone },
      });
      setEditOpen(false);
      setNotice('Your request has been updated.');
      await load();
    } catch (requestError) {
      setFormErrors(requestError.errors || {});
      if (!Object.keys(requestError.errors || {}).length) {
        setFormErrors({ form: requestError.message });
      }
    } finally {
      setSaving(false);
    }
  };

  const withdraw = async () => {
    setSaving(true);
    try {
      await api('/api/applicant/application/withdraw', { method: 'POST' });
      setWithdrawOpen(false);
      setNotice('Your application has been withdrawn.');
      await load();
    } catch (requestError) {
      setFormErrors({ form: requestError.message });
    } finally {
      setSaving(false);
    }
  };

  const copyReference = async () => {
    try {
      await navigator.clipboard.writeText(application.reference);
      setNotice('Reference copied to the clipboard.');
    } catch {
      setNotice('Copy failed — select the reference and copy it manually.');
    }
  };

  if (loading && !data) {
    return (
      <DashboardShell role="applicant" subject={subject ?? 'Applicant'} title="Your application">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Loading your application…
        </div>
      </DashboardShell>
    );
  }

  if (error && !data) {
    return (
      <DashboardShell role="applicant" subject={subject ?? 'Applicant'} title="Your application">
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-2xl border border-brand/30 bg-red-50 p-5 text-sm text-brand sm:flex-row sm:items-center sm:justify-between"
        >
          <span className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {error}
          </span>
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-xs font-semibold text-white"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            Try again
          </button>
        </div>
      </DashboardShell>
    );
  }

  const outcome = OUTCOMES[application.status];
  const OutcomeIcon = outcome?.icon;

  return (
    <DashboardShell
      role="applicant"
      subject={subject ?? application.reference}
      eyebrow="Applicant portal"
      title={`Hello, ${application.fullName.split(' ')[0]}`}
      description="Here is everything the branch holds for your pre-approval request."
      actions={
        <>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-navy"
          >
            <Printer className="h-3.5 w-3.5" aria-hidden="true" />
            Print summary
          </button>
          {canEdit && (
            <>
              <button
                type="button"
                onClick={openEdit}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-navy"
              >
                <PencilLine className="h-3.5 w-3.5" aria-hidden="true" />
                Update request
              </button>
              <button
                type="button"
                onClick={() => {
                  setFormErrors({});
                  setWithdrawOpen(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-brand/30 bg-white px-3 py-2 text-xs font-semibold text-brand transition hover:bg-red-50"
              >
                <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                Withdraw
              </button>
            </>
          )}
        </>
      }
    >
      <div className="space-y-6">
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

        {outcome && (
          <div className={`flex items-start gap-3 rounded-2xl border p-5 ${outcome.tone}`}>
            <OutcomeIcon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <div>
              <p className="text-sm font-bold">{outcome.title}</p>
              <p className="mt-1 text-xs leading-relaxed">{outcome.body}</p>
            </div>
          </div>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Application reference
              </p>
              <div className="mt-1 flex items-center gap-2">
                <p className="font-mono text-lg font-bold tracking-tight text-navy">
                  {application.reference}
                </p>
                <button
                  type="button"
                  onClick={copyReference}
                  aria-label="Copy application reference"
                  className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-navy"
                >
                  <ClipboardCopy className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Submitted {formatDate(application.createdAt)} · Last updated{' '}
                {formatDate(application.updatedAt)}
              </p>
            </div>
            <StatusBadge status={application.status} className="text-sm" />
          </div>
        </section>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Requested amount"
            value={formatMoney(application.amount, application.currency)}
            hint={`${application.currency} — ${CURRENCY_META[application.currency]?.name ?? ''}`}
            icon={Wallet}
          />
          <StatCard
            label="Monthly estimate"
            value={estimate ? formatMoney(estimate.monthly, application.currency, { decimals: 2 }) : '—'}
            hint={estimate ? `At ${estimate.monthlyRate}% per month` : 'Not available'}
            icon={Coins}
          />
          <StatCard
            label="Term"
            value={`${application.termMonths} months`}
            hint="Fixed for this request"
            icon={Timer}
          />
          <StatCard
            label="Total repayable"
            value={estimate ? formatMoney(estimate.total, application.currency) : '—'}
            hint={estimate ? `Includes ${formatMoney(estimate.interest, application.currency)} interest` : 'Not available'}
            icon={CalendarClock}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:col-span-3">
            <h2 className="text-sm font-bold text-navy">Progress</h2>
            <p className="mt-1 text-xs text-slate-500">
              Status changes and messages from the branch.
            </p>
            <div className="mt-5">
              <EventTimeline events={data.events} />
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:col-span-2">
            <h2 className="text-sm font-bold text-navy">Your details</h2>
            <dl className="mt-3">
              <DetailRow label="Full name">{application.fullName}</DetailRow>
              <DetailRow label="Telephone">{application.phone}</DetailRow>
              <DetailRow label="National ID">
                <span className="font-mono">•••••••{application.nationalIdLast4}</span>
              </DetailRow>
              <DetailRow label="Amount">
                {formatMoney(application.amount, application.currency)}
              </DetailRow>
              <DetailRow label="Currency">{application.currency}</DetailRow>
              <DetailRow label="Term">{application.termMonths} months</DetailRow>
              <DetailRow label="Consent version">
                <span className="font-mono text-xs">{application.consentVersion}</span>
              </DetailRow>
            </dl>
            <p className="mt-4 text-xs leading-relaxed text-slate-500">
              Only the last four digits of your national ID are stored. Figures are estimates and
              exclude fees.
            </p>
          </section>
        </div>
      </div>

      <Modal open={editOpen} title="Update your request" onClose={() => setEditOpen(false)} size="sm">
        <form onSubmit={saveEdit} noValidate className="space-y-4">
          <div>
            <label htmlFor="edit-amount" className="block text-sm font-semibold text-navy">
              Loan amount ({application.currency})
            </label>
            <input
              id="edit-amount"
              type="number"
              inputMode="numeric"
              min={100000}
              max={50000000}
              step={1000}
              value={form.amount}
              onChange={(event) => setForm((prev) => ({ ...prev, amount: event.target.value }))}
              className="mt-2 w-full rounded-lg border border-slate-300 px-3.5 py-3 text-sm text-navy focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
            {formErrors.amount && (
              <p className="mt-1.5 text-xs font-medium text-brand">{formErrors.amount}</p>
            )}
          </div>
          <div>
            <label htmlFor="edit-phone" className="block text-sm font-semibold text-navy">
              Telephone number
            </label>
            <input
              id="edit-phone"
              type="tel"
              inputMode="tel"
              value={form.phone}
              onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
              className="mt-2 w-full rounded-lg border border-slate-300 px-3.5 py-3 text-sm text-navy focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
            {formErrors.phone && (
              <p className="mt-1.5 text-xs font-medium text-brand">{formErrors.phone}</p>
            )}
          </div>
          {formErrors.form && (
            <p role="alert" className="rounded-lg bg-red-50 p-3 text-xs font-medium text-brand">
              {formErrors.form}
            </p>
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setEditOpen(false)}
              className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-bold text-white disabled:opacity-70"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              Save changes
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={withdrawOpen}
        title="Withdraw this application?"
        onClose={() => setWithdrawOpen(false)}
        size="sm"
      >
        <p className="text-sm leading-relaxed text-slate-600">
          Withdrawing stops the review and cannot be undone. You would need to submit a new request
          to be considered again.
        </p>
        {formErrors.form && (
          <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-xs font-medium text-brand">
            {formErrors.form}
          </p>
        )}
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => setWithdrawOpen(false)}
            className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-600"
          >
            Keep application
          </button>
          <button
            type="button"
            onClick={withdraw}
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-bold text-white disabled:opacity-70"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            Yes, withdraw
          </button>
        </div>
      </Modal>
    </DashboardShell>
  );
}
