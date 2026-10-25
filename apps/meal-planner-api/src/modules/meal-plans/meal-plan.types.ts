import type { Meal, MealPlan, MealPlanConstraints, MealPlanDay, MealType } from '@ai-meal-planner/shared';

export type NewMealPlan = Omit<MealPlan, 'id'>;

export interface MealPlanRepository {
  create(plan: NewMealPlan): Promise<MealPlan>;
  findById(id: string): Promise<MealPlan | null>;
  /** Newest first. */
  list(limit: number): Promise<MealPlan[]>;
  /** Replaces a plan's days. Returns null if the plan doesn't exist. */
  updateDays(id: string, days: MealPlanDay[]): Promise<MealPlan | null>;
}

export type GeneratorInfo = {
  source: MealPlan['generation']['source'];
  name: string;
};

export type GeneratePlanInput = {
  constraints: MealPlanConstraints;
  startDate: string;
  days: number;
};

export type GenerateReplacementInput = {
  constraints: MealPlanConstraints;
  mealType: MealType;
  current: Meal;
  /** Titles already in the plan, so the replacement can avoid repeats. */
  existingTitles: string[];
};

/**
 * Seam for swapping the development sample generator for a real AI provider.
 * Implementations must throw `AppError('UNSATISFIABLE_PREFERENCES', 422, …)`
 * rather than silently ignoring constraints.
 */
export interface MealPlanGenerator {
  readonly info: GeneratorInfo;
  generatePlan(input: GeneratePlanInput): Promise<MealPlanDay[]>;
  generateReplacement(input: GenerateReplacementInput): Promise<Meal>;
}
