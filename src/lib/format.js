export const STATUS_META = {
  received: { label: 'Received', tone: 'blue' },
  under_review: { label: 'Under review', tone: 'amber' },
  approved: { label: 'Approved', tone: 'green' },
  declined: { label: 'Declined', tone: 'red' },
  withdrawn: { label: 'Withdrawn', tone: 'slate' },
};

export const STATUS_OPTIONS = Object.entries(STATUS_META).map(([value, meta]) => ({
  value,
  label: meta.label,
}));

export function statusLabel(status) {
  return STATUS_META[status]?.label ?? 'Unknown';
}

export function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
