import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const { databaseSslConfig } = await import('../lib/db-config.js');

// Render gives an internal hostname (no dots, no TLS) and a public one
// (*.render.com, TLS). Picking the wrong side fails the connection.
assert.equal(databaseSslConfig('postgresql://u:p@dpg-abc123-a/zirat'), false, 'render internal');
assert.equal(
  databaseSslConfig('postgresql://u:p@dpg-abc123-a.frankfurt-postgres.render.com/zirat').rejectUnauthorized,
  false,
  'render external keeps TLS without pinning the CA',
);
assert.equal(databaseSslConfig('postgresql://u:p@postgres.railway.internal:5432/railway'), false);
assert.equal(databaseSslConfig('postgresql://u:p@localhost:5432/zirat'), false);
assert.equal(databaseSslConfig('postgresql://u:p@127.0.0.1:5432/zirat'), false);
assert.equal(databaseSslConfig('not a url').rejectUnauthorized, false, 'unparseable URLs keep TLS on');

const blueprint = readFileSync(new URL('../render.yaml', import.meta.url), 'utf8');
assert.match(blueprint, /healthCheckPath: \/healthz/);
assert.match(blueprint, /buildCommand: npm ci --include=dev && npm run build/);
assert.match(blueprint, /fromDatabase:\s*\n\s*name: zirat-loan-db/, 'DATABASE_URL comes from the managed database');
assert.match(blueprint, /key: ADMIN_PASSWORD\n\s*sync: false/, 'the admin password is never committed');

console.log('deploy config tests passed');
