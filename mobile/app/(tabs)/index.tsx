import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { AiCommandBar } from '@/components/business/AiCommandBar';
import { StudentAvatar } from '@/components/business/StudentAvatar';
import { StudentTaskCard } from '@/components/business/StudentTaskCard';
import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { useAppStore } from '@/lib/store/app-store';
import { getPrimaryTaskForStudent, sortStudentsByPriority } from '@/lib/workflows/feedback';
import { colors, radius, spacing } from '@/theme/tokens';

export default function TodayScreen() {
  const store = useAppStore();
  const sortedStudents = useMemo(() => sortStudentsByPriority(store.students), [store.students]);
  const [selectedStudentId, setSelectedStudentId] = useState(sortedStudents[0]?.id);
  const [menuOpen, setMenuOpen] = useState(false);
  const selectedStudent = sortedStudents.find((student) => student.id === selectedStudentId) ?? sortedStudents[0];
  const selectedTask = selectedStudent ? getPrimaryTaskForStudent(selectedStudent.id, store.feedbackTasks) : undefined;
  const pendingCount = store.feedbackTasks.filter((task) => task.status !== 'completed').length;
  const riskCount = store.students.filter((student) => student.currentStatus === 'risk').length;

  function handlePrimaryTask() {
    if (!selectedStudent) return;
    if (selectedTask?.status === 'not_generated') {
      store.generateFeedback(selectedTask.id);
      router.push({ pathname: '/feedback-edit', params: { taskId: selectedTask.id } });
      return;
    }
    if (selectedTask) {
      router.push({ pathname: '/feedback-edit', params: { taskId: selectedTask.id } });
      return;
    }
    router.push({ pathname: '/student/[id]', params: { id: selectedStudent.id } });
  }

  function handleAiCommand(command: string) {
    const result = store.runAiCommand(command);
    if (result.type === 'batch_feedback') {
      router.push({ pathname: '/batch-feedback', params: { classId: result.classId } });
    } else if (result.type === 'risk') {
      router.push({ pathname: '/student/[id]', params: { id: result.studentId } });
    } else if (result.type === 'report') {
      router.push({ pathname: '/report/[id]', params: { id: result.reportId } });
    } else {
      Alert.alert('学脉 AI', result.message);
    }
  }

  return (
    <View style={styles.root}>
      <Screen>
        <View style={styles.topbar}>
          <AppText variant="h3" style={styles.todayTitle}>
            今日
          </AppText>
          <Pressable onPress={() => router.push('/notifications')} style={styles.noticeButton}>
            <AppText variant="h3">铃</AppText>
            {store.notifications.some((item) => !item.read) ? <View style={styles.noticeDot} /> : null}
          </Pressable>
        </View>

        <AppText variant="h1">日安，{store.user.name}</AppText>
        <AppText variant="body" style={styles.subtitle}>
          今天还有 {pendingCount} 项教学任务待处理
        </AppText>

        <View style={styles.searchBox}>
          <AppText variant="small" style={styles.searchIcon}>
            搜索
          </AppText>
          <TextInput
            placeholder="搜索学生或班级"
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
          />
        </View>

        <SectionHeader title="我的学生" action="按风险优先排序" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.avatarRow}>
          {sortedStudents.map((student) => (
            <StudentAvatar
              key={student.id}
              student={student}
              selected={student.id === selectedStudent?.id}
              onPress={() => setSelectedStudentId(student.id)}
            />
          ))}
          <Pressable onPress={() => router.push('/student-create')} style={styles.addStudent}>
            <AppText variant="h2" style={styles.addText}>
              +
            </AppText>
            <AppText variant="small">添加</AppText>
          </Pressable>
        </ScrollView>

        <SectionHeader title="优先处理" />
        {selectedStudent ? (
          <StudentTaskCard
            student={selectedStudent}
            task={selectedTask}
            onPress={() => router.push({ pathname: '/student/[id]', params: { id: selectedStudent.id } })}
            onPrimary={handlePrimaryTask}
          />
        ) : null}

        <View style={styles.grid}>
          <Card style={styles.gridCard}>
            <Badge label="待处理" color={colors.yellow} />
            <AppText variant="h2">{pendingCount} 项</AppText>
            <AppText variant="small">待反馈、待确认和 AI 分析完成</AppText>
          </Card>
          <Card style={styles.gridCard}>
            <Badge label="AI 建议" color={colors.blue} />
            <AppText variant="h2">{riskCount} 名</AppText>
            <AppText variant="small">学生近期需要重点关注</AppText>
          </Card>
        </View>

        <Card warm>
          <AppText variant="h3">AI 主动提醒</AppText>
          <AppText variant="body" style={styles.aiCopy}>
            发现初二数学 A 班多名学生在几何证明中存在条件转化问题，建议先处理今日待反馈学生。
          </AppText>
          <Button variant="secondary" onPress={() => router.push('/(tabs)/ai')}>
            查看 AI 助教
          </Button>
        </Card>
      </Screen>

      <AiCommandBar onSubmit={handleAiCommand} onAdd={() => setMenuOpen(true)} />

      <BottomSheet visible={menuOpen} title="添加到 AI 指令" onClose={() => setMenuOpen(false)}>
        <View style={styles.sheetActions}>
          <Button
            variant="secondary"
            onPress={() => {
              setMenuOpen(false);
              router.push('/photo-upload');
            }}>
            拍照上传
          </Button>
          <Button
            variant="ghost"
            onPress={() => {
              setMenuOpen(false);
              router.push('/student-create');
            }}>
            添加学生
          </Button>
          <Button
            variant="ghost"
            onPress={() => {
              setMenuOpen(false);
              router.push('/class-create');
            }}>
            添加班级
          </Button>
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topbar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  todayTitle: {
    color: colors.primary,
  },
  noticeButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  noticeDot: {
    backgroundColor: colors.red,
    borderRadius: radius.pill,
    height: 8,
    position: 'absolute',
    right: 10,
    top: 10,
    width: 8,
  },
  subtitle: {
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  searchBox: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    minHeight: 58,
  },
  searchIcon: {
    color: colors.textMuted,
    fontWeight: '800',
  },
  searchInput: {
    color: colors.text,
    flex: 1,
    fontSize: 16,
  },
  avatarRow: {
    marginBottom: spacing.lg,
  },
  addStudent: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    width: 64,
  },
  addText: {
    color: colors.textMuted,
  },
  grid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  gridCard: {
    flex: 1,
    gap: spacing.sm,
  },
  aiCopy: {
    color: colors.textSecondary,
    marginVertical: spacing.md,
  },
  sheetActions: {
    gap: spacing.md,
  },
});
