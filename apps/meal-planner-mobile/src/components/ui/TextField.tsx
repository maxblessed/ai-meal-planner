import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { colors, radii, spacing, touchTarget, typography } from '@/theme';
import { AppText } from './AppText';

type TextFieldProps = Omit<TextInputProps, 'style'> & {
  label?: string;
  hint?: string;
  error?: string;
  /** Static text shown before the input, e.g. a currency symbol. */
  prefix?: string;
};

export function TextField({ label, hint, error, prefix, accessibilityLabel, ...inputProps }: TextFieldProps) {
  return (
    <View style={styles.wrapper}>
      {label && <AppText variant="label">{label}</AppText>}
      <View style={[styles.field, error ? styles.fieldError : null]}>
        {prefix && (
          <AppText variant="heading" tone="muted">
            {prefix}
          </AppText>
        )}
        <TextInput
          {...inputProps}
          accessibilityLabel={accessibilityLabel ?? label}
          placeholderTextColor={colors.placeholder}
          style={styles.input}
        />
      </View>
      {error ? (
        <AppText variant="caption" tone="danger" accessibilityRole="alert">
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="caption" tone="muted">
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.sm },
  field: {
    minHeight: touchTarget + 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  fieldError: { borderColor: colors.danger, backgroundColor: colors.dangerSurface },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    paddingVertical: spacing.md,
    // Removes the default browser focus outline on web; the border carries the state.
    outlineStyle: 'none',
  } as object,
});
