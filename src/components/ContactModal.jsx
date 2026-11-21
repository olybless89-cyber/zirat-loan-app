import { Clock, Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import Modal from './Modal.jsx';
import { CONTACT, WHATSAPP_LINK, telHref } from '../config/site';

export default function ContactModal({ open, onClose }) {
  return (
    <Modal open={open} title="Contact the London branch" onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          Speak to the branch about a demonstration application, or ask for your record to be
          deleted.
        </p>

        <ul className="space-y-3">
          <li className="flex items-start gap-3 rounded-lg border border-slate-200 p-3">
            <Phone className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Telephone</p>
              <a href={telHref(CONTACT.phone)} className="text-sm font-semibold text-navy hover:text-brand">
                {CONTACT.phone}
              </a>
            </div>
          </li>
          <li className="flex items-start gap-3 rounded-lg border border-slate-200 p-3">
            <Mail className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email</p>
              <a href={`mailto:${CONTACT.email}`} className="text-sm font-semibold text-navy hover:text-brand">
                {CONTACT.email}
              </a>
            </div>
          </li>
          <li className="flex items-start gap-3 rounded-lg border border-slate-200 p-3">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Branch</p>
              <p className="text-sm font-semibold text-navy">{CONTACT.address}</p>
            </div>
          </li>
          <li className="flex items-start gap-3 rounded-lg border border-slate-200 p-3">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Hours</p>
              <p className="text-sm font-semibold text-navy">{CONTACT.hours}</p>
            </div>
          </li>
        </ul>

        {WHATSAPP_LINK && (
          <a
            href={WHATSAPP_LINK}
            target="_blank"
            rel="noreferrer noopener"
            className="flex items-center justify-center gap-2 rounded-lg bg-success px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-600"
          >
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            Message on WhatsApp
          </a>
        )}

        <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">
          Demonstration contact details. Set <code>VITE_CONTACT_PHONE</code>,{' '}
          <code>VITE_CONTACT_EMAIL</code> and <code>VITE_CONTACT_ADDRESS</code> to publish the
          branch’s verified details.
        </p>
      </div>
    </Modal>
  );
}
