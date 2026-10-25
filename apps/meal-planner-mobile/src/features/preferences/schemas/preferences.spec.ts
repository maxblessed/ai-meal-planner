import {
  DEFAULT_FORM_VALUES,
  parseBudgetInput,
  preferencesFormSchema,
  toFormValues,
  toPreferences,
  userPreferencesSchema,
} from './preferences';

describe('parseBudgetInput', () => {
  it.each([
    ['85', 85],
    ['85.50', 85.5],
    ['85,5', 85.5],
    [' 120 ', 120],
  ])('accepts %p', (input, expected) => expect(parseBudgetInput(input)).toBe(expected));

  it.each(['', '  ', '0', '0.00', '-5', 'abc', '1.234', '€85', '1,000.00', '100000'])('rejects %p', (input) =>
    expect(parseBudgetInput(input)).toBeNull(),
  );
});

describe('preferences schemas', () => {
  const valid = { ...DEFAULT_FORM_VALUES, weeklyBudget: '90' };

  it('accepts a valid form and converts it to a profile with a numeric budget', () => {
    expect(preferencesFormSchema.safeParse(valid).success).toBe(true);
    expect(toPreferences(valid).weeklyBudget).toBe(90);
  });

  it('round-trips profile ↔ form values', () => {
    const preferences = toPreferences({ ...valid, householdSize: 4, allergies: ['Peanuts'] });
    expect(toPreferences(toFormValues(preferences))).toEqual(preferences);
  });

  it('rejects household sizes outside 1–12', () => {
    expect(preferencesFormSchema.safeParse({ ...valid, householdSize: 0 }).success).toBe(false);
    expect(preferencesFormSchema.safeParse({ ...valid, householdSize: 13 }).success).toBe(false);
  });

  it('rejects unsupported countries and unknown dietary preferences', () => {
    expect(preferencesFormSchema.safeParse({ ...valid, countryCode: 'US' }).success).toBe(false);
    expect(preferencesFormSchema.safeParse({ ...valid, dietaryPreferences: ['carnivore'] }).success).toBe(false);
  });

  it('rejects an empty or non-positive budget', () => {
    expect(preferencesFormSchema.safeParse({ ...valid, weeklyBudget: '' }).success).toBe(false);
    expect(userPreferencesSchema.safeParse({ ...toPreferences(valid), weeklyBudget: 0 }).success).toBe(false);
  });
});
