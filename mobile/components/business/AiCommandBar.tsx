import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { colors, radius, shadows, spacing } from '@/theme/tokens';

export function AiCommandBar({
  onSubmit,
  onAdd,
}: {
  onSubmit: (command: string) => void;
  onAdd: () => void;
}) {
  const [command, setCommand] = useState('');

  return (
    <View style={styles.bar}>
      <Pressable onPress={onAdd} style={styles.circleButton}>
        <AppText variant="h3">+</AppText>
      </Pressable>
      <TextInput
        value={command}
        onChangeText={setCommand}
        placeholder="问学脉 AI：帮我处理今天的反馈…"
        placeholderTextColor={colors.textMuted}
        style={styles.input}
        returnKeyType="send"
        onSubmitEditing={() => {
          if (command.trim()) {
            onSubmit(command);
            setCommand('');
          }
        }}
      />
      <Pressable
        onPress={() => {
          if (command.trim()) {
            onSubmit(command);
            setCommand('');
          }
        }}
        style={styles.send}>
        <AppText variant="small" style={styles.sendText}>
          发送
        </AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    alignItems: 'center',
    backgroundColor: colors.whiteGlass,
    borderColor: colors.border,
    borderRadius: radius.xl,
    borderWidth: 1,
    bottom: 94,
    flexDirection: 'row',
    gap: spacing.sm,
    left: spacing.lg,
    padding: spacing.sm,
    position: 'absolute',
    right: spacing.lg,
    ...shadows.card,
  },
  circleButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceWarm,
    borderRadius: radius.pill,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  input: {
    color: colors.text,
    flex: 1,
    fontSize: 15,
    minHeight: 42,
  },
  send: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    height: 42,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  sendText: {
    color: colors.surface,
    fontWeight: '900',
  },
});
