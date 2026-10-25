import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { colors, spacing, touchTarget } from '@/theme';
import { formatQuantity, MEAL_TYPE_LABELS } from '../components/format';
import { Meta } from '../components/MealCard';
import { useMealPlan, useReplaceMeal } from '../hooks/useMealPlans';

export function MealDetailScreen() {
  const router = useRouter();
  const { planId, mealId } = useLocalSearchParams<{ planId: string; mealId: string }>();
  const plan = useMealPlan(planId);
  const replace = useReplaceMeal(planId);

  const backToPlan = () => (router.canGoBack() ? router.back() : router.replace('/meal-plan'));

  const meal = plan.data?.days.flatMap((day) => day.meals).find((m) => m.id === mealId);

  return (
    <Screen>
      <Pressable accessibilityRole="button" accessibilityLabel="Back to weekly plan" onPress={backToPlan} style={styles.back}>
        <Ionicons name="chevron-back" size={22} color={colors.primary} />
        <AppText variant="label" tone="primary">
          Weekly plan
        </AppText>
      </Pressable>

      {plan.isPending ? (
        <LoadingState message="Loading meal…" />
      ) : plan.isError ? (
        <ErrorState title="Couldn't load this meal" message={plan.error.message} onRetry={() => plan.refetch()} />
      ) : !meal ? (
        <ErrorState title="Meal not found" message="This meal is no longer part of your plan." />
      ) : (
        <>
          <View style={styles.title}>
            <AppText variant="label" tone="primary">
              {MEAL_TYPE_LABELS[meal.mealType]}
            </AppText>
            <AppText variant="display" accessibilityRole="header">
              {meal.title}
            </AppText>
            <AppText tone="muted">{meal.description}</AppText>
          </View>

          <View style={styles.meta}>
            <Meta icon="cut-outline" text={`Prep ${meal.prepTimeMinutes} min`} />
            <Meta icon="flame-outline" text={`Cook ${meal.cookTimeMinutes} min`} />
            <Meta icon="people-outline" text={`Serves ${meal.servings}`} />
          </View>

          <Card>
            <AppText variant="heading">Ingredients</AppText>
            {meal.ingredients.map((ingredient) => (
              <View key={ingredient.name} style={styles.ingredient}>
                <AppText style={styles.flex}>{ingredient.name}</AppText>
                <AppText tone="muted">{formatQuantity(ingredient)}</AppText>
              </View>
            ))}
          </Card>

          <Card tone="sage">
            <AppText variant="heading">Method</AppText>
            {meal.instructions.map((step, index) => (
              <View key={step} style={styles.step}>
                <AppText variant="bodyStrong" tone="primary">
                  {index + 1}.
                </AppText>
                <AppText style={styles.flex}>{step}</AppText>
              </View>
            ))}
          </Card>

          {replace.isError && (
            <ErrorState
              title="Couldn't replace this meal"
              message={replace.error.message}
              onRetry={() => replace.mutate(meal.id)}
              retrying={replace.isPending}
            />
          )}

          <Button
            title="Replace this meal"
            variant="secondary"
            icon={<Ionicons name="swap-horizontal" size={20} color={colors.primary} />}
            loading={replace.isPending}
            onPress={() => replace.mutate(meal.id)}
          />
          <Button title="Back to weekly plan" onPress={backToPlan} />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: { flexDirection: 'row', alignItems: 'center', minHeight: touchTarget, alignSelf: 'flex-start' },
  title: { gap: spacing.sm },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
  ingredient: { flexDirection: 'row', gap: spacing.md },
  step: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
});
