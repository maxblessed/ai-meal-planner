export const DIETARY_PREFERENCES = [
  'vegetarian',
  'vegan',
  'pescatarian',
  'gluten-free',
  'dairy-free',
  'low-carb',
] as const;
export type DietaryPreference = (typeof DIETARY_PREFERENCES)[number];
