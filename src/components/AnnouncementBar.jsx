import { Clock, Phone, ShieldCheck } from 'lucide-react';
import { CONTACT, telHref } from '../config/site';

export default function AnnouncementBar({ onOpenLegal }) {
  return (
    <div className="border-b border-slate-700/50 bg-navy px-4 py-2.5 text-xs text-slate-300">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center rounded border border-emerald-700/40 bg-emerald-950/70 px-2.5 py-0.5 font-semibold text-emerald-400">
            <span
              className="mr-1.5 h-2 w-2 rounded-full bg-emerald-400 motion-safe:animate-pulse"
              aria-hidden="true"
            />
            London Branch Pre-Approval Line
          </span>
          <span className="hidden text-slate-600 md:inline" aria-hidden="true">
            |
          </span>
          <button
            type="button"
            onClick={onOpenLegal}
            className="hidden items-center gap-1.5 underline-offset-4 transition hover:text-white hover:underline md:inline-flex"
          >
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
            Regulatory &amp; legal notices
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          <a
            href={telHref(CONTACT.phone)}
            className="flex items-center gap-1.5 font-medium transition hover:text-white"
          >
            <Phone className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
            <span>{CONTACT.phone}</span>
          </a>
          <span className="hidden text-slate-600 sm:inline" aria-hidden="true">
            |
          </span>
          <span className="hidden items-center gap-1 sm:flex">
            <Clock className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" />
            {CONTACT.hours}
          </span>
        </div>
      </div>
    </div>
  );
}
