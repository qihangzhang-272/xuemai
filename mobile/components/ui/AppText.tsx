import { PropsWithChildren } from 'react';
import { StyleProp, Text, TextStyle } from 'react-native';

import { colors, typography } from '@/theme/tokens';

type AppTextProps = PropsWithChildren<{
  variant?: 'h1' | 'h2' | 'h3' | 'body' | 'small' | 'muted';
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}>;

export function AppText({ children, variant = 'body', style, numberOfLines }: AppTextProps) {
  const base =
    variant === 'muted'
      ? { ...typography.small, color: colors.textMuted }
      : variant === 'h1'
        ? typography.h1
        : variant === 'h2'
          ? typography.h2
          : variant === 'h3'
            ? typography.h3
            : variant === 'small'
              ? typography.small
              : typography.body;

  return (
    <Text style={[base, style]} numberOfLines={numberOfLines}>
      {children}
    </Text>
  );
}
