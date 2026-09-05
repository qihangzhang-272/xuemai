import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Screen } from '@/components/ui/Screen';
import { useAppStore } from '@/lib/store/app-store';
import { colors, spacing } from '@/theme/tokens';

const steps = ['正在识别作业', '正在分析错题', '正在提取知识点', '正在生成反馈建议', '正在更新学生档案素材'];

export default function AIAnalyzingScreen() {
  const { studentId, classId } = useLocalSearchParams<{ studentId?: string; classId?: string }>();
  const store = useAppStore();
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setStep((value) => Math.min(value + 1, steps.length - 1)), 600);
    const done = setTimeout(() => {
      const analysis = store.createMockAnalysis(studentId ?? store.students[0].id, classId);
      router.replace({ pathname: '/ai-analysis-result', params: { analysisId: analysis.id } });
    }, 3200);

    return () => {
      clearInterval(timer);
      clearTimeout(done);
    };
  }, [classId, store, studentId]);

  return (
    <Screen contentStyle={styles.content}>
      <Card warm style={styles.card}>
        <AppText variant="h2">AI 分析中</AppText>
        <AppText variant="body" style={styles.copy}>正在分析 2 / 4 张图片</AppText>
        <ProgressBar value={(step + 1) / steps.length} />
        <View style={styles.steps}>
          {steps.map((item, index) => (
            <AppText key={item} variant="body" style={[styles.step, index <= step && styles.activeStep]}>
              {index <= step ? '✓ ' : '· '}{item}
            </AppText>
          ))}
        </View>
        <Button variant="secondary" onPress={() => router.replace('/(tabs)/ai')}>后台处理</Button>
        <Button variant="ghost" onPress={() => router.back()}>取消任务</Button>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    justifyContent: 'center',
    minHeight: '100%',
  },
  card: {
    gap: spacing.lg,
  },
  copy: {
    color: colors.textSecondary,
  },
  steps: {
    gap: spacing.md,
  },
  step: {
    color: colors.textMuted,
  },
  activeStep: {
    color: colors.primaryDark,
    fontWeight: '800',
  },
});
