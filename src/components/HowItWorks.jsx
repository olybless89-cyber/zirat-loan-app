import { ClipboardList, FileCheck2, Search, ThumbsUp } from 'lucide-react';

const STEPS = [
  {
    icon: ClipboardList,
    title: 'Complete application',
    text: 'Choose a currency and amount, then add your name, mobile number and national ID.',
  },
  {
    icon: FileCheck2,
    title: 'Submit secure info',
    text: 'Details are validated in the browser and again on the server before anything is stored.',
  },
  {
    icon: Search,
    title: 'Application review',
    text: 'The request is recorded with a unique reference number you can use to follow it in the applicant portal.',
  },
  {
    icon: ThumbsUp,
    title: 'Receive a decision',
    text: 'Branch staff move the request through review and record a decision you can see in the portal.',
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-24 bg-white py-16 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-widest text-brand">How it works</p>
          <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-navy sm:text-3xl">
            Four steps from estimate to decision
          </h2>
          <p className="mt-3 text-sm text-slate-600">
            Each step is designed so you know what happens next and what information is needed.
          </p>
        </div>

        <ol className="relative mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(({ icon: Icon, title, text }, index) => (
            <li
              key={title}
              className="relative rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-brand/30 hover:shadow-md"
            >
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-navy text-sm font-bold text-white">
                  {index + 1}
                </span>
                <Icon className="h-5 w-5 text-brand" aria-hidden="true" />
              </div>
              <h3 className="text-base font-bold text-navy">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
