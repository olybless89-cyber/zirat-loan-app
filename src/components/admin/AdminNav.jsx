import { Link, useLocation } from 'react-router-dom';
import { Inbox, Settings, Users } from 'lucide-react';

const TABS = [
  { to: '/admin', label: 'Applications', icon: Inbox },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/settings', label: 'Site settings', icon: Settings },
];

export default function AdminNav() {
  const { pathname } = useLocation();

  return (
    <nav
      aria-label="Admin sections"
      className="inline-flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm"
    >
      {TABS.map(({ to, label, icon: Icon }) => {
        const active = pathname === to;
        return (
          <Link
            key={to}
            to={to}
            aria-current={active ? 'page' : undefined}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition ${
              active
                ? 'bg-navy text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50 hover:text-navy'
            }`}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
