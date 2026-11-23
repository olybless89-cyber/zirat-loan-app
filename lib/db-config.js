// Postgres on Render is reachable two ways: the internal hostname (a bare
// service name such as dpg-abc123-a, no dots, no TLS) and the public one
// (*.render.com, TLS with a managed certificate). Railway works the same way
// with *.railway.internal. Picking the wrong side fails the connection, so the
// hostname decides.
export function databaseSslConfig(databaseUrl) {
  let host;
  try {
    host = new URL(databaseUrl).hostname;
  } catch {
    return { rejectUnauthorized: false };
  }
  const local = host === 'localhost' || host === '127.0.0.1' || host === '::1';
  const internal = host.endsWith('.railway.internal') || !host.includes('.');
  return local || internal ? false : { rejectUnauthorized: false };
}
