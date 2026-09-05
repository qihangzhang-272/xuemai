import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { useAppStore } from '@/lib/store/app-store';
import { getPrimaryTaskForStudent } from '@/lib/workflows/feedback';
import { colors, spacing } from '@/theme/tokens';

export default function AIAnalysisResultScreen() {
  const { analysisId } = useLocalSearchParams<{ analysisId?: string }>();
  const store = useAppStore();
  const analysis = store.analyses.find((item) => item.id === analysisId) ?? store.analyses[0];
  const student = store.students.find((item) => item.id === analysis.studentId) ?? store.students[0];
  const task = getPrimaryTaskForStudent(student.id, store.feedbackTasks);
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <Screen>
      <Button variant="ghost" onPress={() => router.back()} style={styles.back}>返回</Button>
      <AppText variant="h2">AI 分析结果</AppText>
      <AppText variant="small" style={styles.subtitle}>{student.name} · {analysis.topic}</AppText>
      <Card warm>
        <View style={styles.rowBetween}>
          <AppText variant="h3">分析总结</AppText>
          <Badge label="已完成" />
        </View>
        <AppText variant="body" style={styles.copy}>{analysis.summary}</AppText>
        <AppText variant="small">正确率 {analysis.accuracy ?? 0}%</AppText>
        <ProgressBar value={(analysis.accuracy ?? 0) / 100} />
      </Card>
      <Card>
        <AppText variant="h3">主要薄弱点</AppText>
        <View style={styles.chips}>
          {analysis.mainWeaknesses.map((item) => <Badge key={item} label={item} color={colors.yellow} />)}
        </View>
      </Card>
      <SectionHeader title="错题分析" />
      {analysis.mistakes.map((mistake) => (
        <Card key={mistake.id}>
          <AppText variant="h3">{mistake.knowledgePoint}</AppText>
          <AppText variant="body" style={styles.copy}>错误原因：{mistake.mistakeReason}</AppText>
          <AppText variant="small">讲解建议：{mistake.teachingSuggestion}</AppText>
        </Card>
      ))}
      <View style={styles.actionRow}>
        <Button onPress={() => {
          if (task) {
            store.generateFeedback(task.id);
            router.push({ pathname: '/feedback-edit', params: { taskId: task.id } });
          }
        }} style={styles.actionButton}>生成家长反馈</Button>
        <Button variant="secondary" onPress={() => setConfirmOpen(true)} style={styles.actionButton}>更新学生档案</Button>
      </View>
      <Button variant="secondary" onPress={() => router.push('/(tabs)/ai')}>保存分析</Button>

      <BottomSheet visible={confirmOpen} title="确认 AI 更新" onClose={() => setConfirmOpen(false)}>
        <AppText variant="body" style={styles.sheetCopy}>AI 建议将「{analysis.mainWeaknesses[0]}」写入 {student.name} 的重点观察项。重要档案修改必须由老师确认。</AppText>
        <Button onPress={() => setConfirmOpen(false)}>确认更新</Button>
        <Button variant="ghost" onPress={() => setConfirmOpen(false)} style={styles.sheetButton}>暂不更新</Button>
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: {
    alignSelf: 'flex-start',
    minHeight: 42,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  subtitle: {
    color: colors.textSecondary,
    marginVertical: spacing.md,
  },
  rowBetween: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  copy: {
    color: colors.textSecondary,
    marginVertical: spacing.md,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  actionButton: {
    flex: 1,
  },
  sheetCopy: {
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  sheetButton: {
    marginTop: spacing.md,
  },
});
