import type { Ingredient, Meal, MealType } from '@ai-meal-planner/shared';

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
};

const UNIT_LABELS: Record<Ingredient['unit'], string> = {
  g: 'g',
  ml: 'ml',
  tsp: 'tsp',
  tbsp: 'tbsp',
  piece: '',
  clove: 'clove',
  slice: 'slice',
  can: 'can',
};

/** "120 g", "1½ ", "2 cloves": whole numbers and halves/quarters read naturally. */
export function formatQuantity({ quantity, unit }: Pick<Ingredient, 'quantity' | 'unit'>): string {
  const fractions: Record<number, string> = { 0.25: '¼', 0.5: '½', 0.75: '¾' };
  const whole = Math.floor(quantity);
  const fraction = fractions[Math.round((quantity - whole) * 100) / 100];
  const amount = fraction ? `${whole > 0 ? whole : ''}${fraction}` : String(Math.round(quantity * 100) / 100);
  const label = UNIT_LABELS[unit];
  const plural = label && ['clove', 'slice', 'can'].includes(label) && quantity > 1 ? `${label}s` : label;
  return plural ? `${amount} ${plural}` : amount;
}

export function formatDuration(meal: Pick<Meal, 'prepTimeMinutes' | 'cookTimeMinutes'>): string {
  const total = meal.prepTimeMinutes + meal.cookTimeMinutes;
  return total >= 60 ? `${Math.floor(total / 60)} h${total % 60 ? ` ${total % 60} min` : ''}` : `${total} min`;
}

/** "Monday 30 March" — parsed and formatted in UTC so the calendar date never shifts with time zone. */
export function formatDayLabel(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  });
}

export function formatDateRange(start: string, end: string): string {
  const short = (d: string) =>
    new Date(`${d}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  return `${short(start)} – ${short(end)}`;
}
