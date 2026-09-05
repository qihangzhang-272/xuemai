import { PropsWithChildren } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { colors, radius, shadows, spacing } from '@/theme/tokens';

type CardProps = PropsWithChildren<{
  warm?: boolean;
  style?: StyleProp<ViewStyle>;
}>;

export function Card({ children, warm = false, style }: CardProps) {
  return <View style={[styles.card, warm && styles.warm, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.card,
  },
  warm: {
    backgroundColor: colors.surfaceWarm,
  },
});
