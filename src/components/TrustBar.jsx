import { Clock, Info, Percent, ShieldCheck, Users } from 'lucide-react';

const BADGES = [
  {
    icon: Users,
    title: 'UK-based support',
    hint: 'The London branch team answers during GMT business hours.',
    tooltip: 'Support hours follow the London branch schedule shown in the banner.',
  },
  {
    icon: ShieldCheck,
    title: 'Secure by design',
    hint: 'HTTPS, server-side validation, no full ID stored.',
    tooltip:
      'Submissions are validated again on the server. Only the last four digits of the national ID are persisted.',
  },
  {
    icon: Percent,
    title: 'Transparent estimate',
    hint: 'Formula shown, rate configurable.',
    tooltip:
      'The calculator discloses its formula and reads the rate from configuration. Rates shown are illustrative, not an offer.',
  },
  {
    icon: Clock,
    title: 'Fast turnaround',
    hint: 'Most applications reviewed in two business days.',
    tooltip: 'Indicative only. This demonstration does not issue credit decisions.',
  },
];

export default function TrustBar() {
  return (
    <section aria-label="Trust and service highlights" className="relative z-20 border-b border-slate-200 bg-white py-6 shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {BADGES.map(({ icon: Icon, title, hint, tooltip }) => (
            <div
              key={title}
              className="group relative flex cursor-default items-start gap-3.5 rounded-xl border border-slate-200 bg-slate-50 p-4 transition-all duration-200 hover:border-brand/30 hover:bg-red-50/50"
              tabIndex={0}
            >
              <Icon className="h-6 w-6 shrink-0 text-brand" aria-hidden="true" />
              <div>
                <div className="flex items-center gap-1 text-sm font-bold text-slate-900">
                  {title}
                  <Info
                    className="h-3.5 w-3.5 text-slate-400 transition group-hover:text-brand group-focus:text-brand"
                    aria-hidden="true"
                  />
                </div>
                <p className="mt-0.5 text-xs text-slate-600">{hint}</p>
              </div>
              <div
                role="tooltip"
                className="pointer-events-none absolute left-0 top-full z-30 mt-2 w-64 rounded-lg bg-navy p-3 text-xs leading-relaxed text-slate-200 opacity-0 shadow-xl transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
              >
                {tooltip}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
