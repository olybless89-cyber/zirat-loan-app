import { useEffect, useState } from 'react';
import { CONTACT } from '../config/site.js';

const DEFAULT_TEXT = 'Hello Zirat Bank, I would like to ask about a loan.';

export function waHref(number, text = DEFAULT_TEXT) {
  const digits = String(number ?? '').replace(/\D/g, '');
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

let cachedContact;
let pending;

function loadContact() {
  if (!pending) {
    pending = Promise.resolve()
      .then(() => fetch('/api/config'))
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => (cachedContact = data?.contact ?? null))
      .catch(() => (cachedContact = null));
  }
  return pending;
}

// The branch number lives in site settings, so a floating button mounted outside
// the landing page still follows whatever the console has saved.
export function useSiteContact() {
  const [contact, setContact] = useState(() => cachedContact ?? null);

  useEffect(() => {
    if (cachedContact) return undefined;
    let alive = true;
    loadContact().then((value) => {
      if (alive) setContact(value);
    });
    return () => {
      alive = false;
    };
  }, []);

  return { ...CONTACT, ...(contact ?? {}) };
}
