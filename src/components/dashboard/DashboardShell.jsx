import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, LogOut } from 'lucide-react';
import { BRAND } from '../../config/site';
import { useAuth } from '../../lib/session.jsx';
import { BrandMark } from '../Navbar.jsx';

export default function DashboardShell({ role, subject, eyebrow, title, description, actions, children }) {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);
  const loginPath = role === 'admin' ? '/admin/login' : '/login';
  const roleLabel = role === 'admin' ? 'Staff console' : 'Applicant portal';

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut(role);
    navigate(loginPath, { replace: true });
  };

  return (
    <div className="min-h-screen bg-mist font-sans text-slate-800 antialiased">
      <a
        href="#dashboard-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-navy focus:shadow-lg"
      >
        Skip to content
      </a>

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="flex items-center gap-3 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              aria-label={`${BRAND.name} home`}
            >
              <BrandMark compact />
              <div className="leading-tight">
                <p className="text-sm font-extrabold tracking-tight text-navy">{BRAND.shortName}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-brand">
                  {roleLabel}
                </p>
              </div>
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {subject}
            </span>
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-navy"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              Back to site
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              className="inline-flex items-center gap-1.5 rounded-lg bg-navy px-3 py-2 text-xs font-semibold text-white transition hover:bg-navy-800 disabled:opacity-60"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
              {signingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        </div>
      </header>

      <main id="dashboard-main" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            {eyebrow && (
              <p className="text-xs font-bold uppercase tracking-widest text-brand">{eyebrow}</p>
            )}
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-navy sm:text-3xl">
              {title}
            </h1>
            {description && <p className="mt-2 max-w-2xl text-sm text-slate-600">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>

        <div className="mt-8">{children}</div>

        <p className="mt-10 border-t border-slate-200 pt-5 text-xs leading-relaxed text-slate-500">
          No credit decision is made and no funds are disbursed.
        </p>
      </main>
    </div>
  );
}
