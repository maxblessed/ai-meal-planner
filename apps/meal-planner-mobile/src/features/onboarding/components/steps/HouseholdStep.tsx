import { Controller, useFormContext } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { NumberStepper } from '@/components/ui/NumberStepper';
import { HOUSEHOLD_SIZE_MAX, HOUSEHOLD_SIZE_MIN, type PreferencesFormValues } from '@/features/preferences';
import { spacing } from '@/theme';

export function HouseholdStep() {
  const { control } = useFormContext<PreferencesFormValues>();

  return (
    <Controller
      control={control}
      name="householdSize"
      render={({ field }) => (
        <View style={styles.wrapper}>
          <NumberStepper
            label="household size"
            value={field.value}
            min={HOUSEHOLD_SIZE_MIN}
            max={HOUSEHOLD_SIZE_MAX}
            onChange={field.onChange}
          />
          <AppText tone="muted" style={styles.caption}>
            {field.value === 1 ? 'person' : 'people'} · up to {HOUSEHOLD_SIZE_MAX}
          </AppText>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.md, paddingVertical: spacing.xl },
  caption: { textAlign: 'center' },
});
