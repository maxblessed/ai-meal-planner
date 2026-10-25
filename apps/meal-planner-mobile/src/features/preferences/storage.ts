import AsyncStorage from '@react-native-async-storage/async-storage';
import { z } from 'zod';

import { userPreferencesSchema, type UserPreferences } from './schemas/preferences';

const STORAGE_KEY = 'mealplanner.userPreferences';

// Versioned envelope so future migrations can tell old payloads apart.
const storedSchema = z.object({ version: z.literal(1), preferences: userPreferencesSchema });

/** Returns null when nothing is stored or the stored data is unreadable/invalid (user re-onboards). */
export async function loadPreferences(): Promise<UserPreferences | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = storedSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data.preferences : null;
  } catch {
    return null;
  }
}

export async function persistPreferences(preferences: UserPreferences): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, preferences }));
}
