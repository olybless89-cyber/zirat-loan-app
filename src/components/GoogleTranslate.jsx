import { useEffect } from 'react';
import { Languages } from 'lucide-react';

const INCLUDED_LANGUAGES = 'en,tr,ar,fr,de,es,it,ru,ur,zh-CN';
const SCRIPT_ID = 'google-translate-script';
const BANNER_SELECTOR = [
  'body > div.skiptranslate',
  'iframe.skiptranslate:not(.goog-te-menu-frame)',
  '.goog-te-banner-frame',
  '#gt-nvframe',
].join(',');

function initialiseWidget() {
  const translate = window.google?.translate;
  const container = document.getElementById('google_translate_element');
  if (!translate?.TranslateElement || !container || container.dataset.ready === 'true') return;

  container.dataset.ready = 'true';
  new translate.TranslateElement(
    {
      pageLanguage: 'en',
      includedLanguages: INCLUDED_LANGUAGES,
      autoDisplay: false,
    },
    'google_translate_element',
  );
}

// Google injects a full-width banner above the page when a language is active.
// Hide it and remove the body offset so the sticky header keeps its position.
function hideBanner() {
  document.querySelectorAll(BANNER_SELECTOR).forEach((element) => {
    element.style.setProperty('display', 'none', 'important');
    element.style.setProperty('visibility', 'hidden', 'important');
    element.style.setProperty('height', '0', 'important');
  });
  document.body?.style.setProperty('top', '0px', 'important');
}

export default function GoogleTranslate({ className = '' }) {
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    window.googleTranslateElementInit = initialiseWidget;

    if (!document.getElementById(SCRIPT_ID)) {
      const script = document.createElement('script');
      script.id = SCRIPT_ID;
      script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
      script.async = true;
      document.body.appendChild(script);
    } else if (window.google?.translate?.TranslateElement) {
      initialiseWidget();
    }

    hideBanner();
    const observer = new MutationObserver(hideBanner);
    observer.observe(document.body, { childList: true, subtree: true });
    const interval = window.setInterval(hideBanner, 300);

    return () => {
      observer.disconnect();
      window.clearInterval(interval);
    };
  }, []);

  return (
    <div className={`google-translate notranslate flex items-center gap-1.5 ${className}`} translate="no">
      <Languages className="hidden h-4 w-4 shrink-0 text-slate-500 sm:block" aria-hidden="true" />
      <span className="sr-only">Translate this page</span>
      <div id="google_translate_element" />
    </div>
  );
}
