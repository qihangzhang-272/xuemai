import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { useAppStore } from '@/lib/store/app-store';
import { colors, spacing } from '@/theme/tokens';

export default function ReportListScreen() {
  const store = useAppStore();

  return (
    <Screen>
      <AppText variant="h2">报告</AppText>
      <AppText variant="small" style={styles.subtitle}>
        查看学生月报和老师复盘版内容。
      </AppText>
      <View style={styles.stats}>
        <Card style={styles.statCard}>
          <AppText variant="h2">{store.reports.filter((item) => item.status !== 'generated').length}</AppText>
          <AppText variant="small">本月待生成</AppText>
        </Card>
        <Card style={styles.statCard}>
          <AppText variant="h2">{store.reports.length}</AppText>
          <AppText variant="small">报告总数</AppText>
        </Card>
      </View>
      <SectionHeader title="学生月报" />
      {store.reports.length === 0 ? (
        <EmptyState title="暂无月报" description="生成反馈并沉淀记录后，可在这里预览月报。" actionLabel="返回工作台" onAction={() => router.push('/(tabs)')} />
      ) : (
        store.reports.map((report) => {
          const student = store.students.find((item) => item.id === report.studentId);
          return (
            <Pressable key={report.id} onPress={() => router.push({ pathname: '/report/[id]', params: { id: report.id } })}>
              <Card>
                <View style={styles.rowBetween}>
                  <View>
                    <AppText variant="h3">{student?.name ?? '学生'} {report.month} 月报</AppText>
                    <AppText variant="small">{student?.grade} · {student?.subject}</AppText>
                  </View>
                  <Badge label={report.status === 'generated' ? '已生成' : '草稿'} color={report.status === 'generated' ? colors.primary : colors.yellow} />
                </View>
                <AppText variant="body" style={styles.overview}>{report.parentVersion.overview}</AppText>
              </Card>
            </Pressable>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  subtitle: {
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  stats: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  statCard: {
    flex: 1,
  },
  rowBetween: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  overview: {
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
});
