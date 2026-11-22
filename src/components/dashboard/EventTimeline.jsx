import { formatDateTime, statusLabel } from '../../lib/format.js';

export default function EventTimeline({ events, emptyLabel = 'No updates yet.' }) {
  if (!events?.length) {
    return <p className="text-sm text-slate-500">{emptyLabel}</p>;
  }
  return (
    <ol className="space-y-1">
      {events.map((event, index) => {
        const last = index === events.length - 1;
        return (
          <li key={event.id} className="relative flex gap-4 pb-5 last:pb-0">
            <div className="relative flex w-6 shrink-0 justify-center">
              <span
                className={`z-10 mt-1 h-3 w-3 rounded-full ring-4 ring-white ${
                  event.visibility === 'internal' ? 'bg-slate-400' : 'bg-brand'
                }`}
                aria-hidden="true"
              />
              {!last && <span className="absolute top-4 h-full w-px bg-slate-200" aria-hidden="true" />}
            </div>
            <div className="min-w-0 pb-1">
              <p className="text-sm font-semibold text-navy">
                {event.status ? statusLabel(event.status) : 'Note'}
                {event.visibility === 'internal' && (
                  <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    Internal
                  </span>
                )}
              </p>
              <p className="text-xs text-slate-500">
                {formatDateTime(event.createdAt)} · {event.actor}
              </p>
              {event.note && (
                <p className="mt-1 text-xs leading-relaxed text-slate-600">{event.note}</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
