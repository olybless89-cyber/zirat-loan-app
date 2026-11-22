import Modal from './Modal.jsx';
import { BRAND, CONTACT } from '../config/site';

const UPDATED = 'November 2026';

const DOCS = {
  privacy: {
    title: 'Privacy Notice',
    intro:
      'This notice explains what this application collects, why, and what happens to it.',
    sections: [
      {
        heading: 'Who is responsible',
        body: `${BRAND.name} operates this pre-approval service. It is not authorised to provide credit and does not share data with any lender.`,
      },
      {
        heading: 'What we collect',
        body: 'Your name, mobile number, national ID, requested amount, currency and the consent flag. Only the last four digits of the national ID are written to storage; the full value is used for checksum validation and then discarded.',
      },
      {
        heading: 'Why we collect it',
        body: 'To record your pre-approval request and return a reference number you can quote. Nothing is used for marketing, profiling or automated decision-making.',
      },
      {
        heading: 'What we do not do',
        body: 'No credit bureau or third-party identity service is contacted. No personal data is sent to analytics or advertising pixels. Data is never sold.',
      },
      {
        heading: 'Retention',
        body: 'Without a configured database, submissions live in memory and are lost on restart. With a database, records are kept until they are deleted; you can request deletion at any time.',
      },
      {
        heading: 'Your rights',
        body: 'You can ask for a copy of your record, correct it, have it erased, restrict or object to processing, and request portability. Contact the branch using the details in the contact dialog.',
      },
    ],
  },
  kvkk: {
    title: 'KVKK information (Türkiye)',
    intro:
      'Information under the Turkish Personal Data Protection Law No. 6698 (KVKK) for applicants submitting details from Türkiye.',
    sections: [
      {
        heading: 'Data controller',
        body: `The data controller for this service is ${BRAND.name}. No transfer to a third-party lender takes place.`,
      },
      {
        heading: 'Purpose and legal basis',
        body: 'Data is processed to handle your pre-approval request, on the basis of your explicit consent (KVKK Art. 5/1). Consent is recorded with the notice version and a timestamp.',
      },
      {
        heading: 'Data minimisation',
        body: 'Only the fields required to assess a request are collected. The national ID is validated and reduced to its last four digits before storage.',
      },
      {
        heading: 'Transfers',
        body: 'No data is transferred to third parties, abroad or to a credit bureau.',
      },
      {
        heading: 'Your rights under Art. 11',
        body: 'You may learn whether your data is processed, request information about it, learn the purpose, request correction or deletion, and object to processing. Requests are answered through the contact channel listed in the contact dialog.',
      },
    ],
  },
  gdpr: {
    title: 'UK GDPR information',
    intro:
      'Information for applicants submitting details from the United Kingdom, under the UK GDPR and the Data Protection Act 2018.',
    sections: [
      {
        heading: 'Controller and lawful basis',
        body: `${BRAND.name} acts as controller for this service. Processing relies on your consent (Art. 6(1)(a) UK GDPR), recorded with the notice version and a timestamp.`,
      },
      {
        heading: 'Data minimisation and storage',
        body: 'Only the fields needed to assess a request are collected. The full national ID is not stored — only the last four digits.',
      },
      {
        heading: 'Your rights',
        body: 'You have the right to be informed, to access, to rectification, to erasure, to restrict processing, to data portability, and to object. You may withdraw consent at any time.',
      },
      {
        heading: 'Complaints',
        body: 'If you are unhappy with how data is handled you can complain to the Information Commissioner’s Office (ICO) at ico.org.uk, or to the controller first through the contact dialog.',
      },
      {
        heading: 'International transfers',
        body: 'No data leaves the deployment environment and no third-country transfer takes place.',
      },
    ],
  },
};

export default function LegalModal({ kind, onClose }) {
  const doc = kind ? DOCS[kind] : null;

  return (
    <Modal open={Boolean(doc)} title={doc?.title ?? ''} onClose={onClose} size="lg">
      {doc && (
        <div className="space-y-5">
          <p className="text-sm text-slate-600">{doc.intro}</p>
          {doc.sections.map((section) => (
            <section key={section.heading}>
              <h3 className="text-sm font-bold text-navy">{section.heading}</h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">{section.body}</p>
            </section>
          ))}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
            Last updated {UPDATED}. Questions: {CONTACT.email}.
          </div>
        </div>
      )}
    </Modal>
  );
}
