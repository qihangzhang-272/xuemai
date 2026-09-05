import { SymbolView } from 'expo-symbols';
import type { ComponentProps, ReactNode } from 'react';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { AppText } from '@/components/ui/AppText';
import { colors, radius, shadows, spacing } from '@/theme/tokens';

type SymbolName = ComponentProps<typeof SymbolView>['name'];

const icons = {
  back: { symbol: { ios: 'arrow.left', android: 'arrow_back', web: 'arrow_back' } as SymbolName, web: 'arrow_back' },
  person: { symbol: { ios: 'person', android: 'person', web: 'person' } as SymbolName, web: 'person' },
  pin: { symbol: { ios: 'number', android: 'pin', web: 'pin' } as SymbolName, web: 'pin' },
  lock: { symbol: { ios: 'lock', android: 'lock', web: 'lock' } as SymbolName, web: 'lock' },
  lockReset: { symbol: { ios: 'lock.rotation', android: 'lock_reset', web: 'lock_reset' } as SymbolName, web: 'lock_reset' },
  eyeOff: { symbol: { ios: 'eye.slash', android: 'visibility_off', web: 'visibility_off' } as SymbolName, web: 'visibility_off' },
};

function MaterialIcon({
  icon,
  size = 22,
  color = colors.textMuted,
}: {
  icon: (typeof icons)[keyof typeof icons];
  size?: number;
  color?: string;
}) {
  if (Platform.OS === 'web') {
    return (
      <Text style={[styles.materialSymbol, { color, fontSize: size, lineHeight: size, width: size }]}>
        {icon.web}
      </Text>
    );
  }

  return <SymbolView name={icon.symbol} size={size} tintColor={color} fallback={<View style={{ width: size, height: size }} />} />;
}

function RegisterInput({
  icon,
  placeholder,
  secureTextEntry = false,
  rightSlot,
}: {
  icon: (typeof icons)[keyof typeof icons];
  placeholder: string;
  secureTextEntry?: boolean;
  rightSlot?: ReactNode;
}) {
  return (
    <View style={styles.inputRow}>
      <MaterialIcon icon={icon} size={20} />
      <TextInput
        autoCapitalize="none"
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        secureTextEntry={secureTextEntry}
        style={styles.input}
      />
      {rightSlot}
    </View>
  );
}

export default function RegisterScreen() {
  const [accepted, setAccepted] = useState(false);

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.root}>
        <View pointerEvents="none" style={styles.backgroundDecor}>
          <View style={[styles.blob, styles.blobTop]} />
          <View style={[styles.blob, styles.blobBottom]} />
        </View>

        <View style={styles.container}>
          <View style={styles.topBar}>
            <Pressable
              accessibilityLabel="返回"
              onPress={() => router.back()}
              style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
              <MaterialIcon icon={icons.back} size={24} color={colors.text} />
            </Pressable>
            <View style={styles.topTitleWrap}>
              <AppText variant="h2" style={styles.topTitle}>
                创建账号
              </AppText>
            </View>
          </View>

          <View style={styles.hero}>
            <AppText variant="h1" style={styles.heroTitle}>
              学脉 AI
            </AppText>
            <AppText variant="small" style={styles.heroSubtitle}>
              开始建立你的 AI 学情追踪系统
            </AppText>
          </View>

          <View style={styles.card}>
            <View style={styles.form}>
              <RegisterInput icon={icons.person} placeholder="手机号 / 邮箱" />
              <RegisterInput
                icon={icons.pin}
                placeholder="验证码"
                rightSlot={
                  <Pressable style={({ pressed }) => [styles.codeButton, pressed && styles.pressed]}>
                    <AppText variant="small" style={styles.codeButtonText}>
                      获取验证码
                    </AppText>
                  </Pressable>
                }
              />
              <RegisterInput
                icon={icons.lock}
                placeholder="设置密码"
                secureTextEntry
                rightSlot={
                  <Pressable style={({ pressed }) => [styles.eyeButton, pressed && styles.pressed]}>
                    <MaterialIcon icon={icons.eyeOff} size={20} />
                  </Pressable>
                }
              />
              <RegisterInput icon={icons.lockReset} placeholder="确认密码" secureTextEntry />

              <Pressable onPress={() => setAccepted((value) => !value)} style={styles.termsRow}>
                <View style={[styles.checkbox, accepted && styles.checkboxChecked]}>
                  {accepted ? (
                    <AppText variant="small" style={styles.checkMark}>
                      ✓
                    </AppText>
                  ) : null}
                </View>
                <AppText variant="small" style={styles.termsText}>
                  我已阅读并同意
                  <AppText variant="small" style={styles.termsLink}>
                    服务条款
                  </AppText>
                  和
                  <AppText variant="small" style={styles.termsLink}>
                    隐私政策
                  </AppText>
                </AppText>
              </Pressable>
            </View>

            <View style={styles.bottomActions}>
              <Pressable
                onPress={() => router.push('/identity')}
                style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
                <AppText variant="body" style={styles.primaryButtonText}>
                  下一步
                </AppText>
              </Pressable>
              <Pressable onPress={() => router.replace('/login')} style={styles.loginButton}>
                <AppText variant="small" style={styles.loginText}>
                  已有账号？去登录
                </AppText>
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  root: {
    flex: 1,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  backgroundDecor: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    opacity: 0.4,
  },
  blob: {
    position: 'absolute',
    borderRadius: radius.pill,
  },
  blobTop: {
    left: -92,
    top: -116,
    width: 260,
    height: 260,
    backgroundColor: colors.primarySoft,
  },
  blobBottom: {
    right: -140,
    bottom: -126,
    width: 330,
    height: 330,
    backgroundColor: colors.surfaceWarm,
  },
  container: {
    flex: 1,
    width: '100%',
    maxWidth: 430,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingBottom: spacing.xl,
    paddingTop: spacing.xl,
  },
  topBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -8,
    borderRadius: radius.pill,
  },
  topTitleWrap: {
    flex: 1,
    alignItems: 'center',
    paddingRight: 44,
  },
  topTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
  },
  hero: {
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.xs,
  },
  heroTitle: {
    marginBottom: spacing.xs,
    fontSize: 28,
    lineHeight: 34,
  },
  heroSubtitle: {
    color: colors.textSecondary,
    fontSize: 15,
  },
  card: {
    flex: 1,
    justifyContent: 'space-between',
    borderRadius: 24,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    ...shadows.card,
  },
  form: {
    gap: 12,
  },
  inputRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(229, 231, 235, 0.62)',
    borderRadius: 16,
    backgroundColor: colors.background,
    paddingLeft: spacing.lg,
    paddingRight: spacing.sm,
  },
  materialSymbol: {
    marginRight: 2,
    fontFamily: 'Material Symbols Outlined',
    fontWeight: '400',
    textAlign: 'center',
  },
  input: {
    flex: 1,
    minHeight: 52,
    paddingHorizontal: spacing.sm,
    paddingVertical: 0,
    color: colors.text,
    fontFamily: Platform.select({ web: 'Noto Sans SC, system-ui, sans-serif', default: undefined }),
    fontSize: 16,
  },
  codeButton: {
    minHeight: 34,
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.md,
  },
  codeButtonText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '800',
  },
  eyeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  checkbox: {
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    backgroundColor: colors.background,
  },
  checkboxChecked: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  checkMark: {
    color: colors.surface,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '800',
  },
  termsText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
  },
  termsLink: {
    color: colors.primaryDark,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  bottomActions: {
    gap: spacing.md,
    marginTop: spacing.xxl,
  },
  primaryButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: colors.primary,
  },
  primaryButtonText: {
    color: colors.surface,
    fontSize: 17,
    fontWeight: '800',
  },
  loginButton: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  loginText: {
    color: colors.textSecondary,
    fontSize: 15,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.985 }],
  },
});
