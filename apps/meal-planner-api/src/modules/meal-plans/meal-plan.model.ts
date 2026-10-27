import { model, models, Schema, type Model } from 'mongoose';

import type { NewMealPlan } from './meal-plan.types';

const ingredientSchema = new Schema(
  { name: String, quantity: Number, unit: String, category: String },
  { _id: false },
);

const mealSchema = new Schema(
  {
    id: { type: String, required: true },
    mealType: { type: String, required: true },
    title: { type: String, required: true },
    description: String,
    prepTimeMinutes: Number,
    cookTimeMinutes: Number,
    servings: Number,
    ingredients: [ingredientSchema],
    instructions: [String],
    dietaryTags: [String],
    estimatedCost: { type: new Schema({ amount: Number, currencyCode: String, isEstimate: Boolean }, { _id: false }) },
  },
  { _id: false },
);

const daySchema = new Schema({ date: { type: String, required: true }, meals: [mealSchema] }, { _id: false });

// Dates are stored as ISO strings so documents match the shared API contract 1:1.
const mealPlanSchema = new Schema<NewMealPlan>(
  {
    ownerId: { type: String, required: true, index: true },
    startDate: { type: String, required: true },
    endDate: { type: String, required: true },
    countryCode: { type: String, required: true },
    currencyCode: { type: String, required: true },
    householdSize: { type: Number, required: true },
    weeklyBudget: { type: Number, required: true },
    dietaryPreferences: [String],
    allergies: [String],
    dislikedIngredients: [String],
    days: [daySchema],
    generation: {
      status: String,
      source: String,
      generatorName: String,
      generatedAt: String,
    },
    createdAt: { type: String, required: true },
  },
  { collection: 'meal_plans', versionKey: false },
);

// Reuse the compiled model when the module is re-evaluated (hot reload, warm Lambda).
export const MealPlanModel: Model<NewMealPlan> =
  (models['MealPlan'] as Model<NewMealPlan> | undefined) ?? model<NewMealPlan>('MealPlan', mealPlanSchema);
