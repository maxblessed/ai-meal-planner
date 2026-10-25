import { randomUUID } from 'node:crypto';

import {
  MEAL_TYPES,
  type IngredientUnit,
  type Meal,
  type MealPlanDay,
  type MealType,
} from '@ai-meal-planner/shared';

import { AppError } from '../../../infrastructure/http/errors';
import type {
  GeneratePlanInput,
  GenerateReplacementInput,
  GeneratorInfo,
  MealPlanGenerator,
} from '../meal-plan.types';
import { isRecipeEligible } from './dietary-filter';
import { SAMPLE_RECIPES, type SampleRecipe } from './sample-recipes';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Spreads meal types across the recipe list so consecutive days differ. */
const MEAL_TYPE_OFFSET: Record<MealType, number> = { breakfast: 0, lunch: 1, dinner: 2 };

const UNIT_STEP: Record<IngredientUnit, number> = { g: 5, ml: 5, tsp: 0.25, tbsp: 0.25, piece: 0.5, clove: 1, slice: 1, can: 0.5 };

/** Scales a per-serving quantity and rounds to a step that's practical to shop for and measure. */
export function scaleQuantity(perServing: number, servings: number, unit: IngredientUnit): number {
  const step = UNIT_STEP[unit];
  return Math.max(step, Math.round((perServing * servings) / step) * step);
}

/**
 * DEVELOPMENT GENERATOR: deterministically picks from a small hand-written
 * recipe set. It is not AI and is labelled `development-sample` everywhere.
 */
export class SampleMealGenerator implements MealPlanGenerator {
  readonly info: GeneratorInfo = { source: 'development-sample', name: 'Development sample generator' };

  constructor(
    private readonly recipes: readonly SampleRecipe[] = SAMPLE_RECIPES,
    private readonly idFactory: () => string = randomUUID,
  ) {}

  async generatePlan({ constraints, startDate, days }: GeneratePlanInput): Promise<MealPlanDay[]> {
    const eligibleByType = Object.fromEntries(
      MEAL_TYPES.map((type) => [type, this.eligible(type, constraints)]),
    ) as Record<MealType, SampleRecipe[]>;

    const empty = MEAL_TYPES.filter((type) => eligibleByType[type].length === 0);
    if (empty.length > 0) {
      throw new AppError(
        'UNSATISFIABLE_PREFERENCES',
        422,
        `The development sample set has no ${empty.join(' or ')} option that matches your dietary preferences, allergies and disliked ingredients. ` +
          'Try removing a restriction.',
      );
    }

    return Array.from({ length: days }, (_, dayIndex) => ({
      date: new Date(Date.parse(`${startDate}T00:00:00Z`) + dayIndex * DAY_MS).toISOString().slice(0, 10),
      meals: MEAL_TYPES.map((type) => {
        const options = eligibleByType[type];
        return this.toMeal(options[(dayIndex + MEAL_TYPE_OFFSET[type]) % options.length], constraints.householdSize);
      }),
    }));
  }

  async generateReplacement({ constraints, mealType, current, existingTitles }: GenerateReplacementInput): Promise<Meal> {
    const options = this.eligible(mealType, constraints);
    const currentIndex = options.findIndex((recipe) => recipe.title === current.title);

    // Walk forward from the current recipe so repeated replaces cycle deterministically.
    const ordered = options.map((_, i) => options[(currentIndex + 1 + i) % options.length]);
    const others = ordered.filter((recipe) => recipe.title !== current.title);
    const replacement = others.find((recipe) => !existingTitles.includes(recipe.title)) ?? others[0];

    if (!replacement) {
      throw new AppError(
        'NO_ALTERNATIVE_MEAL',
        422,
        `There is no other ${mealType} in the development sample set that fits your preferences.`,
      );
    }
    return this.toMeal(replacement, constraints.householdSize);
  }

  private eligible(mealType: MealType, constraints: GeneratePlanInput['constraints']): SampleRecipe[] {
    return this.recipes.filter((recipe) => recipe.mealType === mealType && isRecipeEligible(recipe, constraints));
  }

  private toMeal(recipe: SampleRecipe, servings: number): Meal {
    return {
      id: this.idFactory(),
      mealType: recipe.mealType,
      title: recipe.title,
      description: recipe.description,
      prepTimeMinutes: recipe.prepTimeMinutes,
      cookTimeMinutes: recipe.cookTimeMinutes,
      servings,
      ingredients: recipe.ingredients.map(({ name, perServing, unit, category }) => ({
        name,
        quantity: scaleQuantity(perServing, servings, unit),
        unit,
        category,
      })),
      instructions: recipe.instructions,
      dietaryTags: recipe.diets,
      // No estimatedCost: we have no verified prices and don't invent them.
    };
  }
}
