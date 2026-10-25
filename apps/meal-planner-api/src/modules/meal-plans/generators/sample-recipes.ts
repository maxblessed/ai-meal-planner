import type {
  DietaryPreference,
  IngredientCategory,
  IngredientUnit,
  MealType,
} from '@ai-meal-planner/shared';

/**
 * DEVELOPMENT SAMPLE DATA. A small hand-written recipe set used by the sample
 * generator. These are not AI-generated and carry no pricing.
 */

export type RecipeIngredient = {
  name: string;
  /** Quantity for ONE serving; scaled by household size. */
  perServing: number;
  unit: IngredientUnit;
  category: IngredientCategory;
};

export type SampleRecipe = {
  id: string;
  mealType: MealType;
  title: string;
  description: string;
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  diets: DietaryPreference[];
  /** Canonical allergen tags (see ALLERGEN_ALIASES). Oats and bread count as `wheat` (gluten). */
  allergens: string[];
  ingredients: RecipeIngredient[];
  instructions: string[];
};

const ing = (
  name: string,
  perServing: number,
  unit: IngredientUnit,
  category: IngredientCategory,
): RecipeIngredient => ({ name, perServing, unit, category });

type RecipeInput = Omit<SampleRecipe, 'diets'> & { diets: DietaryPreference[] };

/** Vegan implies vegetarian, pescatarian and dairy-free; vegetarian implies pescatarian. */
function expandDiets(diets: DietaryPreference[]): DietaryPreference[] {
  const set = new Set(diets);
  if (set.has('vegan')) ['vegetarian', 'pescatarian', 'dairy-free'].forEach((d) => set.add(d as DietaryPreference));
  if (set.has('vegetarian')) set.add('pescatarian');
  return [...set];
}

const recipes: RecipeInput[] = [
  // ── Breakfast ──────────────────────────────────────────────
  {
    id: 'berry-porridge', mealType: 'breakfast', title: 'Berry porridge',
    description: 'Creamy oats with mixed berries and a drizzle of honey.',
    prepTimeMinutes: 2, cookTimeMinutes: 8, diets: ['vegetarian'], allergens: ['milk', 'wheat'],
    ingredients: [ing('Porridge oats', 40, 'g', 'pantry'), ing('Milk', 200, 'ml', 'dairy-eggs'), ing('Mixed berries', 75, 'g', 'produce'), ing('Honey', 1, 'tsp', 'pantry')],
    instructions: ['Simmer the oats and milk, stirring, for 5–8 minutes until creamy.', 'Spoon into bowls and top with berries.', 'Finish with a drizzle of honey.'],
  },
  {
    id: 'vegan-overnight-oats', mealType: 'breakfast', title: 'Vegan overnight oats',
    description: 'Oats soaked overnight in oat drink with banana and chia seeds.',
    prepTimeMinutes: 5, cookTimeMinutes: 0, diets: ['vegan'], allergens: ['wheat'],
    ingredients: [ing('Porridge oats', 40, 'g', 'pantry'), ing('Oat drink', 150, 'ml', 'pantry'), ing('Chia seeds', 1, 'tbsp', 'pantry'), ing('Banana', 0.5, 'piece', 'produce')],
    instructions: ['Stir the oats, oat drink and chia seeds together in a jar.', 'Cover and chill overnight.', 'Top with sliced banana in the morning.'],
  },
  {
    id: 'scrambled-eggs-toast', mealType: 'breakfast', title: 'Scrambled eggs on toast',
    description: 'Soft scrambled eggs on buttered wholemeal toast.',
    prepTimeMinutes: 3, cookTimeMinutes: 5, diets: ['vegetarian'], allergens: ['eggs', 'milk', 'wheat'],
    ingredients: [ing('Eggs', 2, 'piece', 'dairy-eggs'), ing('Wholemeal bread', 1, 'slice', 'bakery'), ing('Butter', 1, 'tsp', 'dairy-eggs')],
    instructions: ['Beat the eggs with a pinch of salt.', 'Cook gently in a little butter, stirring, until just set.', 'Serve on hot buttered toast.'],
  },
  {
    id: 'yoghurt-berries-seeds', mealType: 'breakfast', title: 'Yoghurt with berries and seeds',
    description: 'Thick natural yoghurt with berries and toasted pumpkin seeds.',
    prepTimeMinutes: 5, cookTimeMinutes: 0, diets: ['vegetarian', 'gluten-free'], allergens: ['milk'],
    ingredients: [ing('Natural yoghurt', 150, 'g', 'dairy-eggs'), ing('Mixed berries', 75, 'g', 'produce'), ing('Pumpkin seeds', 1, 'tbsp', 'pantry'), ing('Honey', 1, 'tsp', 'pantry')],
    instructions: ['Spoon the yoghurt into bowls.', 'Top with berries and pumpkin seeds.', 'Drizzle with honey.'],
  },
  {
    id: 'tofu-scramble', mealType: 'breakfast', title: 'Tofu scramble with spinach',
    description: 'Turmeric-spiced crumbled tofu with spinach and tomatoes.',
    prepTimeMinutes: 5, cookTimeMinutes: 10, diets: ['vegan', 'gluten-free', 'low-carb'], allergens: ['soy'],
    ingredients: [ing('Firm tofu', 100, 'g', 'other'), ing('Baby spinach', 40, 'g', 'produce'), ing('Cherry tomatoes', 4, 'piece', 'produce'), ing('Ground turmeric', 0.25, 'tsp', 'pantry'), ing('Olive oil', 1, 'tsp', 'pantry')],
    instructions: ['Crumble the tofu into a hot oiled pan with the turmeric.', 'Cook for 5 minutes, then add the tomatoes.', 'Stir through the spinach until wilted and serve.'],
  },
  {
    id: 'smoked-salmon-rye', mealType: 'breakfast', title: 'Smoked salmon and avocado on rye',
    description: 'Rye toast topped with smashed avocado and smoked salmon.',
    prepTimeMinutes: 8, cookTimeMinutes: 2, diets: ['pescatarian', 'dairy-free'], allergens: ['fish', 'wheat'],
    ingredients: [ing('Rye bread', 1, 'slice', 'bakery'), ing('Avocado', 0.5, 'piece', 'produce'), ing('Smoked salmon', 40, 'g', 'meat-fish'), ing('Lemon', 0.25, 'piece', 'produce')],
    instructions: ['Toast the rye bread.', 'Smash the avocado with a squeeze of lemon and spread on the toast.', 'Top with smoked salmon.'],
  },
  {
    id: 'veggie-omelette', mealType: 'breakfast', title: 'Veggie omelette',
    description: 'A fluffy omelette with peppers, spinach and cheese.',
    prepTimeMinutes: 5, cookTimeMinutes: 6, diets: ['vegetarian', 'gluten-free', 'low-carb'], allergens: ['eggs', 'milk'],
    ingredients: [ing('Eggs', 2, 'piece', 'dairy-eggs'), ing('Red pepper', 0.25, 'piece', 'produce'), ing('Baby spinach', 30, 'g', 'produce'), ing('Cheddar cheese', 20, 'g', 'dairy-eggs')],
    instructions: ['Soften the pepper in a non-stick pan.', 'Pour in the beaten eggs and cook until nearly set.', 'Scatter over spinach and cheese, fold and serve.'],
  },
  // ── Lunch ──────────────────────────────────────────────────
  {
    id: 'chickpea-tomato-soup', mealType: 'lunch', title: 'Chickpea and tomato soup',
    description: 'A hearty, spiced soup that is ready in 25 minutes.',
    prepTimeMinutes: 10, cookTimeMinutes: 20, diets: ['vegan', 'gluten-free'], allergens: [],
    ingredients: [ing('Tinned chickpeas', 0.5, 'can', 'pantry'), ing('Chopped tomatoes', 0.5, 'can', 'pantry'), ing('Onion', 0.5, 'piece', 'produce'), ing('Carrot', 1, 'piece', 'produce'), ing('Vegetable stock', 250, 'ml', 'pantry')],
    instructions: ['Soften the chopped onion and carrot in a large pan.', 'Add the tomatoes, chickpeas and stock and simmer for 15 minutes.', 'Blend lightly, season and serve.'],
  },
  {
    id: 'tuna-sweetcorn-wraps', mealType: 'lunch', title: 'Tuna and sweetcorn wraps',
    description: 'Quick tuna mayo wraps with crunchy salad.',
    prepTimeMinutes: 10, cookTimeMinutes: 0, diets: ['pescatarian'], allergens: ['fish', 'wheat', 'eggs'],
    ingredients: [ing('Tortilla wraps', 1, 'piece', 'bakery'), ing('Tinned tuna', 0.5, 'can', 'pantry'), ing('Sweetcorn', 30, 'g', 'pantry'), ing('Mayonnaise', 1, 'tbsp', 'pantry'), ing('Lettuce', 20, 'g', 'produce')],
    instructions: ['Mix the tuna, sweetcorn and mayonnaise.', 'Spoon onto the wraps with lettuce.', 'Roll up tightly and halve.'],
  },
  {
    id: 'halloumi-quinoa-salad', mealType: 'lunch', title: 'Halloumi and quinoa salad',
    description: 'Golden halloumi over lemony quinoa, cucumber and tomato.',
    prepTimeMinutes: 10, cookTimeMinutes: 15, diets: ['vegetarian', 'gluten-free'], allergens: ['milk'],
    ingredients: [ing('Quinoa', 50, 'g', 'pantry'), ing('Halloumi', 60, 'g', 'dairy-eggs'), ing('Cucumber', 0.25, 'piece', 'produce'), ing('Tomatoes', 1, 'piece', 'produce'), ing('Lemon', 0.25, 'piece', 'produce')],
    instructions: ['Cook the quinoa according to the packet and cool slightly.', 'Fry the sliced halloumi until golden on both sides.', 'Toss everything with lemon juice and serve.'],
  },
  {
    id: 'lentil-veg-curry', mealType: 'lunch', title: 'Red lentil and spinach curry',
    description: 'A creamy coconut curry that keeps well for leftovers.',
    prepTimeMinutes: 10, cookTimeMinutes: 25, diets: ['vegan', 'gluten-free'], allergens: [],
    ingredients: [ing('Red lentils', 50, 'g', 'pantry'), ing('Coconut milk', 100, 'ml', 'pantry'), ing('Onion', 0.5, 'piece', 'produce'), ing('Baby spinach', 40, 'g', 'produce'), ing('Curry powder', 1, 'tsp', 'pantry'), ing('Basmati rice', 60, 'g', 'pantry')],
    instructions: ['Soften the onion with the curry powder.', 'Add the lentils, coconut milk and 200ml water; simmer for 20 minutes.', 'Stir in the spinach and serve with rice.'],
  },
  {
    id: 'chicken-caesar-salad', mealType: 'lunch', title: 'Chicken and parmesan salad',
    description: 'Griddled chicken over crisp lettuce with parmesan and lemon.',
    prepTimeMinutes: 10, cookTimeMinutes: 12, diets: ['gluten-free', 'low-carb'], allergens: ['milk'],
    ingredients: [ing('Chicken breast', 120, 'g', 'meat-fish'), ing('Cos lettuce', 60, 'g', 'produce'), ing('Parmesan', 15, 'g', 'dairy-eggs'), ing('Olive oil', 1, 'tbsp', 'pantry'), ing('Lemon', 0.25, 'piece', 'produce')],
    instructions: ['Season and griddle the chicken for 5–6 minutes per side.', 'Whisk the oil and lemon juice for the dressing.', 'Slice the chicken over the lettuce, dress and shave over parmesan.'],
  },
  {
    id: 'hummus-veg-wrap', mealType: 'lunch', title: 'Hummus and roasted veg wrap',
    description: 'Roasted peppers and courgette in a wrap with hummus.',
    prepTimeMinutes: 10, cookTimeMinutes: 20, diets: ['vegan'], allergens: ['wheat', 'sesame'],
    ingredients: [ing('Tortilla wraps', 1, 'piece', 'bakery'), ing('Hummus', 40, 'g', 'pantry'), ing('Red pepper', 0.5, 'piece', 'produce'), ing('Courgette', 0.5, 'piece', 'produce')],
    instructions: ['Roast the sliced pepper and courgette at 200°C for 20 minutes.', 'Spread hummus over the wraps.', 'Add the vegetables, roll up and serve.'],
  },
  // ── Dinner ─────────────────────────────────────────────────
  {
    id: 'spaghetti-bolognese', mealType: 'dinner', title: 'Spaghetti bolognese',
    description: 'A classic family bolognese that freezes well.',
    prepTimeMinutes: 10, cookTimeMinutes: 35, diets: ['dairy-free'], allergens: ['wheat'],
    ingredients: [ing('Beef mince', 100, 'g', 'meat-fish'), ing('Spaghetti', 80, 'g', 'pantry'), ing('Chopped tomatoes', 0.5, 'can', 'pantry'), ing('Onion', 0.5, 'piece', 'produce'), ing('Garlic', 1, 'clove', 'produce')],
    instructions: ['Brown the mince with the onion and garlic.', 'Add the tomatoes and simmer for 25 minutes.', 'Cook the spaghetti, drain and serve with the sauce.'],
  },
  {
    id: 'baked-salmon-potatoes', mealType: 'dinner', title: 'Baked salmon with potatoes and broccoli',
    description: 'Sheet-pan salmon with crispy roast potatoes and greens.',
    prepTimeMinutes: 10, cookTimeMinutes: 30, diets: ['pescatarian', 'gluten-free', 'dairy-free'], allergens: ['fish'],
    ingredients: [ing('Salmon fillet', 1, 'piece', 'meat-fish'), ing('Baby potatoes', 150, 'g', 'produce'), ing('Broccoli', 80, 'g', 'produce'), ing('Olive oil', 1, 'tbsp', 'pantry'), ing('Lemon', 0.25, 'piece', 'produce')],
    instructions: ['Roast the halved potatoes in oil at 200°C for 15 minutes.', 'Add the salmon and broccoli and roast for 12–15 minutes more.', 'Serve with lemon wedges.'],
  },
  {
    id: 'tofu-veg-stir-fry', mealType: 'dinner', title: 'Tofu and vegetable stir-fry',
    description: 'Crisp vegetables and tofu in a tamari-ginger sauce over rice.',
    prepTimeMinutes: 15, cookTimeMinutes: 12, diets: ['vegan', 'gluten-free'], allergens: ['soy'],
    ingredients: [ing('Firm tofu', 100, 'g', 'other'), ing('Mixed stir-fry vegetables', 120, 'g', 'produce'), ing('Tamari (gluten-free soy sauce)', 1, 'tbsp', 'pantry'), ing('Fresh ginger', 0.5, 'tsp', 'produce'), ing('Basmati rice', 60, 'g', 'pantry')],
    instructions: ['Cook the rice according to the packet.', 'Fry the cubed tofu until golden, then add the vegetables and ginger.', 'Add the tamari, toss for 2 minutes and serve over rice.'],
  },
  {
    id: 'chicken-veg-traybake', mealType: 'dinner', title: 'Chicken and vegetable traybake',
    description: 'One tray of chicken thighs, potatoes and seasonal vegetables.',
    prepTimeMinutes: 15, cookTimeMinutes: 40, diets: ['gluten-free', 'dairy-free'], allergens: [],
    ingredients: [ing('Chicken thighs', 2, 'piece', 'meat-fish'), ing('Baby potatoes', 150, 'g', 'produce'), ing('Carrot', 1, 'piece', 'produce'), ing('Red onion', 0.5, 'piece', 'produce'), ing('Olive oil', 1, 'tbsp', 'pantry')],
    instructions: ['Toss the vegetables and chicken in oil with salt and pepper.', 'Roast at 200°C for 35–40 minutes until the chicken is cooked through.', 'Rest for 5 minutes and serve.'],
  },
  {
    id: 'mushroom-risotto', mealType: 'dinner', title: 'Mushroom risotto',
    description: 'Creamy risotto with browned mushrooms and parmesan.',
    prepTimeMinutes: 10, cookTimeMinutes: 30, diets: ['vegetarian', 'gluten-free'], allergens: ['milk'],
    ingredients: [ing('Arborio rice', 75, 'g', 'pantry'), ing('Mushrooms', 100, 'g', 'produce'), ing('Onion', 0.5, 'piece', 'produce'), ing('Vegetable stock', 250, 'ml', 'pantry'), ing('Parmesan', 15, 'g', 'dairy-eggs'), ing('Butter', 1, 'tsp', 'dairy-eggs')],
    instructions: ['Brown the sliced mushrooms and set aside.', 'Soften the onion, stir in the rice, then add stock a ladle at a time.', 'After about 20 minutes stir in the mushrooms, butter and parmesan.'],
  },
  {
    id: 'black-bean-chilli', mealType: 'dinner', title: 'Black bean chilli with rice',
    description: 'Smoky, warming bean chilli served over fluffy rice.',
    prepTimeMinutes: 10, cookTimeMinutes: 30, diets: ['vegan', 'gluten-free'], allergens: [],
    ingredients: [ing('Tinned black beans', 0.5, 'can', 'pantry'), ing('Chopped tomatoes', 0.5, 'can', 'pantry'), ing('Red pepper', 0.5, 'piece', 'produce'), ing('Onion', 0.5, 'piece', 'produce'), ing('Chilli powder', 0.5, 'tsp', 'pantry'), ing('Basmati rice', 60, 'g', 'pantry')],
    instructions: ['Soften the onion and pepper with the chilli powder.', 'Add the beans and tomatoes and simmer for 25 minutes.', 'Serve over cooked rice.'],
  },
  {
    id: 'garlic-prawn-courgette', mealType: 'dinner', title: 'Garlic prawns with courgette noodles',
    description: 'A light, fast dinner of garlicky prawns over spiralised courgette.',
    prepTimeMinutes: 10, cookTimeMinutes: 8, diets: ['pescatarian', 'gluten-free', 'dairy-free', 'low-carb'], allergens: ['shellfish'],
    ingredients: [ing('Raw king prawns', 120, 'g', 'meat-fish'), ing('Courgette', 1, 'piece', 'produce'), ing('Garlic', 2, 'clove', 'produce'), ing('Olive oil', 1, 'tbsp', 'pantry'), ing('Lemon', 0.25, 'piece', 'produce')],
    instructions: ['Spiralise the courgette.', 'Fry the garlic and prawns in oil for 3–4 minutes until pink.', 'Toss in the courgette noodles for 1 minute and finish with lemon.'],
  },
];

export const SAMPLE_RECIPES: readonly SampleRecipe[] = recipes.map((recipe) => ({
  ...recipe,
  diets: expandDiets(recipe.diets),
}));
