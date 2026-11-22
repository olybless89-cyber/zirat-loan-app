import { Clock, Info, Phone } from 'lucide-react';
import { BRAND, CONTACT, telHref } from '../config/site';

export default function AnnouncementBar({ onOpenLegal, announcement = '', contact = null }) {
  const details = contact ?? CONTACT;
  const headline = announcement || 'London Branch Pre-Approval Line';

  return (
    <div className="border-b border-white/10 bg-navy px-4 py-2.5 text-[11px] text-slate-300 sm:text-xs">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <span className="inline-flex items-center gap-2 font-semibold text-slate-200">
          <span
            className="h-2 w-2 rounded-full bg-brand motion-safe:animate-pulse"
            aria-hidden="true"
          />
          {headline}
        </span>

        <button
          type="button"
          onClick={onOpenLegal}
          className="inline-flex items-center gap-1.5 text-left underline-offset-4 transition hover:text-white hover:underline"
        >
          <Info className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
          Authorised and regulated by the {BRAND.regulatorShort} · FRN {BRAND.frn}
        </button>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
          <a
            href={telHref(details.phone)}
            className="flex items-center gap-1.5 font-medium transition hover:text-white"
          >
            <Phone className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
            <span>{details.phone}</span>
          </a>
          <span className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
            {details.hours}
          </span>
        </div>
      </div>
    </div>
  );
}
