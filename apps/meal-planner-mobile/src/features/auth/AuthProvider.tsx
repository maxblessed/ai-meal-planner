import { ApiError, type LoginRequest, type RegisterRequest, type User } from '@ai-meal-planner/shared';
import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { authSession, getApiClient } from './api/apiClient';

type Status = 'restoring' | 'signedOut' | 'signedIn' | 'unreachable';

type AuthContextValue = {
  status: Status;
  user: User | null;
  /** Re-attempts restoring the session after the service was unreachable at launch. */
  retry: () => void;
  login: (input: LoginRequest) => Promise<void>;
  register: (input: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<Status>('restoring');
  const [user, setUser] = useState<User | null>(null);
  const [attempt, setAttempt] = useState(0);

  /** Cached server data belongs to one user, so it must never survive a sign-out or user switch. */
  const endSession = useCallback(() => {
    setUser(null);
    setStatus('signedOut');
    queryClient.clear();
  }, [queryClient]);

  // Restore the previous session on launch (and on retry).
  useEffect(() => {
    let active = true;
    setStatus('restoring');
    (async () => {
      const tokens = await authSession.restore();
      if (!tokens) return active && setStatus('signedOut');
      try {
        const me = await getApiClient().auth.me();
        if (!active) return;
        setUser(me);
        setStatus('signedIn');
      } catch (error) {
        if (!active) return;
        const rejected = error instanceof ApiError && error.status !== undefined && error.status >= 400 && error.status < 500;
        if (rejected) {
          await authSession.clear();
          endSession();
        } else {
          setStatus('unreachable');
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [attempt, endSession]);

  // If the session dies mid-use (refresh token rejected), fall back to the sign-in screen.
  useEffect(
    () =>
      authSession.subscribe((tokens) => {
        if (!tokens) endSession();
      }),
    [endSession],
  );

  const login = useCallback(
    async (input: LoginRequest) => {
      const session = await getApiClient().auth.login(input);
      queryClient.clear();
      await authSession.setTokens(session.tokens);
      setUser(session.user);
      setStatus('signedIn');
    },
    [queryClient],
  );

  const register = useCallback(
    async (input: RegisterRequest) => {
      const session = await getApiClient().auth.register(input);
      queryClient.clear();
      await authSession.setTokens(session.tokens);
      setUser(session.user);
      setStatus('signedIn');
    },
    [queryClient],
  );

  const logout = useCallback(async () => {
    const refreshToken = authSession.getRefreshToken();
    // Best effort: even if the server can't be reached, the device must forget the session.
    if (refreshToken) await getApiClient().auth.logout(refreshToken).catch(() => undefined);
    await authSession.clear();
  }, []);

  const value = useMemo(
    () => ({ status, user, retry: () => setAttempt((n) => n + 1), login, register, logout }),
    [status, user, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
