import type { Meal, MealPlan, MealPlanConstraints, MealPlanDay, MealType } from '@ai-meal-planner/shared';

/** `ownerId` is storage-only: it is never part of the API response. */
export type NewMealPlan = Omit<MealPlan, 'id'> & { ownerId: string };

/**
 * Every read and write is scoped to an owner, so a plan can never be reached with another user's id.
 * Lookups for plans owned by someone else behave exactly like lookups for plans that don't exist.
 */
export interface MealPlanRepository {
  create(plan: NewMealPlan): Promise<MealPlan>;
  findById(ownerId: string, id: string): Promise<MealPlan | null>;
  /** Newest first. */
  list(ownerId: string, limit: number): Promise<MealPlan[]>;
  /** Replaces a plan's days. Returns null if the owner has no such plan. */
  updateDays(ownerId: string, id: string, days: MealPlanDay[]): Promise<MealPlan | null>;
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
