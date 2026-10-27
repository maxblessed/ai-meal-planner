import AsyncStorage from '@react-native-async-storage/async-storage';
import { z } from 'zod';

import { userPreferencesSchema, type UserPreferences } from './schemas/preferences';

// Preferences aren't secret, but they belong to one account: key them by user id so another
// person signing in on the same device never inherits them.
const storageKey = (userId: string) => `mealplanner.userPreferences.${userId}`;

// Versioned envelope so future migrations can tell old payloads apart.
const storedSchema = z.object({ version: z.literal(1), preferences: userPreferencesSchema });

/** Returns null when nothing is stored or the stored data is unreadable/invalid (user re-onboards). */
export async function loadPreferences(userId: string): Promise<UserPreferences | null> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(userId));
    if (!raw) return null;
    const parsed = storedSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data.preferences : null;
  } catch {
    return null;
  }
}

export async function persistPreferences(userId: string, preferences: UserPreferences): Promise<void> {
  await AsyncStorage.setItem(storageKey(userId), JSON.stringify({ version: 1, preferences }));
}
