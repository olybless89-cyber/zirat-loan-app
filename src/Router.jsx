import { useEffect } from 'react';
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import App from './App.jsx';
import { useAuth } from './lib/session.jsx';
import ApplicantLogin from './pages/ApplicantLogin.jsx';
import AdminLogin from './pages/AdminLogin.jsx';
import ApplicantDashboard from './pages/ApplicantDashboard.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import AdminUsers from './pages/AdminUsers.jsx';
import AdminSettings from './pages/AdminSettings.jsx';

const TITLES = {
  '/': 'Zirat Bank — Personal & Business Loans | London Branch',
  '/login': 'Track your application — Zirat Bank',
  '/dashboard': 'Your application — Zirat Bank',
  '/admin/login': 'Staff sign in — Zirat Bank',
  '/admin': 'Staff console — Zirat Bank',
  '/admin/users': 'Users — Zirat Bank',
  '/admin/settings': 'Site settings — Zirat Bank',
};

function FullPageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-mist">
      <p className="flex items-center gap-2 text-sm font-semibold text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        Checking your session…
      </p>
    </div>
  );
}

function Protected({ role, children }) {
  const { status, role: currentRole } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <FullPageLoader />;
  if (status !== 'authenticated') {
    return (
      <Navigate
        to={role === 'admin' ? '/admin/login' : '/login'}
        replace
        state={{ from: location.pathname }}
      />
    );
  }
  if (role && currentRole !== role) {
    return <Navigate to={currentRole === 'admin' ? '/admin' : '/dashboard'} replace />;
  }
  return children;
}

function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-mist px-4 text-center">
      <p className="text-xs font-bold uppercase tracking-widest text-brand">404</p>
      <h1 className="text-2xl font-extrabold tracking-tight text-navy">Page not found</h1>
      <p className="max-w-sm text-sm text-slate-600">
        The page you were looking for does not exist. Return to the branch site or sign in to your
        application.
      </p>
      <div className="mt-2 flex gap-2">
        <Link
          to="/"
          className="rounded-lg bg-brand px-4 py-2.5 text-sm font-bold text-white transition hover:bg-brand-dark"
        >
          Back to the site
        </Link>
        <Link
          to="/login"
          className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:text-navy"
        >
          Track an application
        </Link>
      </div>
    </div>
  );
}

export default function Router() {
  const { pathname } = useLocation();

  useEffect(() => {
    document.title = TITLES[pathname] ?? 'Page not found — Zirat Bank';
  }, [pathname]);

  return (
    <Routes>
      <Route path="/" element={<App />} />
      <Route path="/login" element={<ApplicantLogin />} />
      <Route
        path="/dashboard"
        element={
          <Protected role="applicant">
            <ApplicantDashboard />
          </Protected>
        }
      />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route
        path="/admin"
        element={
          <Protected role="admin">
            <AdminDashboard />
          </Protected>
        }
      />
      <Route
        path="/admin/users"
        element={
          <Protected role="admin">
            <AdminUsers />
          </Protected>
        }
      />
      <Route
        path="/admin/settings"
        element={
          <Protected role="admin">
            <AdminSettings />
          </Protected>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
