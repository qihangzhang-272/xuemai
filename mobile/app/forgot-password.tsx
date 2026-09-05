import { router } from 'expo-router';
import { StyleSheet, TextInput } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { colors, radius, spacing } from '@/theme/tokens';

export default function ForgotPasswordScreen() {
  return (
    <Screen>
      <AppText variant="h2">找回密码</AppText>
      <AppText variant="body" style={styles.subtitle}>
        输入手机号或邮箱，第一阶段会模拟发送验证码。
      </AppText>
      <Card style={styles.card}>
        <TextInput style={styles.input} placeholder="手机号 / 邮箱" placeholderTextColor={colors.textMuted} />
        <Button onPress={() => router.back()}>发送验证码</Button>
        <Button variant="ghost" onPress={() => router.back()}>
          返回
        </Button>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  subtitle: {
    color: colors.textSecondary,
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  card: {
    gap: spacing.md,
  },
  input: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.text,
    fontSize: 16,
    minHeight: 54,
    paddingHorizontal: spacing.lg,
  },
});
