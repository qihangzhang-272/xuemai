import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { useAppStore } from '@/lib/store/app-store';
import { classFeedbackProgress, feedbackTaskStatusLabel, taskStatusColor } from '@/lib/workflows/feedback';
import { colors, radius, spacing } from '@/theme/tokens';

export default function BatchFeedbackScreen() {
  const { classId } = useLocalSearchParams<{ classId?: string }>();
  const store = useAppStore();
  const classGroup = store.classes.find((item) => item.id === classId) ?? store.classes[0];
  const tasks = useMemo(() => store.feedbackTasks.filter((task) => task.classId === classGroup.id), [classGroup.id, store.feedbackTasks]);
  const progress = classFeedbackProgress(classGroup, store.feedbackTasks);
  const [selected, setSelected] = useState<string[]>(tasks.filter((task) => task.status !== 'completed').map((task) => task.id));
  const [showComplete, setShowComplete] = useState(false);

  function toggle(taskId: string) {
    setSelected((items) => (items.includes(taskId) ? items.filter((id) => id !== taskId) : [...items, taskId]));
  }

  return (
    <View style={styles.root}>
      <Screen>
        <Button variant="ghost" onPress={() => router.back()} style={styles.back}>返回</Button>
        <AppText variant="h2">批量反馈</AppText>
        <AppText variant="small" style={styles.subtitle}>{classGroup.name} · {tasks.length} 位学生待处理</AppText>
        <Card>
          <View style={styles.progressGrid}>
            <View><AppText variant="h2">{progress.notGenerated}</AppText><AppText variant="small">未生成</AppText></View>
            <View><AppText variant="h2">{progress.notCopied}</AppText><AppText variant="small">未复制</AppText></View>
            <View><AppText variant="h2">{progress.waitingConfirm}</AppText><AppText variant="small">待确认</AppText></View>
            <View><AppText variant="h2">{progress.completed}</AppText><AppText variant="small">已完成</AppText></View>
          </View>
          <ProgressBar value={progress.ratio} />
        </Card>
        <Card warm>
          <AppText variant="h3">批量生成设置</AppText>
          <View style={styles.chips}>
            {['温和', '标准版', '课堂表现', '错题分析', '老师备注'].map((item) => <Badge key={item} label={item} color={colors.primaryDark} />)}
          </View>
          <Button variant="secondary" onPress={() => store.bulkGenerateFeedback(selected)}>为选中学生生成反馈</Button>
        </Card>
        <SectionHeader title="待反馈学生" />
        {tasks.map((task) => {
          const student = store.students.find((item) => item.id === task.studentId);
          if (!student) return null;
          const isSelected = selected.includes(task.id);
          return (
            <Pressable key={task.id} onPress={() => toggle(task.id)}>
              <Card style={isSelected && styles.selectedCard}>
                <View style={styles.rowBetween}>
                  <View style={styles.nameRow}>
                    <View style={[styles.checkbox, isSelected && styles.checkboxOn]} />
                    <View>
                      <AppText variant="h3">{student.name}</AppText>
                      <AppText variant="small">最近课程：{task.topic}</AppText>
                    </View>
                  </View>
                  <Badge label={feedbackTaskStatusLabel(task.status)} color={taskStatusColor(task.status)} />
                </View>
                <AppText variant="small" style={styles.cardCopy}>主要问题：{student.mainWeakness}</AppText>
                <AppText variant="small">照片上传状态：{task.photoAssetIds.length ? `已上传 ${task.photoAssetIds.length} 张` : '尚未上传'}</AppText>
                <View style={styles.actionRow}>
                  <Button variant="ghost" onPress={() => router.push({ pathname: '/photo-upload', params: { studentId: student.id, taskId: task.id, classId: classGroup.id } })} style={styles.actionButton}>拍照</Button>
                  <Button variant="secondary" onPress={() => task.status === 'not_generated' ? store.generateFeedback(task.id) : router.push({ pathname: '/feedback-edit', params: { taskId: task.id } })} style={styles.actionButton}>
                    {task.status === 'not_generated' ? '生成' : '预览'}
                  </Button>
                </View>
              </Card>
            </Pressable>
          );
        })}
      </Screen>
      <View style={styles.bottomBar}>
        <AppText variant="small">已选择 {selected.length} 人</AppText>
        <Button variant="secondary" onPress={() => store.bulkGenerateFeedback(selected)} style={styles.bottomButton}>批量生成</Button>
        <Button onPress={() => setShowComplete(true)} style={styles.bottomButton}>标记已发送</Button>
      </View>
      <BottomSheet visible={showComplete} title="批量确认发送" onClose={() => setShowComplete(false)}>
        <AppText variant="body" style={styles.sheetCopy}>确认后，已选择学生的反馈任务会模拟更新为已完成。</AppText>
        <Button onPress={() => {
          selected.forEach((taskId) => store.confirmFeedbackSent(taskId));
          setShowComplete(false);
        }}>确认已发送</Button>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  back: {
    alignSelf: 'flex-start',
    minHeight: 42,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  subtitle: {
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  progressGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginVertical: spacing.md,
  },
  selectedCard: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  rowBetween: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  nameRow: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: spacing.md,
  },
  checkbox: {
    borderColor: colors.border,
    borderRadius: radius.sm,
    borderWidth: 2,
    height: 22,
    width: 22,
  },
  checkboxOn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  cardCopy: {
    marginTop: spacing.md,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  actionButton: {
    flex: 1,
  },
  bottomBar: {
    alignItems: 'center',
    backgroundColor: colors.whiteGlass,
    borderColor: colors.border,
    borderTopWidth: 1,
    bottom: 0,
    flexDirection: 'row',
    gap: spacing.sm,
    left: 0,
    padding: spacing.md,
    paddingBottom: spacing.xl,
    position: 'absolute',
    right: 0,
  },
  bottomButton: {
    flex: 1,
    minHeight: 46,
  },
  sheetCopy: {
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
});
