import { Controller, useFormContext } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { TextField } from '@/components/ui/TextField';
import { getCountry } from '@/config/countries';
import type { PreferencesFormValues } from '@/features/preferences';
import { spacing } from '@/theme';

export function BudgetStep() {
  const { control, watch } = useFormContext<PreferencesFormValues>();
  const country = getCountry(watch('countryCode'));

  return (
    <View style={styles.wrapper}>
      <Controller
        control={control}
        name="weeklyBudget"
        render={({ field, fieldState }) => (
          <TextField
            label={`Weekly budget (${country.currencyCode})`}
            prefix={country.currencySymbol}
            placeholder="e.g. 85"
            keyboardType="decimal-pad"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
          />
        )}
      />
      <AppText tone="muted">
        This is the total for your whole household, not per person. We&apos;ll use it to tailor future meal plans
        and grocery lists.
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.lg },
});
