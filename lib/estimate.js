import { monthlyInstalment } from './validation.js';

export function buildEstimate(application, monthlyRate) {
  if (!application) return null;
  const monthly = monthlyInstalment(application.amount, monthlyRate, application.termMonths);
  if (monthly === null) return null;
  const total = monthly * application.termMonths;
  return {
    monthlyRate,
    termMonths: application.termMonths,
    monthly,
    total,
    interest: Math.max(total - application.amount, 0),
  };
}
