import { useCallback, useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import AnnouncementBar from './components/AnnouncementBar.jsx';
import ApplicationForm from './components/ApplicationForm.jsx';
import ContactModal from './components/ContactModal.jsx';
import Footer from './components/Footer.jsx';
import Hero from './components/Hero.jsx';
import HowItWorks from './components/HowItWorks.jsx';
import LegalModal from './components/LegalModal.jsx';
import LoanCalculator from './components/LoanCalculator.jsx';
import Navbar from './components/Navbar.jsx';
import SuccessModal from './components/SuccessModal.jsx';
import Testimonials from './components/Testimonials.jsx';
import TrustBar from './components/TrustBar.jsx';
import { trackLead } from './lib/analytics.js';
import { scrollToSection } from './lib/scroll.js';
import { MAX_AMOUNT, MIN_AMOUNT } from '../lib/validation.js';

const FALLBACK = {
  monthlyRate: 2.49,
  termMonths: 36,
  minAmount: MIN_AMOUNT,
  maxAmount: MAX_AMOUNT,
};

export default function App() {
  const [amount, setAmount] = useState(2500000);
  const [currency, setCurrency] = useState('TRY');
  const [term, setTerm] = useState(FALLBACK.termMonths);
  const [config, setConfig] = useState(FALLBACK);
  const [legal, setLegal] = useState(null);
  const [contactOpen, setContactOpen] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/config')
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!data || cancelled) return;
        setConfig({ ...FALLBACK, ...data });
        if (data.termMonths) setTerm(data.termMonths);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const goToForm = useCallback(() => scrollToSection('basvuru-form'), []);

  const handleSuccess = useCallback((payload) => {
    setResult(payload);
    trackLead({ currency: payload.currency, amount: payload.amount });
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-mist font-sans text-slate-800 antialiased selection:bg-brand selection:text-white">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-navy focus:shadow-lg"
      >
        Skip to content
      </a>

      <AnnouncementBar onOpenLegal={() => setLegal('privacy')} />
      <Navbar onOpenContact={() => setContactOpen(true)} />

      <main id="main">
        <Hero amount={amount} currency={currency} onApply={goToForm} />
        <TrustBar />
        <HowItWorks />
        <LoanCalculator
          amount={amount}
          currency={currency}
          rate={config.monthlyRate}
          term={term}
          min={config.minAmount}
          max={config.maxAmount}
          onAmountChange={setAmount}
          onCurrencyChange={setCurrency}
          onTermChange={setTerm}
          onApply={goToForm}
        />
        <ApplicationForm
          amount={amount}
          currency={currency}
          onAmountChange={setAmount}
          onCurrencyChange={setCurrency}
          min={config.minAmount}
          max={config.maxAmount}
          onSuccess={handleSuccess}
          onOpenLegal={setLegal}
        />
        <Testimonials />
      </main>

      <Footer onOpenLegal={setLegal} onOpenContact={() => setContactOpen(true)} />

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 p-3 backdrop-blur sm:hidden">
        <button
          type="button"
          onClick={goToForm}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-3 text-sm font-bold text-white shadow-lg active:scale-95"
        >
          Get Pre-Approved
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      <div className="h-16 sm:hidden" aria-hidden="true" />

      <LegalModal kind={legal} onClose={() => setLegal(null)} />
      <ContactModal open={contactOpen} onClose={() => setContactOpen(false)} />
      <SuccessModal result={result} onClose={() => setResult(null)} />
    </div>
  );
}
