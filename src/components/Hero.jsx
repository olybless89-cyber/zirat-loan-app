import { Award, CheckCircle2, Lock, MessageCircle, ShieldCheck } from 'lucide-react';
import { formatMoney } from '../../lib/validation.js';

const BULLETS = [
  'Borrow 100,000 – 50,000,000, or the USD / EUR / GBP equivalent',
  'Indicative pre-approval decision within two business days',
  'Pick TRY, USD, EUR or GBP before you apply',
  'No credit bureau or third-party checks in this demo',
];

export default function Hero({ amount, currency, rate, term, onApply, onOpenContact }) {
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
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-emerald-300 backdrop-blur-md">
              <Award className="h-4 w-4 text-emerald-400" aria-hidden="true" />
              <span>Multi-currency financing · London branch</span>
            </div>

            <h1 className="text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
              Personal and business financing in{' '}
              <span className="bg-gradient-to-r from-red-400 to-rose-200 bg-clip-text text-transparent">
                four currencies
              </span>
              .
            </h1>

            <p className="text-lg font-medium leading-relaxed text-slate-300 sm:text-xl">
              TRY <span className="text-rose-400">•</span> USD{' '}
              <span className="text-rose-400">•</span> EUR{' '}
              <span className="text-rose-400">•</span> GBP — estimate your monthly instalment, then
              submit a pre-approval request in minutes.
            </p>

            <div className="grid gap-3 pt-2 sm:grid-cols-2">
              {BULLETS.map((bullet) => (
                <div
                  key={bullet}
                  className="flex items-start gap-2.5 rounded-lg border border-white/10 bg-white/5 p-3 backdrop-blur-sm"
                >
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden="true" />
                  <span className="text-sm font-semibold text-slate-200">{bullet}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col items-stretch gap-4 pt-4 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={onApply}
                className="flex items-center justify-center gap-3 rounded-xl bg-success px-8 py-4 text-lg font-bold text-white shadow-xl transition duration-300 hover:-translate-y-0.5 hover:bg-emerald-600 hover:shadow-2xl active:scale-95"
              >
                <MessageCircle className="h-6 w-6" aria-hidden="true" />
                <span>Start your application</span>
              </button>
              <button
                type="button"
                onClick={onOpenContact}
                className="rounded-xl border border-white/30 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Contact the branch
              </button>
            </div>

            <p className="flex items-center justify-center gap-1.5 text-xs text-slate-400 sm:justify-start">
              <ShieldCheck className="h-4 w-4 text-emerald-400" aria-hidden="true" />
              <span>Illustrative figures only — this demonstration does not offer credit.</span>
            </p>
          </div>

          <div className="lg:col-span-5">
            <div className="relative space-y-6 overflow-hidden rounded-2xl border border-white/20 bg-white/10 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
              <div className="absolute right-0 top-0 rounded-bl-xl bg-brand px-4 py-1.5 text-xs font-extrabold uppercase tracking-wider text-white shadow">
                London desk example
              </div>

              <div className="space-y-2 pt-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Featured credit example
                </div>
                <div className="flex items-baseline justify-between border-b border-white/10 pb-3">
                  <span className="font-medium text-slate-300">Financing limit:</span>
                  <span className="text-2xl font-bold text-white">
                    {formatMoney(amount, currency)}
                  </span>
                </div>
              </div>

              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <dt className="text-xs text-slate-400">Monthly rate</dt>
                  <dd className="text-lg font-bold text-emerald-400">{rate}%</dd>
                  <dd className="text-[10px] uppercase tracking-wide text-slate-400">illustrative</dd>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <dt className="text-xs text-slate-400">Term</dt>
                  <dd className="text-lg font-bold text-white">{term} months</dd>
                  <dd className="text-[10px] uppercase tracking-wide text-slate-400">selectable</dd>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <dt className="text-xs text-slate-400">Turnaround</dt>
                  <dd className="text-lg font-bold text-white">2 days</dd>
                  <dd className="text-[10px] uppercase tracking-wide text-slate-400">indicative</dd>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <dt className="text-xs text-slate-400">Collateral</dt>
                  <dd className="text-lg font-bold text-emerald-400">Unsecured</dd>
                  <dd className="text-[10px] uppercase tracking-wide text-slate-400">illustrative</dd>
                </div>
              </dl>

              <div className="flex items-baseline justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2.5">
                <span className="text-xs text-slate-400">Credit check</span>
                <span className="text-sm font-bold text-emerald-400">None in this demo</span>
              </div>

              <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5">
                <Lock className="h-5 w-5 shrink-0 text-emerald-400" aria-hidden="true" />
                <p className="text-xs leading-snug text-emerald-200">
                  Demonstration site. Figures are illustrative, no credit decision is made and no
                  loan is funded.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
