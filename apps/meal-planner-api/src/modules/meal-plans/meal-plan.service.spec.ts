import type { ParsedCreateMealPlanRequest } from '@ai-meal-planner/shared';

import { AppError } from '../../infrastructure/http/errors';
import { SampleMealGenerator } from './generators/sample-meal-generator';
import { InMemoryMealPlanRepository } from './meal-plan.repository';
import { MealPlanService } from './meal-plan.service';

const request: ParsedCreateMealPlanRequest = {
  countryCode: 'GB',
  householdSize: 3,
  dietaryPreferences: ['vegetarian'],
  allergies: ['Peanuts'],
  dislikedIngredients: [],
  weeklyBudget: 95,
  days: 7,
};

const build = () => {
  const repository = new InMemoryMealPlanRepository();
  const service = new MealPlanService({
    repository,
    generator: new SampleMealGenerator(),
    now: () => new Date('2026-03-30T10:00:00Z'),
  });
  return { repository, service };
};

describe('MealPlanService', () => {
  it('creates and persists a plan with derived currency, dates and honest provenance', async () => {
    const { service } = build();
    const plan = await service.createPlan(request);

    expect(plan).toMatchObject({
      countryCode: 'GB',
      currencyCode: 'GBP',
      householdSize: 3,
      startDate: '2026-03-30',
      endDate: '2026-04-05',
      weeklyBudget: 95,
      createdAt: '2026-03-30T10:00:00.000Z',
      generation: { status: 'completed', source: 'development-sample' },
    });
    expect(plan.days).toHaveLength(7);
    expect(await service.getPlan(plan.id)).toEqual(plan);
  });

  it('honours an explicit start date and shorter plans', async () => {
    const { service } = build();
    const plan = await service.createPlan({ ...request, startDate: '2026-12-30', days: 3 });
    expect([plan.startDate, plan.endDate]).toEqual(['2026-12-30', '2027-01-01']);
  });

  it('lists newest first', async () => {
    const { service } = build();
    const first = await service.createPlan(request);
    const second = await service.createPlan(request);
    expect((await service.listPlans()).map((p) => p.id)).toEqual([second.id, first.id]);
  });

  it('throws NOT_FOUND for unknown plans', async () => {
    await expect(build().service.getPlan('0'.repeat(24))).rejects.toMatchObject({ code: 'NOT_FOUND', status: 404 });
  });

  it('does not persist anything when generation fails', async () => {
    const { service, repository } = build();
    await expect(
      service.createPlan({ ...request, dietaryPreferences: ['vegan', 'gluten-free', 'low-carb'] }),
    ).rejects.toBeInstanceOf(AppError);
    expect(await repository.list(10)).toEqual([]);
  });

  describe('replaceMeal', () => {
    it('replaces one meal in place, keeping its id and leaving the rest untouched', async () => {
      const { service } = build();
      const plan = await service.createPlan(request);
      const target = plan.days[1].meals[2];

      const updated = await service.replaceMeal(plan.id, target.id);
      const replaced = updated.days[1].meals[2];

      expect(replaced.id).toBe(target.id);
      expect(replaced.title).not.toBe(target.title);
      expect(replaced.mealType).toBe('dinner');
      expect(replaced.dietaryTags).toContain('vegetarian');
      expect(updated.days[0]).toEqual(plan.days[0]);
      expect(await service.getPlan(plan.id)).toEqual(updated);
    });

    it('throws NOT_FOUND for an unknown meal or plan', async () => {
      const { service } = build();
      const plan = await service.createPlan(request);
      await expect(service.replaceMeal(plan.id, 'nope')).rejects.toMatchObject({ code: 'NOT_FOUND' });
      await expect(service.replaceMeal('0'.repeat(24), 'nope')).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });
  });
});
