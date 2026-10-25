import type { MealPlan } from '@ai-meal-planner/shared';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { formatDateRange, formatDayLabel } from './format';
import { MealCard } from './MealCard';
import { spacing } from '@/theme';

type WeeklyPlanViewProps = {
  plan: MealPlan;
  onOpenMeal: (mealId: string) => void;
  onGenerateNew: () => void;
  generating: boolean;
};

export function WeeklyPlanView({ plan, onOpenMeal, onGenerateNew, generating }: WeeklyPlanViewProps) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <AppText variant="label" tone="muted">
          {formatDateRange(plan.startDate, plan.endDate)} · {plan.householdSize}{' '}
          {plan.householdSize === 1 ? 'person' : 'people'}
        </AppText>
      </View>

      {plan.generation.source === 'development-sample' && (
        <Card tone="sage" accessibilityLabel="Sample plan notice">
          <AppText variant="label">Sample plan</AppText>
          <AppText variant="caption" tone="muted">
            These meals come from a small built-in development set, not AI, and have no price estimates yet.
          </AppText>
        </Card>
      )}

      {plan.days.map((day) => (
        <View key={day.date} style={styles.day}>
          <AppText variant="heading" accessibilityRole="header">
            {formatDayLabel(day.date)}
          </AppText>
          {day.meals.map((meal) => (
            <MealCard key={meal.id} meal={meal} onPress={() => onOpenMeal(meal.id)} />
          ))}
        </View>
      ))}

      <Button title="Generate a new plan" variant="secondary" loading={generating} onPress={onGenerateNew} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.xl },
  header: { gap: spacing.xs },
  day: { gap: spacing.md },
});
