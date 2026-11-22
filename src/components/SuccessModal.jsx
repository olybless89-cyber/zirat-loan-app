import { CheckCircle2 } from 'lucide-react';
import Modal from './Modal.jsx';
import { formatMoney } from '../../lib/validation.js';

export default function SuccessModal({ result, onClose }) {
  const summary = result?.summary;

  return (
    <Modal open={Boolean(result)} title="Application recorded" onClose={onClose} size="sm">
      {result && (
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3.5">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden="true" />
            <p className="text-sm leading-relaxed text-emerald-900">
              Your reference is{' '}
              <span className="font-mono text-sm font-bold">{result.reference}</span>. Quote it if
              you contact the branch about this application.
            </p>
          </div>

          <dl className="divide-y divide-slate-100 rounded-lg border border-slate-200">
            <div className="flex justify-between gap-4 px-4 py-2.5 text-sm">
              <dt className="text-slate-500">Applicant</dt>
              <dd className="font-semibold text-navy">{summary?.fullName}</dd>
            </div>
            <div className="flex justify-between gap-4 px-4 py-2.5 text-sm">
              <dt className="text-slate-500">Amount</dt>
              <dd className="font-semibold text-navy">
                {formatMoney(summary?.amount ?? 0, summary?.currency ?? result.currency)}
              </dd>
            </div>
            <div className="flex justify-between gap-4 px-4 py-2.5 text-sm">
              <dt className="text-slate-500">Status</dt>
              <dd className="font-semibold capitalize text-navy">{summary?.status ?? 'received'}</dd>
            </div>
            <div className="flex justify-between gap-4 px-4 py-2.5 text-sm">
              <dt className="text-slate-500">Submitted</dt>
              <dd className="font-semibold text-navy">
                {summary?.createdAt ? new Date(summary.createdAt).toLocaleString('en-GB') : '—'}
              </dd>
            </div>
          </dl>

          <p className="text-xs leading-relaxed text-slate-500">
            Keep this reference. You can use it with the telephone number you applied with to track
            the request in the applicant portal.
          </p>

          <a
            href="/login"
            className="block w-full rounded-lg bg-brand px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-brand-dark"
          >
            Track this application
          </a>

          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:text-navy"
          >
            Close
          </button>
        </div>
      )}
    </Modal>
  );
}
