import { authTokensSchema, type AuthTokens } from '@ai-meal-planner/shared';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export interface TokenStorage {
  load(): Promise<AuthTokens | null>;
  save(tokens: AuthTokens): Promise<void>;
  clear(): Promise<void>;
}

const KEY = 'mealplanner.auth.tokens';

/** iOS Keychain / Android Keystore via expo-secure-store. Tokens never touch AsyncStorage. */
export const secureTokenStorage: TokenStorage = {
  async load() {
    try {
      const raw = await SecureStore.getItemAsync(KEY);
      const parsed = raw ? authTokensSchema.safeParse(JSON.parse(raw)) : undefined;
      return parsed?.success ? parsed.data : null;
    } catch {
      return null;
    }
  },
  async save(tokens) {
    await SecureStore.setItemAsync(KEY, JSON.stringify(tokens), {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  },
  async clear() {
    await SecureStore.deleteItemAsync(KEY);
  },
};

/**
 * The web has no secure storage (localStorage is readable by any script on the page), so tokens
 * live only in memory there: a page reload signs the user out. That is a deliberate trade-off.
 */
export function createMemoryTokenStorage(): TokenStorage {
  let tokens: AuthTokens | null = null;
  return {
    async load() {
      return tokens;
    },
    async save(next) {
      tokens = next;
    },
    async clear() {
      tokens = null;
    },
  };
}

export const defaultTokenStorage: TokenStorage = Platform.OS === 'web' ? createMemoryTokenStorage() : secureTokenStorage;
