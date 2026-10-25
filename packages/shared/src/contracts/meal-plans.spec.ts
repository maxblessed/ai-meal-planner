import { apiErrorResponseSchema } from './errors';
import {
  createMealPlanRequestSchema,
  isoDateSchema,
  mealPlanResponseSchema,
  mealSchema,
} from './meal-plans';

const request = {
  countryCode: 'IE',
  householdSize: 2,
  dietaryPreferences: ['vegetarian'],
  allergies: ['Peanuts'],
  dislikedIngredients: [],
  weeklyBudget: 90,
};

const meal = {
  id: 'm1',
  mealType: 'dinner',
  title: 'Soup',
  description: 'Warm.',
  prepTimeMinutes: 5,
  cookTimeMinutes: 20,
  servings: 2,
  ingredients: [{ name: 'Carrot', quantity: 2, unit: 'piece', category: 'produce' }],
  instructions: ['Cook it.'],
  dietaryTags: ['vegan'],
};

describe('createMealPlanRequestSchema', () => {
  it('accepts a valid request and defaults days to 7', () => {
    expect(createMealPlanRequestSchema.parse(request).days).toBe(7);
  });

  it.each([
    ['unsupported country', { countryCode: 'US' }],
    ['household size 0', { householdSize: 0 }],
    ['household size 13', { householdSize: 13 }],
    ['non-positive budget', { weeklyBudget: 0 }],
    ['unknown diet', { dietaryPreferences: ['carnivore'] }],
    ['bad date', { startDate: '2026-02-30' }],
    ['too many days', { days: 8 }],
  ])('rejects %s', (_name, patch) => {
    expect(createMealPlanRequestSchema.safeParse({ ...request, ...patch }).success).toBe(false);
  });
});

describe('response schemas', () => {
  it('requires cost estimates to be labelled as estimates', () => {
    const cost = { amount: 3, currencyCode: 'EUR' };
    expect(mealSchema.safeParse({ ...meal, estimatedCost: { ...cost, isEstimate: true } }).success).toBe(true);
    expect(mealSchema.safeParse({ ...meal, estimatedCost: cost }).success).toBe(false);
    expect(mealSchema.safeParse({ ...meal, estimatedCost: { ...cost, isEstimate: false } }).success).toBe(false);
  });

  it('rejects a plan response without data', () => {
    expect(mealPlanResponseSchema.safeParse({}).success).toBe(false);
  });

  it('parses validation error responses', () => {
    const parsed = apiErrorResponseSchema.safeParse({
      error: { code: 'VALIDATION_ERROR', message: 'Bad', details: [{ path: 'body.days', message: 'Too big' }] },
    });
    expect(parsed.success).toBe(true);
  });

  it('validates real calendar dates', () => {
    expect(isoDateSchema.safeParse('2026-02-28').success).toBe(true);
    expect(isoDateSchema.safeParse('2026-02-31').success).toBe(false);
  });
});
