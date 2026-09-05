import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { colors, spacing } from '@/theme/tokens';

export function TopAppBar({
  title,
  rightLabel,
  onRightPress,
  showBack = true,
}: {
  title: string;
  rightLabel?: string;
  onRightPress?: () => void;
  showBack?: boolean;
}) {
  return (
    <View style={styles.bar}>
      <View style={styles.side}>
        {showBack ? (
          <Pressable onPress={() => router.back()} style={styles.iconButton}>
            <AppText variant="h2" style={styles.backIcon}>
              ‹
            </AppText>
          </Pressable>
        ) : null}
      </View>
      <AppText variant="h2" style={styles.title} numberOfLines={1}>
        {title}
      </AppText>
      <View style={[styles.side, styles.rightSide]}>
        {rightLabel ? (
          <Pressable onPress={onRightPress} style={styles.rightButton}>
            <AppText variant="body" style={styles.rightLabel}>
              {rightLabel}
            </AppText>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.86)',
    borderBottomColor: 'rgba(229, 231, 235, 0.65)',
    borderBottomWidth: 1,
    flexDirection: 'row',
    height: 64,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
  },
  side: {
    alignItems: 'flex-start',
    width: 72,
  },
  rightSide: {
    alignItems: 'flex-end',
  },
  iconButton: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  backIcon: {
    color: colors.primaryDark,
    fontSize: 36,
    lineHeight: 38,
  },
  title: {
    color: colors.primary,
    flex: 1,
    textAlign: 'center',
  },
  rightButton: {
    minHeight: 44,
    justifyContent: 'center',
  },
  rightLabel: {
    color: colors.primary,
    fontWeight: '800',
  },
});
