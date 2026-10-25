import type { MealPlanConstraints } from '@ai-meal-planner/shared';

import type { SampleRecipe } from './sample-recipes';

/** Lower-cases, collapses whitespace and strips a plural "s" ("Tree nuts" → "tree nut"). */
export function normaliseTerm(term: string): string {
  const cleaned = term.trim().toLowerCase().replace(/\s+/g, ' ');
  return cleaned.length > 3 && cleaned.endsWith('s') && !cleaned.endsWith('ss') ? cleaned.slice(0, -1) : cleaned;
}

/** Maps normalised user wording to the canonical allergen tags used in the recipe data. */
const ALLERGEN_ALIASES: Record<string, string[]> = {
  peanut: ['peanuts'],
  'tree nut': ['tree nuts'],
  nut: ['peanuts', 'tree nuts'],
  milk: ['milk'],
  dairy: ['milk'],
  lactose: ['milk'],
  egg: ['eggs'],
  fish: ['fish'],
  shellfish: ['shellfish'],
  crustacean: ['shellfish'],
  prawn: ['shellfish'],
  soy: ['soy'],
  soya: ['soy'],
  wheat: ['wheat'],
  gluten: ['wheat'],
  sesame: ['sesame'],
  mustard: ['mustard'],
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Whole-word match so "nut" doesn't hit "coconut", tolerating a plural "s". */
function containsWord(text: string, term: string): boolean {
  return new RegExp(`\\b${escapeRegExp(term)}s?\\b`, 'i').test(text);
}

function violatesAllergy(recipe: SampleRecipe, allergy: string): boolean {
  const term = normaliseTerm(allergy);
  const tags = ALLERGEN_ALIASES[term] ?? [];
  if (tags.some((tag) => recipe.allergens.includes(tag))) return true;
  // Conservative fallback for unknown allergens: avoid anything naming it in an ingredient or the title.
  return recipe.ingredients.some((i) => containsWord(i.name, term)) || containsWord(recipe.title, term);
}

function containsDisliked(recipe: SampleRecipe, disliked: string): boolean {
  const term = normaliseTerm(disliked);
  return recipe.ingredients.some((i) => containsWord(i.name, term)) || containsWord(recipe.title, term);
}

/** A recipe is eligible only if it satisfies every diet and avoids every allergy and dislike. */
export function isRecipeEligible(
  recipe: SampleRecipe,
  constraints: Pick<MealPlanConstraints, 'dietaryPreferences' | 'allergies' | 'dislikedIngredients'>,
): boolean {
  return (
    constraints.dietaryPreferences.every((diet) => recipe.diets.includes(diet)) &&
    !constraints.allergies.some((allergy) => violatesAllergy(recipe, allergy)) &&
    !constraints.dislikedIngredients.some((disliked) => containsDisliked(recipe, disliked))
  );
}
