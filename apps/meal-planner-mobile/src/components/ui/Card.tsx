import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radii, shadows, spacing } from '@/theme';

type CardProps = {
  children: React.ReactNode;
  tone?: 'surface' | 'sage' | 'brand';
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

const backgrounds = { surface: colors.surface, sage: colors.sage, brand: colors.primary } as const;

export function Card({ children, tone = 'surface', onPress, accessibilityLabel, style }: CardProps) {
  const cardStyle = [
    styles.card,
    { backgroundColor: backgrounds[tone] },
    tone === 'surface' && styles.bordered,
    tone === 'surface' && shadows.card,
    style,
  ];

  if (!onPress) return <View style={cardStyle}>{children}</View>;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [cardStyle, pressed && styles.pressed]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radii.lg, padding: spacing.xl, gap: spacing.md },
  bordered: { borderWidth: 1, borderColor: colors.border },
  pressed: { opacity: 0.85 },
});
