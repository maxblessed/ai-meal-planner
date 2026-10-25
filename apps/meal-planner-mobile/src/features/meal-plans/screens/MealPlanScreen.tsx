import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { spacing } from '@/theme';
import { WeeklyPlanView } from '../components/WeeklyPlanView';
import { useGenerateMealPlan, useMealPlans } from '../hooks/useMealPlans';

export function MealPlanScreen() {
  const router = useRouter();
  const plans = useMealPlans();
  const generate = useGenerateMealPlan();
  const plan = plans.data?.[0];

  const generatePlan = () => generate.mutate();

  return (
    <Screen>
      <AppText variant="display" accessibilityRole="header">
        Meal plan
      </AppText>

      {generate.isError && (
        <ErrorState
          title="Couldn't create your plan"
          message={generate.error.message}
          onRetry={generatePlan}
          retrying={generate.isPending}
        />
      )}

      {plans.isPending ? (
        <LoadingState message="Loading your meal plan…" />
      ) : plans.isError ? (
        <ErrorState
          title="Couldn't load your meal plan"
          message={plans.error.message}
          onRetry={() => plans.refetch()}
          retrying={plans.isRefetching}
        />
      ) : plan ? (
        <WeeklyPlanView
          plan={plan}
          generating={generate.isPending}
          onGenerateNew={generatePlan}
          onOpenMeal={(mealId) => router.push({ pathname: '/meal/[planId]/[mealId]', params: { planId: plan.id, mealId } })}
        />
      ) : (
        <View style={styles.empty}>
          <EmptyState
            icon="calendar-outline"
            title="No meal plan yet"
            description="Generate a sample seven-day plan based on your household, diet and allergies."
          />
          <Button title="Generate a 7-day sample plan" loading={generate.isPending} onPress={generatePlan} />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: { gap: spacing.lg },
});
