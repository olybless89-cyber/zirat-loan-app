export const FOLDER_LABELS = {
  inbox: 'Inbox',
  sent: 'Sent',
  archive: 'Archive',
  spam: 'Spam',
  trash: 'Trash',
};

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Inbound mail is attacker-controlled. It renders inside a sandboxed iframe with
// scripts disabled, so a hostile message cannot reach the console session.
export function emailDoc(email) {
  const body = email.html || `<pre style="white-space:pre-wrap;font:inherit">${escapeHtml(email.text)}</pre>`;
  return `<!doctype html>
<html><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https: data:; style-src 'unsafe-inline'; font-src data:;">
<base target="_blank">
</head>
<body style="margin:0;padding:16px;font:14px/1.55 system-ui,-apple-system,'Segoe UI',sans-serif;color:#1f2937;overflow-wrap:anywhere">${body}</body></html>`;
}

export function formatMailDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) {
    return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }
  const sameYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}

export function displaySender(from) {
  const value = String(from || '').trim();
  const match = value.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  if (match) {
    const name = match[1].trim();
    return { name: name || match[2], address: match[2] };
  }
  return { name: value, address: value };
}
