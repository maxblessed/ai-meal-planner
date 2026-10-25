import { Ionicons } from '@expo/vector-icons';
import { StyleSheet } from 'react-native';

import { colors, spacing } from '@/theme';
import { AppText } from './AppText';
import { Button } from './Button';
import { Card } from './Card';

type ErrorStateProps = {
  title?: string;
  message: string;
  onRetry?: () => void;
  retrying?: boolean;
};

export function ErrorState({ title = 'Something went wrong', message, onRetry, retrying }: ErrorStateProps) {
  return (
    <Card style={styles.card}>
      <Ionicons name="alert-circle-outline" size={28} color={colors.danger} />
      <AppText variant="heading" accessibilityRole="alert">
        {title}
      </AppText>
      <AppText tone="muted" style={styles.text}>
        {message}
      </AppText>
      {onRetry && <Button title="Try again" variant="secondary" onPress={onRetry} loading={retrying} />}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'center', backgroundColor: colors.dangerSurface, borderColor: colors.dangerSurface, gap: spacing.md },
  text: { textAlign: 'center' },
});
