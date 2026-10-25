import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { formatMoney, getCountry } from '@/config/countries';
import { DIETARY_PREFERENCE_LABELS, useRequiredPreferences } from '@/features/preferences';
import { colors, radii, spacing, touchTarget } from '@/theme';

export function HomeScreen() {
  const router = useRouter();
  const preferences = useRequiredPreferences();
  const country = getCountry(preferences.countryCode);

  const diet = preferences.dietaryPreferences.length
    ? preferences.dietaryPreferences.map((p) => DIETARY_PREFERENCE_LABELS[p]).join(', ')
    : 'No specific preference';

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <AppText variant="display" accessibilityRole="header">
            Welcome back
          </AppText>
          <AppText tone="muted">Let&apos;s make this week&apos;s food simple.</AppText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Edit preferences"
          onPress={() => router.push('/preferences')}
          style={styles.iconButton}
        >
          <Ionicons name="options-outline" size={24} color={colors.primary} />
        </Pressable>
      </View>

      <Card tone="sage">
        <View style={styles.summaryRow}>
          <SummaryItem
            label="Household"
            value={`${preferences.householdSize} ${preferences.householdSize === 1 ? 'person' : 'people'}`}
          />
          <SummaryItem label="Weekly budget" value={formatMoney(preferences.weeklyBudget, preferences.countryCode)} />
        </View>
        <AppText variant="caption" tone="muted">
          {country.name} · {diet}
          {preferences.allergies.length > 0 ? ` · Allergies: ${preferences.allergies.join(', ')}` : ''}
        </AppText>
      </Card>

      <Card tone="brand">
        <AppText variant="title" tone="onPrimary">
          Plan your week
        </AppText>
        <AppText tone="onPrimaryMuted">
          Build a meal plan around your household and budget.
        </AppText>
        <Button
          title="Create a meal plan"
          variant="inverse"
          onPress={() => router.push('/meal-plan')}
          style={styles.cta}
        />
      </Card>

      <View style={styles.section}>
        <SectionHeading title="This week's meals" />
        <EmptyState
          icon="restaurant-outline"
          title="No meal plan yet"
          description="Once you create a plan, your meals for the week will show up here."
        />
      </View>

      <View style={styles.section}>
        <SectionHeading title="Shopping list" />
        <Card onPress={() => router.push('/shopping-list')} accessibilityLabel="Open shopping list">
          <View style={styles.linkRow}>
            <Ionicons name="cart-outline" size={24} color={colors.primary} />
            <View style={styles.headerText}>
              <AppText variant="bodyStrong">Your shopping list</AppText>
              <AppText tone="muted">Ingredients will be collected here from your meal plan.</AppText>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.placeholder} />
          </View>
        </Card>
      </View>

      <View style={styles.section}>
        <SectionHeading title="Savings" />
        <EmptyState
          icon="pricetag-outline"
          title="No savings to show yet"
          description="Supermarket price comparison isn't available yet. When it is, your savings will appear here."
        />
      </View>
    </Screen>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryItem}>
      <AppText variant="caption" tone="muted">
        {label}
      </AppText>
      <AppText variant="heading">{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  headerText: { flex: 1, gap: spacing.xs },
  iconButton: {
    width: touchTarget,
    height: touchTarget,
    borderRadius: radii.pill,
    backgroundColor: colors.sage,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryRow: { flexDirection: 'row', gap: spacing.lg },
  summaryItem: { flex: 1, gap: spacing.xs },
  cta: { marginTop: spacing.sm, alignSelf: 'flex-start' },
  section: { gap: spacing.md },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
});
