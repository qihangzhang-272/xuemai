import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { colors, radius, spacing } from '@/theme/tokens';

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <View style={styles.box}>
      <AppText variant="h3">{title}</AppText>
      <AppText variant="small" style={styles.description}>
        {description}
      </AppText>
      <Button onPress={onAction} variant="secondary">
        {actionLabel}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.md,
  },
  description: {
    color: colors.textSecondary,
  },
});
