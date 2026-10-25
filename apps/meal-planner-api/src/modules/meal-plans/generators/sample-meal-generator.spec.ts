import { mealPlanSchema, type Meal, type MealPlanConstraints } from '@ai-meal-planner/shared';

import { AppError } from '../../../infrastructure/http/errors';
import { SampleMealGenerator, scaleQuantity } from './sample-meal-generator';
import { SAMPLE_RECIPES, type SampleRecipe } from './sample-recipes';

const constraints: MealPlanConstraints = {
  countryCode: 'IE',
  householdSize: 2,
  dietaryPreferences: [],
  allergies: [],
  dislikedIngredients: [],
  weeklyBudget: 80,
};

const sequentialIds = () => {
  let n = 0;
  return () => `meal-${++n}`;
};

describe('SampleMealGenerator', () => {
  it('is labelled as a development sample, not AI', () => {
    expect(new SampleMealGenerator().info).toMatchObject({ source: 'development-sample' });
  });

  it('generates 7 consecutive days with breakfast, lunch and dinner', async () => {
    const days = await new SampleMealGenerator().generatePlan({ constraints, startDate: '2026-03-30', days: 7 });
    expect(days.map((d) => d.date)).toEqual([
      '2026-03-30', '2026-03-31', '2026-04-01', '2026-04-02', '2026-04-03', '2026-04-04', '2026-04-05',
    ]);
    for (const day of days) expect(day.meals.map((m) => m.mealType)).toEqual(['breakfast', 'lunch', 'dinner']);
  });

  it('is deterministic apart from ids', async () => {
    const titles = async () =>
      (await new SampleMealGenerator().generatePlan({ constraints, startDate: '2026-03-30', days: 7 })).map((d) =>
        d.meals.map((m) => m.title),
      );
    expect(await titles()).toEqual(await titles());
  });

  it('produces contract-valid meals with servings equal to household size and no invented cost', async () => {
    const days = await new SampleMealGenerator(undefined, sequentialIds()).generatePlan({
      constraints: { ...constraints, householdSize: 4 },
      startDate: '2026-03-30',
      days: 2,
    });
    const meals = days.flatMap((d) => d.meals);
    expect(new Set(meals.map((m) => m.id)).size).toBe(meals.length);
    for (const meal of meals) {
      expect(meal.servings).toBe(4);
      expect(meal.estimatedCost).toBeUndefined();
    }
    // Whole plan must satisfy the shared contract.
    expect(
      mealPlanSchema.safeParse({
        ...constraints, id: 'x', startDate: '2026-03-30', endDate: '2026-03-31', currencyCode: 'EUR', days,
        generation: { status: 'completed', source: 'development-sample', generatorName: 'x', generatedAt: new Date().toISOString() },
        createdAt: new Date().toISOString(),
      }).success,
    ).toBe(true);
  });

  it('scales ingredient quantities by household size', async () => {
    const one = await new SampleMealGenerator().generatePlan({ constraints: { ...constraints, householdSize: 1 }, startDate: '2026-03-30', days: 1 });
    const four = await new SampleMealGenerator().generatePlan({ constraints: { ...constraints, householdSize: 4 }, startDate: '2026-03-30', days: 1 });
    const grams = (meal: { ingredients: { unit: string; quantity: number }[] }) =>
      meal.ingredients.filter((i) => i.unit === 'g').reduce((sum, i) => sum + i.quantity, 0);
    expect(grams(four[0].meals[0])).toBeCloseTo(grams(one[0].meals[0]) * 4, -1);
  });

  it('respects diets, allergies and dislikes across the whole plan', async () => {
    const days = await new SampleMealGenerator().generatePlan({
      constraints: { ...constraints, dietaryPreferences: ['vegan'], allergies: ['Soy'], dislikedIngredients: ['Chickpeas'] },
      startDate: '2026-03-30',
      days: 7,
    });
    for (const meal of days.flatMap((d) => d.meals)) {
      expect(meal.dietaryTags).toContain('vegan');
      expect(meal.title).not.toMatch(/tofu|chickpea/i);
      expect(meal.ingredients.map((i) => i.name.toLowerCase()).join(' ')).not.toMatch(/tofu|chickpea|tamari/);
    }
  });

  it('fails clearly instead of ignoring constraints it cannot satisfy', async () => {
    const error = await new SampleMealGenerator()
      .generatePlan({ constraints: { ...constraints, dietaryPreferences: ['vegan'], allergies: ['Wheat', 'Soy', 'Nuts'], dislikedIngredients: ['Banana', 'Lentils', 'Beans', 'Chickpeas', 'Rice'] }, startDate: '2026-03-30', days: 7 })
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AppError);
    expect(error).toMatchObject({ code: 'UNSATISFIABLE_PREFERENCES', status: 422 });
  });

  describe('generateReplacement', () => {
    it('returns a different meal of the same type that still satisfies the constraints', async () => {
      const generator = new SampleMealGenerator();
      const [day] = await generator.generatePlan({ constraints: { ...constraints, dietaryPreferences: ['vegetarian'] }, startDate: '2026-03-30', days: 1 });
      const current = day.meals[2];
      const replacement = await generator.generateReplacement({
        constraints: { ...constraints, dietaryPreferences: ['vegetarian'] },
        mealType: 'dinner',
        current,
        existingTitles: [current.title],
      });
      expect(replacement.mealType).toBe('dinner');
      expect(replacement.title).not.toBe(current.title);
      expect(replacement.dietaryTags).toContain('vegetarian');
    });

    it('throws NO_ALTERNATIVE_MEAL when the current meal is the only eligible option', async () => {
      const only = SAMPLE_RECIPES.find((r) => r.mealType === 'breakfast') as SampleRecipe;
      const generator = new SampleMealGenerator([only]);
      const current = { title: only.title } as Meal; // the generator only reads the title

      await expect(
        generator.generateReplacement({ constraints, mealType: 'breakfast', current, existingTitles: [] }),
      ).rejects.toMatchObject({ code: 'NO_ALTERNATIVE_MEAL', status: 422 });
    });
  });
});

describe('scaleQuantity', () => {
  it.each([
    [40, 3, 'g', 120],
    [0.5, 3, 'piece', 1.5],
    [0.25, 1, 'tsp', 0.25],
    [1, 5, 'clove', 5],
  ] as const)('scaleQuantity(%p × %p %s) = %p', (perServing, servings, unit, expected) =>
    expect(scaleQuantity(perServing, servings, unit)).toBe(expected),
  );
});
