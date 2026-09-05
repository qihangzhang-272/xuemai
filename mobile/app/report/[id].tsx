import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { FixedActionBar } from '@/components/ui/FixedActionBar';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Screen } from '@/components/ui/Screen';
import { TopAppBar } from '@/components/ui/TopAppBar';
import { useAppStore } from '@/lib/store/app-store';
import { colors, radius, spacing } from '@/theme/tokens';

export default function ReportDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const store = useAppStore();
  const report = store.reports.find((item) => item.id === id) ?? store.reports[0];
  const student = store.students.find((item) => item.id === report.studentId);
  const [version, setVersion] = useState<'parent' | 'teacher'>('parent');
  const content = version === 'parent' ? report.parentVersion : report.teacherReviewVersion;

  return (
    <SafeAreaView style={styles.root}>
      <TopAppBar title="月度学习报告" rightLabel="分享" onRightPress={() => undefined} />
      <Screen contentStyle={styles.content}>
        <Card style={styles.coverCard}>
          <View style={styles.decorative} />
          <View style={styles.coverHeader}>
            <View>
              <AppText variant="h2">{student?.name ?? '学生'}</AppText>
              <AppText variant="small" style={styles.muted}>
                {report.month.replace('-', '年')}月学习报告
              </AppText>
            </View>
            <Badge label={report.status === 'generated' ? '已生成' : '草稿'} />
          </View>
          <AppText variant="body" style={styles.coverCopy}>
            {content.overview}
          </AppText>
          <View style={styles.coverFooter}>
            <AppText variant="small">面向家长沟通与老师复盘</AppText>
            <AppText variant="small" style={styles.primaryText}>
              学脉 AI 生成
            </AppText>
          </View>
        </Card>

        <Card style={styles.controlCard}>
          <View style={styles.segment}>
            <SegmentButton active={version === 'parent'} label="家长版" onPress={() => setVersion('parent')} />
            <SegmentButton active={version === 'teacher'} label="老师复盘版" onPress={() => setVersion('teacher')} />
          </View>
          <View style={styles.controlRow}>
            <Badge label="温和专业" color={colors.primaryDark} />
            <Badge label="可复制" color={colors.blue} />
            <Badge label="可导出" color={colors.yellow} />
          </View>
        </Card>

        <Card warm>
          <AppText variant="h3">关键结论</AppText>
          <AppText variant="body" style={styles.conclusion}>
            {content.overview}
          </AppText>
        </Card>

        <View style={styles.dataGrid}>
          {content.abilityChanges.slice(0, 6).map((item) => (
            <Card key={item.label} style={styles.dataCard}>
              <AppText variant="small" style={styles.muted}>
                {item.label}
              </AppText>
              <AppText variant="h2">{item.after}</AppText>
              <ProgressBar value={item.after / 100} />
              <AppText variant="small" style={styles.primaryText}>
                +{item.after - item.before}
              </AppText>
            </Card>
          ))}
        </View>

        <View style={styles.stacked}>
          <Card style={styles.halfCard}>
            <AppText variant="h3">本月进步</AppText>
            {content.progressPoints.map((item) => (
              <AppText key={item} variant="small" style={styles.listItem}>
                ✓ {item}
              </AppText>
            ))}
          </Card>
          <Card style={styles.halfCard}>
            <AppText variant="h3">主要问题</AppText>
            {content.weaknesses.map((item) => (
              <AppText key={item} variant="small" style={styles.warningItem}>
                ! {item}
              </AppText>
            ))}
          </Card>
        </View>

        <Card style={styles.previewCard}>
          <AppText variant="h3">报告正文预览</AppText>
          <AppText variant="body" style={styles.previewText}>
            {content.overview}
            {'\n\n'}
            本月进步：{content.progressPoints.join('、')}。
            {'\n\n'}
            需要继续关注：{content.weaknesses.join('、')}。
            {'\n\n'}
            下月建议：{content.nextMonthSuggestions.join('、')}。
            {content.teacherReview?.length ? `\n\n老师复盘：${content.teacherReview.join('、')}。` : ''}
          </AppText>
        </Card>
      </Screen>
      <FixedActionBar
        primaryLabel="导出报告"
        secondaryLabel="复制文字"
        onPrimary={() => undefined}
        onSecondary={() => undefined}
      />
    </SafeAreaView>
  );
}

function SegmentButton({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.segmentItem, active && styles.segmentActive]}>
      <AppText variant="small" style={[styles.segmentText, active && styles.segmentTextActive]}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: colors.background,
    flex: 1,
  },
  content: {
    paddingTop: spacing.lg,
    paddingBottom: 180,
  },
  coverCard: {
    overflow: 'hidden',
    padding: spacing.xl,
  },
  decorative: {
    backgroundColor: colors.primarySoft,
    borderBottomLeftRadius: 80,
    height: 110,
    position: 'absolute',
    right: -26,
    top: -34,
    width: 130,
  },
  coverHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  muted: {
    color: colors.textSecondary,
  },
  coverCopy: {
    color: colors.textSecondary,
    marginTop: spacing.xl,
  },
  coverFooter: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
    paddingTop: spacing.md,
  },
  primaryText: {
    color: colors.primaryDark,
    fontWeight: '800',
  },
  controlCard: {
    gap: spacing.md,
  },
  segment: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.pill,
    flexDirection: 'row',
    padding: spacing.xs,
  },
  segmentItem: {
    alignItems: 'center',
    borderRadius: radius.pill,
    flex: 1,
    paddingVertical: spacing.sm,
  },
  segmentActive: {
    backgroundColor: colors.surface,
  },
  segmentText: {
    color: colors.textSecondary,
    fontWeight: '800',
  },
  segmentTextActive: {
    color: colors.primary,
  },
  controlRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  conclusion: {
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  dataGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  dataCard: {
    flexBasis: '47%',
    flexGrow: 1,
    gap: spacing.sm,
    marginBottom: 0,
  },
  stacked: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  halfCard: {
    flex: 1,
  },
  listItem: {
    color: colors.primaryDark,
    marginTop: spacing.md,
  },
  warningItem: {
    color: colors.red,
    marginTop: spacing.md,
  },
  previewCard: {
    padding: spacing.xl,
  },
  previewText: {
    color: colors.textSecondary,
    lineHeight: 26,
    marginTop: spacing.md,
  },
});
