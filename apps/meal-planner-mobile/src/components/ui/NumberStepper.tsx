import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radii, spacing } from '@/theme';
import { AppText } from './AppText';

type NumberStepperProps = {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  label: string;
};

export function NumberStepper({ value, min, max, onChange, label }: NumberStepperProps) {
  return (
    <View
      style={styles.row}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ min, max, now: value }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === 'increment' && value < max) onChange(value + 1);
        if (event.nativeEvent.actionName === 'decrement' && value > min) onChange(value - 1);
      }}
    >
      <StepButton icon="remove" label={`Decrease ${label}`} disabled={value <= min} onPress={() => onChange(value - 1)} />
      <View style={styles.value}>
        <AppText variant="display">{value}</AppText>
      </View>
      <StepButton icon="add" label={`Increase ${label}`} disabled={value >= max} onPress={() => onChange(value + 1)} />
    </View>
  );
}

function StepButton({
  icon,
  label,
  disabled,
  onPress,
}: {
  icon: 'add' | 'remove';
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.button, disabled && styles.disabled]}
    >
      <Ionicons name={icon} size={28} color={colors.primary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xl },
  value: { minWidth: 72, alignItems: 'center' },
  button: {
    width: 60,
    height: 60,
    borderRadius: radii.pill,
    backgroundColor: colors.sage,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.4 },
});
