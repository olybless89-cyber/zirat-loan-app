import { ArrowRight, Info } from 'lucide-react';
import {
  CURRENCIES,
  CURRENCY_META,
  formatMoney,
  monthlyInstalment,
} from '../../lib/validation.js';

const TERMS = [12, 24, 36, 48, 60];

export default function LoanCalculator({
  amount,
  currency,
  rate,
  term,
  min,
  max,
  onAmountChange,
  onCurrencyChange,
  onTermChange,
  onApply,
}) {
  const monthly = monthlyInstalment(amount, rate, term) ?? 0;
  const total = monthly * term;
  const interest = Math.max(total - Number(amount || 0), 0);

  return (
    <section id="calculator-section" className="scroll-mt-24 bg-mist py-16 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-widest text-brand">Loan calculator</p>
          <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-navy sm:text-3xl">
            Estimate your monthly instalment
          </h2>
          <p className="mt-3 text-sm text-slate-600">
            Change the currency, amount or term and the estimate updates immediately. The form
            below stays in step with these figures.
          </p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <fieldset>
              <legend className="text-sm font-bold text-navy">Currency</legend>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {CURRENCIES.map((code) => {
                  const active = code === currency;
                  return (
                    <button
                      key={code}
                      type="button"
                      aria-pressed={active}
                      onClick={() => onCurrencyChange(code)}
                      className={`rounded-lg border px-3 py-2.5 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                        active
                          ? 'border-brand bg-red-50 text-brand shadow-sm'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <span aria-hidden="true">{CURRENCY_META[code].symbol}</span> {code}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div className="mt-6">
              <label htmlFor="calc-amount" className="text-sm font-bold text-navy">
                Loan amount
              </label>
              <div className="mt-2 flex items-center rounded-lg border border-slate-300 bg-white focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20">
                <span className="pl-4 text-slate-500" aria-hidden="true">
                  {CURRENCY_META[currency].symbol}
                </span>
                <input
                  id="calc-amount"
                  type="number"
                  inputMode="numeric"
                  min={min}
                  max={max}
                  step={1000}
                  value={amount}
                  onChange={(event) => onAmountChange(Number(event.target.value))}
                  className="w-full rounded-lg bg-transparent px-3 py-3 text-lg font-semibold text-navy outline-none"
                />
              </div>
              <input
                type="range"
                aria-label="Loan amount slider"
                min={min}
                max={max}
                step={50000}
                value={Math.min(Math.max(Number(amount) || min, min), max)}
                onChange={(event) => onAmountChange(Number(event.target.value))}
                className="mt-4 h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-brand"
              />
              <div className="mt-2 flex justify-between text-xs text-slate-500">
                <span>{formatMoney(min, currency)}</span>
                <span>{formatMoney(max, currency)}</span>
              </div>
            </div>

            <div className="mt-6">
              <label htmlFor="calc-term" className="text-sm font-bold text-navy">
                Term
              </label>
              <select
                id="calc-term"
                value={term}
                onChange={(event) => onTermChange(Number(event.target.value))}
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm font-semibold text-navy focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              >
                {TERMS.map((months) => (
                  <option key={months} value={months}>
                    {months} months
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs leading-relaxed text-slate-600">
              <p className="flex items-center gap-1.5 font-semibold text-slate-700">
                <Info className="h-3.5 w-3.5" aria-hidden="true" />
                How this is calculated
              </p>
              <p className="mt-2 font-mono text-[11px] text-slate-700">
                M = P × r(1+r)^n ÷ ((1+r)^n − 1)
              </p>
              <p className="mt-2">
                P is the amount, r is {rate}% per month (configurable) and n is {term} months. The
                estimate excludes fees and is not an offer of credit.
              </p>
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-2xl bg-navy p-6 text-white shadow-xl sm:p-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Estimated monthly instalment
              </p>
              <p className="mt-2 text-4xl font-extrabold tracking-tight text-emerald-400 sm:text-5xl">
                {formatMoney(monthly, currency, { decimals: 2 })}
              </p>

              <dl className="mt-8 space-y-3 border-t border-white/10 pt-6 text-sm">
                <div className="flex items-baseline justify-between">
                  <dt className="text-slate-300">Total repayable</dt>
                  <dd className="font-semibold">{formatMoney(total, currency)}</dd>
                </div>
                <div className="flex items-baseline justify-between">
                  <dt className="text-slate-300">Total interest</dt>
                  <dd className="font-semibold">{formatMoney(interest, currency)}</dd>
                </div>
                <div className="flex items-baseline justify-between">
                  <dt className="text-slate-300">Term</dt>
                  <dd className="font-semibold">{term} months</dd>
                </div>
                <div className="flex items-baseline justify-between">
                  <dt className="text-slate-300">Rate used</dt>
                  <dd className="font-semibold">{rate}% per month</dd>
                </div>
              </dl>
            </div>

            <button
              type="button"
              onClick={onApply}
              className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-6 py-3.5 text-sm font-bold text-white shadow-lg transition hover:bg-brand-dark active:scale-95"
            >
              Apply with these figures
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
