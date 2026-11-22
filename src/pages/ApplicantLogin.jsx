import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight, Loader2 } from 'lucide-react';
import AuthLayout from '../components/dashboard/AuthLayout.jsx';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/session.jsx';

export const inputClass =
  'mt-2 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-3 text-sm text-navy shadow-sm transition placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20';

export default function ApplicantLogin() {
  const { status, role, acceptSession } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [reference, setReference] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const target = location.state?.from || '/dashboard';

  useEffect(() => {
    if (status === 'authenticated' && role === 'applicant') navigate(target, { replace: true });
  }, [status, role, target, navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (!reference.trim() || !phone.trim()) {
      setError('Enter both your reference number and the telephone number you applied with.');
      return;
    }
    setSubmitting(true);
    try {
      const data = await api('/api/auth/applicant/login', {
        method: 'POST',
        body: { reference: reference.trim(), phone: phone.trim() },
      });
      acceptSession('applicant', data.subject);
      navigate(target, { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      eyebrow="Applicant portal"
      headline="Track your pre-approval request from start to decision."
      points={[
        'See your current status and full history',
        'Check the instalment estimate for the amount you asked for',
        'Update your request or withdraw it before a decision',
      ]}
      footer={
        <>
          Bank staff?{' '}
          <Link to="/admin/login" className="font-semibold text-brand underline underline-offset-2">
            Open the staff console
          </Link>
        </>
      }
    >
      <h2 className="text-xl font-extrabold tracking-tight text-navy">Sign in to track</h2>
      <p className="mt-2 text-sm text-slate-600">
        Use the reference from your confirmation screen (it starts with <span className="font-mono">ZIR-</span>)
        and the mobile number on the application.
      </p>

      <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
        <div>
          <label htmlFor="reference" className="block text-sm font-semibold text-navy">
            Application reference
          </label>
          <input
            id="reference"
            name="reference"
            type="text"
            autoComplete="off"
            spellCheck={false}
            value={reference}
            onChange={(event) => setReference(event.target.value)}
            placeholder="ZIR-20261122-A1B2C3"
            className={`${inputClass} font-mono uppercase`}
          />
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-semibold text-navy">
            Telephone number
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="+90 5XX XXX XXXX"
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
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-6 py-3.5 text-sm font-bold text-white shadow-lg transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-70"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Signing in…
            </>
          ) : (
            <>
              Sign in
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </>
          )}
        </button>
      </form>

      <p className="mt-5 border-t border-slate-100 pt-4 text-xs leading-relaxed text-slate-500">
        Lost your reference? Call the branch on{' '}
        <a href="tel:+442076004985" className="font-semibold text-navy underline underline-offset-2">
          +44 20 7600 4985
        </a>{' '}
        and quote the mobile number you applied with.
      </p>
    </AuthLayout>
  );
}
