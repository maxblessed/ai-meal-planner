import { z } from 'zod';

import { COUNTRY_CODES, type CountryCode } from '@/config/countries';

export const DIETARY_PREFERENCES = [
  'vegetarian',
  'vegan',
  'pescatarian',
  'gluten-free',
  'dairy-free',
  'low-carb',
] as const;
export type DietaryPreference = (typeof DIETARY_PREFERENCES)[number];

export const DIETARY_PREFERENCE_LABELS: Record<DietaryPreference, string> = {
  vegetarian: 'Vegetarian',
  vegan: 'Vegan',
  pescatarian: 'Pescatarian',
  'gluten-free': 'Gluten-free',
  'dairy-free': 'Dairy-free',
  'low-carb': 'Low-carb',
};

export const COMMON_ALLERGENS = [
  'Peanuts',
  'Tree nuts',
  'Milk',
  'Eggs',
  'Fish',
  'Shellfish',
  'Soy',
  'Wheat',
  'Sesame',
  'Mustard',
] as const;

export const HOUSEHOLD_SIZE_MIN = 1;
export const HOUSEHOLD_SIZE_MAX = 12;

const BUDGET_PATTERN = /^\d{1,5}([.,]\d{1,2})?$/;

/** Parses user-typed money ("85", "85.50", "85,50"). Returns null if invalid or not positive. */
export function parseBudgetInput(input: string): number | null {
  const trimmed = input.trim();
  if (!BUDGET_PATTERN.test(trimmed)) return null;
  const value = Number(trimmed.replace(',', '.'));
  return value > 0 ? value : null;
}

const tagList = z.array(z.string().trim().min(1).max(40)).max(30);

/** Persisted profile. Currency is derived from `countryCode` via config, never stored. */
export const userPreferencesSchema = z.object({
  countryCode: z.enum(COUNTRY_CODES),
  householdSize: z.number().int().min(HOUSEHOLD_SIZE_MIN).max(HOUSEHOLD_SIZE_MAX),
  dietaryPreferences: z.array(z.enum(DIETARY_PREFERENCES)),
  allergies: tagList,
  dislikedIngredients: tagList,
  weeklyBudget: z.number().positive().max(99999),
});
export type UserPreferences = z.infer<typeof userPreferencesSchema>;

/** Form shape: identical to the profile except the budget is the raw text the user typed. */
export const preferencesFormSchema = userPreferencesSchema.extend({
  weeklyBudget: z
    .string()
    .refine((value) => parseBudgetInput(value) !== null, 'Enter an amount above 0, like 85 or 85.50'),
});
export type PreferencesFormValues = z.infer<typeof preferencesFormSchema>;

export const DEFAULT_FORM_VALUES: PreferencesFormValues = {
  countryCode: 'IE' satisfies CountryCode,
  householdSize: 1,
  dietaryPreferences: [],
  allergies: [],
  dislikedIngredients: [],
  weeklyBudget: '',
};

export function toFormValues(preferences: UserPreferences): PreferencesFormValues {
  return { ...preferences, weeklyBudget: String(preferences.weeklyBudget) };
}

export function toPreferences(values: PreferencesFormValues): UserPreferences {
  return userPreferencesSchema.parse({
    ...values,
    weeklyBudget: parseBudgetInput(values.weeklyBudget),
  });
}
