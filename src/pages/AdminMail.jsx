import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Archive,
  ArrowLeft,
  Ban,
  CheckCircle2,
  Inbox,
  Loader2,
  Mail,
  Paperclip,
  PenLine,
  RefreshCw,
  Search,
  Send,
  Trash2,
} from 'lucide-react';
import AdminNav from '../components/admin/AdminNav.jsx';
import DashboardShell from '../components/dashboard/DashboardShell.jsx';
import { api } from '../lib/api.js';
import { FOLDER_LABELS, displaySender, emailDoc, formatMailDate } from '../lib/mail.js';
import { useAuth } from '../lib/session.jsx';

const FOLDERS = [
  { key: 'inbox', icon: Inbox },
  { key: 'sent', icon: Send },
  { key: 'archive', icon: Archive },
  { key: 'spam', icon: Ban },
  { key: 'trash', icon: Trash2 },
];

const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-navy placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20';

function SetupCard({ missing }) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
      <h2 className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-widest text-amber-900">
        <AlertCircle className="h-4 w-4" aria-hidden="true" />
        Email is not connected yet
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-amber-900/90">
        The console is ready, but this service has no Resend credentials, so nothing can be sent or
        received. Add these environment variables on the Render service and redeploy:
      </p>
      <ul className="mt-3 space-y-1 font-mono text-xs text-amber-950">
        {(missing || ['RESEND_API_KEY', 'MAIL_INBOX']).map((key) => (
          <li key={key} className="rounded bg-white/70 px-2 py-1">
            {key}
          </li>
        ))}
        <li className="rounded bg-white/70 px-2 py-1">MAIL_FROM_NAME (optional)</li>
      </ul>
      <ol className="mt-4 space-y-1.5 text-sm text-amber-900/90">
        <li>1. Verify ziratbank.loan in Resend so it can send.</li>
        <li>2. Enable receiving for the domain and add the MX record Resend shows to Cloudflare.</li>
        <li>3. Create an inbox, for example admin@ziratbank.loan.</li>
        <li>4. Paste the API key into RESEND_API_KEY and the address into MAIL_INBOX.</li>
      </ol>
    </div>
  );
}

function ThreadRow({ thread, active, onOpen }) {
  const sender = displaySender(thread.from);
  return (
    <button
      type="button"
      onClick={() => onOpen(thread.id)}
      aria-current={active ? 'true' : undefined}
      className={`w-full border-b border-slate-100 px-3 py-3 text-left transition ${
        active ? 'bg-navy/5' : 'hover:bg-slate-50'
      }`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span
          className={`truncate text-xs ${
            thread.read ? 'font-semibold text-slate-600' : 'font-extrabold text-navy'
          }`}
        >
          {sender.name}
        </span>
        <span className="shrink-0 text-[11px] text-slate-400">{formatMailDate(thread.lastActiveAt)}</span>
      </div>
      <p className={`mt-0.5 truncate text-sm ${thread.read ? 'text-slate-600' : 'font-bold text-navy'}`}>
        {thread.subject}
      </p>
      <p className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-400">
        {thread.emailCount > 1 && <span>{thread.emailCount} messages</span>}
        {thread.hasAttachment && (
          <span className="inline-flex items-center gap-1">
            <Paperclip className="h-3 w-3" aria-hidden="true" /> attachment
          </span>
        )}
        {!thread.read && <span className="font-bold text-brand">Unread</span>}
      </p>
    </button>
  );
}

function MessageCard({ email }) {
  const sender = displaySender(email.from);
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-100 pb-2">
        <div>
          <p className="text-sm font-bold text-navy">{sender.name}</p>
          <p className="text-[11px] text-slate-500">
            {sender.address}
            {email.to?.length ? ` → ${email.to.join(', ')}` : ''}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-slate-400">{formatMailDate(email.at)}</p>
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
            {email.direction === 'outbound' ? 'Sent' : 'Received'}
          </p>
        </div>
      </header>
      <iframe
        title={`Message from ${sender.address}`}
        srcDoc={emailDoc(email)}
        sandbox="allow-popups allow-popups-to-escape-sandbox"
        referrerPolicy="no-referrer"
        className="mt-3 h-72 w-full rounded-lg border border-slate-100 bg-white"
      />
      {email.attachments?.length > 0 && (
        <ul className="mt-2 space-y-1 text-xs text-slate-600">
          {email.attachments.map((file) => (
            <li key={file.id} className="inline-flex items-center gap-1.5 rounded bg-slate-50 px-2 py-1">
              <Paperclip className="h-3 w-3" aria-hidden="true" />
              {file.filename}
              {file.size ? <span className="text-slate-400">({Math.ceil(file.size / 1024)} kB)</span> : null}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

export default function AdminMail() {
  const { subject: account } = useAuth();
  const [status, setStatus] = useState(null);
  const [folder, setFolder] = useState('inbox');
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [threads, setThreads] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [openId, setOpenId] = useState(null);
  const [openThread, setOpenThread] = useState(null);
  const [threadLoading, setThreadLoading] = useState(false);
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [composing, setComposing] = useState(false);
  const [compose, setCompose] = useState({ to: '', subject: '', text: '' });
  const [composeErrors, setComposeErrors] = useState({});

  useEffect(() => {
    api('/api/admin/mail/status')
      .then(setStatus)
      .catch((err) => {
        setStatus({ configured: false, missing: [] });
        setError(err.message);
      });
  }, []);

  const loadThreads = useCallback(async () => {
    if (status?.configured === false) return;
    setListLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ folder });
      if (appliedSearch) params.set('q', appliedSearch);
      const data = await api(`/api/admin/mail/threads?${params}`);
      setThreads(data.threads);
    } catch (err) {
      setError(err.message);
      setThreads([]);
    } finally {
      setListLoading(false);
    }
  }, [folder, appliedSearch, status]);

  useEffect(() => {
    if (status?.configured) loadThreads();
  }, [status, loadThreads]);

  const openThreadById = useCallback(
    async (id) => {
      setOpenId(id);
      setThreadLoading(true);
      setError('');
      setNotice('');
      try {
        const data = await api(`/api/admin/mail/threads/${id}`);
        setOpenThread(data);
        setThreads((current) =>
          current.map((thread) => (thread.id === id ? { ...thread, read: true } : thread)),
        );
        if (!data.thread.read) {
          api(`/api/admin/mail/threads/${id}/read`, { method: 'POST', body: { read: true } }).catch(() => {});
        }
      } catch (err) {
        setError(err.message);
        setOpenThread(null);
      } finally {
        setThreadLoading(false);
      }
    },
    [],
  );

  async function sendReply(event) {
    event.preventDefault();
    if (!reply.trim()) return;
    setBusy(true);
    setError('');
    try {
      await api(`/api/admin/mail/threads/${openId}/reply`, { method: 'POST', body: { text: reply } });
      setReply('');
      setNotice('Reply sent.');
      await openThreadById(openId);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function sendNew(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setComposeErrors({});
    try {
      await api('/api/admin/mail/send', { method: 'POST', body: compose });
      setCompose({ to: '', subject: '', text: '' });
      setComposing(false);
      setNotice('Message sent.');
      setFolder('sent');
    } catch (err) {
      setComposeErrors(err.errors || {});
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function moveThread(target) {
    if (!openId) return;
    setBusy(true);
    setError('');
    try {
      await api(`/api/admin/mail/threads/${openId}/folder`, { method: 'POST', body: { folder: target } });
      setNotice(`Moved to ${FOLDER_LABELS[target]}.`);
      setOpenId(null);
      setOpenThread(null);
      await loadThreads();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const unread = useMemo(() => threads.filter((thread) => !thread.read).length, [threads]);

  return (
    <DashboardShell
      role="admin"
      subject={account}
      eyebrow="Staff console"
      title="Mail"
      description={
        status?.inbox
          ? `Send and receive as ${status.inbox}. Replies land in this inbox and are threaded automatically.`
          : 'Send and receive branch email without leaving the console.'
      }
      actions={<AdminNav />}
    >
      <div className="space-y-4">
        {error && (
          <p role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {notice}
          </p>
        )}

        {status === null && (
          <p className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Checking the mail connection…
          </p>
        )}

        {status && !status.configured && <SetupCard missing={status.missing} />}

        {status?.configured && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm">
                {FOLDERS.map(({ key, icon: Icon }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setFolder(key);
                      setOpenId(null);
                      setOpenThread(null);
                      setAppliedSearch('');
                      setSearch('');
                    }}
                    aria-pressed={folder === key}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                      folder === key ? 'bg-navy text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-navy'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    {FOLDER_LABELS[key]}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setComposing((value) => !value);
                    setComposeErrors({});
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-xs font-bold text-white transition hover:bg-brand-dark"
                >
                  <PenLine className="h-3.5 w-3.5" aria-hidden="true" />
                  New message
                </button>
                <button
                  type="button"
                  onClick={loadThreads}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:text-navy"
                >
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                  Refresh
                </button>
              </div>
            </div>

            {composing && (
              <form onSubmit={sendNew} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    To
                    <input
                      className={`mt-1 ${inputClass}`}
                      value={compose.to}
                      onChange={(event) => setCompose({ ...compose, to: event.target.value })}
                      placeholder="customer@example.com"
                      autoComplete="off"
                    />
                    {composeErrors.to && <span className="mt-1 block text-[11px] font-semibold text-red-600">{composeErrors.to}</span>}
                  </label>
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Subject
                    <input
                      className={`mt-1 ${inputClass}`}
                      value={compose.subject}
                      onChange={(event) => setCompose({ ...compose, subject: event.target.value })}
                      placeholder="Your application"
                    />
                    {composeErrors.subject && (
                      <span className="mt-1 block text-[11px] font-semibold text-red-600">{composeErrors.subject}</span>
                    )}
                  </label>
                </div>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">
                  Message
                  <textarea
                    className={`mt-1 min-h-[140px] ${inputClass}`}
                    value={compose.text}
                    onChange={(event) => setCompose({ ...compose, text: event.target.value })}
                    placeholder="Write your message. Blank lines become paragraphs."
                  />
                  {composeErrors.text && (
                    <span className="mt-1 block text-[11px] font-semibold text-red-600">{composeErrors.text}</span>
                  )}
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={busy}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-navy px-4 py-2 text-xs font-bold text-white transition hover:bg-navy/90 disabled:opacity-60"
                  >
                    {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Send className="h-3.5 w-3.5" aria-hidden="true" />}
                    Send
                  </button>
                  <button
                    type="button"
                    onClick={() => setComposing(false)}
                    className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            <div className="grid gap-4 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
              <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    setAppliedSearch(search.trim());
                  }}
                  className="flex items-center gap-2 border-b border-slate-100 p-2"
                >
                  <label className="flex flex-1 items-center gap-2 rounded-lg bg-slate-50 px-2 py-1.5">
                    <Search className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                    <span className="sr-only">Search mail</span>
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search mail"
                      className="w-full bg-transparent text-xs text-navy placeholder:text-slate-400 focus:outline-none"
                    />
                  </label>
                </form>

                <p className="flex items-center justify-between px-3 py-2 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                  <span>{appliedSearch ? `Results for “${appliedSearch}”` : FOLDER_LABELS[folder]}</span>
                  <span>{unread ? `${unread} unread` : `${threads.length} threads`}</span>
                </p>

                {listLoading ? (
                  <p className="flex items-center gap-2 px-3 py-6 text-sm text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Loading…
                  </p>
                ) : threads.length === 0 ? (
                  <p className="px-3 py-8 text-center text-sm text-slate-500">
                    {appliedSearch ? 'No messages match that search.' : `Nothing in ${FOLDER_LABELS[folder].toLowerCase()}.`}
                  </p>
                ) : (
                  <div className="max-h-[32rem] overflow-y-auto">
                    {threads.map((thread) => (
                      <ThreadRow
                        key={thread.id}
                        thread={thread}
                        active={thread.id === openId}
                        onOpen={openThreadById}
                      />
                    ))}
                  </div>
                )}
              </section>

              <section className="space-y-3">
                {threadLoading && (
                  <p className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Opening the conversation…
                  </p>
                )}

                {!threadLoading && !openThread && (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
                    <Mail className="mx-auto h-6 w-6 text-slate-300" aria-hidden="true" />
                    <p className="mt-2 text-sm font-semibold text-slate-500">Pick a conversation to read it here.</p>
                  </div>
                )}

                {!threadLoading && openThread && (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h2 className="text-base font-extrabold tracking-tight text-navy">{openThread.thread.subject}</h2>
                        <p className="text-[11px] text-slate-500">
                          {openThread.emails.length} message{openThread.emails.length === 1 ? '' : 's'} ·{' '}
                          {FOLDER_LABELS[openThread.thread.folder] || openThread.thread.folder}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          onClick={() => moveThread('archive')}
                          disabled={busy}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:text-navy disabled:opacity-60"
                        >
                          <Archive className="h-3.5 w-3.5" aria-hidden="true" /> Archive
                        </button>
                        <button
                          type="button"
                          onClick={() => moveThread('spam')}
                          disabled={busy}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:text-navy disabled:opacity-60"
                        >
                          <Ban className="h-3.5 w-3.5" aria-hidden="true" /> Spam
                        </button>
                        <button
                          type="button"
                          onClick={() => moveThread('trash')}
                          disabled={busy}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:text-navy disabled:opacity-60"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Trash
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {openThread.emails.map((email) => (
                        <MessageCard key={email.id} email={email} />
                      ))}
                    </div>

                    <form onSubmit={sendReply} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                      <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">
                        Reply
                        <textarea
                          value={reply}
                          onChange={(event) => setReply(event.target.value)}
                          placeholder="Write your reply…"
                          className={`mt-1 min-h-[110px] ${inputClass}`}
                        />
                      </label>
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          type="submit"
                          disabled={busy || !reply.trim()}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-xs font-bold text-white transition hover:bg-brand-dark disabled:opacity-60"
                        >
                          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Send className="h-3.5 w-3.5" aria-hidden="true" />}
                          Send reply
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setOpenId(null);
                            setOpenThread(null);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600"
                        >
                          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Back to list
                        </button>
                      </div>
                    </form>
                  </>
                )}
              </section>
            </div>
          </>
        )}
      </div>
    </DashboardShell>
  );
}
