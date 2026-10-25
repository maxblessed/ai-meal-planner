import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';

import { colors, radii, spacing, touchTarget } from '@/theme';
import { AppText } from './AppText';

type ChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
  /** 'checkbox' for multi-select groups, 'radio' for single-select. */
  role?: 'checkbox' | 'radio';
};

export function Chip({ label, selected, onPress, role = 'checkbox' }: ChipProps) {
  return (
    <Pressable
      accessibilityRole={role}
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={[styles.chip, selected && styles.selected]}
    >
      {selected && <Ionicons name="checkmark" size={16} color={colors.onPrimary} />}
      <AppText variant="label" tone={selected ? 'onPrimary' : 'default'}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: touchTarget - 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  selected: { backgroundColor: colors.primary, borderColor: colors.primary },
});
