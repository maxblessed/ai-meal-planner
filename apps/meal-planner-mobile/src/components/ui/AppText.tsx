import { Text, type TextProps } from 'react-native';

import { toneColors, typography, type TextTone, type TextVariant } from '@/theme';

type AppTextProps = TextProps & {
  variant?: TextVariant;
  tone?: TextTone;
};

export function AppText({ variant = 'body', tone = 'default', style, ...props }: AppTextProps) {
  return <Text {...props} style={[typography[variant], { color: toneColors[tone] }, style]} />;
}
