import { useEffect, useState } from 'react';
import { ArrowRight, Menu, X } from 'lucide-react';
import { BRAND } from '../config/site';
import { scrollToSection } from '../lib/scroll';

const LINKS = [
  { label: 'How It Works', id: 'how-it-works' },
  { label: 'Loan Calculator', id: 'calculator-section' },
  { label: 'Testimonials', id: 'reviews-section' },
];

export function BrandMark({ compact = false }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand text-2xl font-black leading-none text-white shadow-md">
        <span aria-hidden="true">Z</span>
      </div>
      {!compact && (
        <div className="leading-tight">
          <div className="text-lg font-extrabold tracking-tight text-navy">{BRAND.shortName}</div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-brand">
            {BRAND.branch}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Navbar({ onOpenContact }) {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const go = (id) => {
    setMenuOpen(false);
    scrollToSection(id);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur-md">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="flex items-center gap-4 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          aria-label={`${BRAND.name} home`}
        >
          <BrandMark />
        </button>

        <nav aria-label="Main" className="hidden items-center gap-8 text-sm font-medium text-slate-700 lg:flex">
          {LINKS.map((link) => (
            <button
              key={link.id}
              type="button"
              onClick={() => go(link.id)}
              className="py-1 transition-colors hover:text-brand"
            >
              {link.label}
            </button>
          ))}
          <button
            type="button"
            onClick={onOpenContact}
            className="py-1 transition-colors hover:text-brand"
          >
            Contact
          </button>
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => go('basvuru-form')}
            className="hidden items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-brand-dark hover:shadow-lg active:scale-95 sm:flex"
          >
            <span>Request Pre-Approval</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setMenuOpen((value) => !value)}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            className="rounded-lg p-2 text-navy transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand lg:hidden"
          >
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div id="mobile-menu" className="border-t border-slate-200 bg-white px-4 pb-5 pt-3 lg:hidden">
          <nav aria-label="Mobile" className="flex flex-col">
            {LINKS.map((link) => (
              <button
                key={link.id}
                type="button"
                onClick={() => go(link.id)}
                className="border-b border-slate-100 py-3 text-left text-sm font-medium text-slate-700 hover:text-brand"
              >
                {link.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onOpenContact();
              }}
              className="border-b border-slate-100 py-3 text-left text-sm font-medium text-slate-700 hover:text-brand"
            >
              Contact
            </button>
            <button
              type="button"
              onClick={() => go('basvuru-form')}
              className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-brand px-5 py-3 text-sm font-semibold text-white shadow-md"
            >
              <span>Request Pre-Approval</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}
