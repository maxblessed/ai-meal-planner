import { Pressable, StyleSheet, View } from 'react-native';

import { spacing } from '@/theme';
import { AppText } from './AppText';

type SectionHeadingProps = {
  title: string;
  actionLabel?: string;
  onActionPress?: () => void;
};

export function SectionHeading({ title, actionLabel, onActionPress }: SectionHeadingProps) {
  return (
    <View style={styles.row}>
      <AppText variant="heading" accessibilityRole="header">
        {title}
      </AppText>
      {actionLabel && onActionPress && (
        <Pressable accessibilityRole="button" onPress={onActionPress} hitSlop={spacing.md}>
          <AppText variant="label" tone="primary">
            {actionLabel}
          </AppText>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
