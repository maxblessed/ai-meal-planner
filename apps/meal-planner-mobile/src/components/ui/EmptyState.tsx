import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { colors, radii, spacing } from '@/theme';
import { AppText } from './AppText';
import { Button } from './Button';
import { Card } from './Card';

type EmptyStateProps = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  description: string;
  actionLabel?: string;
  onActionPress?: () => void;
};

export function EmptyState({ icon, title, description, actionLabel, onActionPress }: EmptyStateProps) {
  return (
    <Card tone="sage" style={styles.card}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={26} color={colors.primary} />
      </View>
      <AppText variant="heading" style={styles.centered}>
        {title}
      </AppText>
      <AppText tone="muted" style={styles.centered}>
        {description}
      </AppText>
      {actionLabel && onActionPress && (
        <Button title={actionLabel} variant="secondary" onPress={onActionPress} style={styles.action} />
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'center' },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centered: { textAlign: 'center' },
  action: { marginTop: spacing.sm },
});
