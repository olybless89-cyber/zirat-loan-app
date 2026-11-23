import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  KeyRound,
  Loader2,
  Mail,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserX,
} from 'lucide-react';
import AdminNav from '../components/admin/AdminNav.jsx';
import DashboardShell from '../components/dashboard/DashboardShell.jsx';
import StatusBadge from '../components/dashboard/StatusBadge.jsx';
import Modal from '../components/Modal.jsx';
import { api } from '../lib/api.js';
import { formatDate, formatDateTime } from '../lib/format.js';
import { useAuth } from '../lib/session.jsx';
import { formatMoney } from '../../lib/validation.js';

const inputClass =
  'mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-navy placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20';

const EMPTY_STAFF = { email: '', password: '', role: 'admin' };

export default function AdminUsers() {
  const { subject } = useAuth();
  const [me, setMe] = useState(null);
  const [users, setUsers] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');

  const [dialog, setDialog] = useState(null);
  const [form, setForm] = useState(EMPTY_STAFF);
  const [formErrors, setFormErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const isOwner = me?.role === 'owner';

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [meResult, usersResult, appsResult] = await Promise.all([
        api('/api/admin/me'),
        api('/api/admin/users'),
        api('/api/admin/applications?pageSize=50'),
      ]);
      setMe(meResult.user);
      setUsers(usersResult.users || []);
      setApplications(appsResult.items || []);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openDialog = (next, initial = EMPTY_STAFF) => {
    setDialog(next);
    setForm(initial);
    setFormErrors({});
    setFormError('');
  };

  const closeDialog = () => {
    setDialog(null);
    setForm(EMPTY_STAFF);
    setFormErrors({});
    setFormError('');
  };

  const run = async (action, successMessage) => {
    setBusy(true);
    setFormError('');
    setFormErrors({});
    try {
      await action();
      setNotice(successMessage);
      closeDialog();
      await load();
    } catch (requestError) {
      setFormErrors(requestError.errors || {});
      setFormError(requestError.message);
      if (!dialog) setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  const createStaff = (event) => {
    event.preventDefault();
    run(
      () => api('/api/admin/users', { method: 'POST', body: form }),
      `${form.email.trim().toLowerCase()} can now sign in to the console.`,
    );
  };

  const resetPassword = (event) => {
    event.preventDefault();
    run(
      () =>
        api(`/api/admin/users/${dialog.user.id}`, {
          method: 'PATCH',
          body: { password: form.password },
        }),
      `Password reset for ${dialog.user.email}.`,
    );
  };

  const changeEmail = (event) => {
    event.preventDefault();
    run(
      () =>
        api(`/api/admin/users/${dialog.user.id}`, {
          method: 'PATCH',
          body: { email: form.email },
        }),
      `Sign-in email changed to ${form.email.trim().toLowerCase()}.`,
    );
  };

  const toggleActive = (user) =>
    run(
      () => api(`/api/admin/users/${user.id}`, { method: 'PATCH', body: { active: !user.active } }),
      `${user.email} is now ${user.active ? 'disabled' : 'active'}.`,
    );

  const changeRole = (user, role) =>
    run(
      () => api(`/api/admin/users/${user.id}`, { method: 'PATCH', body: { role } }),
      `${user.email} is now ${role === 'owner' ? 'an owner' : 'an admin'}.`,
    );

  const removeStaff = () =>
    run(
      () => api(`/api/admin/users/${dialog.user.id}`, { method: 'DELETE' }),
      `${dialog.user.email} was removed.`,
    );

  const removeApplication = () =>
    run(
      () => api(`/api/admin/applications/${dialog.reference}`, { method: 'DELETE' }),
      `Application ${dialog.reference} and its history were removed.`,
    );

  const filteredApplications = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return applications;
    return applications.filter(
      (item) =>
        item.reference.toLowerCase().includes(term) ||
        item.fullName.toLowerCase().includes(term) ||
        item.phone.toLowerCase().includes(term),
    );
  }, [applications, search]);

  return (
    <DashboardShell
      role="admin"
      subject={subject ?? 'Staff'}
      eyebrow="Staff console"
      title="Users and access"
      description="Staff accounts that can sign in to this console, and every applicant on file."
      actions={
        <>
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-navy"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
            Refresh
          </button>
          {isOwner && (
            <button
              type="button"
              onClick={() => openDialog({ type: 'create' })}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-xs font-bold text-white transition hover:bg-brand-dark"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Add staff
            </button>
          )}
        </>
      }
    >
      <div className="space-y-6">
        <AdminNav />

        {!isOwner && me && (
          <p className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            You can review applications. Only the owner account can add staff, reset passwords or
            change site settings.
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

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 p-4">
            <div>
              <h2 className="text-sm font-bold text-navy">Staff accounts</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Owners manage staff and settings; admins review applications.
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
              {users.length} total
            </span>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 p-6 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Loading staff…
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                    <th scope="col" className="px-4 py-3 font-semibold">Email</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Role</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Last sign-in</th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-slate-100 last:border-0">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-navy">{user.email}</p>
                        <p className="text-xs text-slate-500">Added {formatDate(user.createdAt)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <label className="sr-only" htmlFor={`role-${user.id}`}>
                          Role for {user.email}
                        </label>
                        <select
                          id={`role-${user.id}`}
                          value={user.role}
                          disabled={!isOwner || busy}
                          onChange={(event) => changeRole(user, event.target.value)}
                          className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-semibold text-navy disabled:opacity-60"
                        >
                          <option value="owner">Owner</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                            user.active
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {user.active ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {user.lastLoginAt ? formatDateTime(user.lastLoginAt) : 'Never'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap justify-end gap-1.5">
                          <button
                            type="button"
                            disabled={!isOwner || busy}
                            onClick={() =>
                              openDialog({ type: 'email', user }, { ...EMPTY_STAFF, email: user.email })
                            }
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-brand hover:text-brand disabled:opacity-40"
                          >
                            <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                            Email
                          </button>
                          <button
                            type="button"
                            disabled={!isOwner || busy}
                            onClick={() => openDialog({ type: 'password', user })}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-brand hover:text-brand disabled:opacity-40"
                          >
                            <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
                            Reset
                          </button>
                          <button
                            type="button"
                            disabled={!isOwner || busy}
                            onClick={() => toggleActive(user)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-brand hover:text-brand disabled:opacity-40"
                          >
                            {user.active ? (
                              <UserX className="h-3.5 w-3.5" aria-hidden="true" />
                            ) : (
                              <UserCheck className="h-3.5 w-3.5" aria-hidden="true" />
                            )}
                            {user.active ? 'Disable' : 'Enable'}
                          </button>
                          <button
                            type="button"
                            disabled={!isOwner || busy || user.id === me?.id}
                            onClick={() => openDialog({ type: 'delete-staff', user })}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-brand hover:text-brand disabled:opacity-40"
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-bold text-navy">Applicants</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                The 50 most recent pre-approval requests. Search to narrow the list.
              </p>
            </div>
            <div className="relative w-full sm:max-w-xs">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="search"
                aria-label="Search applicants"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search reference, name or phone"
                className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm text-navy placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </div>
          </div>

          {filteredApplications.length === 0 ? (
            <p className="p-6 text-sm text-slate-500">No applicants match that search.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {filteredApplications.map((item) => (
                <li key={item.reference} className="flex flex-wrap items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-navy">{item.fullName}</p>
                    <p className="font-mono text-[11px] text-slate-500">{item.reference}</p>
                  </div>
                  <p className="text-xs text-slate-500">{item.phone}</p>
                  <p className="text-sm font-semibold text-navy">
                    {formatMoney(item.amount, item.currency)}{' '}
                    <span className="text-xs font-normal text-slate-500">{item.currency}</span>
                  </p>
                  <StatusBadge status={item.status} />
                  <div className="flex gap-1.5">
                    <Link
                      to={`/admin?q=${encodeURIComponent(item.reference)}`}
                      className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-brand hover:text-brand"
                    >
                      Review
                    </Link>
                    <button
                      type="button"
                      disabled={!isOwner || busy}
                      onClick={() =>
                        openDialog({ type: 'delete-application', reference: item.reference })
                      }
                      className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-brand hover:text-brand disabled:opacity-40"
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <Modal
        open={dialog?.type === 'create'}
        title="Add a staff account"
        onClose={closeDialog}
        size="md"
      >
        <form onSubmit={createStaff} className="space-y-4">
          <div>
            <label htmlFor="staff-email" className="block text-xs font-semibold text-slate-600">
              Email
            </label>
            <input
              id="staff-email"
              type="email"
              data-autofocus
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              className={inputClass}
              placeholder="name@ziratbank.com"
            />
            {formErrors.email && <p className="mt-1 text-xs font-medium text-brand">{formErrors.email}</p>}
          </div>
          <div>
            <label htmlFor="staff-password" className="block text-xs font-semibold text-slate-600">
              Temporary password
            </label>
            <input
              id="staff-password"
              type="password"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              className={inputClass}
              placeholder="At least 10 characters"
            />
            {formErrors.password && (
              <p className="mt-1 text-xs font-medium text-brand">{formErrors.password}</p>
            )}
          </div>
          <div>
            <label htmlFor="staff-role" className="block text-xs font-semibold text-slate-600">
              Role
            </label>
            <select
              id="staff-role"
              value={form.role}
              onChange={(event) => setForm({ ...form, role: event.target.value })}
              className={inputClass}
            >
              <option value="admin">Admin — review applications</option>
              <option value="owner">Owner — full access</option>
            </select>
          </div>
          {formError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-xs font-medium text-brand">{formError}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={closeDialog} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600">
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-bold text-white disabled:opacity-70"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              Create account
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={dialog?.type === 'email'} title="Change sign-in email" onClose={closeDialog} size="md">
        <form onSubmit={changeEmail} className="space-y-4">
          <p className="text-sm text-slate-600">
            The account for{' '}
            <span className="font-semibold text-navy">{dialog?.user?.email}</span> will sign in with
            the new address. The password stays the same.
          </p>
          <div>
            <label htmlFor="staff-email-new" className="block text-xs font-semibold text-slate-600">
              Sign-in email
            </label>
            <input
              id="staff-email-new"
              type="email"
              data-autofocus
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              className={inputClass}
              placeholder="name@ziratbank.com"
            />
            {formErrors.email && <p className="mt-1 text-xs font-medium text-brand">{formErrors.email}</p>}
          </div>
          {formError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-xs font-medium text-brand">{formError}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={closeDialog} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600">
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-bold text-white disabled:opacity-70"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              Save email
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={dialog?.type === 'password'}
        title="Reset password"
        onClose={closeDialog}
        size="md"
      >
        <form onSubmit={resetPassword} className="space-y-4">
          <p className="text-sm text-slate-600">
            Set a new password for <span className="font-semibold text-navy">{dialog?.user?.email}</span>.
            They will need it the next time they sign in.
          </p>
          <div>
            <label htmlFor="new-password" className="block text-xs font-semibold text-slate-600">
              New password
            </label>
            <input
              id="new-password"
              type="password"
              data-autofocus
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              className={inputClass}
              placeholder="At least 10 characters"
            />
            {formErrors.password && (
              <p className="mt-1 text-xs font-medium text-brand">{formErrors.password}</p>
            )}
          </div>
          {formError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-xs font-medium text-brand">{formError}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={closeDialog} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600">
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-bold text-white disabled:opacity-70"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              Save password
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={dialog?.type === 'delete-staff'}
        title="Remove staff account"
        onClose={closeDialog}
        size="md"
      >
        <p className="text-sm text-slate-600">
          Remove <span className="font-semibold text-navy">{dialog?.user?.email}</span>? They will be
          signed out immediately and lose access to this console.
        </p>
        {formError && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-xs font-medium text-brand">{formError}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={closeDialog} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600">
            Keep account
          </button>
          <button
            type="button"
            onClick={removeStaff}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-bold text-white disabled:opacity-70"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            Remove account
          </button>
        </div>
      </Modal>

      <Modal
        open={dialog?.type === 'delete-application'}
        title="Remove applicant record"
        onClose={closeDialog}
        size="md"
      >
        <p className="text-sm text-slate-600">
          Delete <span className="font-mono font-semibold text-navy">{dialog?.reference}</span> and its
          full history? The applicant will no longer be able to sign in with that reference.
        </p>
        {formError && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-xs font-medium text-brand">{formError}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={closeDialog} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600">
            Keep record
          </button>
          <button
            type="button"
            onClick={removeApplication}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-bold text-white disabled:opacity-70"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            Delete record
          </button>
        </div>
      </Modal>
    </DashboardShell>
  );
}
