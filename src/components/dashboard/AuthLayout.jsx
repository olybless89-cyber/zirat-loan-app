import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { BRAND } from '../../config/site';
import { BrandMark } from '../Navbar.jsx';

export default function AuthLayout({ eyebrow, headline, points = [], children, footer }) {
  return (
    <div className="grid min-h-screen bg-mist font-sans text-slate-800 antialiased lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative flex flex-col justify-between gap-10 overflow-hidden bg-navy px-6 py-8 text-white sm:px-10 lg:px-14 lg:py-14">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-brand/20 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-32 -left-20 h-72 w-72 rounded-full bg-sky-500/10 blur-3xl"
        />

        <Link
          to="/"
          className="relative w-fit rounded-xl bg-white/5 p-2 [&_.text-navy]:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          aria-label={`${BRAND.name} home`}
        >
          <BrandMark />
        </Link>

        <div className="relative max-w-lg">
          <p className="text-xs font-bold uppercase tracking-widest text-brand">{eyebrow}</p>
          <h1 className="mt-3 text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">
            {headline}
          </h1>
          <ul className="mt-6 space-y-3 text-sm text-slate-300">
            {points.map((point) => (
              <li key={point} className="flex items-start gap-2.5">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
                {point}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs leading-relaxed text-slate-400">
          {BRAND.name}, London branch. {BRAND.regulator} reference {BRAND.frn}. No credit decision
          is made and no loan is funded.
        </p>
      </aside>

      <main className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            {children}
          </div>
          {footer && <div className="mt-5 text-center text-xs text-slate-500">{footer}</div>}
        </div>
      </main>
    </div>
  );
}
