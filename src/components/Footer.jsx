import { Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import { BRAND, CONTACT, WHATSAPP_LINK, telHref } from '../config/site';
import { BrandMark } from './Navbar.jsx';

export default function Footer({ onOpenLegal, onOpenContact, contact = null }) {
  const details = contact ?? CONTACT;
  const whatsappLink = details.whatsapp
    ? `https://wa.me/${details.whatsapp.replace(/\D/g, '')}`
    : WHATSAPP_LINK;
  
  return (
    <footer className="bg-navy text-slate-300">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="rounded-xl bg-white/5 p-2">
              <div className="[&_.text-navy]:text-white">
                <BrandMark />
              </div>
            </div>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-400">
              A multi-currency loan pre-approval demonstration for the London branch. Figures are
              illustrative, no credit decision is made and no loan is funded.
            </p>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-white">Navigate</h3>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <a href="#how-it-works" className="transition hover:text-white">
                  How it works
                </a>
              </li>
              <li>
                <a href="#calculator-section" className="transition hover:text-white">
                  Loan calculator
                </a>
              </li>
              <li>
                <a href="#reviews-section" className="transition hover:text-white">
                  Testimonials
                </a>
              </li>
              <li>
                <a href="#basvuru-form" className="transition hover:text-white">
                  Apply
                </a>
              </li>
              <li>
                <button type="button" onClick={onOpenContact} className="transition hover:text-white">
                  Contact
                </button>
              </li>
              <li>
                <a href="/login" className="transition hover:text-white">
                  Track an application
                </a>
              </li>
              <li>
                <a href="/admin/login" className="transition hover:text-white">
                  Staff sign in
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-white">Contact</h3>
            <ul className="mt-4 space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
                <a href={telHref(details.phone)} className="transition hover:text-white">
                  {details.phone}
                </a>
              </li>
              {whatsappLink && (
                <li className="flex items-start gap-2">
                  <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
                  <a
                    href={whatsappLink}
                    target="_blank"
                    rel="noreferrer noopener"
                    aria-label={`WhatsApp ${details.whatsapp}`}
                    className="transition hover:text-white"
                  >
                    {details.whatsapp}
                  </a>
                </li>
              )}
              <li className="flex items-start gap-2">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
                <a href={`mailto:${details.email}`} className="transition hover:text-white">
                  {details.email}
                </a>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
                <span>{details.address}</span>
              </li>
            </ul>
            <p className="mt-3 text-xs text-slate-500">{details.hours}</p>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t border-white/10 pt-6 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {BRAND.name}. Demonstration build — not a lender and not
            authorised to provide credit.
          </p>
          <div className="flex flex-wrap gap-4">
            <button type="button" onClick={() => onOpenLegal('privacy')} className="underline-offset-4 transition hover:text-white hover:underline">
              Privacy Notice
            </button>
            <button type="button" onClick={() => onOpenLegal('kvkk')} className="underline-offset-4 transition hover:text-white hover:underline">
              KVKK
            </button>
            <button type="button" onClick={() => onOpenLegal('gdpr')} className="underline-offset-4 transition hover:text-white hover:underline">
              UK GDPR
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
