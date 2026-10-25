import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { colors, spacing } from '@/theme';
import { AppText } from './AppText';

export function LoadingState({ message }: { message: string }) {
  return (
    <View style={styles.wrapper} accessibilityRole="progressbar" accessibilityLabel={message}>
      <ActivityIndicator color={colors.primary} size="large" />
      <AppText tone="muted">{message}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxl },
});
