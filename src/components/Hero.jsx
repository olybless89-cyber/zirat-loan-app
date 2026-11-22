import { ArrowRight, Clock, Lock, ShieldCheck, TrendingUp, XCircle } from 'lucide-react';
import { CURRENCY_META } from '../../lib/validation.js';
import { BRAND, RATES } from '../config/site';

const BULLETS = [
  '₺100,000 – ₺50,000,000 (or equivalent USD / EUR / GBP)',
  'Indicative decision within 48 hours',
  'TRY / USD / EUR / GBP multi-currency options',
  'No credit bureau enquiry at application stage',
];

const formatLimit = (value, currency) => {
  const symbol = CURRENCY_META[currency]?.symbol ?? '';
  const locale = currency === 'TRY' ? 'tr-TR' : 'en-GB';
  return `${symbol}${Number(value || 0).toLocaleString(locale, { maximumFractionDigits: 0 })}`;
};

export default function Hero({ amount, currency, onApply }) {
  const annualRate = RATES.annualPercent.toFixed(2);

  return (
    <section className="relative overflow-hidden bg-navy py-16 text-white lg:py-24">
      <div className="pointer-events-none absolute inset-0 opacity-15" aria-hidden="true">
        <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="hero-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#hero-grid)" />
        </svg>
      </div>
      <div
        className="pointer-events-none absolute left-10 top-1/4 h-96 w-96 rounded-full bg-brand/20 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute bottom-10 right-10 h-96 w-96 rounded-full bg-blue-600/20 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-200 backdrop-blur-md">
              <ShieldCheck className="h-4 w-4 text-slate-300" aria-hidden="true" />
              <span>
                {BRAND.name} {BRAND.branch} Exclusive Financing
              </span>
            </div>

            <h1 className="text-4xl font-extrabold leading-[1.06] tracking-tight sm:text-5xl xl:text-[3.5rem]">
              Exclusive Personal &amp; Business Loans from{' '}
              <span className="text-red-500 xl:inline-block xl:whitespace-nowrap">
                {BRAND.name} {BRAND.branch}
              </span>
            </h1>

            <p className="text-lg font-medium leading-relaxed text-slate-300 sm:text-xl">
              No credit bureau check <span className="text-rose-400">·</span> Unsecured{' '}
              <span className="text-rose-400">·</span> Indicative pricing from {annualRate}% p.a.
            </p>

            <div className="grid gap-3 pt-2 sm:grid-cols-2">
              {BULLETS.map((bullet) => (
                <div key={bullet} className="flex items-start gap-2.5">
                  <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" aria-hidden="true" />
                  <span className="text-sm font-semibold leading-snug text-slate-200">{bullet}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-4 pt-4 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={onApply}
                className="flex items-center justify-center gap-2.5 rounded-xl bg-success px-8 py-4 text-lg font-bold text-white shadow-xl transition duration-300 hover:-translate-y-0.5 hover:bg-emerald-600 hover:shadow-2xl active:scale-95"
              >
                <span>Request Free Pre-Approval</span>
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </button>
              <p className="flex items-center justify-center gap-1.5 text-xs text-slate-400 sm:justify-start">
                <Lock className="h-4 w-4 text-slate-400" aria-hidden="true" />
                <span>No paperwork required · Digital processing</span>
              </p>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="relative space-y-5 overflow-hidden rounded-2xl border border-white/15 bg-white/10 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
              <div className="flex items-center justify-between gap-4">
                <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-300">
                  London Desk Offer
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/60 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-red-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-400" aria-hidden="true" />
                  Featured
                </span>
              </div>

              <div className="space-y-1.5 border-b border-white/10 pb-5">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Financing limit
                </div>
                <div className="text-4xl font-extrabold tracking-tight text-white">
                  {formatLimit(amount, currency)}
                </div>
                <div className="text-xs text-slate-400">
                  Selected in the calculator below · {currency}
                </div>
              </div>

              <dl className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Indicative rate
                  </dt>
                  <dd className="mt-1 text-base font-bold text-white">{annualRate}% p.a.</dd>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Turnaround
                  </dt>
                  <dd className="mt-1 flex items-center gap-1.5 text-base font-bold text-white">
                    <Clock className="h-4 w-4 text-slate-300" aria-hidden="true" />
                    {RATES.turnaroundHours} hours
                  </dd>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Credit rating impact
                  </dt>
                  <dd className="mt-1 flex items-center gap-1.5 text-base font-bold text-white">
                    <TrendingUp className="h-4 w-4 text-slate-300" aria-hidden="true" />
                    Zero check
                  </dd>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Collateral
                  </dt>
                  <dd className="mt-1 text-base font-bold text-white">Unsecured</dd>
                </div>
              </dl>

              <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-3.5">
                <ShieldCheck className="h-5 w-5 shrink-0 text-slate-400" aria-hidden="true" />
                <p className="text-[11px] leading-snug text-slate-400">
                  Authorised and regulated by the {BRAND.regulator}. Firm Reference Number{' '}
                  {BRAND.frn}.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
