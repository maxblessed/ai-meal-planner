import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import type { UserPreferences } from './schemas/preferences';
import { loadPreferences, persistPreferences } from './storage';

type PreferencesContextValue = {
  status: 'loading' | 'ready';
  /** null until onboarding has been completed. */
  preferences: UserPreferences | null;
  /** Persists first, then updates state; rejects if storage fails. */
  savePreferences: (preferences: UserPreferences) => Promise<void>;
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

type PreferencesProviderProps = {
  /** The signed-in user. Undefined while signed out, when there is nothing to load. */
  userId: string | undefined;
  children: ReactNode;
};

export function PreferencesProvider({ userId, children }: PreferencesProviderProps) {
  // Remember which user the loaded preferences belong to, so the very first render after a
  // user change is already "loading" (no flash of onboarding for someone who has preferences).
  const [loaded, setLoaded] = useState<{ userId: string | undefined; preferences: UserPreferences | null }>({
    userId: undefined,
    preferences: null,
  });
  const isCurrent = loaded.userId === userId;

  useEffect(() => {
    if (!userId) {
      setLoaded({ userId: undefined, preferences: null });
      return;
    }
    let active = true;
    loadPreferences(userId).then((stored) => {
      if (active) setLoaded({ userId, preferences: stored });
    });
    return () => {
      active = false;
    };
  }, [userId]);

  const savePreferences = useCallback(
    async (next: UserPreferences) => {
      if (!userId) throw new Error('Cannot save preferences while signed out');
      await persistPreferences(userId, next);
      setLoaded({ userId, preferences: next });
    },
    [userId],
  );

  const status: PreferencesContextValue['status'] = isCurrent ? 'ready' : 'loading';
  const preferences = isCurrent ? loaded.preferences : null;

  const value = useMemo(() => ({ status, preferences, savePreferences }), [status, preferences, savePreferences]);

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): PreferencesContextValue {
  const context = useContext(PreferencesContext);
  if (!context) throw new Error('usePreferences must be used inside <PreferencesProvider>');
  return context;
}

/** For screens that only render after onboarding; fails loudly if that invariant breaks. */
export function useRequiredPreferences(): UserPreferences {
  const { preferences } = usePreferences();
  if (!preferences) throw new Error('Preferences are required but onboarding is not complete');
  return preferences;
}
