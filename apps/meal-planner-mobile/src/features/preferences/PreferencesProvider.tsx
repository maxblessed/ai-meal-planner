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

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<PreferencesContextValue['status']>('loading');
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);

  useEffect(() => {
    let active = true;
    loadPreferences().then((stored) => {
      if (!active) return;
      setPreferences(stored);
      setStatus('ready');
    });
    return () => {
      active = false;
    };
  }, []);

  const savePreferences = useCallback(async (next: UserPreferences) => {
    await persistPreferences(next);
    setPreferences(next);
  }, []);

  const value = useMemo(
    () => ({ status, preferences, savePreferences }),
    [status, preferences, savePreferences],
  );

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
