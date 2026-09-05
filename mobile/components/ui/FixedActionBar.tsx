import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { colors, spacing } from '@/theme/tokens';

export function FixedActionBar({
  primaryLabel,
  secondaryLabel,
  onPrimary,
  onSecondary,
}: {
  primaryLabel: string;
  secondaryLabel?: string;
  onPrimary: () => void;
  onSecondary?: () => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 20) }]}>
      <Button onPress={onPrimary}>{primaryLabel}</Button>
      {secondaryLabel ? (
        <Button variant="ghost" onPress={onSecondary} style={styles.secondary}>
          {secondaryLabel}
        </Button>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    bottom: 0,
    gap: spacing.sm,
    left: 0,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    position: 'absolute',
    right: 0,
  },
  secondary: {
    backgroundColor: 'transparent',
    minHeight: 44,
  },
});
