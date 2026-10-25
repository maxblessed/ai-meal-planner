import { Controller, useFormContext } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { TagInput } from '@/components/ui/TagInput';
import {
  COMMON_ALLERGENS,
  DIETARY_PREFERENCES,
  DIETARY_PREFERENCE_LABELS,
  type DietaryPreference,
  type PreferencesFormValues,
} from '@/features/preferences';
import { spacing } from '@/theme';

export function DietStep() {
  const { control } = useFormContext<PreferencesFormValues>();

  return (
    <View style={styles.sections}>
      <View style={styles.section}>
        <AppText variant="heading">Dietary preferences</AppText>
        <AppText tone="muted">Choose any that apply, or none.</AppText>
        <Controller
          control={control}
          name="dietaryPreferences"
          render={({ field }) => {
            const toggle = (item: DietaryPreference) =>
              field.onChange(
                field.value.includes(item) ? field.value.filter((v) => v !== item) : [...field.value, item],
              );
            return (
              <View style={styles.chips}>
                <Chip
                  label="No specific preference"
                  selected={field.value.length === 0}
                  onPress={() => field.onChange([])}
                />
                {DIETARY_PREFERENCES.map((item) => (
                  <Chip
                    key={item}
                    label={DIETARY_PREFERENCE_LABELS[item]}
                    selected={field.value.includes(item)}
                    onPress={() => toggle(item)}
                  />
                ))}
              </View>
            );
          }}
        />
      </View>

      <Card tone="sage">
        <AppText variant="heading">Food allergies</AppText>
        <AppText tone="muted">Allergies are treated as strict exclusions, not preferences.</AppText>
        <Controller
          control={control}
          name="allergies"
          render={({ field }) => (
            <TagInput
              label="Other allergy"
              placeholder="e.g. Lupin"
              value={field.value}
              onChange={field.onChange}
              suggestions={COMMON_ALLERGENS}
            />
          )}
        />
      </Card>

      <View style={styles.section}>
        <AppText variant="heading">Ingredients you dislike</AppText>
        <AppText tone="muted">We&apos;ll avoid these where we can.</AppText>
        <Controller
          control={control}
          name="dislikedIngredients"
          render={({ field }) => (
            <TagInput
              label="Disliked ingredient"
              placeholder="e.g. Mushrooms"
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sections: { gap: spacing.xl },
  section: { gap: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
