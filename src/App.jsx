import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Award,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Info,
  Lock,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  Star,
  X,
} from 'lucide-react';
import { trackLead } from './lib/analytics.js';
import {
  CURRENCY_META,
  MAX_AMOUNT,
  MIN_AMOUNT,
  formatMoney,
  generateDemoId,
  monthlyInstalment,
  tcChecksumError,
  validateAmount,
  validateName,
  validatePhone,
} from '../lib/validation.js';

// Identity block. Set `regulator` and `frn` only for a registration this
// business actually holds; while they are empty the regulatory line is hidden.
const BRAND = {
  wordmark: 'AMBERLINE CREDIT',
  name: 'Amberline Credit',
  branch: 'London Branch',
  regulator: '',
  frn: '',
  address: '1 Example Square, London E14 5AB',
  phone: '+44 20 7946 0821',
};

const RATE = { annualPercent: 3.9, termMonths: 36 };

const QUICK_AMOUNTS = [500000, 2500000, 10000000, 50000000];

const TRUST = [
  {
    Icon: Building2,
    title: 'London-based desk',
    detail: 'Applications are reviewed in London during business hours.',
    summary: 'UK desk',
  },
  {
    Icon: ShieldCheck,
    title: 'Secure by design',
    detail: 'Traffic is encrypted in transit with 256-bit TLS.',
    summary: 'TLS protection',
  },
  {
    Icon: Lock,
    title: 'Data minimisation',
    detail: 'Only the last four digits of the national ID are retained.',
    summary: 'Last 4 digits only',
  },
  {
    Icon: Clock,
    title: 'Bilingual support',
    detail: 'English and Turkish advisors on weekday hours.',
    summary: 'EN / TR advisors',
  },
];

const STEPS = [
  {
    number: '01',
    title: '1. Complete the Application Form (2 mins)',
    body: 'Enter your basic details and desired loan amount securely in our online pre-approval portal.',
  },
  {
    number: '02',
    title: '2. A Specialist Reviews Your Request',
    body: 'Verification and rate structuring with a dedicated advisor, usually the same working day.',
    badge: 'Priority desk',
  },
  {
    number: '03',
    title: '3. Indicative Decision, Then Documentation',
    body: 'Receive an indicative decision in two business days. Funds follow final sign-off in TRY, USD, EUR or GBP.',
  },
];

const TESTIMONIALS = [
  {
    name: 'Emre Kaya',
    short: 'Emre K.',
    city: 'London, UK',
    amount: '£120,000 GBP',
    quote:
      'Applied from London for my business expansion. The multi-currency options made the whole thing simple, and the team explained every step before I signed anything.',
    date: 'February 18, 2026',
  },
  {
    name: 'Zeynep Arslan',
    short: 'Zeynep A.',
    city: 'Istanbul, Türkiye',
    amount: '₺3,500,000 TRY',
    quote:
      'The specialist guided me through every step in minutes. Having flexible currency options made all the difference.',
    date: 'January 29, 2026',
  },
  {
    name: 'Burak Demir',
    short: 'Burak D.',
    city: 'Manchester, UK',
    amount: '€85,000 EUR',
    quote:
      'Fast, transparent, and professional. From submitting the 2-minute form to the indicative decision, everything happened when they said it would.',
    date: 'March 04, 2026',
  },
];

const LEGAL = {
  privacy: {
    title: 'Privacy Policy',
    body: [
      'This is a demonstration build. Submissions are stored so the form can be tested end to end; they are not used to assess credit and are not shared with any lender.',
      'The application form collects a name, a Turkish mobile number and an 11-digit national ID. Only the final four digits of the national ID are written to storage; the full number is validated in memory and then discarded.',
    ],
  },
  kvkk: {
    title: 'KVKK & Data Disclosure',
    body: [
      'Under KVKK (Law No. 6698) and the UK GDPR you may request access to, correction of, or deletion of the data submitted here.',
      'No automated credit decision is made, and no credit reference agency, KKB or other bureau is contacted by this demonstration.',
    ],
  },
  contact: { title: 'Contact & Branch Info', body: [] },
};

const scrollToSection = (id) => {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

export default function App() {
  const [amount, setAmount] = useState(2500000);
  const [currency, setCurrency] = useState('TRY');
  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    nationalId: '',
    amount: 2500000,
    currency: 'TRY',
    consent: false,
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [modal, setModal] = useState(null);

  const monthlyRate = RATE.annualPercent / 12;

  const instalment = useMemo(
    () => monthlyInstalment(amount, monthlyRate, RATE.termMonths),
    [amount, monthlyRate],
  );
  const totalRepayable = instalment ? instalment * RATE.termMonths : 0;

  const syncAmount = useCallback((next) => {
    setAmount(next);
    setForm((prev) => ({ ...prev, amount: next }));
  }, []);

  const syncCurrency = useCallback((next) => {
    setCurrency(next);
    setForm((prev) => ({ ...prev, currency: next }));
  }, []);

  const update = (key) => (event) => {
    const value = key === 'consent' ? event.target.checked : event.target.value;
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: null } : prev));
  };

  const submit = async (event) => {
    event.preventDefault();
    const nextErrors = {
      fullName: validateName(form.fullName),
      phone: validatePhone(form.phone),
      nationalId: tcChecksumError(form.nationalId),
      amount: validateAmount(form.amount),
      consent: form.consent ? null : 'You must accept the privacy and data processing notice.',
    };
    const cleaned = Object.fromEntries(Object.entries(nextErrors).filter(([, value]) => value));
    setErrors(cleaned);
    if (Object.keys(cleaned).length) return;

    setSubmitting(true);
    try {
      const response = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: form.fullName.trim(),
          phone: form.phone,
          nationalId: form.nationalId.trim(),
          amount: Number(form.amount),
          currency: form.currency,
          consent: true,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setErrors(payload.errors || { form: 'Something went wrong. Please try again.' });
        return;
      }
      setResult(payload);
      trackLead({ currency: form.currency, amount: Number(form.amount) });
      setForm((prev) => ({ ...prev, fullName: '', phone: '', nationalId: '', consent: false }));
    } catch {
      setErrors({ form: 'Network error. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#F5F5F5] font-sans text-slate-800 antialiased selection:bg-[#C8102E] selection:text-white">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-[#0B1D3A] focus:shadow-lg"
      >
        Skip to content
      </a>

      <div className="border-b border-slate-700/50 bg-[#0B1D3A] px-4 py-2.5 text-xs text-slate-300">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center rounded border border-emerald-700/40 bg-emerald-950/70 px-2.5 py-0.5 font-semibold text-emerald-400">
              <span className="mr-1.5 h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              London Branch Pre-Approval Line
            </span>
            <span className="hidden text-slate-500 md:inline">|</span>
            <span className="hidden md:inline">Demonstration build — no credit is offered</span>
          </div>
          <div className="flex items-center gap-6">
            <a
              href={`tel:${BRAND.phone.replace(/[^\d+]/g, '')}`}
              className="flex items-center gap-1.5 font-medium transition hover:text-white"
            >
              <Phone className="h-3.5 w-3.5 text-[#C8102E]" aria-hidden="true" />
              <span>{BRAND.phone}</span>
            </a>
            <span className="hidden text-slate-500 sm:inline">|</span>
            <span className="hidden items-center gap-1 sm:flex">
              <Clock className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" />
              Weekday support
            </span>
          </div>
        </div>
      </div>

      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur-md">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-4 text-left"
          >
            <span className="flex items-center gap-3">
              <span className="flex items-center justify-center rounded-xl bg-[#C8102E] p-2.5 text-white shadow-md">
                <svg className="h-8 w-8 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 2L4 7v10l8 5 8-5V7l-8-5zm0 2.3L18 8v3.5L12 8 6 11.5V8l6-3.7zM6 13.2l6-3.5 6 3.5v3.6l-6 3.7-6-3.7v-3.6z" />
                </svg>
              </span>
              <span>
                <span className="block text-xl font-extrabold tracking-tight text-[#0B1D3A]">
                  {BRAND.wordmark}
                </span>
                <span className="block text-[10px] font-bold uppercase tracking-widest text-[#C8102E]">
                  {BRAND.branch}
                </span>
              </span>
            </span>
            <span className="hidden items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 shadow-inner sm:flex">
              <MapPin className="h-3.5 w-3.5 text-[#C8102E]" aria-hidden="true" />
              <span>{BRAND.branch}</span>
            </span>
          </button>

          <nav className="hidden items-center space-x-8 text-sm font-medium text-slate-700 lg:flex">
            <button type="button" onClick={() => scrollToSection('how-it-works')} className="py-1 transition-colors hover:text-[#C8102E]">
              How It Works
            </button>
            <button type="button" onClick={() => scrollToSection('calculator-section')} className="py-1 transition-colors hover:text-[#C8102E]">
              Loan Calculator
            </button>
            <button type="button" onClick={() => scrollToSection('reviews-section')} className="py-1 transition-colors hover:text-[#C8102E]">
              Testimonials
            </button>
            <button type="button" onClick={() => setModal('contact')} className="py-1 transition-colors hover:text-[#C8102E]">
              Contact
            </button>
          </nav>

          <button
            type="button"
            onClick={() => scrollToSection('basvuru-form')}
            className="flex items-center gap-2 rounded-lg bg-[#C8102E] px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:bg-[#a00d24] hover:shadow-lg active:scale-95"
          >
            <span>Get Pre-Approved</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </header>

      <main id="main">
        <section className="relative overflow-hidden bg-[#0B1D3A] py-16 text-white lg:py-24">
          <div className="pointer-events-none absolute inset-0 opacity-15">
            <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <defs>
                <pattern id="hero-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#hero-grid)" />
            </svg>
          </div>
          <div className="pointer-events-none absolute left-10 top-1/4 h-96 w-96 rounded-full bg-[#C8102E]/20 blur-3xl" />
          <div className="pointer-events-none absolute bottom-10 right-10 h-96 w-96 rounded-full bg-blue-600/20 blur-3xl" />

          <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid items-center gap-12 lg:grid-cols-12">
              <div className="space-y-6 text-left lg:col-span-7">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-emerald-300 backdrop-blur-md">
                  <Award className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                  <span>
                    {BRAND.name} {BRAND.branch} Exclusive Financing
                  </span>
                </div>

                <h1 className="text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
                  Exclusive Personal &amp; Business Loans from{' '}
                  <span className="bg-gradient-to-r from-red-400 to-rose-200 bg-clip-text text-transparent">
                    {BRAND.name} {BRAND.branch}
                  </span>
                </h1>

                <p className="text-lg font-medium leading-relaxed text-slate-300 sm:text-xl">
                  Indicative decision <span className="text-rose-400">•</span> Unsecured{' '}
                  <span className="text-rose-400">•</span>{' '}
                  <strong className="text-white underline decoration-[#C8102E] underline-offset-4">
                    Rates from {RATE.annualPercent.toFixed(2)}% per year
                  </strong>
                </p>

                <div className="grid gap-3 pt-2 sm:grid-cols-2">
                  {[
                    '₺500,000 – ₺50,000,000 (or equivalent USD / EUR / GBP)',
                    'Indicative decision in two business days',
                    'TRY / USD / EUR / GBP multi-currency options',
                    'No hard credit search in this demo',
                  ].map((bullet) => (
                    <div
                      key={bullet}
                      className="flex items-start gap-2.5 rounded-lg border border-white/10 bg-white/5 p-3 backdrop-blur-sm"
                    >
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#28A745]" aria-hidden="true" />
                      <span className="text-sm font-semibold text-slate-200">{bullet}</span>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col items-stretch gap-4 pt-4 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={() => scrollToSection('basvuru-form')}
                    className="flex transform items-center justify-center gap-3 rounded-xl bg-[#28A745] px-8 py-4 text-lg font-bold text-white shadow-xl transition-all duration-300 hover:-translate-y-0.5 hover:bg-emerald-600 hover:shadow-2xl active:scale-95"
                  >
                    <MessageCircle className="h-6 w-6 fill-current" aria-hidden="true" />
                    <span>Get Free Pre-Approval →</span>
                  </button>
                  <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
                    <ShieldCheck className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                    <span>No paperwork required • Digital processing</span>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5">
                <div className="relative space-y-6 overflow-hidden rounded-2xl border border-white/20 bg-white/10 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
                  <div className="absolute right-0 top-0 rounded-bl-xl bg-[#C8102E] px-4 py-1.5 text-xs font-extrabold uppercase tracking-wider text-white shadow">
                    London Desk Offer
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                      Featured Credit Example
                    </div>
                    <div className="flex items-baseline justify-between border-b border-white/10 pb-3">
                      <span className="font-medium text-slate-300">Financing limit:</span>
                      <span className="text-2xl font-bold text-white">₺2,500,000</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                      <div className="text-xs text-slate-400">Rate</div>
                      <div className="text-lg font-bold text-emerald-400">{RATE.annualPercent.toFixed(2)}% p.a.</div>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                      <div className="text-xs text-slate-400">Turnaround</div>
                      <div className="text-lg font-bold text-white">2 business days</div>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                      <div className="text-xs text-slate-400">Credit search</div>
                      <div className="text-lg font-bold text-white">None in demo</div>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                      <div className="text-xs text-slate-400">Collateral</div>
                      <div className="text-lg font-bold text-emerald-400">Unsecured</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5">
                    <Lock className="h-5 w-5 shrink-0 text-emerald-400" aria-hidden="true" />
                    <p className="text-xs leading-snug text-emerald-200">
                      {BRAND.regulator && BRAND.frn
                        ? `Authorised and regulated by the ${BRAND.regulator}, firm reference ${BRAND.frn}.`
                        : 'Demonstration build. No credit decision is made and no funds are disbursed.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="relative z-20 border-b border-slate-200 bg-white py-6 shadow-sm">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              {TRUST.map((item) => (
                <div
                  key={item.title}
                  className="group relative flex cursor-pointer items-center space-x-3.5 rounded-xl border border-slate-200 bg-slate-50 p-4 transition-all duration-200 hover:bg-red-50/50"
                >
                  <item.Icon className="h-7 w-7 shrink-0 text-[#C8102E]" aria-hidden="true" />
                  <div>
                    <div className="flex items-center gap-1 text-sm font-bold text-slate-900">
                      {item.title}
                      <Info
                        className="h-3.5 w-3.5 text-slate-400 group-hover:text-[#C8102E]"
                        aria-label={item.detail}
                      />
                    </div>
                    <div className="mt-0.5 text-xs text-slate-500">{item.summary}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="bg-white py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-bold uppercase tracking-widest text-[#C8102E]">Simple 3-Step Process</p>
              <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-[#0B1D3A] sm:text-4xl">
                How Your Application Is Processed
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                No physical paperwork or branch queues required. Secure your pre-approval online in minutes.
              </p>
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {STEPS.map((step) => (
                <div
                  key={step.number}
                  className="relative rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-sm"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0B1D3A] text-sm font-bold text-white">
                      {step.number}
                    </span>
                    {step.badge && (
                      <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                        {step.badge}
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-[#0B1D3A]">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="calculator-section" className="bg-[#F5F5F5] py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-bold uppercase tracking-widest text-[#C8102E]">Instant Calculator &amp; Portal</p>
              <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-[#0B1D3A] sm:text-4xl">
                Calculate Your Repayments &amp; Apply Online
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Select your financing amount, preview estimated monthly payments, and submit your request.
              </p>
            </div>

            <div className="mt-12 grid gap-8 lg:grid-cols-12">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 lg:col-span-7">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-bold text-[#0B1D3A]">Loan Repayment Calculator</h3>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                    {RATE.annualPercent.toFixed(2)}% p.a.
                  </span>
                </div>

                <div className="mt-6">
                  <div className="text-sm font-semibold text-slate-700">Select Currency</div>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {Object.entries(CURRENCY_META).map(([code, meta]) => (
                      <button
                        key={code}
                        type="button"
                        onClick={() => syncCurrency(code)}
                        aria-pressed={currency === code}
                        className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                          currency === code
                            ? 'border-[#C8102E] bg-red-50 text-[#C8102E]'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        {meta.symbol} {code}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-6">
                  <label htmlFor="calc-amount" className="text-sm font-semibold text-slate-700">
                    Loan Amount
                  </label>
                  <div className="mt-2 flex items-center rounded-lg border border-slate-300 bg-white px-3 focus-within:border-[#C8102E]">
                    <span className="text-slate-500">{CURRENCY_META[currency].symbol}</span>
                    <input
                      id="calc-amount"
                      type="number"
                      min={MIN_AMOUNT}
                      max={MAX_AMOUNT}
                      step={50000}
                      value={amount}
                      onChange={(event) => syncAmount(Number(event.target.value))}
                      className="w-full bg-transparent px-2 py-3 text-lg font-bold text-slate-900 outline-none"
                    />
                  </div>
                  <input
                    type="range"
                    min={MIN_AMOUNT}
                    max={MAX_AMOUNT}
                    step={50000}
                    value={Math.min(Math.max(amount, MIN_AMOUNT), MAX_AMOUNT)}
                    onChange={(event) => syncAmount(Number(event.target.value))}
                    aria-label="Loan amount slider"
                    className="mt-4 w-full accent-[#C8102E]"
                  />
                  <div className="mt-1 flex justify-between text-xs text-slate-500">
                    <span>{formatMoney(MIN_AMOUNT, currency)}</span>
                    <span>{formatMoney(MAX_AMOUNT, currency)}</span>
                  </div>
                </div>

                <div className="mt-5">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Quick Select:</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {QUICK_AMOUNTS.map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => syncAmount(value)}
                        className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-[#C8102E] hover:text-[#C8102E]"
                      >
                        {formatMoney(value, currency, { decimals: 0 })}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5">
                <div className="flex h-full flex-col justify-between rounded-2xl bg-[#0B1D3A] p-6 text-white shadow-xl sm:p-8">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                      Repayment Summary
                    </div>
                    <div className="mt-4 text-sm text-slate-300">Estimated Monthly Installment:</div>
                    <div data-testid="instalment" className="mt-1 text-4xl font-extrabold tracking-tight text-emerald-400">
                      {instalment ? formatMoney(instalment, currency, { decimals: 2 }) : '—'}
                    </div>

                    <dl className="mt-6 space-y-3 border-t border-white/10 pt-4 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-slate-400">Total repayable</dt>
                        <dd className="font-semibold">{formatMoney(totalRepayable, currency, { decimals: 0 })}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-slate-400">Total interest</dt>
                        <dd className="font-semibold">
                          {formatMoney(Math.max(totalRepayable - amount, 0), currency, { decimals: 0 })}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-slate-400">Term</dt>
                        <dd className="font-semibold">{RATE.termMonths} months</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-slate-400">Rate used</dt>
                        <dd className="font-semibold">{RATE.annualPercent.toFixed(2)}% per year</dd>
                      </div>
                    </dl>

                    <p className="mt-4 text-xs leading-relaxed text-slate-400">
                      * Indicative only, based on {RATE.annualPercent.toFixed(2)}% per year over {RATE.termMonths} months.
                      The actual rate depends on your financial profile.
                    </p>
                    <p className="mt-2 flex items-start gap-1.5 text-xs text-slate-400">
                      <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" aria-hidden="true" />
                      No hard credit search — this demo creates no KKB or credit-file record.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => scrollToSection('basvuru-form')}
                    className="mt-6 w-full rounded-lg bg-[#C8102E] px-4 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-[#a00d24] active:scale-95"
                  >
                    Apply with these figures
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="basvuru-form" className="bg-white py-16">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <p className="text-xs font-bold uppercase tracking-widest text-[#C8102E]">Pre-Approval Application</p>
              <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-[#0B1D3A] sm:text-4xl">
                Submit Your Request
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Your information is encrypted in transit and routed to the {BRAND.branch} desk.
              </p>
            </div>

            <form onSubmit={submit} noValidate className="mt-10 space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-lg sm:p-8">
              <div>
                <label htmlFor="fullName" className="text-sm font-semibold text-slate-700">
                  Full Name *
                </label>
                <input
                  id="fullName"
                  name="fullName"
                  value={form.fullName}
                  onChange={update('fullName')}
                  placeholder="e.g. Ahmet Yilmaz or Zeynep Arslan"
                  aria-invalid={Boolean(errors.fullName)}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[#C8102E]"
                />
                {errors.fullName && <p className="mt-1 text-xs font-medium text-[#C8102E]">{errors.fullName}</p>}
              </div>

              <div>
                <label htmlFor="phone" className="text-sm font-semibold text-slate-700">
                  Turkish Mobile Phone Number *
                </label>
                <input
                  id="phone"
                  name="phone"
                  inputMode="tel"
                  value={form.phone}
                  onChange={update('phone')}
                  placeholder="+90 532 123 4567 or 0532 123 4567"
                  aria-invalid={Boolean(errors.phone)}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[#C8102E]"
                />
                {errors.phone && <p className="mt-1 text-xs font-medium text-[#C8102E]">{errors.phone}</p>}
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="nationalId" className="text-sm font-semibold text-slate-700">
                    Turkish ID Number (TC Kimlik) *
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setForm((prev) => ({ ...prev, nationalId: generateDemoId() }));
                      setErrors((prev) => ({ ...prev, nationalId: null }));
                    }}
                    className="rounded-full border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-[#C8102E] hover:text-[#C8102E]"
                  >
                    Fill Valid Demo ID
                  </button>
                </div>
                <input
                  id="nationalId"
                  name="nationalId"
                  inputMode="numeric"
                  maxLength={11}
                  value={form.nationalId}
                  onChange={update('nationalId')}
                  aria-invalid={Boolean(errors.nationalId)}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[#C8102E]"
                />
                <p className="mt-1 text-xs text-slate-500">11-digit TR National ID Number</p>
                {errors.nationalId && <p className="mt-1 text-xs font-medium text-[#C8102E]">{errors.nationalId}</p>}
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="form-amount" className="text-sm font-semibold text-slate-700">
                    Loan Amount *
                  </label>
                  <input
                    id="form-amount"
                    name="amount"
                    type="number"
                    min={MIN_AMOUNT}
                    max={MAX_AMOUNT}
                    step={50000}
                    value={form.amount}
                    onChange={(event) => {
                      const next = Number(event.target.value);
                      setForm((prev) => ({ ...prev, amount: next }));
                      setAmount(next);
                      setErrors((prev) => ({ ...prev, amount: null }));
                    }}
                    aria-invalid={Boolean(errors.amount)}
                    className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[#C8102E]"
                  />
                  {errors.amount && <p className="mt-1 text-xs font-medium text-[#C8102E]">{errors.amount}</p>}
                </div>

                <div>
                  <label htmlFor="form-currency" className="text-sm font-semibold text-slate-700">
                    Currency
                  </label>
                  <select
                    id="form-currency"
                    name="currency"
                    value={form.currency}
                    onChange={(event) => syncCurrency(event.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#C8102E]"
                  >
                    {Object.entries(CURRENCY_META).map(([code, meta]) => (
                      <option key={code} value={code}>
                        {code} ({meta.symbol}) — {meta.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <input
                  id="consent"
                  name="consent"
                  type="checkbox"
                  checked={form.consent}
                  onChange={update('consent')}
                  aria-invalid={Boolean(errors.consent)}
                  className="mt-0.5 h-4 w-4 accent-[#C8102E]"
                />
                <label htmlFor="consent" className="text-xs leading-relaxed text-slate-600">
                  I have read and accept the{' '}
                  <button type="button" onClick={() => setModal('privacy')} className="font-semibold text-[#C8102E] underline">
                    KVKK &amp; UK GDPR Privacy Notice
                  </button>
                  . I authorise {BRAND.name} to evaluate my application details. *
                </label>
              </div>
              {errors.consent && <p className="text-xs font-medium text-[#C8102E]">{errors.consent}</p>}
              {errors.form && <p className="text-xs font-medium text-[#C8102E]">{errors.form}</p>}

              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#28A745] px-6 py-3.5 text-sm font-bold text-white shadow-lg transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-70 active:scale-95"
              >
                {submitting ? 'Submitting…' : 'Submit & Continue'}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </form>
          </div>
        </section>

        <section id="reviews-section" className="bg-[#F5F5F5] py-16">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <p className="text-xs font-bold uppercase tracking-widest text-[#C8102E]">Social Proof &amp; Trust</p>
              <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-[#0B1D3A] sm:text-4xl">
                Client Testimonials
              </h2>
            </div>
            <Testimonials />
          </div>
        </section>
      </main>

      <footer className="bg-[#0B1D3A] py-12 text-slate-300">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
            <div className="max-w-md">
              <div className="text-lg font-extrabold text-white">
                {BRAND.name} {BRAND.branch}
              </div>
              <p className="mt-3 text-xs leading-relaxed text-slate-400">
                {BRAND.regulator && BRAND.frn
                  ? `${BRAND.name} ${BRAND.branch} is authorised and regulated by the ${BRAND.regulator} under firm reference ${BRAND.frn}.`
                  : 'Demonstration build. No credit is offered, no application is assessed, and no funds are disbursed.'}
              </p>
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
              <button type="button" onClick={() => setModal('privacy')} className="hover:text-white">
                Privacy Policy
              </button>
              <span className="text-slate-600">•</span>
              <button type="button" onClick={() => setModal('kvkk')} className="hover:text-white">
                KVKK &amp; Data Disclosure
              </button>
              <span className="text-slate-600">•</span>
              <button type="button" onClick={() => setModal('contact')} className="hover:text-white">
                Contact &amp; Branch Info
              </button>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-2 border-t border-white/10 pt-6 text-xs text-slate-400 sm:flex-row sm:justify-between">
            <div>
              <div>
                Direct Desk:{' '}
                <a href={`tel:${BRAND.phone.replace(/[^\d+]/g, '')}`} className="font-semibold text-white">
                  {BRAND.phone}
                </a>{' '}
                <span className="text-slate-500">(demo line)</span>
              </div>
              <div className="mt-1">Address: {BRAND.address}</div>
            </div>
            <div>© 2024 {BRAND.name}. All rights reserved.</div>
          </div>
        </div>
      </footer>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 p-3 backdrop-blur sm:hidden">
        <button
          type="button"
          onClick={() => scrollToSection('basvuru-form')}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#C8102E] px-4 py-3 text-sm font-bold text-white shadow-lg active:scale-95"
        >
          Get Pre-Approved
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      <div className="h-16 sm:hidden" aria-hidden="true" />

      <Modal open={modal === 'privacy'} title={LEGAL.privacy.title} onClose={() => setModal(null)}>
        {LEGAL.privacy.body.map((paragraph) => (
          <p key={paragraph} className="mt-3 text-sm leading-relaxed text-slate-600">
            {paragraph}
          </p>
        ))}
      </Modal>

      <Modal open={modal === 'kvkk'} title={LEGAL.kvkk.title} onClose={() => setModal(null)}>
        {LEGAL.kvkk.body.map((paragraph) => (
          <p key={paragraph} className="mt-3 text-sm leading-relaxed text-slate-600">
            {paragraph}
          </p>
        ))}
      </Modal>

      <Modal open={modal === 'contact'} title={LEGAL.contact.title} onClose={() => setModal(null)}>
        <div className="mt-3 space-y-2 text-sm text-slate-600">
          <p>
            <span className="font-semibold text-slate-800">Direct desk:</span> {BRAND.phone}{' '}
            <span className="text-slate-400">(demo line — cannot connect)</span>
          </p>
          <p>
            <span className="font-semibold text-slate-800">Address:</span> {BRAND.address}
          </p>
          <p>
            <span className="font-semibold text-slate-800">Hours:</span> weekdays, 09:00–18:00 GMT
          </p>
        </div>
      </Modal>

      <Modal open={Boolean(result)} title="Application received" onClose={() => setResult(null)}>
        <div className="mt-3 space-y-3 text-sm text-slate-600">
          <p>This demonstration recorded your request. No credit decision has been made.</p>
          <p className="rounded-lg bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700">
            Reference: {result?.reference}
          </p>
        </div>
      </Modal>
    </div>
  );
}

function Testimonials() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return undefined;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % TESTIMONIALS.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [paused]);

  const current = TESTIMONIALS[index];

  return (
    <div
      className="mt-10"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg sm:p-8">
        <div className="flex items-center gap-1 text-amber-400" aria-label="Five star rating">
          {[0, 1, 2, 3, 4].map((star) => (
            <Star key={star} className="h-4 w-4 fill-current" aria-hidden="true" />
          ))}
        </div>

        <blockquote className="mt-4 text-lg font-medium leading-relaxed text-slate-800">
          “{current.quote}”
        </blockquote>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-4">
          <div>
            <div className="text-sm font-bold text-[#0B1D3A]">{current.short}</div>
            <div className="text-xs text-slate-500">{current.name}</div>
            <div className="mt-1 text-xs text-slate-500">
              Location: {current.city} • Disbursed limit: {current.amount}
            </div>
          </div>
          <div className="text-right">
            <span className="inline-block rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
              Demo testimonial
            </span>
            <div className="mt-1.5 text-xs text-slate-500">Date: {current.date}</div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="flex gap-1.5">
          {TESTIMONIALS.map((item, i) => (
            <button
              key={item.name}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Show testimonial ${i + 1}`}
              aria-current={i === index}
              className={`h-2 w-2 rounded-full ${i === index ? 'bg-[#C8102E]' : 'bg-slate-300'}`}
            />
          ))}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setIndex((prev) => (prev - 1 + TESTIMONIALS.length) % TESTIMONIALS.length)}
            aria-label="Previous testimonial"
            className="rounded-full border border-slate-200 bg-white p-2 text-slate-600 shadow-sm hover:text-[#C8102E]"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setIndex((prev) => (prev + 1) % TESTIMONIALS.length)}
            aria-label="Next testimonial"
            className="rounded-full border border-slate-200 bg-white p-2 text-slate-600 shadow-sm hover:text-[#C8102E]"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <p className="mt-4 text-center text-xs text-slate-400">
        * Carousel auto-advances every 5 seconds. Hover over the card to pause auto-scrolling.
      </p>
    </div>
  );
}

function Modal({ open, title, onClose, children }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-0 sm:items-center sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-6 shadow-2xl sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-lg font-bold text-[#0B1D3A]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
