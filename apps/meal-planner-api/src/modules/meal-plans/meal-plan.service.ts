import {
  getCountry,
  type Meal,
  type MealPlan,
  type ParsedCreateMealPlanRequest,
} from '@ai-meal-planner/shared';

import { AppError, notFound } from '../../infrastructure/http/errors';
import type { MealPlanGenerator, MealPlanRepository } from './meal-plan.types';

const LIST_LIMIT = 20;
const DAY_MS = 24 * 60 * 60 * 1000;

const toIsoDate = (date: Date) => date.toISOString().slice(0, 10);
const addDays = (isoDate: string, days: number) => toIsoDate(new Date(Date.parse(`${isoDate}T00:00:00Z`) + days * DAY_MS));

type Dependencies = {
  repository: MealPlanRepository;
  generator: MealPlanGenerator;
  now?: () => Date;
};

/** Business logic for meal plans. Knows nothing about HTTP or MongoDB. */
export class MealPlanService {
  private readonly repository: MealPlanRepository;
  private readonly generator: MealPlanGenerator;
  private readonly now: () => Date;

  constructor({ repository, generator, now = () => new Date() }: Dependencies) {
    this.repository = repository;
    this.generator = generator;
    this.now = now;
  }

  async createPlan(request: ParsedCreateMealPlanRequest): Promise<MealPlan> {
    const { startDate: requestedStart, days: dayCount, ...constraints } = request;
    const now = this.now().toISOString();
    const startDate = requestedStart ?? now.slice(0, 10);

    const days = await this.generator.generatePlan({ constraints, startDate, days: dayCount });

    return this.repository.create({
      ...constraints,
      // Currency always comes from the country config, never from the client.
      currencyCode: getCountry(constraints.countryCode).currencyCode,
      startDate,
      endDate: addDays(startDate, dayCount - 1),
      days,
      generation: {
        status: 'completed',
        source: this.generator.info.source,
        generatorName: this.generator.info.name,
        generatedAt: now,
      },
      createdAt: now,
    });
  }

  listPlans(): Promise<MealPlan[]> {
    return this.repository.list(LIST_LIMIT);
  }

  async getPlan(id: string): Promise<MealPlan> {
    const plan = await this.repository.findById(id);
    if (!plan) throw notFound('Meal plan not found.');
    return plan;
  }

  /** Swaps one meal for a different one that satisfies the plan's original constraints. The meal keeps its id. */
  async replaceMeal(planId: string, mealId: string): Promise<MealPlan> {
    const plan = await this.getPlan(planId);

    const day = plan.days.find((d) => d.meals.some((meal) => meal.id === mealId));
    const current = day?.meals.find((meal) => meal.id === mealId);
    if (!day || !current) throw notFound('Meal not found in this plan.');

    const replacement = await this.generator.generateReplacement({
      constraints: plan,
      mealType: current.mealType,
      current,
      existingTitles: plan.days.flatMap((d) => d.meals.map((meal) => meal.title)),
    });
    const updatedMeal: Meal = { ...replacement, id: current.id };

    const days = plan.days.map((d) => ({
      ...d,
      meals: d.meals.map((meal) => (meal.id === mealId ? updatedMeal : meal)),
    }));

    const updated = await this.repository.updateDays(planId, days);
    if (!updated) throw new AppError('NOT_FOUND', 404, 'Meal plan not found.');
    return updated;
  }
}
