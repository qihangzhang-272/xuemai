import { PropsWithChildren } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { colors, radius, spacing } from '@/theme/tokens';

export function FormCard({ title, children }: PropsWithChildren<{ title: string }>) {
  return (
    <Card style={styles.card}>
      <AppText variant="h3" style={styles.title}>
        {title}
      </AppText>
      <View style={styles.rows}>{children}</View>
    </Card>
  );
}

export function FormRow({
  label,
  value,
  placeholder,
  editable = false,
  onChangeText,
  suffix,
  onPress,
}: {
  label: string;
  value?: string;
  placeholder?: string;
  editable?: boolean;
  onChangeText?: (value: string) => void;
  suffix?: string;
  onPress?: () => void;
}) {
  const content = editable ? (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.textMuted}
      style={styles.input}
    />
  ) : (
    <View style={styles.valueWrap}>
      <AppText variant="body" style={[styles.value, !value && styles.placeholder]} numberOfLines={1}>
        {value ?? placeholder}
      </AppText>
      {suffix ? (
        <AppText variant="body" style={styles.suffix}>
          {suffix}
        </AppText>
      ) : null}
      {onPress ? (
        <AppText variant="body" style={styles.chevron}>
          ›
        </AppText>
      ) : null}
    </View>
  );

  return (
    <Pressable disabled={!onPress} onPress={onPress} style={styles.row}>
      <AppText variant="body" style={styles.label}>
        {label}
      </AppText>
      {content}
    </Pressable>
  );
}

export function ToggleRow({ label, enabled = true }: { label: string; enabled?: boolean }) {
  return (
    <View style={styles.row}>
      <AppText variant="body" style={styles.toggleLabel}>
        {label}
      </AppText>
      <View style={[styles.switchTrack, enabled && styles.switchTrackOn]}>
        <View style={[styles.switchThumb, enabled && styles.switchThumbOn]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
  },
  title: {
    marginBottom: spacing.sm,
  },
  rows: {
    borderTopColor: colors.border,
  },
  row: {
    alignItems: 'center',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    minHeight: 52,
    paddingVertical: spacing.sm,
  },
  label: {
    color: colors.textSecondary,
    flexShrink: 0,
    width: 108,
  },
  toggleLabel: {
    color: colors.textSecondary,
    flex: 1,
  },
  input: {
    color: colors.text,
    flex: 1,
    fontFamily: 'Noto Sans SC',
    fontSize: 16,
    minHeight: 44,
    padding: 0,
    textAlign: 'right',
  },
  valueWrap: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    minWidth: 0,
  },
  value: {
    color: colors.text,
    flexShrink: 1,
    textAlign: 'right',
  },
  placeholder: {
    color: colors.textMuted,
  },
  suffix: {
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
  chevron: {
    color: colors.textMuted,
    fontSize: 26,
    lineHeight: 28,
    marginLeft: spacing.xs,
  },
  switchTrack: {
    backgroundColor: colors.border,
    borderRadius: radius.pill,
    height: 30,
    padding: 2,
    width: 52,
  },
  switchTrackOn: {
    backgroundColor: colors.primary,
  },
  switchThumb: {
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    height: 26,
    width: 26,
  },
  switchThumbOn: {
    transform: [{ translateX: 22 }],
  },
});
