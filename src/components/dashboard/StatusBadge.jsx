import { STATUS_META, statusLabel } from '../../lib/format.js';

const TONES = {
  blue: 'bg-sky-50 text-sky-700 ring-sky-200',
  amber: 'bg-amber-50 text-amber-800 ring-amber-200',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  red: 'bg-red-50 text-brand ring-brand/20',
  slate: 'bg-slate-100 text-slate-600 ring-slate-200',
};

export default function StatusBadge({ status, className = '' }) {
  const tone = TONES[STATUS_META[status]?.tone ?? 'slate'];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${tone} ${className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {statusLabel(status)}
    </span>
  );
}
