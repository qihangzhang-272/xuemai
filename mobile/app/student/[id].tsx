import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { useAppStore } from '@/lib/store/app-store';
import { getPrimaryTaskForStudent, statusColor, statusLabel } from '@/lib/workflows/feedback';
import { colors, radius, spacing } from '@/theme/tokens';

export default function StudentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const store = useAppStore();
  const student = store.students.find((item) => item.id === id) ?? store.students[0];
  const classGroup = store.classes.find((item) => item.id === student.classId);
  const task = getPrimaryTaskForStudent(student.id, store.feedbackTasks);
  const report = store.reports.find((item) => item.studentId === student.id);

  function startFeedback() {
    if (task?.status === 'not_generated') store.generateFeedback(task.id);
    if (task) router.push({ pathname: '/feedback-edit', params: { taskId: task.id } });
  }

  return (
    <Screen>
      <Button variant="ghost" onPress={() => router.back()} style={styles.back}>返回</Button>
      <Card warm>
        <View style={styles.profileRow}>
          <View style={[styles.avatar, { backgroundColor: statusColor(student.currentStatus) }]}>
            <AppText variant="h2" style={styles.avatarText}>{student.avatarText}</AppText>
          </View>
          <View style={styles.profileInfo}>
            <AppText variant="h2">{student.name}</AppText>
            <AppText variant="small">{student.grade} · {student.subject} · {classGroup?.name ?? '未分班'}</AppText>
            <Badge label={statusLabel(student.currentStatus)} color={statusColor(student.currentStatus)} />
          </View>
        </View>
      </Card>
      <View style={styles.actionRow}>
        <Button variant="secondary" onPress={() => router.push({ pathname: '/photo-upload', params: { studentId: student.id, classId: student.classId } })} style={styles.actionButton}>拍照</Button>
        <Button onPress={startFeedback} style={styles.actionButton}>生成反馈</Button>
      </View>
      <Button variant="secondary" onPress={() => report ? router.push({ pathname: '/report/[id]', params: { id: report.id } }) : router.push('/(tabs)/reports')}>生成月报</Button>

      <SectionHeader title="学习状态" />
      <Card>
        <AppText variant="h3">核心问题</AppText>
        <AppText variant="body" style={styles.copy}>{student.mainWeakness}</AppText>
        <AppText variant="small">学习目标：{student.learningGoal}</AppText>
      </Card>
      <Card>
        <AppText variant="h3">能力维度</AppText>
        {['基础概念', '计算准确率', '审题能力', '知识迁移', '表达规范', '学习稳定性'].map((item, index) => (
          <View key={item} style={styles.abilityRow}>
            <AppText variant="small">{item}</AppText>
            <ProgressBar value={(62 + index * 5) / 100} />
          </View>
        ))}
      </Card>
      <SectionHeader title="标签与 AI 记忆" />
      <Card>
        <View style={styles.tagRow}>
          {student.tags.map((tag) => (
            <Badge key={tag.id} label={tag.label} color={tag.importance === 'important' ? colors.red : colors.primary} />
          ))}
        </View>
      </Card>
      {store.aiLogs.filter((log) => log.relatedStudentId === student.id).slice(0, 4).map((log) => (
        <Card key={log.id}>
          <AppText variant="body">{log.title}</AppText>
          <AppText variant="small">{new Date(log.createdAt).toLocaleDateString()}</AppText>
        </Card>
      ))}
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
  profileRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.lg,
  },
  avatar: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 76,
    justifyContent: 'center',
    width: 76,
  },
  avatarText: {
    color: colors.surface,
  },
  profileInfo: {
    flex: 1,
    gap: spacing.sm,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  actionButton: {
    flex: 1,
  },
  copy: {
    color: colors.textSecondary,
    marginVertical: spacing.sm,
  },
  abilityRow: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
