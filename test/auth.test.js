import assert from 'node:assert/strict';

process.env.ADMIN_EMAIL = 'staff@example.test';
process.env.ADMIN_PASSWORD = 'correct horse battery staple';
delete process.env.DATABASE_URL;

const {
  checkAdminCredentials,
  ensureBootstrapAdmin,
  hashPassword,
  hashToken,
  parseCookies,
  verifyPassword,
} = await import('../lib/auth.js');
const {
  ACTIVE_STATUSES,
  applicationStats,
  createApplication,
  createSession,
  deleteSession,
  findApplicationByReference,
  findApplicationByReferenceAndPhone,
  createAdminUser,
  deleteAdminUser,
  findSession,
  initStore,
  listAdminUsers,
  listApplications,
  loadSettings,
  saveSettings,
  updateAdminUser,
  listEvents,
  updateApplicationDetails,
  updateApplicationStatus,
} = await import('../lib/store.js');
const { validateTerm } = await import('../lib/validation.js');

// ---------- password hashing ----------
const hash = hashPassword('s3cret-passphrase');
assert.equal(hash.startsWith('scrypt$'), true);
assert.notEqual(hash, hashPassword('s3cret-passphrase'), 'each hash uses a fresh salt');
assert.equal(verifyPassword('s3cret-passphrase', hash), true);
assert.equal(verifyPassword('wrong', hash), false);
assert.equal(verifyPassword('anything', 'not-a-hash'), false);
assert.equal(verifyPassword('anything', null), false);

// ---------- cookies and tokens ----------
assert.deepEqual(parseCookies('a=1; b=hello%20world'), { a: '1', b: 'hello world' });
assert.deepEqual(parseCookies(''), {});
assert.equal(hashToken('abc').length, 64);
assert.notEqual(hashToken('abc'), hashToken('abd'));

// ---------- term validation ----------
assert.equal(validateTerm(36), null);
assert.equal(validateTerm(6), null);
assert.equal(validateTerm(84), null);
assert.ok(validateTerm(5));
assert.ok(validateTerm(85));
assert.ok(validateTerm(12.5));
assert.ok(validateTerm('abc'));

// ---------- in-memory store ----------
assert.equal(await initStore(), false, 'no DATABASE_URL means memory storage');

// ---------- staff accounts ----------
const bootstrap = await ensureBootstrapAdmin();
assert.equal(bootstrap.created, true, 'the first boot seeds the env admin');
assert.equal(bootstrap.email, 'staff@example.test');
assert.equal((await ensureBootstrapAdmin()).created, false, 'seeding is idempotent');

const owner = await checkAdminCredentials('staff@example.test', 'correct horse battery staple');
assert.equal(owner.email, 'staff@example.test');
assert.equal(owner.role, 'owner');
assert.equal(
  (await checkAdminCredentials('STAFF@example.test', 'correct horse battery staple')).email,
  'staff@example.test',
  'email matching ignores case',
);
assert.equal(await checkAdminCredentials('staff@example.test', 'nope'), null);
assert.equal(await checkAdminCredentials('someone@example.test', 'correct horse battery staple'), null);

const reviewer = await createAdminUser({
  email: 'Reviewer@Example.test',
  passwordHash: hashPassword('reviewer-passphrase'),
  role: 'admin',
});
assert.equal(reviewer.email, 'reviewer@example.test');
assert.equal(reviewer.role, 'admin');
assert.equal((await listAdminUsers()).length, 2);
assert.equal((await checkAdminCredentials('reviewer@example.test', 'reviewer-passphrase')).role, 'admin');

await assert.rejects(
  () => createAdminUser({ email: 'reviewer@example.test', passwordHash: hashPassword('x-123456789') }),
  /already exists/,
);

await updateAdminUser(reviewer.id, { active: false });
assert.equal(
  await checkAdminCredentials('reviewer@example.test', 'reviewer-passphrase'),
  null,
  'disabled accounts cannot sign in',
);
await updateAdminUser(reviewer.id, { active: true, passwordHash: hashPassword('rotated-passphrase') });
assert.equal(await checkAdminCredentials('reviewer@example.test', 'reviewer-passphrase'), null);
assert.ok(await checkAdminCredentials('reviewer@example.test', 'rotated-passphrase'));

assert.equal(await deleteAdminUser(reviewer.id), true);
assert.equal(await deleteAdminUser(reviewer.id), false);
assert.equal((await listAdminUsers()).length, 1);

// The env credentials stay usable even after the stored password changes,
// so a redeploy can never lock the operator out of the console.
await updateAdminUser(owner.id, { passwordHash: hashPassword('changed-in-console') });
assert.ok(await checkAdminCredentials('staff@example.test', 'changed-in-console'));
assert.equal(
  (await checkAdminCredentials('staff@example.test', 'correct horse battery staple')).role,
  'owner',
);

// Renaming the sign-in email keeps the password and rejects duplicates.
const renamed = await updateAdminUser(owner.id, { email: 'OWNER@Example.Test' });
assert.equal(renamed.email, 'owner@example.test', 'the store normalises the address');
assert.ok(await checkAdminCredentials('owner@example.test', 'changed-in-console'));
assert.equal(
  (await checkAdminCredentials('owner@example.test', 'correct horse battery staple')).role,
  'owner',
  'the env password follows the owner after a rename',
);
const ownersBefore = (await listAdminUsers()).length;
const viaStaleEnvEmail = await checkAdminCredentials('staff@example.test', 'correct horse battery staple');
assert.equal(viaStaleEnvEmail.email, 'owner@example.test', 'the stale env email resolves to the owner');
assert.equal((await listAdminUsers()).length, ownersBefore, 'and does not seed a second owner');
const tempStaff = await createAdminUser({
  email: 'taken@example.test',
  passwordHash: hashPassword('another-passphrase'),
  role: 'admin',
});
await assert.rejects(
  () => updateAdminUser(owner.id, { email: 'taken@example.test' }),
  (error) => error.code === 'EMAIL_TAKEN',
);
await deleteAdminUser(tempStaff.id);
await updateAdminUser(owner.id, { email: 'staff@example.test' });

// Deleting the owner row lets the env credentials recreate it on the next sign-in.
await deleteAdminUser(owner.id);
assert.equal((await listAdminUsers()).length, 0);
const recovered = await checkAdminCredentials('staff@example.test', 'correct horse battery staple');
assert.equal(recovered.role, 'owner');
assert.equal((await listAdminUsers()).length, 1);

// ---------- site settings ----------
assert.equal(await loadSettings(), null, 'no stored settings until an owner saves them');
const savedSettings = await saveSettings({ monthlyRate: 3.25, acceptingApplications: false });
assert.equal(savedSettings.data.monthlyRate, 3.25);
assert.equal((await loadSettings()).data.acceptingApplications, false);
const replaced = await saveSettings({ monthlyRate: 2.5, acceptingApplications: true });
assert.equal(replaced.data.monthlyRate, 2.5, 'a second save replaces the first');
assert.deepEqual(ACTIVE_STATUSES, ['received', 'under_review']);

const first = await createApplication({
  fullName: 'Ayşe Yılmaz',
  phone: '+90 532 123 4567',
  nationalIdLast4: '0146',
  amount: 2500000,
  currency: 'TRY',
  termMonths: 36,
  consentVersion: 'test-v1',
});

assert.match(first.reference, /^ZIR-\d{8}-[0-9A-F]{6}$/);
assert.equal(first.phone, '+905321234567', 'phone is normalised');
assert.equal(first.status, 'received');
assert.equal(first.termMonths, 36);

const second = await createApplication({
  fullName: 'Emre Kaya',
  phone: '+44 7700 900123',
  nationalIdLast4: '9876',
  amount: 120000,
  currency: 'GBP',
  termMonths: 24,
  consentVersion: 'test-v1',
});

assert.equal((await findApplicationByReference(first.reference)).fullName, 'Ayşe Yılmaz');
assert.equal(
  (await findApplicationByReferenceAndPhone(first.reference.toLowerCase(), '0 532 123 4567')).reference,
  first.reference,
);
assert.equal(await findApplicationByReferenceAndPhone(first.reference, '0 532 000 0000'), null);
assert.equal(await findApplicationByReference('ZIR-NOPE'), null);

const pageOne = await listApplications({ page: 1, pageSize: 1 });
assert.equal(pageOne.total, 2);
assert.equal(pageOne.pages, 2);
assert.equal(pageOne.items.length, 1);
assert.equal(pageOne.items[0].reference, second.reference, 'newest application first');

const searched = await listApplications({ q: 'Ayşe' });
assert.equal(searched.total, 1);
assert.equal(searched.items[0].reference, first.reference);

const byCurrency = await listApplications({ currency: 'GBP' });
assert.equal(byCurrency.total, 1);

const stats = await applicationStats();
assert.equal(stats.total, 2);
assert.equal(stats.active, 2);
assert.equal(stats.byStatus.received, 2);
assert.equal(stats.valueByCurrency.TRY, 2500000);
assert.equal(stats.valueByCurrency.GBP, 120000);

// ---------- status changes and audit trail ----------
const reviewed = await updateApplicationStatus(first.reference, {
  status: 'under_review',
  note: 'Documents received.',
  actor: 'admin',
  visibility: 'public',
});
assert.equal(reviewed.status, 'under_review');
assert.notEqual(reviewed.updatedAt, undefined);

await updateApplicationStatus(first.reference, {
  status: 'under_review',
  note: 'Internal credit note.',
  actor: 'admin',
  visibility: 'internal',
});

let events = await listEvents(first.reference);
assert.equal(events.length, 3, 'submission + two review events');
assert.equal(events[0].status, 'received');
assert.equal(events[1].note, 'Documents received.');
assert.equal(events[2].visibility, 'internal');

const publicEvents = await listEvents(first.reference, { visibility: 'public' });
assert.equal(publicEvents.length, 2);

assert.equal(await updateApplicationStatus('ZIR-MISSING', { status: 'approved' }), null);
await assert.rejects(() => updateApplicationStatus(first.reference, { status: 'nonsense' }));

// ---------- applicant edits ----------
const edited = await updateApplicationDetails(first.reference, { amount: 3000000, phone: '+90 533 111 2233' });
assert.equal(edited.amount, 3000000);
assert.equal(edited.phone, '+905331112233');

const withdrawn = await updateApplicationStatus(second.reference, {
  status: 'withdrawn',
  actor: 'applicant',
  visibility: 'public',
});
assert.equal(withdrawn.status, 'withdrawn');
const afterWithdraw = await applicationStats();
assert.equal(afterWithdraw.active, 1);
assert.equal(afterWithdraw.valueByCurrency.GBP, undefined, 'withdrawn value excluded');

// ---------- sessions ----------
await createSession({
  tokenHash: 'hash-one',
  role: 'applicant',
  subject: first.reference,
  expiresAt: new Date(Date.now() + 60_000),
  ip: '127.0.0.1',
  userAgent: 'test',
});
const session = await findSession('hash-one');
assert.equal(session.role, 'applicant');
assert.equal(session.subject, first.reference);
assert.equal(await findSession('hash-two'), null);

await deleteSession('hash-one');
assert.equal(await findSession('hash-one'), null);

await createSession({
  tokenHash: 'hash-expired',
  role: 'admin',
  subject: 'admin@example.test',
  expiresAt: new Date(Date.now() - 1000),
});
assert.equal(await findSession('hash-expired'), null, 'expired sessions are rejected and purged');

console.log('auth and store tests passed');
