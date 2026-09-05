import { router, usePathname } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { colors, spacing } from '@/theme/tokens';

export default function SplashScreen() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== '/') {
      return undefined;
    }

    const timer = setTimeout(() => router.replace('/login'), 900);
    return () => clearTimeout(timer);
  }, [pathname]);

  return (
    <View style={styles.root}>
      <View style={styles.logo}>
        <AppText variant="h1" style={styles.logoText}>
          学
        </AppText>
      </View>
      <AppText variant="h1">学脉 AI</AppText>
      <AppText variant="body" style={styles.subtitle}>
        让每个学生的学习轨迹，都有脉络可循
      </AppText>
      <ActivityIndicator color={colors.primary} style={styles.loading} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  logo: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: 34,
    height: 92,
    justifyContent: 'center',
    marginBottom: spacing.xl,
    width: 92,
  },
  logoText: {
    color: colors.primaryDark,
  },
  subtitle: {
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  loading: {
    marginTop: spacing.xxl,
  },
});
