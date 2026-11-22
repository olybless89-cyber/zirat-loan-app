import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from './api.js';

const AuthContext = createContext(null);

const ANONYMOUS = {
  status: 'anonymous',
  role: null,
  subject: null,
  adminGeneratedPassword: false,
};

export function AuthProvider({ children }) {
  const [state, setState] = useState({ ...ANONYMOUS, status: 'loading' });

  const refresh = useCallback(async () => {
    try {
      const data = await api('/api/auth/session');
      setState({
        status: data.authenticated ? 'authenticated' : 'anonymous',
        role: data.role ?? null,
        subject: data.subject ?? null,
        adminGeneratedPassword: Boolean(data.adminUsesGeneratedPassword),
      });
    } catch {
      setState({ ...ANONYMOUS });
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const signOut = useCallback(
    async (role) => {
      const path = role === 'admin' ? '/api/auth/admin/logout' : '/api/auth/applicant/logout';
      await api(path, { method: 'POST' }).catch(() => {});
      await refresh();
    },
    [refresh],
  );

  const value = useMemo(
    () => ({
      ...state,
      refresh,
      signOut,
      acceptSession: (role, subject) =>
        setState((prev) => ({
          ...prev,
          status: 'authenticated',
          role,
          subject,
        })),
    }),
    [state, refresh, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider.');
  return context;
}
