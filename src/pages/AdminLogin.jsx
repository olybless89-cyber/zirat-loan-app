import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, KeyRound, Loader2 } from 'lucide-react';
import AuthLayout from '../components/dashboard/AuthLayout.jsx';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/session.jsx';
import { inputClass } from './ApplicantLogin.jsx';

export default function AdminLogin() {
  const { status, role, acceptSession } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (status === 'authenticated' && role === 'admin') navigate('/admin', { replace: true });
  }, [status, role, navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (!email.trim() || !password) {
      setError('Enter your staff email and password.');
      return;
    }
    setSubmitting(true);
    try {
      const data = await api('/api/auth/admin/login', {
        method: 'POST',
        body: { email: email.trim(), password },
      });
      acceptSession('admin', data.subject);
      navigate('/admin', { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      eyebrow="Staff console"
      headline="Review and decide every pre-approval request in one place."
      points={[
        'Filter by status, currency or applicant',
        'Move a request through review with an audit trail',
        'Export the current view for reconciliation',
      ]}
      footer={
        <>
          Are you an applicant?{' '}
          <Link to="/login" className="font-semibold text-brand underline underline-offset-2">
            Track your application
          </Link>
        </>
      }
    >
      <div className="flex items-center gap-2">
        <span className="rounded-lg bg-navy/5 p-2 text-navy" aria-hidden="true">
          <KeyRound className="h-4 w-4" />
        </span>
        <h2 className="text-xl font-extrabold tracking-tight text-navy">Staff sign in</h2>
      </div>
      <p className="mt-2 text-sm text-slate-600">
        Restricted to branch staff. Sessions last eight hours and every status change is recorded.
      </p>

      <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
        <div>
          <label htmlFor="admin-email" className="block text-sm font-semibold text-navy">
            Staff email
          </label>
          <input
            id="admin-email"
            name="email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="admin@ziratbank.com"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="admin-password" className="block text-sm font-semibold text-navy">
            Password
          </label>
          <input
            id="admin-password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••••"
            className={inputClass}
          />
        </div>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-brand/30 bg-red-50 p-3 text-xs font-medium text-brand"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-navy px-6 py-3.5 text-sm font-bold text-white shadow-lg transition hover:bg-navy-800 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Signing in…
            </>
          ) : (
            'Sign in to the console'
          )}
        </button>
      </form>
    </AuthLayout>
  );
}
