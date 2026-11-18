import { useCallback, useEffect, useMemo, useState } from 'react';
import { AuthContext } from './authContext.js';
import { authService } from '../services/auth.service.js';
import { setUnauthorizedHandler } from '../services/api.js';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading');

  const signOutLocally = useCallback(() => {
    setUser(null);
    setStatus('anonymous');
  }, []);

  useEffect(() => {
    // Any 401 (expired cookie, removed account) ends the session in the UI.
    setUnauthorizedHandler(signOutLocally);

    let active = true;
    authService
      .me()
      .then((current) => {
        if (!active) return;
        setUser(current);
        setStatus('authenticated');
      })
      .catch(() => active && signOutLocally());
    return () => {
      active = false;
    };
  }, [signOutLocally]);

  const value = useMemo(() => {
    const startSession = (nextUser) => {
      setUser(nextUser);
      setStatus('authenticated');
      return nextUser;
    };
    return {
      user,
      status,
      login: (credentials) => authService.login(credentials).then(startSession),
      register: (data) => authService.register(data).then(startSession),
      logout: () => authService.logout().finally(signOutLocally),
    };
  }, [user, status, signOutLocally]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
