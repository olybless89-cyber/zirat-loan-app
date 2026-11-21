import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, MapPin, Star } from 'lucide-react';
import { TESTIMONIALS } from '../data/testimonials';

export default function Testimonials() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const total = TESTIMONIALS.length;

  useEffect(() => {
    if (paused) return undefined;
    const timer = setInterval(() => setIndex((current) => (current + 1) % total), 5000);
    return () => clearInterval(timer);
  }, [paused, total]);

  const move = (delta) => setIndex((current) => (current + delta + total) % total);
  const active = TESTIMONIALS[index];

  return (
    <section id="reviews-section" className="scroll-mt-24 bg-mist py-16 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-widest text-brand">Testimonials</p>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-navy sm:text-3xl">
              What applicants say about the process
            </h2>
            <p className="mt-3 text-sm text-slate-600">
              Sample reviews written for this demonstration. They describe the experience of using
              the form, not credit outcomes.
            </p>
          </div>
          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-700">
            Illustrative content
          </span>
        </div>

        <div
          className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
        >
          <div aria-live="polite" className="min-h-[13rem]">
            <div className="flex gap-0.5" aria-label={`${active.stars} out of 5 stars`}>
              {Array.from({ length: 5 }).map((_, starIndex) => (
                <Star
                  key={starIndex}
                  className={`h-4 w-4 ${starIndex < active.stars ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`}
                  aria-hidden="true"
                />
              ))}
            </div>

            <blockquote className="mt-4 text-lg font-medium leading-relaxed text-slate-800">
              “{active.comment}”
            </blockquote>

            <figcaption className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <span className="font-bold text-navy">{active.fullName}</span>
              <span className="flex items-center gap-1 text-slate-500">
                <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                {active.city}
              </span>
              <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                {active.amount}
              </span>
              <span className="text-xs text-slate-400">{active.date}</span>
            </figcaption>
          </div>

          <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-5">
            <div className="flex gap-1.5" role="tablist" aria-label="Choose a testimonial">
              {TESTIMONIALS.map((item, dotIndex) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={dotIndex === index}
                  aria-label={`Testimonial ${dotIndex + 1} of ${total}`}
                  onClick={() => setIndex(dotIndex)}
                  className={`h-2 rounded-full transition-all ${
                    dotIndex === index ? 'w-6 bg-brand' : 'w-2 bg-slate-300 hover:bg-slate-400'
                  }`}
                />
              ))}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => move(-1)}
                aria-label="Previous testimonial"
                className="rounded-full border border-slate-300 p-2 text-slate-600 transition hover:border-brand hover:text-brand"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => move(1)}
                aria-label="Next testimonial"
                className="rounded-full border border-slate-300 p-2 text-slate-600 transition hover:border-brand hover:text-brand"
              >
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
