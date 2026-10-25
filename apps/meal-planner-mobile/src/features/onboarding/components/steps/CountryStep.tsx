import { Ionicons } from '@expo/vector-icons';
import { Controller, useFormContext } from 'react-hook-form';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { COUNTRY_LIST } from '@/config/countries';
import type { PreferencesFormValues } from '@/features/preferences';
import { colors, radii, spacing, touchTarget } from '@/theme';

export function CountryStep() {
  const { control } = useFormContext<PreferencesFormValues>();

  return (
    <Controller
      control={control}
      name="countryCode"
      render={({ field }) => (
        <View style={styles.list} accessibilityRole="radiogroup">
          {COUNTRY_LIST.map((country) => {
            const selected = field.value === country.code;
            return (
              <Pressable
                key={country.code}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                accessibilityLabel={`${country.name}, ${country.currencyCode}`}
                onPress={() => field.onChange(country.code)}
                style={[styles.option, selected && styles.selected]}
              >
                <View style={styles.text}>
                  <AppText variant="heading">{country.name}</AppText>
                  <AppText tone="muted">
                    Prices in {country.currencyCode} ({country.currencySymbol})
                  </AppText>
                </View>
                <Ionicons
                  name={selected ? 'radio-button-on' : 'radio-button-off'}
                  size={26}
                  color={selected ? colors.primary : colors.placeholder}
                />
              </Pressable>
            );
          })}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.md },
  option: {
    minHeight: touchTarget + 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  selected: { borderColor: colors.primary, backgroundColor: colors.sage },
  text: { flex: 1, gap: spacing.xs },
});
