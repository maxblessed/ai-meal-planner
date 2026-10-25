import { useFormContext } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { formatMoney, getCountry } from '@/config/countries';
import {
  DIETARY_PREFERENCE_LABELS,
  parseBudgetInput,
  type PreferencesFormValues,
} from '@/features/preferences';
import { colors, spacing } from '@/theme';
import type { StepId } from '../../hooks/useOnboardingWizard';

type ReviewStepProps = {
  onEdit: (step: StepId) => void;
};

export function ReviewStep({ onEdit }: ReviewStepProps) {
  const { getValues } = useFormContext<PreferencesFormValues>();
  const values = getValues();
  const country = getCountry(values.countryCode);
  const budget = parseBudgetInput(values.weeklyBudget);
  const list = (items: string[], empty: string) => (items.length ? items.join(', ') : empty);

  return (
    <Card style={styles.card}>
      <Row
        label="Country"
        value={`${country.name} · ${country.currencyCode} (${country.currencySymbol})`}
        onEdit={() => onEdit('country')}
      />
      <Row
        label="Household"
        value={`${values.householdSize} ${values.householdSize === 1 ? 'person' : 'people'}`}
        onEdit={() => onEdit('household')}
      />
      <Row
        label="Dietary preferences"
        value={list(
          values.dietaryPreferences.map((p) => DIETARY_PREFERENCE_LABELS[p]),
          'No specific preference',
        )}
        onEdit={() => onEdit('diet')}
      />
      <Row label="Allergies" value={list(values.allergies, 'None')} onEdit={() => onEdit('diet')} />
      <Row
        label="Disliked ingredients"
        value={list(values.dislikedIngredients, 'None')}
        onEdit={() => onEdit('diet')}
      />
      <Row
        label="Weekly budget"
        value={budget === null ? '—' : `${formatMoney(budget, values.countryCode)} per week`}
        onEdit={() => onEdit('budget')}
        last
      />
    </Card>
  );
}

function Row({ label, value, onEdit, last = false }: { label: string; value: string; onEdit: () => void; last?: boolean }) {
  return (
    <View style={[styles.row, !last && styles.divider]}>
      <View style={styles.rowText}>
        <AppText variant="caption" tone="muted">
          {label}
        </AppText>
        <AppText variant="bodyStrong">{value}</AppText>
      </View>
      <Button title="Edit" variant="ghost" accessibilityLabel={`Edit ${label}`} onPress={onEdit} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { paddingVertical: spacing.sm, gap: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  rowText: { flex: 1, gap: 2 },
});
