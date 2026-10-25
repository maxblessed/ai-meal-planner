import { Screen } from '@/components/layout/Screen';
import { AppText } from '@/components/ui/AppText';
import { EmptyState } from '@/components/ui/EmptyState';

export function MealPlanScreen() {
  return (
    <Screen>
      <AppText variant="display" accessibilityRole="header">
        Meal plan
      </AppText>
      <EmptyState
        icon="calendar-outline"
        title="Meal planning is coming soon"
        description="Personalised weekly plans aren't available yet. Your preferences are saved and ready for when they are."
      />
    </Screen>
  );
}
