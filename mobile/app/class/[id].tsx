import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { StudentAvatar } from '@/components/business/StudentAvatar';
import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { useAppStore } from '@/lib/store/app-store';
import { classFeedbackProgress, sortStudentsByPriority } from '@/lib/workflows/feedback';
import { colors, radius, spacing } from '@/theme/tokens';

export default function ClassDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const store = useAppStore();
  const classGroup = store.classes.find((item) => item.id === id) ?? store.classes[0];
  const students = sortStudentsByPriority(store.students.filter((student) => classGroup.studentIds.includes(student.id)));
  const progress = classFeedbackProgress(classGroup, store.feedbackTasks);

  return (
    <Screen>
      <Button variant="ghost" onPress={() => router.back()} style={styles.back}>返回</Button>
      <Card warm>
        <View style={styles.header}>
          <View>
            <AppText variant="h2">{classGroup.name}</AppText>
            <AppText variant="small">{classGroup.grade} · {classGroup.subject} · {students.length} 名学生</AppText>
          </View>
          <Badge label={classGroup.pendingFeedbackCount ? '待反馈' : '正常'} color={classGroup.pendingFeedbackCount ? colors.yellow : colors.primary} />
        </View>
        <ProgressBar value={progress.ratio} />
        <AppText variant="small" style={styles.progressText}>
          本周反馈完成率 {Math.round(progress.ratio * 100)}%，待反馈 {progress.notGenerated + progress.notCopied + progress.waitingConfirm} 人
        </AppText>
      </Card>

      <SectionHeader title="班级学生" action="风险优先" />
      <Card>
        <ScrollView style={styles.studentGrid} nestedScrollEnabled>
          <View style={styles.grid}>
            <Pressable onPress={() => router.push('/student-create')} style={styles.addCircle}>
              <AppText variant="h2" style={styles.addText}>+</AppText>
              <AppText variant="small">添加</AppText>
            </Pressable>
            {students.map((student) => (
              <StudentAvatar
                key={student.id}
                student={student}
                onPress={() => router.push({ pathname: '/student/[id]', params: { id: student.id } })}
              />
            ))}
          </View>
        </ScrollView>
      </Card>

      <Card>
        <AppText variant="h3">班级报告摘要</AppText>
        <AppText variant="body" style={styles.copy}>本周几何证明共性问题集中在条件转化和书写规范。建议批量生成课后反馈，并在下节课前安排 15 分钟专项回顾。</AppText>
        <Button variant="secondary" onPress={() => router.push('/(tabs)/reports')}>查看完整报告</Button>
      </Card>

      <Card>
        <AppText variant="h3">班级 AI 记忆</AppText>
        {['多人在辅助线题型出现重复错误', '班级反馈完成率较上周提升 12%', '建议下节课安排条件转化训练'].map((item) => (
          <AppText key={item} variant="small" style={styles.memory}>· {item}</AppText>
        ))}
      </Card>

      <Button onPress={() => router.push({ pathname: '/batch-feedback', params: { classId: classGroup.id } })}>批量反馈</Button>
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
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  progressText: {
    marginTop: spacing.sm,
  },
  studentGrid: {
    maxHeight: 236,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  addCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 64,
  },
  addText: {
    color: colors.textMuted,
    backgroundColor: colors.graySoft,
    borderRadius: radius.pill,
    height: 58,
    lineHeight: 58,
    overflow: 'hidden',
    textAlign: 'center',
    width: 58,
  },
  copy: {
    color: colors.textSecondary,
    marginVertical: spacing.md,
  },
  memory: {
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
});
