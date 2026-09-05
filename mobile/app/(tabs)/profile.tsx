import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { useAppStore } from '@/lib/store/app-store';
import { colors, radius, spacing } from '@/theme/tokens';

const groups = [
  {
    title: '工作室与账号',
    items: [
      ['工作室资料', '管理名称、城市和主营科目'],
      ['账号与安全', '登录方式、密码和设备管理'],
      ['套餐与版本', '查看当前体验版权益'],
    ],
  },
  {
    title: 'AI 助教',
    important: true,
    items: [
      ['AI 助教设置', '默认反馈语气、长度和重点'],
      ['反馈模板管理', '管理常用结束语和沟通模板'],
      ['月报生成设置', '配置家长版和老师复盘版'],
      ['风险提醒规则', '设置学生风险识别阈值'],
    ],
  },
  {
    title: '通知与数据',
    items: [
      ['通知设置', '待反馈、月报和 AI 完成提醒'],
      ['学生档案管理', '管理学生档案、学习记录和历史数据'],
      ['数据导出', '导出学生报告、反馈记录和学习数据'],
    ],
  },
  {
    title: '帮助与支持',
    items: [
      ['帮助中心', '查看使用说明和常见问题'],
      ['联系客服', '反馈问题或预约支持'],
    ],
  },
];

export default function ProfileScreen() {
  const store = useAppStore();
  const [activeSetting, setActiveSetting] = useState<string | null>(null);
  const pendingCount = store.feedbackTasks.filter((task) => task.status !== 'completed').length;

  return (
    <Screen contentStyle={styles.content}>
      <AppText variant="h2" style={styles.title}>
        我的空间
      </AppText>

      <Card warm style={styles.profileCard}>
        <View style={styles.profileTop}>
          <View style={styles.avatar}>
            <AppText variant="h2" style={styles.avatarText}>
              E
            </AppText>
          </View>
          <View style={styles.profileInfo}>
            <AppText variant="h2">{store.user.name}</AppText>
            <AppText variant="small" style={styles.muted}>
              {store.studio.displayName}
            </AppText>
            <View style={styles.badgeRow}>
              <Badge label="个体老师" />
              <Badge label="体验版" color={colors.blue} />
            </View>
          </View>
        </View>
        <View style={styles.statRow}>
          <ProfileMetric value={String(store.students.length)} label="名学生" />
          <ProfileMetric value={String(store.classes.length)} label="个班级" />
          <ProfileMetric value={String(pendingCount)} label="待反馈" danger />
        </View>
      </Card>

      {groups.map((group) => (
        <View key={group.title} style={styles.group}>
          <AppText variant="small" style={[styles.groupTitle, group.important && styles.groupTitleImportant]}>
            {group.title}
          </AppText>
          <Card style={styles.groupCard}>
            {group.items.map(([title, description], index) => (
              <Pressable
                key={title}
                onPress={() => setActiveSetting(title)}
                style={[styles.settingRow, index > 0 && styles.rowBorder]}>
                <View style={[styles.settingIcon, group.important && styles.settingIconImportant]}>
                  <AppText variant="small" style={group.important ? styles.settingIconImportantText : styles.settingIconText}>
                    {title.slice(0, 1)}
                  </AppText>
                </View>
                <View style={styles.settingText}>
                  <AppText variant="body" style={styles.settingTitle}>
                    {title}
                  </AppText>
                  <AppText variant="small" numberOfLines={1}>
                    {description}
                  </AppText>
                </View>
                <AppText variant="body" style={styles.chevron}>
                  ›
                </AppText>
              </Pressable>
            ))}
          </Card>
        </View>
      ))}

      <Button variant="danger" onPress={() => setActiveSetting('退出登录')} style={styles.logout}>
        退出登录
      </Button>

      <BottomSheet visible={Boolean(activeSetting)} title={activeSetting ?? ''} onClose={() => setActiveSetting(null)}>
        <AppText variant="body" style={styles.sheetCopy}>
          第一阶段这里展示设置弹窗的交互承接。后续会接入真实账号、通知、模板和导出配置。
        </AppText>
        <Button onPress={() => setActiveSetting(null)}>保存设置</Button>
      </BottomSheet>
    </Screen>
  );
}

function ProfileMetric({ value, label, danger = false }: { value: string; label: string; danger?: boolean }) {
  return (
    <View style={styles.metric}>
      <AppText variant="h2" style={danger && styles.dangerText}>
        {value}
      </AppText>
      <AppText variant="small" style={styles.metricLabel}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: spacing.lg,
  },
  title: {
    marginBottom: spacing.lg,
  },
  profileCard: {
    padding: spacing.xl,
  },
  profileTop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.lg,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: 34,
    height: 68,
    justifyContent: 'center',
    width: 68,
  },
  avatarText: {
    color: colors.primaryDark,
  },
  profileInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  muted: {
    color: colors.textSecondary,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  statRow: {
    backgroundColor: 'rgba(255, 255, 255, 0.62)',
    borderRadius: radius.lg,
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: spacing.xl,
    paddingVertical: spacing.md,
  },
  metric: {
    alignItems: 'center',
    flex: 1,
  },
  metricLabel: {
    color: colors.textSecondary,
    fontSize: 10,
  },
  dangerText: {
    color: colors.red,
  },
  group: {
    marginBottom: spacing.lg,
  },
  groupTitle: {
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    marginLeft: spacing.sm,
  },
  groupTitleImportant: {
    color: colors.primaryDark,
    fontWeight: '900',
  },
  groupCard: {
    marginBottom: 0,
    padding: 0,
    overflow: 'hidden',
  },
  settingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 72,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  rowBorder: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
  },
  settingIcon: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    height: 42,
    justifyContent: 'center',
    marginRight: spacing.md,
    width: 42,
  },
  settingIconImportant: {
    backgroundColor: colors.primarySoft,
  },
  settingIconText: {
    color: colors.textSecondary,
    fontWeight: '900',
  },
  settingIconImportantText: {
    color: colors.primaryDark,
    fontWeight: '900',
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontWeight: '800',
  },
  chevron: {
    color: colors.textMuted,
    fontSize: 26,
  },
  logout: {
    marginTop: spacing.md,
  },
  sheetCopy: {
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
});
