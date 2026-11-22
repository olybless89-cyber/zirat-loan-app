import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  Inbox,
  Loader2,
  RefreshCw,
  Search,
  ThumbsUp,
  XCircle,
} from 'lucide-react';
import DashboardShell from '../components/dashboard/DashboardShell.jsx';
import EventTimeline from '../components/dashboard/EventTimeline.jsx';
import StatCard from '../components/dashboard/StatCard.jsx';
import StatusBadge from '../components/dashboard/StatusBadge.jsx';
import Modal from '../components/Modal.jsx';
import { api } from '../lib/api.js';
import { STATUS_OPTIONS, formatDate, formatDateTime, statusLabel } from '../lib/format.js';
import { useAuth } from '../lib/session.jsx';
import { CURRENCIES, formatMoney } from '../../lib/validation.js';

const EMPTY_STATS = {
  total: 0,
  active: 0,
  last7Days: 0,
  byStatus: {},
  valueByCurrency: {},
};

const selectClass =
  'rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-navy focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20';

export default function AdminDashboard() {
  const { subject } = useAuth();
  const [stats, setStats] = useState(EMPTY_STATS);
  const [list, setList] = useState({ items: [], total: 0, page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [status, setStatus] = useState('');
  const [currency, setCurrency] = useState('');
  const [page, setPage] = useState(1);

  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [nextStatus, setNextStatus] = useState('under_review');
  const [note, setNote] = useState('');
  const [notify, setNotify] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debounced, status, currency]);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (debounced) params.set('q', debounced);
    if (status) params.set('status', status);
    if (currency) params.set('currency', currency);
    return params;
  }, [debounced, status, currency]);

  const loadStats = useCallback(async () => {
    try {
      const result = await api('/api/admin/stats');
      setStats(result.stats || EMPTY_STATS);
    } catch {
      setStats(EMPTY_STATS);
    }
  }, []);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError('');
    const params = new URLSearchParams(query);
    params.set('page', String(page));
    params.set('pageSize', '10');
    try {
      const result = await api(`/api/admin/applications?${params.toString()}`);
      setList(result);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [query, page]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const openDetail = async (reference) => {
    setSelected(reference);
    setDetail(null);
    setDetailError('');
    setDetailLoading(true);
    setNote('');
    setNotify(true);
    setFormError('');
    try {
      const result = await api(`/api/admin/applications/${reference}`);
      setDetail(result);
      setNextStatus(result.application.status === 'received' ? 'under_review' : result.application.status);
    } catch (requestError) {
      setDetailError(requestError.message);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setSelected(null);
    setDetail(null);
  };

  const saveStatus = async (event) => {
    event.preventDefault();
    if (!detail) return;
    setSaving(true);
    setFormError('');
    try {
      const result = await api(`/api/admin/applications/${detail.application.reference}`, {
        method: 'PATCH',
        body: { status: nextStatus, note, notifyApplicant: notify },
      });
      setDetail(result);
      setNote('');
      setNotice(
        `Application ${result.application.reference} updated to ${statusLabel(result.application.status)}.`,
      );
      await Promise.all([loadList(), loadStats()]);
    } catch (requestError) {
      setFormError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const exportHref = `/api/admin/export.csv${query.toString() ? `?${query.toString()}` : ''}`;
  const valueEntries = Object.entries(stats.valueByCurrency || {});

  return (
    <DashboardShell
      role="admin"
      subject={subject ?? 'Staff'}
      eyebrow="Staff console"
      title="Applications overview"
      description="Every pre-approval request submitted through the branch site, newest first."
      actions={
        <>
          <button
            type="button"
            onClick={() => {
              loadList();
              loadStats();
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-navy"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
            Refresh
          </button>
          <a
            href={exportHref}
            className="inline-flex items-center gap-1.5 rounded-lg bg-navy px-3 py-2 text-xs font-semibold text-white transition hover:bg-navy-800"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            Export CSV
          </a>
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

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total applications"
            value={stats.total}
            hint={`${stats.last7Days} in the last 7 days`}
            icon={Inbox}
          />
          <StatCard label="Awaiting review" value={stats.active} hint="Received or under review" icon={Clock3} />
          <StatCard label="Approved" value={stats.byStatus.approved || 0} hint="Pre-approval granted" icon={ThumbsUp} />
          <StatCard label="Declined" value={stats.byStatus.declined || 0} hint="Not approved" icon={XCircle} />
        </div>

        {valueEntries.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Requested value by currency
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {valueEntries.map(([code, value]) => (
                <span
                  key={code}
                  className="rounded-lg bg-slate-50 px-3 py-1.5 text-xs font-semibold text-navy ring-1 ring-inset ring-slate-200"
                >
                  {formatMoney(value, code)} {code}
                </span>
              ))}
            </div>
          </div>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-xs">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="search"
                aria-label="Search applications"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search reference, name or phone"
                className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm text-navy placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label htmlFor="filter-status" className="sr-only">
                Filter by status
              </label>
              <select
                id="filter-status"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className={selectClass}
              >
                <option value="">All statuses</option>
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <label htmlFor="filter-currency" className="sr-only">
                Filter by currency
              </label>
              <select
                id="filter-currency"
                value={currency}
                onChange={(event) => setCurrency(event.target.value)}
                className={selectClass}
              >
                <option value="">All currencies</option>
                {CURRENCIES.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>

              {(search || status || currency) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setStatus('');
                    setCurrency('');
                  }}
                  className="text-xs font-semibold text-brand underline underline-offset-2"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>

          {error ? (
            <div role="alert" className="flex items-start gap-2 p-5 text-sm text-brand">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              {error}
            </div>
          ) : loading ? (
            <div className="flex items-center gap-2 p-6 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Loading applications…
            </div>
          ) : list.items.length === 0 ? (
            <div className="p-8 text-center">
              <Inbox className="mx-auto h-8 w-8 text-slate-300" aria-hidden="true" />
              <p className="mt-3 text-sm font-semibold text-navy">No applications match</p>
              <p className="mt-1 text-xs text-slate-500">
                Adjust the filters, or submit a request from the landing page to see it here.
              </p>
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                      <th scope="col" className="px-4 py-3 font-semibold">Reference</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Applicant</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Requested</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Received</th>
                      <th scope="col" className="px-4 py-3 text-right font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.items.map((item) => (
                      <tr key={item.reference} className="border-b border-slate-100 last:border-0">
                        <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-navy">
                          {item.reference}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-navy">{item.fullName}</p>
                          <p className="text-xs text-slate-500">{item.phone}</p>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 font-semibold text-navy">
                          {formatMoney(item.amount, item.currency)}
                          <span className="ml-1 text-xs font-normal text-slate-500">
                            {item.currency}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={item.status} />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                          {formatDate(item.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => openDetail(item.reference)}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-brand hover:text-brand"
                          >
                            Review
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <ul className="divide-y divide-slate-100 md:hidden">
                {list.items.map((item) => (
                  <li key={item.reference} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-navy">{item.fullName}</p>
                        <p className="font-mono text-[11px] text-slate-500">{item.reference}</p>
                      </div>
                      <StatusBadge status={item.status} />
                    </div>
                    <p className="mt-2 text-sm font-semibold text-navy">
                      {formatMoney(item.amount, item.currency)}{' '}
                      <span className="text-xs font-normal text-slate-500">{item.currency}</span>
                    </p>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-xs text-slate-500">{formatDate(item.createdAt)}</span>
                      <button
                        type="button"
                        onClick={() => openDetail(item.reference)}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600"
                      >
                        Review
                      </button>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 p-4 text-xs text-slate-500 sm:flex-row">
                <p>
                  Showing {list.items.length} of {list.total} applications · page {list.page} of{' '}
                  {list.pages}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((value) => Math.max(1, value - 1))}
                    disabled={list.page <= 1}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 font-semibold text-slate-600 disabled:opacity-40"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((value) => Math.min(list.pages, value + 1))}
                    disabled={list.page >= list.pages}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 font-semibold text-slate-600 disabled:opacity-40"
                  >
                    Next
                    <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      <Modal open={Boolean(selected)} title="Application review" onClose={closeDetail} size="lg">
        {detailLoading && (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Loading application…
          </div>
        )}

        {detailError && (
          <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm font-medium text-brand">
            {detailError}
          </p>
        )}

        {detail && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-lg font-bold text-navy">{detail.application.fullName}</p>
                <p className="font-mono text-xs text-slate-500">{detail.application.reference}</p>
              </div>
              <StatusBadge status={detail.application.status} />
            </div>

            <dl className="grid gap-x-6 gap-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
              {[
                ['Telephone', detail.application.phone],
                ['National ID', `•••••••${detail.application.nationalIdLast4}`],
                ['Requested', `${formatMoney(detail.application.amount, detail.application.currency)} ${detail.application.currency}`],
                ['Term', `${detail.application.termMonths} months`],
                [
                  'Monthly estimate',
                  detail.estimate
                    ? formatMoney(detail.estimate.monthly, detail.application.currency, { decimals: 2 })
                    : '—',
                ],
                ['Received', formatDateTime(detail.application.createdAt)],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    {label}
                  </dt>
                  <dd className="mt-0.5 text-sm font-semibold text-navy">{value}</dd>
                </div>
              ))}
            </dl>

            <div>
              <h3 className="text-sm font-bold text-navy">History</h3>
              <div className="mt-3">
                <EventTimeline events={detail.events} />
              </div>
            </div>

            <form onSubmit={saveStatus} className="space-y-3 border-t border-slate-200 pt-4">
              <h3 className="text-sm font-bold text-navy">Record a decision or note</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="decision-status" className="block text-xs font-semibold text-slate-600">
                    Status
                  </label>
                  <select
                    id="decision-status"
                    value={nextStatus}
                    onChange={(event) => setNextStatus(event.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-navy focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <label className="flex items-start gap-2 text-xs text-slate-600">
                    <input
                      type="checkbox"
                      checked={notify}
                      onChange={(event) => setNotify(event.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-brand"
                    />
                    Show this note to the applicant
                  </label>
                </div>
              </div>

              <div>
                <label htmlFor="decision-note" className="block text-xs font-semibold text-slate-600">
                  Note (optional, 500 characters)
                </label>
                <textarea
                  id="decision-note"
                  rows={3}
                  maxLength={500}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Add context for the audit trail or a message for the applicant."
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-navy placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                />
              </div>

              {formError && (
                <p role="alert" className="rounded-lg bg-red-50 p-3 text-xs font-medium text-brand">
                  {formError}
                </p>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-bold text-white disabled:opacity-70"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                  Save update
                </button>
              </div>
            </form>
          </div>
        )}
      </Modal>
    </DashboardShell>
  );
}
