import type { Meal } from '@ai-meal-planner/shared';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { colors, spacing } from '@/theme';
import { formatDuration, MEAL_TYPE_LABELS } from './format';

const PREVIEW_COUNT = 4;

type MealCardProps = {
  meal: Meal;
  onPress: () => void;
};

export function MealCard({ meal, onPress }: MealCardProps) {
  const names = meal.ingredients.map((i) => i.name);
  const extra = names.length - PREVIEW_COUNT;
  const time = formatDuration(meal);

  return (
    <Card
      onPress={onPress}
      accessibilityLabel={`${MEAL_TYPE_LABELS[meal.mealType]}: ${meal.title}. ${time}, serves ${meal.servings}. Open details`}
      style={styles.card}
    >
      <AppText variant="label" tone="primary">
        {MEAL_TYPE_LABELS[meal.mealType]}
      </AppText>
      <AppText variant="heading">{meal.title}</AppText>
      <View style={styles.meta}>
        <Meta icon="time-outline" text={time} />
        <Meta icon="people-outline" text={`Serves ${meal.servings}`} />
      </View>
      <AppText variant="caption" tone="muted" numberOfLines={2}>
        {names.slice(0, PREVIEW_COUNT).join(', ')}
        {extra > 0 ? ` +${extra} more` : ''}
      </AppText>
    </Card>
  );
}

export function Meta({ icon, text }: { icon: React.ComponentProps<typeof Ionicons>['name']; text: string }) {
  return (
    <View style={styles.metaItem}>
      <Ionicons name={icon} size={16} color={colors.textMuted} />
      <AppText variant="label" tone="muted">
        {text}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: spacing.lg, gap: spacing.sm },
  meta: { flexDirection: 'row', gap: spacing.lg },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
});
