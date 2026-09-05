import { router } from 'expo-router';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Screen } from '@/components/ui/Screen';
import { useAppStore } from '@/lib/store/app-store';
import { statusColor } from '@/lib/workflows/feedback';
import { colors, radius, spacing } from '@/theme/tokens';

export default function ClassListScreen() {
  const store = useAppStore();
  const pendingCount = store.classes.reduce((sum, item) => sum + item.pendingFeedbackCount, 0);

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.topbar}>
        <AppText variant="h2" style={styles.title}>
          班级
        </AppText>
        <Pressable onPress={() => router.push('/class-create')} style={styles.addButton}>
          <AppText variant="h3" style={styles.addText}>
            +
          </AppText>
        </Pressable>
      </View>

      <View style={styles.searchWrap}>
        <AppText variant="body" style={styles.searchIcon}>
          ⌕
        </AppText>
        <TextInput
          placeholder="搜索学生或班级"
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
        />
      </View>

      <Card style={styles.overviewCard}>
        <View style={styles.overviewHeader}>
          <AppText variant="h3">班级状态概览</AppText>
          <Badge label="今日" />
        </View>
        <View style={styles.overviewGrid}>
          <Metric value={`${store.classes.length}`} label="班级总数" />
          <Metric value={`${store.students.length}`} label="学生总数" />
          <Metric value={`${pendingCount}`} label="待反馈" danger />
        </View>
        <ProgressBar value={0.68} />
      </Card>

      <View style={styles.sectionHeader}>
        <AppText variant="h2">我的班级</AppText>
        <AppText variant="small" style={styles.sectionAction}>
          查看全部
        </AppText>
      </View>

      {store.classes.map((classGroup) => {
        const students = store.students.filter((student) => classGroup.studentIds.includes(student.id));
        const complete = classGroup.pendingFeedbackCount === 0;

        return (
          <Pressable
            key={classGroup.id}
            onPress={() => router.push({ pathname: '/class/[id]', params: { id: classGroup.id } })}>
            <Card style={styles.classCard}>
              <View style={styles.cardHeader}>
                <View>
                  <AppText variant="h3">{classGroup.name}</AppText>
                  <AppText variant="small" style={styles.classMeta}>
                    {classGroup.subject} · {students.length} 名学生 ·{' '}
                    <AppText variant="small" style={complete ? styles.completeText : styles.pendingText}>
                      {complete ? '全部完成' : `${classGroup.pendingFeedbackCount} 人待反馈`}
                    </AppText>
                  </AppText>
                </View>
                <View style={[styles.statusPill, complete ? styles.statusDone : styles.statusPending]}>
                  <AppText variant="small" style={complete ? styles.statusDoneText : styles.statusPendingText}>
                    {complete ? '正常' : '待处理'}
                  </AppText>
                </View>
              </View>

              <View style={styles.previewRow}>
                {students.slice(0, 6).map((student, index) => (
                  <View
                    key={student.id}
                    style={[
                      styles.avatar,
                      {
                        backgroundColor: statusColor(student.currentStatus),
                        marginLeft: index === 0 ? 0 : -8,
                      },
                    ]}>
                    <AppText variant="small" style={styles.avatarText}>
                      {student.avatarText}
                    </AppText>
                  </View>
                ))}
                <AppText variant="small" style={styles.previewText}>
                  {students.length > 6 ? `+${students.length - 6}` : '学生状态预览'}
                </AppText>
              </View>

              <View style={styles.footerRow}>
                <View style={styles.progressWrap}>
                  <ProgressBar value={classGroup.monthlyReportProgress} />
                  <AppText variant="small" style={styles.progressText}>
                    月报完成度 {Math.round(classGroup.monthlyReportProgress * 100)}%
                  </AppText>
                </View>
                <Button
                  variant="secondary"
                  onPress={() => router.push({ pathname: '/class/[id]', params: { id: classGroup.id } })}
                  style={styles.viewButton}>
                  查看班级
                </Button>
              </View>
            </Card>
          </Pressable>
        );
      })}
    </Screen>
  );
}

function Metric({ value, label, danger = false }: { value: string; label: string; danger?: boolean }) {
  return (
    <View style={styles.metric}>
      <AppText variant="h2" style={danger && styles.pendingText}>
        {value}
      </AppText>
      <AppText variant="small">{label}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: spacing.lg,
  },
  topbar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  title: {
    color: colors.primary,
  },
  addButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  addText: {
    color: colors.surface,
  },
  searchWrap: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.lg,
    flexDirection: 'row',
    gap: spacing.sm,
    height: 52,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  searchIcon: {
    color: colors.textMuted,
    fontSize: 22,
  },
  searchInput: {
    color: colors.text,
    flex: 1,
    fontFamily: 'Noto Sans SC',
    fontSize: 16,
  },
  overviewCard: {
    gap: spacing.md,
  },
  overviewHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  overviewGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metric: {
    alignItems: 'center',
    flex: 1,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  sectionAction: {
    color: colors.primary,
    fontWeight: '800',
  },
  classCard: {
    padding: spacing.lg,
  },
  cardHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  classMeta: {
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  pendingText: {
    color: colors.red,
    fontWeight: '800',
  },
  completeText: {
    color: colors.primaryDark,
    fontWeight: '800',
  },
  statusPill: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  statusPending: {
    backgroundColor: colors.yellowSoft,
  },
  statusDone: {
    backgroundColor: colors.primarySoft,
  },
  statusPendingText: {
    color: '#B45309',
    fontWeight: '800',
  },
  statusDoneText: {
    color: colors.primaryDark,
    fontWeight: '800',
  },
  previewRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginVertical: spacing.lg,
  },
  avatar: {
    alignItems: 'center',
    borderColor: colors.surface,
    borderRadius: radius.pill,
    borderWidth: 2,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  avatarText: {
    color: colors.surface,
    fontWeight: '900',
  },
  previewText: {
    color: colors.textMuted,
    marginLeft: spacing.sm,
  },
  footerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  progressWrap: {
    flex: 1,
    gap: spacing.xs,
  },
  progressText: {
    color: colors.textMuted,
  },
  viewButton: {
    minHeight: 40,
    paddingHorizontal: spacing.lg,
  },
});
