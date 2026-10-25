import { z } from 'zod';

import { COUNTRY_CODES } from './countries';
import { DIETARY_PREFERENCES } from './dietary';

export const MEAL_TYPES = ['breakfast', 'lunch', 'dinner'] as const;
export type MealType = (typeof MEAL_TYPES)[number];

export const INGREDIENT_UNITS = ['g', 'ml', 'tsp', 'tbsp', 'piece', 'clove', 'slice', 'can'] as const;
export type IngredientUnit = (typeof INGREDIENT_UNITS)[number];

/** Coarse aisle grouping; lets future shopping lists and price comparison bucket ingredients. */
export const INGREDIENT_CATEGORIES = ['produce', 'meat-fish', 'dairy-eggs', 'bakery', 'pantry', 'other'] as const;
export type IngredientCategory = (typeof INGREDIENT_CATEGORIES)[number];

export const MAX_HOUSEHOLD_SIZE = 12;
export const MAX_PLAN_DAYS = 7;

/** `YYYY-MM-DD`, validated as a real calendar date. */
export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected a date like 2026-01-31')
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
  }, 'Not a real calendar date');

const tagList = z.array(z.string().trim().min(1).max(40)).max(30);

/** The user constraints a plan was built from. Shared by requests and stored plans. */
export const mealPlanConstraintsSchema = z.object({
  countryCode: z.enum(COUNTRY_CODES),
  householdSize: z.number().int().min(1).max(MAX_HOUSEHOLD_SIZE),
  dietaryPreferences: z.array(z.enum(DIETARY_PREFERENCES)).max(DIETARY_PREFERENCES.length),
  allergies: tagList,
  dislikedIngredients: tagList,
  weeklyBudget: z.number().positive().max(99999),
});
export type MealPlanConstraints = z.infer<typeof mealPlanConstraintsSchema>;

export const ingredientSchema = z.object({
  name: z.string().min(1),
  /** Total for the meal's `servings`, not per person. */
  quantity: z.number().positive(),
  unit: z.enum(INGREDIENT_UNITS),
  category: z.enum(INGREDIENT_CATEGORIES),
});
export type Ingredient = z.infer<typeof ingredientSchema>;

export const estimatedCostSchema = z.object({
  amount: z.number().nonnegative(),
  currencyCode: z.string().length(3),
  /** Always true: costs are never verified retailer prices. */
  isEstimate: z.literal(true),
});
export type EstimatedCost = z.infer<typeof estimatedCostSchema>;

export const mealSchema = z.object({
  id: z.string().min(1),
  mealType: z.enum(MEAL_TYPES),
  title: z.string().min(1),
  description: z.string(),
  prepTimeMinutes: z.number().int().nonnegative(),
  cookTimeMinutes: z.number().int().nonnegative(),
  servings: z.number().int().positive(),
  ingredients: z.array(ingredientSchema).min(1),
  instructions: z.array(z.string().min(1)).min(1),
  dietaryTags: z.array(z.enum(DIETARY_PREFERENCES)),
  estimatedCost: estimatedCostSchema.optional(),
});
export type Meal = z.infer<typeof mealSchema>;

export const mealPlanDaySchema = z.object({
  date: isoDateSchema,
  meals: z.array(mealSchema),
});
export type MealPlanDay = z.infer<typeof mealPlanDaySchema>;

export const GENERATION_STATUSES = ['pending', 'completed', 'failed'] as const;

export const mealPlanSchema = mealPlanConstraintsSchema.extend({
  id: z.string().min(1),
  startDate: isoDateSchema,
  endDate: isoDateSchema,
  /** Derived from `countryCode` via the country config. */
  currencyCode: z.string().length(3),
  days: z.array(mealPlanDaySchema).min(1),
  generation: z.object({
    status: z.enum(GENERATION_STATUSES),
    /** Be honest about provenance: sample data is never labelled as AI. */
    source: z.enum(['development-sample', 'ai']),
    generatorName: z.string(),
    generatedAt: z.string().datetime(),
  }),
  createdAt: z.string().datetime(),
});
export type MealPlan = z.infer<typeof mealPlanSchema>;

export const createMealPlanRequestSchema = mealPlanConstraintsSchema.extend({
  /** Defaults to today (UTC) on the server. */
  startDate: isoDateSchema.optional(),
  days: z.number().int().min(1).max(MAX_PLAN_DAYS).default(MAX_PLAN_DAYS),
});
export type CreateMealPlanRequest = z.input<typeof createMealPlanRequestSchema>;
export type ParsedCreateMealPlanRequest = z.output<typeof createMealPlanRequestSchema>;

export const mealPlanResponseSchema = z.object({ data: mealPlanSchema });
export const mealPlanListResponseSchema = z.object({ data: z.array(mealPlanSchema) });
export type MealPlanResponse = z.infer<typeof mealPlanResponseSchema>;
export type MealPlanListResponse = z.infer<typeof mealPlanListResponseSchema>;
