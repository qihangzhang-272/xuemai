import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FeedbackTask, Student } from '@/lib/types/domain';
import { feedbackTaskStatusLabel, statusColor, statusLabel, taskStatusColor } from '@/lib/workflows/feedback';
import { colors, spacing } from '@/theme/tokens';

export function StudentTaskCard({
  student,
  task,
  onPress,
  onPrimary,
  primaryLabel = '立即处理',
}: {
  student: Student;
  task?: FeedbackTask;
  onPress?: () => void;
  onPrimary?: () => void;
  primaryLabel?: string;
}) {
  return (
    <Pressable onPress={onPress}>
      <Card>
        <View style={styles.header}>
          <View>
            <AppText variant="h3">{student.name}</AppText>
            <AppText variant="small">
              {student.grade} · {student.subject}
            </AppText>
          </View>
          <Badge label={task ? feedbackTaskStatusLabel(task.status) : statusLabel(student.currentStatus)} color={task ? taskStatusColor(task.status) : statusColor(student.currentStatus)} />
        </View>
        <View style={styles.detail}>
          <AppText variant="small">最近课程：{task?.topic ?? '暂无最近课程'}</AppText>
          <AppText variant="small">主要问题：{student.mainWeakness ?? '等待学习记录沉淀'}</AppText>
          <AppText variant="small">照片状态：{task?.photoAssetIds.length ? `已上传 ${task.photoAssetIds.length} 张` : '尚未上传'}</AppText>
        </View>
        <Button onPress={onPrimary}>{primaryLabel}</Button>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  detail: {
    backgroundColor: colors.background,
    borderRadius: 18,
    gap: spacing.xs,
    marginBottom: spacing.md,
    padding: spacing.md,
  },
});
