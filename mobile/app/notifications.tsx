import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { useAppStore } from '@/lib/store/app-store';
import { colors, spacing } from '@/theme/tokens';

export default function NotificationCenterScreen() {
  const store = useAppStore();

  function handleAction(notificationId: string) {
    const notification = store.notifications.find((item) => item.id === notificationId);
    if (!notification) return;
    store.markNotificationRead(notification.id);
    if (notification.type === 'pending_feedback' && notification.relatedTaskId) {
      const task = store.feedbackTasks.find((item) => item.id === notification.relatedTaskId);
      if (task?.status === 'not_generated') store.generateFeedback(task.id);
      router.push({ pathname: '/feedback-edit', params: { taskId: notification.relatedTaskId } });
      return;
    }
    if (notification.type === 'learning_risk' && notification.relatedStudentId) {
      router.push({ pathname: '/student/[id]', params: { id: notification.relatedStudentId } });
      return;
    }
    if (notification.type === 'monthly_report') {
      router.push('/(tabs)/reports');
      return;
    }
    router.push('/(tabs)/ai');
  }

  return (
    <Screen>
      <Button variant="ghost" onPress={() => router.back()} style={styles.back}>返回</Button>
      <AppText variant="h2">通知中心</AppText>
      <AppText variant="small" style={styles.subtitle}>待反馈、月报、学情风险和 AI 分析完成提醒。</AppText>
      {store.notifications.length === 0 ? (
        <EmptyState title="暂无通知" description="没有待处理提醒时，这里会保持安静。" actionLabel="返回工作台" onAction={() => router.back()} />
      ) : (
        store.notifications.map((notification) => (
          <Card key={notification.id} warm={!notification.read}>
            <View style={styles.rowBetween}>
              <View style={styles.titleWrap}>
                <AppText variant="h3">{notification.title}</AppText>
                <AppText variant="body" style={styles.copy}>{notification.description}</AppText>
              </View>
              <Badge label={notification.read ? '已读' : '未读'} color={notification.read ? colors.textMuted : colors.primary} />
            </View>
            <AppText variant="small">{new Date(notification.createdAt).toLocaleTimeString()}</AppText>
            <Button variant="secondary" onPress={() => handleAction(notification.id)} style={styles.action}>
              {notification.actionLabel}
            </Button>
          </Card>
        ))
      )}
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
    gap: spacing.md,
  },
  titleWrap: {
    flex: 1,
  },
  copy: {
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  action: {
    marginTop: spacing.md,
  },
});
