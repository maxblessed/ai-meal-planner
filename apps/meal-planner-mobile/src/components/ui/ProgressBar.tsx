import { StyleSheet, View } from 'react-native';

import { colors, radii } from '@/theme';

type ProgressBarProps = {
  /** 0–1 */
  progress: number;
  label: string;
};

export function ProgressBar({ progress, label }: ProgressBarProps) {
  const percent = Math.round(Math.min(Math.max(progress, 0), 1) * 100);
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: percent }}
      style={styles.track}
    >
      <View style={[styles.fill, { width: `${percent}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: 8, borderRadius: radii.pill, backgroundColor: colors.sageStrong, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radii.pill, backgroundColor: colors.primary },
});
