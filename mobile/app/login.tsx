import { SymbolView } from 'expo-symbols';
import { Link, router } from 'expo-router';
import type { ComponentProps } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View, ViewStyle } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { colors, radius, shadows, spacing } from '@/theme/tokens';

type SymbolName = ComponentProps<typeof SymbolView>['name'];

const inputIcons = {
  person: { ios: 'person', android: 'person', web: 'person' } as SymbolName,
  lock: { ios: 'lock', android: 'lock', web: 'lock' } as SymbolName,
};

function LoginInput({
  icon,
  placeholder,
  secureTextEntry = false,
}: {
  icon: 'person' | 'lock';
  placeholder: string;
  secureTextEntry?: boolean;
}) {
  return (
    <View style={styles.inputWrap}>
      <LineIcon name={icon} />
      <TextInput
        autoCapitalize="none"
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        secureTextEntry={secureTextEntry}
        style={styles.input}
      />
    </View>
  );
}

function LineIcon({ name }: { name: 'person' | 'lock' }) {
  if (Platform.OS === 'web') {
    return <Text style={styles.materialSymbol}>{name}</Text>;
  }

  return (
    <SymbolView
      name={inputIcons[name]}
      size={22}
      tintColor={colors.textMuted}
      fallback={<View style={{ width: 22, height: 22 }} />}
      style={styles.symbolIcon}
    />
  );
}

function TargetIcon() {
  return (
    <View style={styles.targetOuter}>
      <View style={styles.targetMiddle}>
        <View style={styles.targetDot} />
      </View>
    </View>
  );
}

export default function LoginScreen() {
  const isWeb = Platform.OS === 'web';

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.root, isWeb && styles.webRoot, isWeb && webDottedBackground]}>
      {isWeb ? (
        <View style={styles.previewHeader}>
          <View style={styles.previewIcon}>
            <View style={styles.previewIconInner} />
          </View>
          <AppText variant="body" style={styles.previewTitle}>
            登录页
          </AppText>
        </View>
      ) : null}

      <View style={[styles.appSurface, isWeb && styles.webAppSurface]}>
        <View pointerEvents="none" style={[styles.blob, styles.blobTop]} />
        <View pointerEvents="none" style={[styles.blob, styles.blobBottom]} />

        <View style={[styles.container, isWeb && styles.webContainer]}>
        <View style={styles.header}>
          <View style={styles.logoCard}>
            <TargetIcon />
          </View>
          <AppText variant="h1" style={styles.title}>
            知迹 AI
          </AppText>
          <AppText variant="small" style={styles.subtitle}>
            继续追踪每个学生的学习进步
          </AppText>
        </View>

        <View style={styles.card}>
          <View style={styles.form}>
            <LoginInput icon="person" placeholder="手机号 / 邮箱" />

            <View>
              <LoginInput icon="lock" placeholder="密码" secureTextEntry />
              <Pressable onPress={() => router.push('/forgot-password')} style={styles.forgotButton}>
                <AppText variant="small" style={styles.forgotText}>
                  忘记密码？
                </AppText>
              </Pressable>
            </View>

            <Pressable
              onPress={() => router.replace('/identity')}
              style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
              <AppText variant="body" style={styles.primaryButtonText}>
                登录
              </AppText>
            </Pressable>
          </View>

          <Link href="/register" asChild>
            <Pressable style={styles.registerButton}>
              <AppText variant="small" style={styles.registerText}>
                还没有账号？
                <AppText variant="small" style={styles.registerHighlight}>
                  立即注册
                </AppText>
                <AppText variant="small" style={styles.registerArrow}>
                  ›
                </AppText>
              </AppText>
            </Pressable>
          </Link>
        </View>

        <View style={styles.footer}>
          <AppText variant="small" style={styles.legalText}>
            登录即表示你同意
            <AppText variant="small" style={styles.legalLink}>
              用户协议
            </AppText>
            与
            <AppText variant="small" style={styles.legalLink}>
              隐私政策
            </AppText>
          </AppText>
        </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const webDottedBackground = Platform.select({
  web: {
    backgroundImage: 'radial-gradient(rgba(148, 163, 184, 0.36) 1.2px, transparent 1.2px)',
    backgroundSize: '18px 18px',
  } as ViewStyle,
  default: {},
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  webRoot: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 30,
    backgroundColor: '#FFFFFF',
    overflow: 'visible',
  },
  previewHeader: {
    width: 496,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  previewIcon: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: '#D89D00',
    borderRadius: 2,
  },
  previewIconInner: {
    position: 'absolute',
    right: -5,
    bottom: -4,
    width: 10,
    height: 8,
    borderWidth: 2,
    borderColor: '#D89D00',
    backgroundColor: '#FFFFFF',
  },
  previewTitle: {
    color: colors.textSecondary,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '500',
  },
  appSurface: {
    flex: 1,
    width: '100%',
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  webAppSurface: {
    flex: 0,
    width: 496,
    height: 850,
    borderWidth: 1,
    borderColor: '#D5D9DE',
    borderRadius: 16,
    backgroundColor: '#FBFCF8',
  },
  blob: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.65,
  },
  blobTop: {
    top: -112,
    right: -120,
    width: 260,
    height: 260,
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
  },
  blobBottom: {
    left: -142,
    bottom: 108,
    width: 320,
    height: 320,
    backgroundColor: 'rgba(220, 252, 231, 0.68)',
  },
  container: {
    flex: 1,
    width: '100%',
    maxWidth: 430,
    alignSelf: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingBottom: spacing.xl,
    paddingTop: spacing.xxl,
  },
  webContainer: {
    justifyContent: 'flex-start',
    paddingTop: 50,
    paddingHorizontal: 60,
    paddingBottom: 34,
  },
  header: {
    alignItems: 'center',
    marginBottom: 58,
  },
  logoCard: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
    borderRadius: 22,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  targetOuter: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 3,
    borderColor: colors.primary,
  },
  targetMiddle: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 3,
    borderColor: colors.primary,
  },
  targetDot: {
    width: 8,
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  title: {
    marginBottom: spacing.xs,
    textAlign: 'center',
    fontSize: 28,
    lineHeight: 34,
  },
  subtitle: {
    width: 260,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  card: {
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(229, 231, 235, 0.72)',
    borderRadius: 24,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    paddingTop: 30,
    ...shadows.card,
  },
  form: {
    gap: 20,
  },
  inputWrap: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(229, 231, 235, 0.78)',
    borderRadius: 16,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
  },
  iconBox: {
    width: 24,
    height: 24,
    marginRight: 2,
  },
  materialSymbol: {
    width: 24,
    marginRight: 2,
    color: colors.textMuted,
    fontFamily: 'Material Symbols Outlined',
    fontSize: 22,
    fontWeight: '400',
    lineHeight: 22,
    textAlign: 'center',
  },
  symbolIcon: {
    marginRight: 2,
  },
  personHead: {
    position: 'absolute',
    top: 4,
    left: 9,
    width: 8,
    height: 8,
    borderWidth: 2,
    borderColor: colors.textMuted,
    borderRadius: 999,
  },
  personBody: {
    position: 'absolute',
    left: 5,
    bottom: 3,
    width: 16,
    height: 11,
    borderTopWidth: 0,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderColor: colors.textMuted,
    borderBottomLeftRadius: 11,
    borderBottomRightRadius: 11,
  },
  lockShackle: {
    position: 'absolute',
    top: 3,
    left: 7,
    width: 10,
    height: 11,
    borderWidth: 2,
    borderColor: colors.textMuted,
    borderBottomWidth: 0,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  lockBody: {
    position: 'absolute',
    left: 5,
    bottom: 3,
    width: 14,
    height: 13,
    borderWidth: 2,
    borderColor: colors.textMuted,
    borderRadius: 4,
  },
  input: {
    flex: 1,
    minHeight: 52,
    paddingVertical: 0,
    color: colors.text,
    fontFamily: Platform.select({ web: 'Noto Sans SC, system-ui, sans-serif', default: undefined }),
    fontSize: 16,
  },
  forgotButton: {
    alignSelf: 'flex-end',
    paddingTop: spacing.xs,
    paddingBottom: 2,
  },
  forgotText: {
    color: colors.primaryDark,
    fontSize: 15,
  },
  primaryButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    borderRadius: 20,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 4,
  },
  primaryButtonText: {
    color: colors.surface,
    fontSize: 17,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
  registerButton: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
    paddingVertical: spacing.sm,
  },
  registerText: {
    color: colors.textSecondary,
    fontSize: 15,
  },
  registerHighlight: {
    color: colors.primaryDark,
    fontSize: 15,
    fontWeight: '800',
  },
  registerArrow: {
    color: colors.textSecondary,
    fontSize: 18,
  },
  footer: {
    marginTop: 'auto',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xxl,
  },
  legalText: {
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
  },
  legalLink: {
    color: colors.textSecondary,
    fontSize: 11,
    textDecorationLine: 'underline',
  },
});
