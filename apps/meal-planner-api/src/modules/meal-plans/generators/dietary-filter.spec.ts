import { isRecipeEligible, normaliseTerm } from './dietary-filter';
import { SAMPLE_RECIPES } from './sample-recipes';

const none = { dietaryPreferences: [], allergies: [], dislikedIngredients: [] };
const recipe = (id: string) => {
  const found = SAMPLE_RECIPES.find((r) => r.id === id);
  if (!found) throw new Error(`missing recipe ${id}`);
  return found;
};

describe('normaliseTerm', () => {
  it.each([
    ['Peanuts', 'peanut'],
    ['  Tree Nuts ', 'tree nut'],
    ['Eggs', 'egg'],
    
    ['glass', 'glass'],
  ])('%p → %p', (input, expected) => expect(normaliseTerm(input)).toBe(expected));
});

describe('isRecipeEligible', () => {
  it('accepts everything when there are no constraints', () => {
    expect(SAMPLE_RECIPES.every((r) => isRecipeEligible(r, none))).toBe(true);
  });

  it('requires every selected dietary preference', () => {
    const vegan = { ...none, dietaryPreferences: ['vegan' as const] };
    expect(isRecipeEligible(recipe('tofu-scramble'), vegan)).toBe(true);
    expect(isRecipeEligible(recipe('scrambled-eggs-toast'), vegan)).toBe(false);

    const veganGf = { ...none, dietaryPreferences: ['vegan' as const, 'gluten-free' as const] };
    expect(isRecipeEligible(recipe('hummus-veg-wrap'), veganGf)).toBe(false);
    expect(isRecipeEligible(recipe('black-bean-chilli'), veganGf)).toBe(true);
  });

  it('treats vegan meals as vegetarian, pescatarian and dairy-free', () => {
    expect(recipe('tofu-scramble').diets).toEqual(expect.arrayContaining(['vegetarian', 'pescatarian', 'dairy-free']));
  });

  it('excludes allergens using aliases and plural/case variants', () => {
    expect(isRecipeEligible(recipe('scrambled-eggs-toast'), { ...none, allergies: ['Eggs'] })).toBe(false);
    expect(isRecipeEligible(recipe('berry-porridge'), { ...none, allergies: ['dairy'] })).toBe(false);
    expect(isRecipeEligible(recipe('berry-porridge'), { ...none, allergies: ['Gluten'] })).toBe(false);
    expect(isRecipeEligible(recipe('garlic-prawn-courgette'), { ...none, allergies: ['Shellfish'] })).toBe(false);
    expect(isRecipeEligible(recipe('garlic-prawn-courgette'), { ...none, allergies: ['Peanuts'] })).toBe(true);
  });

  it('falls back to ingredient names for allergens it has no tag for', () => {
    expect(isRecipeEligible(recipe('baked-salmon-potatoes'), { ...none, allergies: ['Broccoli'] })).toBe(false);
  });

  it('matches whole words only ("nut" must not exclude coconut milk)', () => {
    expect(isRecipeEligible(recipe('lentil-veg-curry'), { ...none, allergies: ['Nuts'] })).toBe(true);
  });

  it('excludes disliked ingredients from ingredient names and titles', () => {
    expect(isRecipeEligible(recipe('mushroom-risotto'), { ...none, dislikedIngredients: ['Mushrooms'] })).toBe(false);
    expect(isRecipeEligible(recipe('mushroom-risotto'), { ...none, dislikedIngredients: ['Onion'] })).toBe(false);
    expect(isRecipeEligible(recipe('mushroom-risotto'), { ...none, dislikedIngredients: ['Carrot'] })).toBe(true);
  });
});

describe('sample recipe data integrity', () => {
  it.each(SAMPLE_RECIPES.map((r) => [r.id, r] as const))('%s tags are consistent', (_id, r) => {
    if (r.diets.includes('dairy-free')) expect(r.allergens).not.toContain('milk');
    if (r.diets.includes('gluten-free')) expect(r.allergens).not.toContain('wheat');
    if (r.diets.includes('vegan')) expect(r.allergens).not.toEqual(expect.arrayContaining(['eggs']));
    if (r.diets.includes('vegetarian')) expect(r.allergens).not.toEqual(expect.arrayContaining(['fish']));
    if (r.diets.includes('vegetarian')) expect(r.allergens).not.toContain('shellfish');
    expect(r.ingredients.length).toBeGreaterThan(0);
    expect(r.instructions.length).toBeGreaterThan(0);
  });

  it('has unique ids', () => {
    expect(new Set(SAMPLE_RECIPES.map((r) => r.id)).size).toBe(SAMPLE_RECIPES.length);
  });
});
