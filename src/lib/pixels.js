// Pixels load only when their IDs are configured. No personal data is ever
// attached to these events; see lib/analytics.js.
function injectScript(src) {
  const script = document.createElement('script');
  script.async = true;
  script.src = src;
  document.head.appendChild(script);
}

export function initAnalytics() {
  const pixelId = import.meta.env.VITE_FB_PIXEL_ID;
  const gaId = import.meta.env.VITE_GA_ID;

  if (pixelId && !window.fbq) {
    window.fbq = function fbq(...args) {
      window.fbq.queue.push(args);
    };
    window.fbq.queue = [];
    window._fbq = window.fbq;
    injectScript('https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('init', pixelId);
  }

  if (gaId && !window.gtag) {
    injectScript(`https://www.googletagmanager.com/gtag/js?id=${gaId}`);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag(...args) {
      window.dataLayer.push(args);
    };
    window.gtag('js', new Date());
    window.gtag('config', gaId, { send_page_view: true });
  }
}
