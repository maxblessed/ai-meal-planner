import { z } from 'zod';

/** Request schemas live in @ai-meal-planner/shared; only API-specific ones are here. */
export const mealPlanIdParamsSchema = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid meal plan id'),
});

export const replaceMealParamsSchema = mealPlanIdParamsSchema.extend({
  mealId: z.string().min(1).max(100),
});

/** The replace endpoint takes no options yet; unknown fields are rejected. */
export const replaceMealBodySchema = z.object({}).strict();
